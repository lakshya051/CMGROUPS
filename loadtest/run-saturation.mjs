// Saturation ramp test. Ramps autocannon's concurrent-connection count through
// 10 → 50 → 100 → 200 (configurable) for a fixed window each, capturing RPS
// and p99 at every level. Graphs the curve as ASCII so you can spot the
// "knee" — the connection count where RPS plateaus and p99 starts spiraling.
//
// Use this BEFORE / AFTER pool-size or rate-limit changes to prove you moved
// the saturation point in the right direction.
//
// Usage:
//   node run-saturation.mjs                           # default ramp
//   node run-saturation.mjs --target=/api/home-bootstrap
//   node run-saturation.mjs --steps=10,25,50,100,200  # custom rung
//   node run-saturation.mjs --duration=20             # seconds per rung
//   node run-saturation.mjs --backend=http://localhost:5000

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

const BACKEND = args.backend || process.env.BACKEND_URL || 'http://localhost:5000';
const TARGET_PATH = args.target || '/api/home-bootstrap';
const target = `${BACKEND}${TARGET_PATH}`;
const stepsRaw = (args.steps || '10,50,100,200').toString();
const steps = stepsRaw.split(',').map((s) => parseInt(s, 10)).filter(Number.isFinite);
const duration = Number(args.duration ?? 20);
const pipelining = Number(args.pipelining ?? 1);

const fmt = (n, d = 1) =>
    typeof n === 'number' && Number.isFinite(n) ? n.toFixed(d) : String(n);

async function rung(connections) {
    process.stdout.write(`\n▶ ${connections.toString().padStart(4)} conns × ${duration}s × pipelining=${pipelining} ...`);
    const result = await autocannon({
        url: target,
        connections,
        pipelining,
        duration,
        timeout: 30,
        headers: { 'Accept-Encoding': 'gzip, deflate' },
    });
    const errors = (result.errors || 0) + (result.timeouts || 0);
    const non2xx = result.non2xx || 0;
    const total = result['2xx'] + non2xx + errors;
    process.stdout.write(`  rps=${fmt(result.requests.mean)}  p50=${fmt(result.latency.p50)}ms  p99=${fmt(result.latency.p99)}ms  errs=${fmt((errors + non2xx) / Math.max(1, total) * 100)}%\n`);

    return {
        connections,
        durationSec: result.duration,
        totalRequests: total,
        ok2xx: result['2xx'] || 0,
        non2xx,
        errors: result.errors || 0,
        timeouts: result.timeouts || 0,
        rpsAvg: result.requests.mean,
        rpsMax: result.requests.max,
        latencyP50: result.latency.p50,
        latencyP90: result.latency.p90,
        latencyP97_5: result.latency.p97_5,
        latencyP99: result.latency.p99,
        latencyP99_9: result.latency.p99_9,
        latencyMax: result.latency.max,
    };
}

function asciiPlot(label, points) {
    if (points.length === 0) return;
    const values = points.map((p) => p.value);
    const maxVal = Math.max(...values);
    const width = 50;
    console.log(`\n${label}`);
    for (const p of points) {
        const bar = maxVal > 0 ? '█'.repeat(Math.round((p.value / maxVal) * width)) : '';
        console.log(`  ${p.label.padStart(6)} | ${bar} ${fmt(p.value)}`);
    }
}

async function main() {
    console.log('═'.repeat(80));
    console.log('CMGroups Saturation Ramp');
    console.log('═'.repeat(80));
    console.log(`Target  : ${target}`);
    console.log(`Steps   : ${steps.join(' → ')}`);
    console.log(`Duration: ${duration}s per rung`);
    console.log(`Total   : ~${duration * steps.length}s`);

    const ramp = [];
    for (const step of steps) {
        ramp.push(await rung(step));
    }

    console.log('\n' + '═'.repeat(80));
    console.log('SUMMARY');
    console.log('═'.repeat(80));
    console.table(
        ramp.map((r) => ({
            'Conns': r.connections,
            'RPS': Number(fmt(r.rpsAvg, 1)),
            'p50 ms': r.latencyP50,
            'p90 ms': r.latencyP90,
            'p97.5 ms': r.latencyP97_5,
            'p99 ms': r.latencyP99,
            'p99.9 ms': r.latencyP99_9,
            'Errors': r.errors + r.timeouts + r.non2xx,
        })),
    );

    asciiPlot(
        'RPS vs connections',
        ramp.map((r) => ({ label: r.connections.toString(), value: r.rpsAvg })),
    );
    asciiPlot(
        'p99 latency vs connections (lower is better)',
        ramp.map((r) => ({ label: r.connections.toString(), value: r.latencyP99 })),
    );

    // Find the knee — the rung after which p99 jumps > 2× the baseline.
    if (ramp.length > 0) {
        const baseline = ramp[0].latencyP99;
        const knee = ramp.find((r) => r.latencyP99 > baseline * 2);
        if (knee) {
            console.log(`\n→ Knee at ~${knee.connections} concurrent connections (p99 went from ${fmt(baseline)}ms to ${fmt(knee.latencyP99)}ms).`);
        } else {
            console.log(`\n→ No knee found; system held p99 below ${fmt(baseline * 2)}ms across the whole ramp.`);
        }
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(resultsDir, `saturation-${stamp}.json`);
    writeFileSync(
        jsonPath,
        JSON.stringify(
            {
                meta: {
                    timestamp: new Date().toISOString(),
                    target,
                    duration,
                    pipelining,
                    steps,
                },
                ramp,
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
