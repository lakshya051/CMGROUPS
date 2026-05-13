// Local load test driver for CMGroups (backend + frontend dev servers).
// Uses autocannon (HTTP/1.1 benchmarker) to hit safe public endpoints.
//
// Usage:
//   node run.mjs                  # full suite, results saved to results/
//   node run.mjs --quick          # 5s smoke run, low concurrency
//   node run.mjs --duration=30    # custom duration (seconds)
//   node run.mjs --connections=20 # custom concurrent connections
//   node run.mjs --only=api-products,frontend-root

import autocannon from 'autocannon';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resultsDir = path.join(__dirname, 'results');
if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
        if (a.startsWith('--')) {
            const [k, v] = a.slice(2).split('=');
            return [k, v ?? true];
        }
        return [a, true];
    }),
);

const QUICK = !!args.quick;
const DEFAULT_DURATION = QUICK ? 5 : 15;
const DEFAULT_CONNECTIONS = QUICK ? 5 : 25;
const duration = Number(args.duration ?? DEFAULT_DURATION);
const connections = Number(args.connections ?? DEFAULT_CONNECTIONS);
const pipelining = Number(args.pipelining ?? 1);
const onlyFilter = (args.only || '').toString().split(',').map((s) => s.trim()).filter(Boolean);

const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

// Each scenario is a safe, idempotent GET. Mutating endpoints, auth-only, and
// admin endpoints are intentionally excluded.
const scenarios = [
    {
        id: 'backend-health',
        title: 'Backend root health (no DB)',
        url: `${BACKEND}/`,
    },
    {
        id: 'frontend-root',
        title: 'Frontend Vite index (HTML shell)',
        url: `${FRONTEND}/`,
    },
    {
        id: 'api-products',
        title: 'GET /api/products?limit=20 (DB-backed, cached 60s)',
        url: `${BACKEND}/api/products?limit=20`,
    },
    {
        id: 'api-products-search',
        title: 'GET /api/products?search=...&sort=price-low (different cache key)',
        url: `${BACKEND}/api/products?search=cable&sort=price-low&limit=20`,
    },
    {
        id: 'api-categories',
        title: 'GET /api/categories (DB-backed)',
        url: `${BACKEND}/api/categories`,
    },
    {
        id: 'api-banners',
        title: 'GET /api/banners (DB-backed)',
        url: `${BACKEND}/api/banners`,
    },
    {
        id: 'api-courses',
        title: 'GET /api/courses (DB-backed)',
        url: `${BACKEND}/api/courses`,
    },
    {
        id: 'api-bundles',
        title: 'GET /api/bundles (DB-backed)',
        url: `${BACKEND}/api/bundles`,
    },
    {
        id: 'api-bundle-templates',
        title: 'GET /api/bundle-templates (DB-backed)',
        url: `${BACKEND}/api/bundle-templates`,
    },
    {
        id: 'api-home-bootstrap',
        title: 'GET /api/home-bootstrap (one-shot homepage payload)',
        url: `${BACKEND}/api/home-bootstrap`,
    },
    {
        id: 'api-products-card',
        title: 'GET /api/products?limit=20&fields=card (thin payload)',
        url: `${BACKEND}/api/products?limit=20&fields=card`,
    },
    // Optional auth-cached scenario: validates the 60s `firebaseUid → user`
    // cache added in Phase 0. Requires a real Firebase ID token because
    // the `protect` middleware verifies it via Firebase Admin. Set
    // `LOADTEST_FIREBASE_TOKEN` in the env to enable.
    ...(process.env.LOADTEST_FIREBASE_TOKEN ? [{
        id: 'auth-cached',
        title: 'GET /api/auth/me (validates 60s auth user cache)',
        url: `${BACKEND}/api/auth/me`,
        headers: { Authorization: `Bearer ${process.env.LOADTEST_FIREBASE_TOKEN}` },
    }] : []),
];

const filtered = onlyFilter.length
    ? scenarios.filter((s) => onlyFilter.includes(s.id))
    : scenarios;

const fmt = (n, digits = 2) =>
    typeof n === 'number' && Number.isFinite(n) ? n.toFixed(digits) : String(n);

function summarize(s, r) {
    const lat = r.latency || {};
    const req = r.requests || {};
    const tp = r.throughput || {};
    const errors = (r.errors || 0) + (r.timeouts || 0);
    const non2xx = r.non2xx || 0;
    const total = r['2xx'] + non2xx + errors;
    const errRate = total > 0 ? ((errors + non2xx) / total) * 100 : 0;

    return {
        id: s.id,
        title: s.title,
        url: s.url,
        durationSec: r.duration,
        connections: r.connections,
        pipelining: r.pipelining,
        totalRequests: total,
        ok2xx: r['2xx'] || 0,
        non2xx,
        errors: r.errors || 0,
        timeouts: r.timeouts || 0,
        errorRatePct: Number(fmt(errRate, 2)),
        rps: {
            mean: req.mean,
            stddev: req.stddev,
            min: req.min,
            max: req.max,
        },
        latencyMs: {
            avg: lat.average,
            p50: lat.p50,
            p90: lat.p90,
            // autocannon's HDR histogram does not expose p95 natively — only p97_5.
            // p97_5 is slightly more conservative (covers more of the long tail)
            // so it's a safe stand-in when an SLA targets p95.
            p97_5: lat.p97_5,
            p99: lat.p99,
            p99_9: lat.p99_9,
            max: lat.max,
        },
        throughputBytes: {
            mean: tp.mean,
            max: tp.max,
        },
    };
}

