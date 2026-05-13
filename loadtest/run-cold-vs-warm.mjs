// Cold vs warm latency comparison.
//
// What "cold" means here:
//   • The very first request to a route after the server has just booted,
//     or after the in-process cache has aged out — the first user gets the
//     full DB roundtrip and any one-time work (Prisma engine warmup, JIT,
//     connection pool fill).
// What "warm" means:
//   • Subsequent requests that hit either the fresh cache or the SWR stale
//     entry → essentially "is the in-memory hit path as fast as we expect?".
//
// Why this matters:
//   • A 5-minute deploy gap means every cache entry is cold, so the next
//     user pays the cold price.
//   • If cold latency is many multiples of warm latency you have a UX cliff.
//   • A small cold/warm ratio also indirectly tells you the cache is doing
//     its job — if cold == warm, the cache isn't being hit on subsequent
//     requests.
//
// What the script does:
//   1. Asks the running backend to clear all caches via DELETE /api/__test/cache
//      (only enabled in non-prod). Falls back to "skip warm step" if the
//      route isn't there.
//   2. For each read route in TARGETS, fires N cold requests one at a time
//      (with cache flushed each time → every request is a cold miss).
//   3. Then fires N warm requests as a tight loop with cache populated.
//   4. Prints a comparison table: cold p50/p99 vs warm p50/p99, plus speedup.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resultsDir = path.join(__dirname, 'results');
if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000';
const COLD_RUNS = parseInt(process.env.COLD_RUNS || '20', 10);
const WARM_RUNS = parseInt(process.env.WARM_RUNS || '200', 10);
const TEST_FLUSH_HEADER = process.env.TEST_FLUSH_HEADER || 'x-test-flush-token';
const TEST_FLUSH_TOKEN = process.env.TEST_FLUSH_TOKEN || 'loadtest';

const TARGETS = [
    { id: 'home-bootstrap', path: '/api/home-bootstrap' },
    { id: 'products-list', path: '/api/products?limit=20' },
    { id: 'products-card', path: '/api/products?limit=20&fields=card' },
    { id: 'categories', path: '/api/categories' },
    { id: 'banners', path: '/api/banners' },
    { id: 'bundles', path: '/api/bundles' },
    { id: 'bundle-templates', path: '/api/bundle-templates' },
    { id: 'courses', path: '/api/courses' },
];

// Quantile from a sorted ascending array.
const q = (arr, p) => {
    if (!arr.length) return null;
    const i = Math.min(arr.length - 1, Math.floor(p * arr.length));
    return arr[i];
};

async function timed(url) {
    const start = process.hrtime.bigint();
    const res = await fetch(url);
    // drain the body — otherwise we're only timing headers
    await res.text();
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;
    return { ms, status: res.status };
}

async function flushCache() {
    try {
        const res = await fetch(`${BACKEND}/api/__test/cache`, {
            method: 'DELETE',
            headers: { [TEST_FLUSH_HEADER]: TEST_FLUSH_TOKEN },
        });
        await res.text();
        return res.status === 200 || res.status === 204;
    } catch {
        return false;
    }
}

async function runScenario(target) {
    // ── Cold pass: flush before each request so every one is a cache miss ──
    const cold = [];
    let coldFlushedAll = true;
    for (let i = 0; i < COLD_RUNS; i++) {
        const flushed = await flushCache();
        if (!flushed) coldFlushedAll = false;
        const { ms, status } = await timed(`${BACKEND}${target.path}`);
        if (status >= 500) {
            cold.push({ ms, status, error: true });
        } else {
            cold.push({ ms, status, error: false });
        }
    }

    // ── Warm pass: don't flush, hammer the route to populate + reuse cache ──
    const warm = [];
    for (let i = 0; i < WARM_RUNS; i++) {
        const { ms, status } = await timed(`${BACKEND}${target.path}`);
        warm.push({ ms, status, error: status >= 500 });
    }

    const sortedCold = cold.map((c) => c.ms).sort((a, b) => a - b);
    const sortedWarm = warm.map((c) => c.ms).sort((a, b) => a - b);

    return {
        id: target.id,
        path: target.path,
        coldFlushedAll,
        cold: {
            samples: COLD_RUNS,
            p50: q(sortedCold, 0.5),
            p90: q(sortedCold, 0.9),
            p99: q(sortedCold, 0.99),
            max: sortedCold[sortedCold.length - 1],
            errors: cold.filter((c) => c.error).length,
        },
        warm: {
            samples: WARM_RUNS,
            p50: q(sortedWarm, 0.5),
            p90: q(sortedWarm, 0.9),
            p99: q(sortedWarm, 0.99),
            max: sortedWarm[sortedWarm.length - 1],
            errors: warm.filter((c) => c.error).length,
        },
    };
}

