import express from 'express';
import prisma, { isDatabaseUnavailable } from '../lib/prisma.js';
import cache from '../lib/cache.js';

const router = express.Router();

const CACHE_KEY = 'banners:active';
const FRESH_TTL = 120;
const STALE_TTL = 600;

router.get('/', async (req, res) => {
    try {
        const banners = await cache.getOrRefresh(CACHE_KEY, FRESH_TTL, STALE_TTL, () =>
            prisma.banner.findMany({
                where: { active: true },
                orderBy: { displayOrder: 'asc' },
            }),
        );
        res.json(banners);
    } catch (error) {
        // Public read endpoint — when the DB is unavailable and we have nothing
        // cached, send an empty array rather than a 500 so the homepage stays
        // usable. Real bugs (validation, schema, etc.) still surface as 500.
        if (isDatabaseUnavailable(error)) return res.json([]);
        console.error('Get public banners error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
