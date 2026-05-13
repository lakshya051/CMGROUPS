// Cache state-machine tests.
//
// The cache module is the single most important resilience primitive in this
// app: it owns the stale-while-revalidate path, the request-coalescing
// behaviour that stops a cache stampede, and the in-flight refresh promise
// lifecycle. If any of those break silently the homepage either becomes a
// thundering herd against the DB OR starts serving cached-forever data.
//
// These tests drive the cache through every state transition end-to-end:
//   • miss → fetch → fresh
//   • fresh hit (no fetch)
//   • fresh → stale (background refresh fires, original caller returns immediately)
//   • stale → fresh again after background refresh resolves
//   • stale + refresh fails → caller still gets stale value (no thrown error)
//   • miss + refresh fails → caller sees the error (no stale to fall back on)
//   • parallel misses share a single refresh (no stampede)
//   • del / delByPrefix / flush actually delete
//
// Uses node:assert — no test runner needed. Run with `node test-cache.mjs`.

import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';
import cache from '../backend/src/lib/cache.js';

let passed = 0;
let failed = 0;
const results = [];

const test = async (name, fn) => {
    cache.flush();
    try {
        await fn();
        passed++;
        results.push({ name, status: 'PASS' });
        console.log(`  ✓ ${name}`);
    } catch (err) {
        failed++;
        results.push({ name, status: 'FAIL', error: err.message });
        console.log(`  ✗ ${name}`);
        console.log(`      ${err.stack?.split('\n').slice(0, 3).join('\n      ') || err.message}`);
    }
};

console.log('\n═══ cache state-machine tests ═══');

// 1) miss → fetch → fresh
await test('miss returns undefined', () => {
    assert.equal(cache.get('absent'), undefined);
    assert.equal(cache.getStale('absent'), undefined);
});

await test('set/get round-trip preserves value', () => {
    cache.set('k', { foo: 'bar' }, 60);
    assert.deepEqual(cache.get('k'), { foo: 'bar' });
});

// useClones: a mutation on the returned object does not corrupt the entry.
await test('useClones isolates callers from each other', () => {
    cache.set('k', { foo: 'bar' }, 60);
    const a = cache.get('k');
    a.foo = 'mutated';
    const b = cache.get('k');
    assert.equal(b.foo, 'bar', 'cache should clone, not share references');
});

// 2) freshness window
await test('value within freshTtl is reported as fresh (not stale)', () => {
    cache.setWithStale('k', 'v', 1, 5);
    const got = cache.getStale('k');
    assert.deepEqual(got, { value: 'v', isStale: false });
});

await test('value past freshTtl is reported as stale', async () => {
    cache.setWithStale('k', 'v', 1, 5);
    await wait(1100); // crosses freshTtl
    const got = cache.getStale('k');
    assert.equal(got.value, 'v');
    assert.equal(got.isStale, true);
    // get() (fresh-only) now returns undefined.
    assert.equal(cache.get('k'), undefined);
});

await test('value past freshTtl+staleTtl is gone', async () => {
    cache.setWithStale('k', 'v', 1, 1);
    await wait(2200); // crosses both windows
    assert.equal(cache.getStale('k'), undefined);
});

// 3) getOrRefresh: cold miss path
await test('getOrRefresh: cold miss awaits refresh, caches result', async () => {
    let fetchCount = 0;
    const refresh = async () => { fetchCount++; return 'fresh-value'; };
    const v = await cache.getOrRefresh('k', 60, 300, refresh);
    assert.equal(v, 'fresh-value');
    assert.equal(fetchCount, 1);
    // subsequent call is served from cache — refresh NOT called again.
    const v2 = await cache.getOrRefresh('k', 60, 300, refresh);
    assert.equal(v2, 'fresh-value');
    assert.equal(fetchCount, 1, 'fresh hit must not re-fetch');
});

// 4) getOrRefresh: SWR path — stale value returned synchronously, refresh in background
await test('getOrRefresh: stale entry returned immediately + bg refresh fires', async () => {
    cache.setWithStale('k', 'old', 1, 60); // fresh for 1s
    await wait(1200); // now stale but not expired

    let refreshResolves;
    const refreshDone = new Promise((res) => { refreshResolves = res; });
    let fetchCount = 0;
    const refresh = async () => {
        fetchCount++;
        await refreshDone; // give us time to inspect the cache state
        return 'new';
    };

    const start = Date.now();
    const v = await cache.getOrRefresh('k', 60, 300, refresh);
    const elapsed = Date.now() - start;
    assert.equal(v, 'old', 'must return STALE value, not wait for refresh');
    assert.ok(elapsed < 100, `stale path must return synchronously, took ${elapsed}ms`);
    assert.equal(fetchCount, 1, 'refresh should have started');

    // let bg refresh resolve, then assert the next read is the fresh value.
    refreshResolves('new');
    await wait(50); // let promise chain settle
    const v2 = await cache.getOrRefresh('k', 60, 300, refresh);
    assert.equal(v2, 'new', 'after bg refresh, fresh value must be served');
});

