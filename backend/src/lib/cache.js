import NodeCache from 'node-cache';
import { cacheHitsTotal, cacheMissesTotal } from './metrics.js';

// Two-layer TTL: each entry has a `freshUntil` timestamp inside the value, while
// node-cache itself holds the entry for `freshTtl + staleTtl`. Handlers that use
// `getStale()` can serve a stale entry instantly while triggering a background
// refresh, so a single slow Postgres call no longer pins every concurrent request
// behind it (cache stampede + cold-start cliff fix).
const cache = new NodeCache({
    stdTTL: 60,
    checkperiod: 120,
    useClones: true,
});

const DEFAULT_FRESH_TTL = 60;
const DEFAULT_STALE_TTL = 300;

const wrap = (value, freshTtl) => ({
    value,
    freshUntil: Date.now() + freshTtl * 1000,
});

const isWrapped = (entry) =>
    entry && typeof entry === 'object' && 'value' in entry && 'freshUntil' in entry;

// Coalesce concurrent refreshes for the same key. Without this, N parallel
// requests to a route with a missing cache entry all fire the underlying DB
// query at once (cache stampede). With this, they share one query.
const inFlight = new Map();

export default {
    /** Returns the stored value if present and fresh; undefined otherwise.
     *  Stays backwards-compatible with the old plain `set(key, value, ttl)` callers. */
    get(key) {
        const entry = cache.get(key);
        if (entry === undefined) return undefined;
        if (!isWrapped(entry)) return entry;
        if (Date.now() > entry.freshUntil) return undefined;
        return entry.value;
    },

    /** Returns `{value, isStale}` if anything is in the cache (fresh or stale),
     *  or `undefined` if there is no entry at all. Use this for stale-while-revalidate:
     *  if `isStale` is true, return value to the user immediately AND fire a refresh. */
    getStale(key) {
        const entry = cache.get(key);
        if (entry === undefined) return undefined;
        if (!isWrapped(entry)) return { value: entry, isStale: false };
        return {
            value: entry.value,
            isStale: Date.now() > entry.freshUntil,
        };
    },

    /** Plain set. Stores a wrapped entry with `freshUntil = now + ttl` and a
     *  node-cache TTL of `ttl + DEFAULT_STALE_TTL` so the entry is still
     *  available as stale data after expiry. */
    set(key, value, ttl) {
        const freshTtl = ttl !== undefined ? ttl : DEFAULT_FRESH_TTL;
        cache.set(key, wrap(value, freshTtl), freshTtl + DEFAULT_STALE_TTL);
    },

    /** Like `set()` but with explicit stale window. After `freshTtl` seconds the
     *  value is served stale; after `freshTtl + staleTtl` it is dropped entirely. */
    setWithStale(key, value, freshTtl = DEFAULT_FRESH_TTL, staleTtl = DEFAULT_STALE_TTL) {
        cache.set(key, wrap(value, freshTtl), freshTtl + staleTtl);
    },

    del(key) {
        cache.del(key);
        inFlight.delete(key);
    },

    delByPrefix(prefix) {
        const keys = cache.keys().filter(k => k.startsWith(prefix));
        if (keys.length > 0) {
            cache.del(keys);
            for (const k of keys) inFlight.delete(k);
        }
    },

    /** Bust one prefix AND every cache that depends on it.
     *
     *  Two dependency edges are baked in:
     *    • Every home-bootstrap source family (banners/categories/products/...)
     *      → must also bust `home:` because the homepage aggregates them.
     *    • `products:` → must also bust `coPurchased:` because the per-product
     *      "frequently bought together" cache references products by id and
     *      goes stale the moment a product is renamed, hidden, or deleted.
     *
     *  Use this from every admin write handler. The static audit in
     *  loadtest/validate-cache-invalidation.mjs enforces that any caller
     *  invalidating one of these prefixes also invalidates the dependents,
     *  so dropping a `delByPrefix` here will fail CI. */
    bustWithHome(prefix) {
        this.delByPrefix(prefix);
        this.delByPrefix('home:');
        if (prefix === 'products:') this.delByPrefix('coPurchased:');
    },

    flush() {
        cache.flushAll();
        inFlight.clear();
    },

    /** Stale-while-revalidate primitive used by every public read route.
     *
     *   1. Fresh entry → return it.
     *   2. Stale entry → return it AND fire `refreshFn()` in the background.
     *   3. No entry    → await `refreshFn()`, cache the result, return it.
     *   4. `refreshFn()` throws AND we have a stale entry → return the stale entry.
     *   5. `refreshFn()` throws AND no entry → re-throw, let the caller handle it.
     *
     * Concurrent calls for the same key share a single in-flight refresh
     * promise (no cache stampede). */
    async getOrRefresh(key, freshTtl, staleTtl, refreshFn) {
        // Metrics labels use the cache-key prefix (e.g. `products:`) rather than
        // the full key so we don't blow up cardinality on per-query keys like
        // `products:{"limit":20,"page":1}`.
        const labelKey = key.split(':')[0] || 'misc';

        const fresh = this.get(key);
        if (fresh !== undefined) {
            cacheHitsTotal.inc({ key: labelKey, freshness: 'fresh' });
            return fresh;
        }

        const stale = this.getStale(key);
        if (stale && stale.isStale) {
            cacheHitsTotal.inc({ key: labelKey, freshness: 'stale' });
            if (!inFlight.has(key)) {
                const p = Promise.resolve()
                    .then(refreshFn)
                    .then((value) => {
                        this.setWithStale(key, value, freshTtl, staleTtl);
                        return value;
                    })
                    .catch((err) => {
                        // Swallow — caller already has a stale value to return.
                        if (process.env.NODE_ENV !== 'test') {
                            console.warn(`[cache] background refresh failed for ${key}:`, err.message);
                        }
                    })
                    .finally(() => { inFlight.delete(key); });
                inFlight.set(key, p);
            }
            return stale.value;
        }

        let pending = inFlight.get(key);
        if (!pending) {
            cacheMissesTotal.inc({ key: labelKey });
            pending = Promise.resolve()
                .then(refreshFn)
                .then((value) => {
                    this.setWithStale(key, value, freshTtl, staleTtl);
                    return value;
                })
                .finally(() => { inFlight.delete(key); });
            inFlight.set(key, pending);
        }
        try {
            return await pending;
        } catch (err) {
            const fallback = this.getStale(key);
            if (fallback) return fallback.value;
            throw err;
        }
    },
};
