import prisma from './prisma.js';
import cache from './cache.js';

const CACHE_KEY = 'featureFlags:current';
const FRESH_TTL = 30;
const STALE_TTL = 600;

const DEFAULTS = Object.freeze({
    bundlesEnabled: false,
});

const PUBLIC_KEYS = Object.freeze(['bundlesEnabled']);

const toPublicShape = (row) => ({
    bundlesEnabled: Boolean(row?.bundlesEnabled ?? DEFAULTS.bundlesEnabled),
});

const ensureRow = async () => {
    if (!prisma.featureFlags || typeof prisma.featureFlags.findFirst !== 'function') {
        return { ...DEFAULTS };
    }
    let row = await prisma.featureFlags.findFirst();
    if (!row) {
        try {
            row = await prisma.featureFlags.create({ data: {} });
        } catch {
            row = await prisma.featureFlags.findFirst();
        }
    }
    return row || { ...DEFAULTS };
};

const fetchFresh = async () => {
    const row = await ensureRow();
    return toPublicShape(row);
};

export const getFeatureFlags = async () => {
    try {
        return await cache.getOrRefresh(CACHE_KEY, FRESH_TTL, STALE_TTL, fetchFresh);
    } catch {
        return { ...DEFAULTS };
    }
};

// Cheap synchronous check used inside hot code paths that already have a flag
// snapshot. Callers that don't have one should `await getFeatureFlags()` first.
export const isBundlesEnabled = (flags) =>
    Boolean(flags?.bundlesEnabled ?? DEFAULTS.bundlesEnabled);

export const bustFeatureFlagsCache = () => {
    cache.del(CACHE_KEY);
};

export const getDefaultFeatureFlags = () => ({ ...DEFAULTS });

export const PUBLIC_FEATURE_FLAG_KEYS = PUBLIC_KEYS;

export default { getFeatureFlags, isBundlesEnabled, bustFeatureFlagsCache, getDefaultFeatureFlags };
