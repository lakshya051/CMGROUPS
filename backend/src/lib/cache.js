import NodeCache from 'node-cache';

const cache = new NodeCache({
    stdTTL: 60,
    checkperiod: 120,
    useClones: false,
});

export default {
    get(key) {
        return cache.get(key);
    },

    set(key, value, ttl) {
        if (ttl !== undefined) {
            cache.set(key, value, ttl);
        } else {
            cache.set(key, value);
        }
    },

    del(key) {
        cache.del(key);
    },

    delByPrefix(prefix) {
        const keys = cache.keys().filter(k => k.startsWith(prefix));
        if (keys.length > 0) {
            cache.del(keys);
        }
    },

    flush() {
        cache.flushAll();
    },
};
