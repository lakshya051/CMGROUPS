// Compare two loadtest JSON outputs and print a delta table. Use this in PR
// descriptions to demonstrate that a change actually moved the needle:
//
//   node compare.mjs results/loadtest-2026-05-05....json results/loadtest-2026-05-06....json
//
// You can also pin the "before" file to whatever you committed alongside the
// change so a reviewer can re-run the after themselves.

import { readFileSync } from 'node:fs';

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
    console.error('Usage: node compare.mjs <before.json> <after.json>');
    process.exit(1);
}

const before = JSON.parse(readFileSync(beforePath, 'utf8'));
const after = JSON.parse(readFileSync(afterPath, 'utf8'));

const indexById = (arr) => Object.fromEntries(arr.map((r) => [r.id, r]));
const beforeIdx = indexById(before.results || []);
const afterIdx = indexById(after.results || []);

const allIds = [...new Set([...Object.keys(beforeIdx), ...Object.keys(afterIdx)])].sort();

const deltaPct = (oldVal, newVal) => {
    if (typeof oldVal !== 'number' || typeof newVal !== 'number' || oldVal === 0) return null;
    return ((newVal - oldVal) / oldVal) * 100;
};

const fmtPct = (p) => {
    if (p === null) return '—';
    const sign = p > 0 ? '+' : '';
    return `${sign}${p.toFixed(1)}%`;
};

const fmt = (n) => (typeof n === 'number' ? n.toFixed(1) : '—');

const rows = allIds.map((id) => {
    const b = beforeIdx[id] || {};
    const a = afterIdx[id] || {};
    return {
        Scenario: id,
        'RPS before': fmt(b.rps?.mean),
        'RPS after': fmt(a.rps?.mean),
        'RPS Δ': fmtPct(deltaPct(b.rps?.mean, a.rps?.mean)),
        'p97.5 before': fmt(b.latencyMs?.p97_5),
        'p97.5 after': fmt(a.latencyMs?.p97_5),
        'p97.5 Δ': fmtPct(deltaPct(b.latencyMs?.p97_5, a.latencyMs?.p97_5)),
        'p99 before': fmt(b.latencyMs?.p99),
        'p99 after': fmt(a.latencyMs?.p99),
        'p99 Δ': fmtPct(deltaPct(b.latencyMs?.p99, a.latencyMs?.p99)),
        'Err% before': fmt(b.errorRatePct),
        'Err% after': fmt(a.errorRatePct),
    };
});

console.log('═'.repeat(80));
console.log('Load test delta');
console.log('═'.repeat(80));
console.log(`Before: ${beforePath} (${before.meta?.timestamp || '?'})`);
console.log(`After : ${afterPath} (${after.meta?.timestamp || '?'})`);
console.table(rows);