// 5) getOrRefresh: stampede protection
await test('getOrRefresh: 100 parallel misses fire refresh ONCE', async () => {
    let fetchCount = 0;
    const refresh = async () => {
        fetchCount++;
        await wait(50); // simulate slow DB
        return `value-${fetchCount}`;
    };
    const results = await Promise.all(
        Array.from({ length: 100 }, () => cache.getOrRefresh('k', 60, 300, refresh)),
    );
    assert.equal(fetchCount, 1, `expected 1 refresh, got ${fetchCount} (stampede!)`);
    // All 100 callers received the same value.
    assert.ok(results.every((r) => r === 'value-1'), 'all callers must see the same value');
});

await test('getOrRefresh: parallel stale reads share ONE background refresh', async () => {
    cache.setWithStale('k', 'old', 1, 60);
    await wait(1200);

    let fetchCount = 0;
    const refresh = async () => {
        fetchCount++;
        await wait(80);
        return 'new';
    };
    // 50 parallel callers — all should immediately return 'old', but only one bg
    // refresh should run.
    const results = await Promise.all(
        Array.from({ length: 50 }, () => cache.getOrRefresh('k', 60, 300, refresh)),
    );
    assert.ok(results.every((r) => r === 'old'), 'parallel stale reads must all return old value');
    await wait(150); // let bg refresh complete
    assert.equal(fetchCount, 1, `expected exactly 1 bg refresh, got ${fetchCount}`);
});

// 6) Failure paths
await test('getOrRefresh: refresh throws on cold miss → error bubbles', async () => {
    let threw = false;
    try {
        await cache.getOrRefresh('k', 60, 300, async () => { throw new Error('db is down'); });
    } catch (err) {
        threw = true;
        assert.match(err.message, /db is down/);
    }
    assert.ok(threw, 'caller MUST see the error when no stale value exists');
});

await test('getOrRefresh: bg refresh throws on stale entry → stale value still returned', async () => {
    cache.setWithStale('k', 'old', 1, 60);
    await wait(1200);
    const v = await cache.getOrRefresh('k', 60, 300, async () => { throw new Error('db down'); });
    assert.equal(v, 'old', 'caller must still get stale data when refresh fails');
    // Wait for bg promise to settle; cache should still hold the stale entry.
    await wait(50);
    const stillThere = cache.getStale('k');
    assert.equal(stillThere?.value, 'old', 'stale entry must survive a failed bg refresh');
});

// 7) Invalidation
await test('del removes the key', () => {
    cache.set('k', 'v', 60);
    assert.equal(cache.get('k'), 'v');
    cache.del('k');
    assert.equal(cache.get('k'), undefined);
    assert.equal(cache.getStale('k'), undefined);
});

await test('delByPrefix removes only matching keys', () => {
    cache.set('products:list', 'a', 60);
    cache.set('products:single:1', 'b', 60);
    cache.set('categories:list', 'c', 60);
    cache.delByPrefix('products:');
    assert.equal(cache.get('products:list'), undefined);
    assert.equal(cache.get('products:single:1'), undefined);
    assert.equal(cache.get('categories:list'), 'c', 'unrelated key must survive');
});

await test('del clears any in-flight refresh promise (no zombie writes after delete)', async () => {
    // Start a slow refresh, delete the key mid-flight, then start a SECOND
    // refresh. The second call must not be coalesced with the first stale
    // one — del() must wipe the inFlight entry so the new caller's refresh
    // actually runs.
    let firstResolves;
    let firstStarted;
    const firstStartedSignal = new Promise((res) => { firstStarted = res; });
    let firstRunCount = 0;
    let secondRunCount = 0;

    const firstRefresh = () => new Promise((res) => {
        firstRunCount++;
        firstResolves = res;
        firstStarted();
    });
    const pending = cache.getOrRefresh('k', 60, 300, firstRefresh);
    await firstStartedSignal; // make sure firstRefresh() has been invoked

    // Nuke the key while a refresh is in flight.
    cache.del('k');

    // Now another caller comes in — should NOT reuse the old promise.
    const pendingTwo = cache.getOrRefresh('k', 60, 300, async () => {
        secondRunCount++;
        return 'second';
    });

    // Resolve the first refresh so it doesn't leak.
    firstResolves('first');
    const v1 = await pending;
    const v2 = await pendingTwo;

    assert.equal(v1, 'first', 'original caller still gets its value');
    assert.equal(v2, 'second', 'second caller must run its OWN refresh, not reuse first');
    assert.equal(firstRunCount, 1);
    assert.equal(secondRunCount, 1, 'del() must clear inFlight so new refresh runs');
});

await test('flush empties the cache', () => {
    cache.set('a', 1, 60);
    cache.set('b', 2, 60);
    cache.flush();
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('b'), undefined);
});

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
    process.exit(1);
}
