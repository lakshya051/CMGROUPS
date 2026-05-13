// Soak test — sustained low/medium load over a long window so we can spot
// slow-burn problems that a 5-second burst will never expose:
//
//   • p99 drifting upwards over time (lock contention, slow GC, breaker flap)
//   • Resident set / heap-used trending up monotonically (leak)
//   • Event-loop lag spikes (sync work or GC pauses creeping in)
//   • Breaker oscillating between open / closed (sick DB)
//
// We can't easily sample inside a single multi-minute autocannon run, so the
// soak is implemented as N back-to-back bins. After each bin we:
//   1. Capture autocannon's latency histogram for the bin.
//   2. Scrape `/metrics` (Prometheus format) for memory & breaker state.
//   3. Append a row to the live console table + the result JSON.
//
// Usage:
//   node run-soak.mjs                            # default: 30 min, /api/home-bootstrap
//   node run-soak.mjs --duration=600             # 10 min total
//   node run-soak.mjs --bin=30 --duration=1800   # 30s bins × 60 = 30 min
//   node run-soak.mjs --target=/api/products?limit=20
//   node run-soak.mjs --connections=10           # softer load to spot trends, not saturation
//   METRICS_TOKEN=<token> node run-soak.mjs      # scrape protected /metrics

import autocannon from 'autocannon';
import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
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
const TOTAL_DURATION_S = Number(args.duration ?? 1800);   // default 30 min
const BIN_DURATION_S = Number(args.bin ?? 60);            // default 1 min per bin
const connections = Number(args.connections ?? 10);
const pipelining = Number(args.pipelining ?? 1);
const metricsToken = process.env.METRICS_TOKEN || '';

const binCount = Math.max(1, Math.floor(TOTAL_DURATION_S / BIN_DURATION_S));

// ── Metrics scraping ─────────────────────────────────────────────────────────
// We only care about a few specific gauges/counters — the full /metrics text
// is ~25 KB, parsing it as Prometheus exposition format gives clean numbers.
const METRICS_OF_INTEREST = {
    rssBytes: 'shoptify_process_resident_memory_bytes',
    heapUsedBytes: 'shoptify_nodejs_heap_size_used_bytes',
    heapTotalBytes: 'shoptify_nodejs_heap_size_total_bytes',
    externalBytes: 'shoptify_nodejs_external_memory_bytes',
    eventLoopLagP99: 'shoptify_nodejs_eventloop_lag_p99_seconds',
    breakerOpen: 'shoptify_db_breaker_open',
    breakerChanges: 'shoptify_db_breaker_state_changes_total',
    slowQueries: 'shoptify_db_slow_queries_total',
};

async function scrapeMetrics() {
    try {
        const headers = metricsToken
            ? { 'X-Metrics-Token': metricsToken }
            : {};
        const res = await fetch(`${BACKEND}/metrics`, { headers });
        if (!res.ok) return null;
        const text = await res.text();
        const out = { _scrapedAt: new Date().toISOString() };
        for (const [key, name] of Object.entries(METRICS_OF_INTEREST)) {
            // Match `metric_name 1234` and `metric_name{label="..."} 1234`.
            // Sum counters across labels (e.g. breakerChanges has open/closed labels).
            let total = 0;
            let matched = false;
            const re = new RegExp(`^${name}(?:\\{[^}]*\\})?\\s+([\\d.eE+-]+)$`, 'gm');
            let m;
            while ((m = re.exec(text)) !== null) {
                total += parseFloat(m[1]);
                matched = true;
            }
            out[key] = matched ? total : null;
        }
        return out;
    } catch (err) {
        return { _scrapedAt: new Date().toISOString(), _error: err.message };
    }
}

