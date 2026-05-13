// Static auditor for cache-invalidation correctness.
//
// What it does:
//   1. Walks every route file under backend/src/routes and indexes:
//        • cache READS  — `cache.getOrRefresh('PREFIX:...', ...)` and `cache.set('PREFIX:...', ...)`
//        • cache BUSTS  — `cache.delByPrefix('PREFIX:')` and `cache.del('KEY')`
//        • WRITE handlers — router.post / put / patch / delete
//   2. For each prefix that is READ somewhere, asserts that EVERY write handler
//      touching that family also has a BUST for that prefix.
//   3. Computes the home-bootstrap dependency set (`home:bootstrap` aggregates
//      banners, categories, products, bundles, bundleTemplates, courses,
//      serviceTypes) and asserts every BUST of those prefixes also busts `home:`.
//      A single missed `cache.delByPrefix('home:')` means the homepage will keep
//      serving stale data for up to 90 s + 600 s after admin changes.
//   4. Prints a clean report and exits non-zero if anything is missing — wire
//      this into CI to keep cache correctness from rotting over time.
//
// Run with:  node validate-cache-invalidation.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROUTES_DIR = path.join(__dirname, '..', 'backend', 'src', 'routes');

// Prefixes the home-bootstrap response aggregates. Sourced by inspecting
// homeBootstrap.js: if a new prefix is added there, add it here too — the
// audit will catch missing invalidations and remind you.
const HOME_DEPENDENCIES = [
    'banners:',
    'categories:',
    'serviceTypes:',
    'products:',
    'bundles:',
    'bundleTemplates:',
    'courses:',
];

const HOME_PREFIX = 'home:';

// Walk directory recursively, returning .js files.
function walk(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) out.push(...walk(full));
        else if (name.endsWith('.js')) out.push(full);
    }
    return out;
}

const files = walk(ROUTES_DIR);