async function main() {
    console.log('═'.repeat(80));
    console.log('Cold vs Warm latency comparison');
    console.log('═'.repeat(80));
    console.log(`Backend     : ${BACKEND}`);
    console.log(`Cold samples: ${COLD_RUNS} (cache flushed before each)`);
    console.log(`Warm samples: ${WARM_RUNS} (steady state, no flush)`);
    console.log('');

    // Probe once so a misconfigured flush endpoint surfaces early.
    const probe = await flushCache();
    if (!probe) {
        console.log('⚠  Cache flush endpoint not available — cold samples will be');
        console.log('   approximate (only first request after process start is truly cold).');
        console.log('   Wire DELETE /api/__test/cache to cache.flush() in non-prod to fix.\n');
    } else {
        console.log('✓ Cache flush endpoint reachable\n');
    }

    const results = [];
    for (const target of TARGETS) {
        process.stdout.write(`Running ${target.id.padEnd(18)} `);
        const r = await runScenario(target);
        results.push(r);
        console.log(`cold p99=${r.cold.p99?.toFixed(1)}ms warm p99=${r.warm.p99?.toFixed(1)}ms`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('Results');
    console.log('═'.repeat(80));

    const fmt = (v) => v == null ? '—' : v.toFixed(1);

    console.table(
        results.map((r) => ({
            Scenario: r.id,
            'cold p50': fmt(r.cold.p50),
            'cold p99': fmt(r.cold.p99),
            'warm p50': fmt(r.warm.p50),
            'warm p99': fmt(r.warm.p99),
            'p50 ratio': r.warm.p50 ? (r.cold.p50 / r.warm.p50).toFixed(1) + 'x' : '—',
            'p99 ratio': r.warm.p99 ? (r.cold.p99 / r.warm.p99).toFixed(1) + 'x' : '—',
            'cold err': r.cold.errors,
            'warm err': r.warm.errors,
        })),
    );

    // Findings — flag pathological cases.
    console.log('\nFindings:');
    for (const r of results) {
        if (r.warm.p99 == null || r.cold.p99 == null) continue;
        const ratio = r.cold.p99 / r.warm.p99;
        if (ratio > 50) {
            console.log(`  ⚠  ${r.id}: cold/warm p99 ratio is ${ratio.toFixed(1)}x — users hitting a cold cache will see ${(r.cold.p99).toFixed(0)}ms vs steady-state ${(r.warm.p99).toFixed(0)}ms.`);
        }
        if (r.cold.errors > 0) {
            console.log(`  ✗  ${r.id}: ${r.cold.errors}/${COLD_RUNS} cold requests errored.`);
        }
        if (r.warm.errors > 0) {
            console.log(`  ✗  ${r.id}: ${r.warm.errors}/${WARM_RUNS} warm requests errored.`);
        }
        if (r.warm.p99 > 50 && ratio < 2) {
            console.log(`  ⚠  ${r.id}: warm p99 is ${r.warm.p99.toFixed(0)}ms but cold/warm ratio is only ${ratio.toFixed(1)}x — the cache may not be doing its job (steady-state still hitting the DB).`);
        }
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const out = path.join(resultsDir, `cold-vs-warm-${stamp}.json`);
    writeFileSync(out, JSON.stringify({
        backend: BACKEND,
        coldRuns: COLD_RUNS,
        warmRuns: WARM_RUNS,
        flushEndpointAvailable: probe,
        ranAt: new Date().toISOString(),
        results,
    }, null, 2));
    console.log(`\nResults → ${path.relative(process.cwd(), out)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