// ── Bin runner ───────────────────────────────────────────────────────────────
async function runBin(index) {
    const startedAt = new Date().toISOString();
    const result = await autocannon({
        url: target,
        connections,
        pipelining,
        duration: BIN_DURATION_S,
        timeout: 30,
        headers: { 'Accept-Encoding': 'gzip, deflate' },
    });
    const finishedAt = new Date().toISOString();
    const metrics = await scrapeMetrics();
    const errors = (result.errors || 0) + (result.timeouts || 0);
    const non2xx = result.non2xx || 0;
    const total = result['2xx'] + non2xx + errors;

    return {
        bin: index,
        startedAt,
        finishedAt,
        elapsedMin: Number(((index + 1) * BIN_DURATION_S / 60).toFixed(2)),
        rps: Number((result.requests.mean || 0).toFixed(1)),
        p50: result.latency.p50,
        p90: result.latency.p90,
        p97_5: result.latency.p97_5,
        p99: result.latency.p99,
        p99_9: result.latency.p99_9,
        max: result.latency.max,
        ok2xx: result['2xx'] || 0,
        non2xx,
        errors: result.errors || 0,
        timeouts: result.timeouts || 0,
        errorPct: total > 0 ? Number(((errors + non2xx) / total * 100).toFixed(2)) : 0,
        memMB: metrics?.rssBytes != null ? Number((metrics.rssBytes / 1024 / 1024).toFixed(1)) : null,
        heapMB: metrics?.heapUsedBytes != null ? Number((metrics.heapUsedBytes / 1024 / 1024).toFixed(1)) : null,
        loopLagMs: metrics?.eventLoopLagP99 != null ? Number((metrics.eventLoopLagP99 * 1000).toFixed(2)) : null,
        breakerOpen: metrics?.breakerOpen ?? null,
        breakerChanges: metrics?.breakerChanges ?? null,
        slowQueries: metrics?.slowQueries ?? null,
    };
}

// ── Trend detection ──────────────────────────────────────────────────────────
// Simple linear regression on (binIndex, value) → returns slope in units/bin.
// Positive slope on memMB = leak; positive slope on p99 = degradation.
function slope(series) {
    const xs = series.map((_, i) => i);
    const ys = series.filter((v) => typeof v === 'number');
    const n = ys.length;
    if (n < 3) return null;
    const meanX = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
        num += (xs[i] - meanX) * (ys[i] - meanY);
        den += (xs[i] - meanX) ** 2;
    }
    return den === 0 ? 0 : num / den;
}

function asciiPlot(label, values, unit = '') {
    const nonNull = values.filter((v) => typeof v === 'number');
    if (nonNull.length === 0) return;
    const min = Math.min(...nonNull);
    const max = Math.max(...nonNull);
    const range = max - min || 1;
    const HEIGHT = 8;
    console.log(`\n${label} (min=${min.toFixed(1)}${unit}, max=${max.toFixed(1)}${unit})`);
    for (let row = HEIGHT - 1; row >= 0; row--) {
        const threshold = min + (range * row / (HEIGHT - 1));
        const line = values.map((v) => (typeof v === 'number' && v >= threshold) ? '█' : ' ').join('');
        console.log(`  ${threshold.toFixed(1).padStart(7)}${unit} ┤ ${line}`);
    }
    const axis = '─'.repeat(values.length);
    console.log(`           └${axis}→ time`);
}