// ── Pattern matchers ─────────────────────────────────────────────────────────
// We're parsing JS without an AST. Match conservatively: capture the literal
// prefix inside the first string argument. This will miss exotic call sites
// (dynamic prefixes built from variables) but those are rare in this codebase.
const READ_PATTERNS = [
    /cache\.getOrRefresh\(\s*['"`]([^'"`]+?)['"`]/g,        // getOrRefresh('prefix:...')
    /cache\.getOrRefresh\(\s*([A-Z_]+)\s*,/g,                // getOrRefresh(CACHE_KEY, ...)
    /cache\.set\(\s*['"`]([^'"`]+?)['"`]/g,
    /cache\.set\(\s*([a-zA-Z_$][\w$]*)\s*,/g,                // cache.set(cacheKey, ...)
];

// Each entry: (regex, callback) — the callback receives the regex match and
// returns an array of prefixes that the call invalidates. This lets a single
// call site (`cache.bustWithHome('products:')`) register as busting both
// "products:" and "home:" — exactly the contract the helper provides.
const BUST_PATTERNS = [
    [
        /cache\.delByPrefix\(\s*['"`]([^'"`]+?)['"`]/g,
        (m) => [m[1]],
    ],
    [
        /cache\.del\(\s*['"`]([^'"`]+?)['"`]/g,
        (m) => [m[1]],
    ],
    [
        /cache\.bustWithHome\(\s*['"`]([^'"`]+?)['"`]/g,
        (m) => {
            const prefix = m[1];
            // Mirror the dependency edges baked into cache.bustWithHome:
            // anything that busts the products family also clears the
            // co-purchase sub-cache.
            const extras = ['home:'];
            if (prefix === 'products:') extras.push('coPurchased:');
            return [prefix, ...extras];
        },
    ],
];

const WRITE_HANDLER_PATTERN = /router\.(post|put|patch|delete)\s*\(/g;

// ── Per-file analysis ────────────────────────────────────────────────────────
const fileSummary = {};
const prefixesSeen = new Set();

for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const rel = path.relative(ROUTES_DIR, file);

    // Resolve variable-based prefixes by also harvesting `const FOO = 'prefix:...'`.
    const constMap = {};
    const constRe = /const\s+([A-Z_][A-Z_0-9]*)\s*=\s*['"`]([^'"`]+?)['"`]/g;
    let m;
    while ((m = constRe.exec(src)) !== null) constMap[m[1]] = m[2];
    // Also harvest `const cacheKey = \`bundles:list:${...}\`` style — capture
    // the leading literal prefix up to the first `${`.
    const localKeyRe = /const\s+([a-zA-Z_$][\w$]*)\s*=\s*[`'"]([^`'"$]+?:)/g;
    while ((m = localKeyRe.exec(src)) !== null) constMap[m[1]] = m[2];

    const reads = new Set();
    const busts = new Set();

    for (const pattern of READ_PATTERNS) {
        pattern.lastIndex = 0;
        while ((m = pattern.exec(src)) !== null) {
            let raw = m[1];
            if (constMap[raw]) raw = constMap[raw];
            const prefix = raw.split(':').slice(0, 1)[0] + ':';
            if (prefix && prefix !== ':') reads.add(prefix);
        }
    }
    for (const [pattern, extract] of BUST_PATTERNS) {
        pattern.lastIndex = 0;
        while ((m = pattern.exec(src)) !== null) {
            for (const raw of extract(m)) {
                const prefix = raw.split(':').slice(0, 1)[0] + ':';
                if (prefix && prefix !== ':') busts.add(prefix);
            }
        }
    }

    // count write handlers
    let writeCount = 0;
    WRITE_HANDLER_PATTERN.lastIndex = 0;
    while ((WRITE_HANDLER_PATTERN.exec(src)) !== null) writeCount++;

    fileSummary[rel] = { reads, busts, writeCount };
    for (const p of reads) prefixesSeen.add(p);
    for (const p of busts) prefixesSeen.add(p);
}

// ── Build a global map: prefix → files that READ it; prefix → files that BUST it
const readByPrefix = {};
const bustByPrefix = {};
for (const [file, info] of Object.entries(fileSummary)) {
    for (const p of info.reads) (readByPrefix[p] ||= []).push(file);
    for (const p of info.busts) (bustByPrefix[p] ||= []).push(file);
}

// ── Findings ─────────────────────────────────────────────────────────────────
const findings = [];

// (A) Any cached prefix MUST have at least one place that busts it. Else the
// data is cached for life-of-process.
for (const prefix of Object.keys(readByPrefix)) {
    if (!bustByPrefix[prefix]) {
        findings.push({
            severity: 'WARN',
            kind: 'no-busters',
            prefix,
            message: `Prefix "${prefix}" is read with cache.getOrRefresh/cache.set in ${readByPrefix[prefix].join(', ')} but NEVER invalidated. Cached data will never refresh until the entry's TTL expires.`,
        });
    }
}

// (B) Every file that mutates AND reads the same family must ALSO invalidate
// it. (e.g. products.js can't both serve cached products and mutate them
// without busting.)
for (const [file, info] of Object.entries(fileSummary)) {
    if (info.writeCount > 0 && info.reads.size > 0) {
        for (const p of info.reads) {
            if (!info.busts.has(p)) {
                findings.push({
                    severity: 'ERROR',
                    kind: 'reads-and-writes-without-busting',
                    file,
                    prefix: p,
                    message: `${file} caches prefix "${p}" AND has ${info.writeCount} write handler(s) but never calls cache.delByPrefix('${p}'). Writes will not invalidate the cache.`,
                });
            }
        }
    }
}

// (C) home-bootstrap dependency check. Every site that busts a HOME_DEPENDENCIES
// prefix MUST also bust `home:`. Otherwise the homepage keeps serving stale
// aggregates for up to 10 minutes after a write.
for (const [file, info] of Object.entries(fileSummary)) {
    const touchesHomeDep = [...info.busts].some((p) => HOME_DEPENDENCIES.includes(p));
    if (touchesHomeDep && !info.busts.has(HOME_PREFIX)) {
        findings.push({
            severity: 'ERROR',
            kind: 'home-not-invalidated',
            file,
            message: `${file} invalidates a home-bootstrap dependency (${[...info.busts].filter((p) => HOME_DEPENDENCIES.includes(p)).join(', ')}) but does NOT call cache.delByPrefix('home:'). The homepage will serve stale data for up to fresh+stale TTL after every write.`,
        });
    }
}

// (D) HOME_DEPENDENCIES must align with what homeBootstrap.js actually reads.
// Cross-check by inspecting the file directly.
try {
    const homeFile = path.join(ROUTES_DIR, 'homeBootstrap.js');
    const homeSrc = readFileSync(homeFile, 'utf8');
    const knownTables = ['banner', 'category', 'product', 'bundle', 'bundleTemplate', 'course', 'serviceType'];
    const referenced = knownTables.filter((t) => new RegExp(`prisma\\.${t}\\b`, 'i').test(homeSrc));
    // map model → prefix
    const modelToPrefix = {
        banner: 'banners:',
        category: 'categories:',
        product: 'products:',
        bundle: 'bundles:',
        bundleTemplate: 'bundleTemplates:',
        course: 'courses:',
        serviceType: 'serviceTypes:',
    };
    for (const t of referenced) {
        const prefix = modelToPrefix[t];
        if (prefix && !HOME_DEPENDENCIES.includes(prefix)) {
            findings.push({
                severity: 'WARN',
                kind: 'home-deps-drift',
                message: `homeBootstrap.js reads prisma.${t} but HOME_DEPENDENCIES in this audit does not list "${prefix}". Add it so future invalidation checks include it.`,
            });
        }
    }
} catch { /* homeBootstrap.js missing — not fatal here */ }

// ── Report ───────────────────────────────────────────────────────────────────
console.log('═══ Cache invalidation audit ═══\n');

const ROUTES_REL = path.relative(process.cwd(), ROUTES_DIR);
console.log(`Scanned ${files.length} route files in ${ROUTES_REL}\n`);

const readsSorted = Object.entries(readByPrefix).sort();
console.log('Cache prefixes in use:');
for (const [p, fs] of readsSorted) {
    const busts = bustByPrefix[p] || [];
    const status = busts.length ? `✓ busted by ${busts.length} file(s)` : '✗ NEVER BUSTED';
    console.log(`  ${p.padEnd(22)} reads: ${fs.length}, ${status}`);
}

if (!findings.length) {
    console.log('\n✓ No invalidation problems detected.');
    process.exit(0);
}

const errors = findings.filter((f) => f.severity === 'ERROR');
const warnings = findings.filter((f) => f.severity === 'WARN');

if (errors.length) {
    console.log(`\n${'═'.repeat(70)}\nERRORS (${errors.length}):\n${'═'.repeat(70)}`);
    for (const f of errors) {
        console.log(`\n  [${f.kind}]`);
        console.log(`  ${f.message}`);
    }
}
if (warnings.length) {
    console.log(`\n${'═'.repeat(70)}\nWARNINGS (${warnings.length}):\n${'═'.repeat(70)}`);
    for (const f of warnings) {
        console.log(`\n  [${f.kind}]`);
        console.log(`  ${f.message}`);
    }
}

console.log('');
if (errors.length) process.exit(1);
process.exit(0);
