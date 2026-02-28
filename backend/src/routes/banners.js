import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// GET /api/banners — public, returns only active banners sorted by displayOrder
router.get('/', async (req, res) => {
    try {
        const banners = await prisma.banner.findMany({
            where: { active: true },
            orderBy: { displayOrder: 'asc' },
        });
        res.json(banners);
    } catch (error) {
        console.error('Get public banners error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
