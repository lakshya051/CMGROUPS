import express from 'express';
import prisma from '../lib/prisma.js';
import cache from '../lib/cache.js';

const router = express.Router();

// GET /api/banners — public, returns only active banners sorted by displayOrder
router.get('/', async (req, res) => {
    try {
        const cached = cache.get('banners:active');
        if (cached) return res.json(cached);

        const banners = await prisma.banner.findMany({
            where: { active: true },
            orderBy: { displayOrder: 'asc' },
        });
        cache.set('banners:active', banners, 120);
        res.json(banners);
    } catch (error) {
        console.error('Get public banners error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
