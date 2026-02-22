/**
 * src/lib/cache.js
 * Lightweight in-memory cache powered by node-cache.
 *
 * Default TTL: 60 seconds — perfect for product/course list responses.
 * On mutation (create/update/delete), call cache.del(key) or cache.delByPrefix(prefix).
 */

const NodeCache = require('node-cache');

const cache = new NodeCache({
    stdTTL: 60,          // default time-to-live per key (seconds)
    checkperiod: 120,    // automatic delete check every 2 minutes
    useClones: false,    // skip deep-cloning for performance (we never mutate cached data)
});

module.exports = {
    /**
     * Get a cached value.
     * @param {string} key
     * @returns {any|undefined}
     */
    get(key) {
        return cache.get(key);
    },

    /**
     * Store a value in the cache.
     * @param {string} key
     * @param {any} value
     * @param {number} [ttl] - override TTL in seconds (optional)
     */
    set(key, value, ttl) {
        if (ttl !== undefined) {
            cache.set(key, value, ttl);
        } else {
            cache.set(key, value);
        }
    },

    /**
     * Delete a specific key.
     * @param {string} key
     */
    del(key) {
        cache.del(key);
    },

    /**
     * Delete all keys that start with the given prefix.
     * Use this to invalidate an entire resource namespace (e.g. "products:").
     * @param {string} prefix
     */
    delByPrefix(prefix) {
        const keys = cache.keys().filter(k => k.startsWith(prefix));
        if (keys.length > 0) {
            cache.del(keys);
        }
    },

    /**
     * Flush the entire cache.
     */
    flush() {
        cache.flushAll();
    },
};
