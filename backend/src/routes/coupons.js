const express = require('express');
const prisma = require('../lib/prisma');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/coupons/validate (Public - validate a coupon code)
router.post('/validate', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) return res.status(400).json({ error: 'Coupon code is required' });

        const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

        if (!coupon || !coupon.active) {
            return res.status(400).json({ error: 'Invalid or expired coupon' });
        }

        res.json({
            valid: true,
            discountType: coupon.discountType,
            value: coupon.value,
            code: coupon.code
        });
    } catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============ ADMIN COUPON MANAGEMENT ============

// GET /api/coupons (Admin - list all coupons)
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const coupons = await prisma.coupon.findMany({ orderBy: { id: 'desc' } });
        res.json(coupons);
    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/coupons (Admin - create coupon)
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { code, discountType, value } = req.body;

        if (!code || !discountType || value === undefined) {
            return res.status(400).json({ error: 'Code, discountType, and value are required' });
        }

        if (!['percent', 'fixed'].includes(discountType)) {
            return res.status(400).json({ error: 'discountType must be "percent" or "fixed"' });
        }

        const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (existing) {
            return res.status(400).json({ error: 'Coupon code already exists' });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                discountType,
                value: parseFloat(value),
                active: true
            }
        });

        res.status(201).json(coupon);
    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/coupons/:id (Admin - toggle active / update)
router.patch('/:id', protect, adminOnly, async (req, res) => {
    try {
        const { active, value, discountType } = req.body;
        const updateData = {};

        if (active !== undefined) updateData.active = active;
        if (value !== undefined) updateData.value = parseFloat(value);
        if (discountType) updateData.discountType = discountType;

        const coupon = await prisma.coupon.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });

        res.json(coupon);
    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/coupons/:id (Admin - delete coupon)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        await prisma.coupon.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
