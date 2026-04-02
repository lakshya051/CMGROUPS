import express from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma.js';
import { protect, adminOnly, optionalProtect } from '../middleware/auth.js';
import { assertCouponUserEligibility } from '../utils/couponUserRules.js';

const validateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many coupon validation attempts. Please try again in a minute.' }
});

const router = express.Router();
const DISCOUNT_TYPES = ['percent', 'fixed'];
const APPLICABLE_TO_VALUES = ['all', 'products', 'bundles', 'services', 'courses'];

const parseOptionalNumber = (value, fieldName, { integer = false, min = 0 } = {}) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
        throw new Error(`${fieldName} must be a valid ${integer ? 'integer' : 'number'}`);
    }

    if (integer && !Number.isInteger(parsed)) {
        throw new Error(`${fieldName} must be a whole number`);
    }

    if (parsed < min) {
        throw new Error(`${fieldName} must be at least ${min}`);
    }

    return parsed;
};

const parseOptionalDate = (value, fieldName) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${fieldName} must be a valid date`);
    }

    return parsed;
};

const buildCouponData = (body, { partial = false } = {}) => {
    const data = {};

    if (!partial || body.code !== undefined) {
        const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
        if (!code) {
            throw new Error('Coupon code is required');
        }
        data.code = code;
    }

    if (!partial || body.discountType !== undefined) {
        if (!DISCOUNT_TYPES.includes(body.discountType)) {
            throw new Error('discountType must be "percent" or "fixed"');
        }
        data.discountType = body.discountType;
    }

    if (!partial || body.value !== undefined) {
        const value = Number(body.value);
        if (Number.isNaN(value) || value <= 0) {
            throw new Error('value must be greater than 0');
        }
        data.value = value;
    }

    const minOrderAmount = parseOptionalNumber(body.minOrderAmount, 'minOrderAmount');
    if (minOrderAmount !== undefined) data.minOrderAmount = minOrderAmount;

    const maxUses = parseOptionalNumber(body.maxUses, 'maxUses', { integer: true, min: 1 });
    if (maxUses !== undefined) data.maxUses = maxUses;

    const expiresAt = parseOptionalDate(body.expiresAt, 'expiresAt');
    if (expiresAt !== undefined) data.expiresAt = expiresAt;

    if (body.active !== undefined) {
        if (typeof body.active !== 'boolean') {
            throw new Error('active must be a boolean');
        }
        data.active = body.active;
    }

    if (body.applicableTo !== undefined) {
        if (!APPLICABLE_TO_VALUES.includes(body.applicableTo)) {
            throw new Error(`applicableTo must be one of: ${APPLICABLE_TO_VALUES.join(', ')}`);
        }
        data.applicableTo = body.applicableTo;
    }

    if (!partial || body.firstOrderOnly !== undefined) {
        if (body.firstOrderOnly !== undefined && typeof body.firstOrderOnly !== 'boolean') {
            throw new Error('firstOrderOnly must be a boolean');
        }
        if (body.firstOrderOnly !== undefined) data.firstOrderOnly = body.firstOrderOnly;
    }

    const maxUsesPerUser = parseOptionalNumber(body.maxUsesPerUser, 'maxUsesPerUser', { integer: true, min: 1 });
    if (maxUsesPerUser !== undefined) data.maxUsesPerUser = maxUsesPerUser;

    return data;
};

// POST /api/coupons/validate (optional auth — Bearer token enables first-order / per-user checks)
router.post('/validate', validateLimiter, optionalProtect, async (req, res) => {
    try {
        const { code, cartItems, orderSubtotal } = req.body;

        if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Coupon code is required' });

        const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

        if (!coupon || !coupon.active) {
            return res.status(400).json({ error: 'Invalid or inactive coupon' });
        }

        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Coupon has expired' });
        }

        if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
            return res.status(400).json({ error: 'Coupon usage limit reached' });
        }

        const needsUserForRules = coupon.firstOrderOnly || coupon.maxUsesPerUser != null;
        if (needsUserForRules && !req.user) {
            return res.status(400).json({ error: 'You must be signed in to use this coupon.' });
        }
        if (needsUserForRules && req.user) {
            try {
                await assertCouponUserEligibility(prisma, coupon, req.user.id);
            } catch (e) {
                if (e.isCouponUserRule) {
                    return res.status(400).json({ error: e.message });
                }
                throw e;
            }
        }

        if (coupon.minOrderAmount != null && orderSubtotal !== undefined && orderSubtotal !== null && orderSubtotal !== '') {
            const sub = Number(orderSubtotal);
            if (Number.isFinite(sub) && sub < coupon.minOrderAmount) {
                return res.status(400).json({
                    error: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`,
                });
            }
        }

        if (coupon.applicableTo !== 'all' && Array.isArray(cartItems) && cartItems.length > 0) {
            const hasApplicableItem = cartItems.some(item => {
                if (coupon.applicableTo === 'bundles') return !!item.bundleId;
                if (coupon.applicableTo === 'products') return !!item.productId && !item.bundleId;
                if (coupon.applicableTo === 'services') return !!item.serviceTypeId;
                if (coupon.applicableTo === 'courses') return !!item.courseId;
                return false;
            });
            if (!hasApplicableItem) {
                return res.status(400).json({
                    error: `This coupon is only applicable to ${coupon.applicableTo}. Add eligible items to your cart.`,
                });
            }
        }

        res.json({
            valid: true,
            discountType: coupon.discountType,
            value: coupon.value,
            code: coupon.code,
            minOrderAmount: coupon.minOrderAmount,
            applicableTo: coupon.applicableTo,
            firstOrderOnly: coupon.firstOrderOnly,
            maxUsesPerUser: coupon.maxUsesPerUser,
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
        let couponData;
        try {
            couponData = buildCouponData(req.body);
        } catch (validationError) {
            return res.status(400).json({ error: validationError.message });
        }

        const existing = await prisma.coupon.findUnique({ where: { code: couponData.code } });
        if (existing) {
            return res.status(400).json({ error: 'Coupon code already exists' });
        }

        const coupon = await prisma.coupon.create({
            data: {
                ...couponData,
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
        const couponId = Number(req.params.id);
        if (!Number.isInteger(couponId)) {
            return res.status(400).json({ error: 'Invalid coupon id' });
        }

        let updateData;
        try {
            updateData = buildCouponData(req.body, { partial: true });
        } catch (validationError) {
            return res.status(400).json({ error: validationError.message });
        }

        if (updateData.code) {
            const existing = await prisma.coupon.findUnique({ where: { code: updateData.code } });
            if (existing && existing.id !== couponId) {
                return res.status(400).json({ error: 'Coupon code already exists' });
            }
        }

        const coupon = await prisma.coupon.update({
            where: { id: couponId },
            data: updateData
        });

        res.json(coupon);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Coupon not found' });
        }
        console.error('Update coupon error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/coupons/:id (Admin - delete coupon)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const couponId = parseInt(req.params.id);
        if (Number.isNaN(couponId)) return res.status(400).json({ error: 'Invalid coupon ID' });
        await prisma.coupon.delete({ where: { id: couponId } });
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