function printRow(label, value, unit = '') {
    console.log(`  ${label.padEnd(28)} ${String(value).padStart(12)} ${unit}`);
}

async function runOne(s) {
    console.log('\n' + '─'.repeat(80));
    console.log(`▶  ${s.title}`);
    console.log(`   ${s.url}`);
    console.log(`   connections=${connections}  pipelining=${pipelining}  duration=${duration}s`);
    console.log('─'.repeat(80));

    const result = await autocannon({
        url: s.url,
        connections,
        pipelining,
        duration,
        timeout: 30,
        // Avoid keep-alive surprises during local dev:
        headers: { 'Accept-Encoding': 'gzip, deflate', ...(s.headers || {}) },
    });

    const summary = summarize(s, result);

    printRow('Total requests', summary.totalRequests);
    printRow('2xx OK', summary.ok2xx);
    printRow('non-2xx', summary.non2xx);
    printRow('Errors / Timeouts', `${summary.errors} / ${summary.timeouts}`);
    printRow('Error rate', `${fmt(summary.errorRatePct, 2)}%`);
    printRow('RPS (avg)', fmt(summary.rps.mean, 1), 'req/s');
    printRow('RPS (max)', fmt(summary.rps.max, 1), 'req/s');
    printRow('Latency avg', fmt(summary.latencyMs.avg, 1), 'ms');
    printRow('Latency p50', fmt(summary.latencyMs.p50, 1), 'ms');
    printRow('Latency p90', fmt(summary.latencyMs.p90, 1), 'ms');
    printRow('Latency p97.5', fmt(summary.latencyMs.p97_5, 1), 'ms');
    printRow('Latency p99', fmt(summary.latencyMs.p99, 1), 'ms');
    printRow('Latency p99.9', fmt(summary.latencyMs.p99_9, 1), 'ms');
    printRow('Latency max', fmt(summary.latencyMs.max, 1), 'ms');

    return { summary, raw: result };
}

async function main() {
    console.log('═'.repeat(80));
    console.log('CMGroups Local Load Test');
    console.log('═'.repeat(80));
    console.log(`Backend : ${BACKEND}`);
    console.log(`Frontend: ${FRONTEND}`);
    console.log(`Mode    : ${QUICK ? 'QUICK SMOKE' : 'FULL'}`);
    console.log(`Duration: ${duration}s   Connections: ${connections}   Pipelining: ${pipelining}`);
    console.log(`Scenarios: ${filtered.map((s) => s.id).join(', ')}`);

    const allSummaries = [];
    for (const s of filtered) {
        try {
            const { summary } = await runOne(s);
            allSummaries.push(summary);
        } catch (err) {
            console.error(`\n!! Failed to run scenario "${s.id}":`, err.message);
            allSummaries.push({
                id: s.id,
                title: s.title,
                url: s.url,
                fatal: err.message,
            });
        }
    }

    // ── Final overview ──────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(80));
    console.log('SUMMARY');
    console.log('═'.repeat(80));

    const tableRows = allSummaries.map((s) => ({
        Scenario: s.id,
        RPS: s.rps?.mean != null ? Number(s.rps.mean.toFixed(1)) : '—',
        'p50 ms': s.latencyMs?.p50 ?? '—',
        'p90 ms': s.latencyMs?.p90 ?? '—',
        'p97.5 ms': s.latencyMs?.p97_5 ?? '—',
        'p99 ms': s.latencyMs?.p99 ?? '—',
        'p99.9 ms': s.latencyMs?.p99_9 ?? '—',
        'Err %': s.errorRatePct != null ? s.errorRatePct : '—',
        'Total': s.totalRequests ?? '—',
    }));
    console.table(tableRows);

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(resultsDir, `loadtest-${stamp}.json`);
    writeFileSync(
        jsonPath,
        JSON.stringify(
            {
                meta: {
                    timestamp: new Date().toISOString(),
                    backend: BACKEND,
                    frontend: FRONTEND,
                    duration,
                    connections,
                    pipelining,
                    quick: QUICK,
                },
                results: allSummaries,
            },
            null,
            2,
        ),
    );
    console.log(`\nResults saved → ${path.relative(process.cwd(), jsonPath)}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