// ── Main loop ────────────────────────────────────────────────────────────────
async function main() {
    console.log('═'.repeat(80));
    console.log('CMGroups Soak Test');
    console.log('═'.repeat(80));
    console.log(`Target     : ${target}`);
    console.log(`Total      : ${(TOTAL_DURATION_S / 60).toFixed(1)} min (${binCount} × ${BIN_DURATION_S}s bins)`);
    console.log(`Connections: ${connections}, pipelining: ${pipelining}`);
    console.log(`Metrics    : ${metricsToken ? 'with token' : 'open (localhost or unset)'}`);
    console.log('');

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(resultsDir, `soak-${stamp}.json`);
    const ndjsonPath = path.join(resultsDir, `soak-${stamp}.ndjson`);

    // Write a header so streaming readers can recognise the run.
    appendFileSync(ndjsonPath, JSON.stringify({
        type: 'meta',
        target,
        durationSec: TOTAL_DURATION_S,
        binSec: BIN_DURATION_S,
        binCount,
        connections,
        pipelining,
        startedAt: new Date().toISOString(),
    }) + '\n');

    const startMetrics = await scrapeMetrics();

    const bins = [];
    console.log('bin │ t(min) │   rps │ p50 │ p90 │p97.5│ p99 │p99.9│ err%│ rssMB │heapMB│ loopMs│ brk │');
    console.log('────┼────────┼───────┼─────┼─────┼─────┼─────┼─────┼─────┼───────┼──────┼───────┼─────┤');

    for (let i = 0; i < binCount; i++) {
        const row = await runBin(i);
        bins.push(row);
        appendFileSync(ndjsonPath, JSON.stringify({ type: 'bin', ...row }) + '\n');
        const pad = (v, w, d = 0) => (v == null ? '—' : (typeof v === 'number' ? v.toFixed(d) : String(v))).padStart(w);
        console.log(
            `${pad(i + 1, 3)} │ ${pad(row.elapsedMin, 6, 2)} │ ${pad(row.rps, 5, 1)} │ ${pad(row.p50, 3)} │ ${pad(row.p90, 3)} │ ${pad(row.p97_5, 3)} │ ${pad(row.p99, 3)} │ ${pad(row.p99_9, 3)} │ ${pad(row.errorPct, 4, 1)} │ ${pad(row.memMB, 5, 1)} │ ${pad(row.heapMB, 4, 1)} │ ${pad(row.loopLagMs, 5, 2)} │ ${pad(row.breakerOpen, 3)} │`,
        );
    }

    // ── Trend analysis ─────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(80));
    console.log('TREND ANALYSIS');
    console.log('═'.repeat(80));

    const p99Slope = slope(bins.map((b) => b.p99));
    const memSlope = slope(bins.map((b) => b.memMB));
    const heapSlope = slope(bins.map((b) => b.heapMB));
    const breakerChanges = bins.length > 0 && bins[bins.length - 1].breakerChanges != null
        ? bins[bins.length - 1].breakerChanges - (bins[0].breakerChanges ?? 0)
        : null;

    const startMem = startMetrics?.rssBytes != null ? startMetrics.rssBytes / 1024 / 1024 : null;
    const endMem = bins[bins.length - 1]?.memMB ?? null;
    const memGrowth = (typeof startMem === 'number' && typeof endMem === 'number')
        ? endMem - startMem : null;

    const verdict = (label, slopeVal, badThreshold, unit = '/bin') => {
        if (slopeVal == null) return `  ${label.padEnd(30)} insufficient samples`;
        const sign = slopeVal >= 0 ? '+' : '';
        const status = Math.abs(slopeVal) >= badThreshold
            ? (slopeVal > 0 ? 'GROWING' : 'SHRINKING')
            : 'FLAT';
        return `  ${label.padEnd(30)} slope ${(sign + slopeVal.toFixed(3))}${unit}  →  ${status}`;
    };

    console.log(verdict('p99 latency', p99Slope, 5, ' ms/bin'));
    console.log(verdict('RSS (resident memory)', memSlope, 1, ' MB/bin'));
    console.log(verdict('heap used', heapSlope, 0.5, ' MB/bin'));
    if (memGrowth != null) {
        const direction = memGrowth >= 0 ? '+' : '';
        console.log(`  total RSS change               ${direction}${memGrowth.toFixed(1)} MB over ${(TOTAL_DURATION_S / 60).toFixed(1)} min`);
    }
    if (breakerChanges != null) {
        console.log(`  DB breaker state changes       ${breakerChanges} (flapping if > 2)`);
    }

    // ── ASCII plots ────────────────────────────────────────────────────────
    asciiPlot('p99 latency over time', bins.map((b) => b.p99), 'ms');
    asciiPlot('RSS memory over time', bins.map((b) => b.memMB), 'MB');
    asciiPlot('heap used over time', bins.map((b) => b.heapMB), 'MB');
    asciiPlot('RPS over time', bins.map((b) => b.rps));

    // ── Save final JSON ────────────────────────────────────────────────────
    writeFileSync(jsonPath, JSON.stringify({
        meta: {
            target,
            durationSec: TOTAL_DURATION_S,
            binSec: BIN_DURATION_S,
            binCount,
            connections,
            pipelining,
            startedAt: new Date().toISOString(),
        },
        startMetrics,
        bins,
        trends: {
            p99SlopeMsPerBin: p99Slope,
            rssSlopeMbPerBin: memSlope,
            heapSlopeMbPerBin: heapSlope,
            totalRssGrowthMb: memGrowth,
            breakerStateChanges: breakerChanges,
        },
    }, null, 2));

    console.log(`\nResults  → ${path.relative(process.cwd(), jsonPath)}`);
    console.log(`Stream   → ${path.relative(process.cwd(), ndjsonPath)}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
