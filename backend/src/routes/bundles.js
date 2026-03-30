import express from 'express';
import prisma from '../lib/prisma.js';
import cache from '../lib/cache.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

const bundleInclude = {
    items: {
        include: {
            product: {
                select: {
                    id: true, title: true, price: true, images: true, stock: true, category: true, rating: true,
                    hasVariants: true,
                    variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1, select: { id: true, name: true, price: true, stock: true, combination: true } }
                }
            },
            serviceType: {
                select: { id: true, title: true, description: true, icon: true, price: true }
            }
        }
    }
};

function isActiveBundle(bundle) {
    const now = new Date();
    if (!bundle.isActive) return false;
    if (bundle.startDate && now < bundle.startDate) return false;
    if (bundle.endDate && now > bundle.endDate) return false;
    return true;
}

function enrichBundle(bundle) {
    const itemTotal = bundle.items.reduce((sum, bi) => {
        if (bi.itemType === 'product' && bi.product) {
            return sum + bi.product.price * bi.quantity;
        }
        if (bi.itemType === 'service' && bi.serviceType?.price) {
            return sum + bi.serviceType.price * bi.quantity;
        }
        return sum;
    }, 0);
    return {
        ...bundle,
        itemTotal,
        savings: Math.max(0, itemTotal - bundle.bundlePrice),
        savingsPercent: itemTotal > 0 ? Math.round(((itemTotal - bundle.bundlePrice) / itemTotal) * 100) : 0,
    };
}

// GET /api/bundles — list active bundles, optional ?displayOn=home filter
router.get('/', async (req, res) => {
    try {
        const { displayOn } = req.query;
        const cacheKey = `bundles:list:${displayOn || 'all'}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const bundles = await prisma.bundle.findMany({
            where: { isActive: true },
            include: bundleInclude,
            orderBy: { createdAt: 'desc' },
        });

        let active = bundles.filter(isActiveBundle);
        if (displayOn) {
            active = active.filter(b => b.displayOn.includes(displayOn));
        }

        const result = active.map(enrichBundle);
        cache.set(cacheKey, result, 120);
        res.json(result);
    } catch (error) {
        console.error('Get bundles error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/bundles/admin — all bundles for admin (including inactive)
router.get('/admin', protect, adminOnly, async (req, res) => {
    try {
        const bundles = await prisma.bundle.findMany({
            include: bundleInclude,
            orderBy: { createdAt: 'desc' },
        });
        res.json(bundles.map(enrichBundle));
    } catch (error) {
        console.error('Get admin bundles error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/bundles/:id — single bundle
router.get('/:id', async (req, res) => {
    try {
        const bundle = await prisma.bundle.findUnique({
            where: { id: parseInt(req.params.id) },
            include: bundleInclude,
        });
        if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
        res.json(enrichBundle(bundle));
    } catch (error) {
        console.error('Get bundle error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/bundles/for-product/:productId — bundles containing a product
router.get('/for-product/:productId', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const cacheKey = `bundles:product:${productId}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const bundles = await prisma.bundle.findMany({
            where: {
                isActive: true,
                items: { some: { productId } },
            },
            include: bundleInclude,
        });

        const result = bundles.filter(isActiveBundle).map(enrichBundle);
        cache.set(cacheKey, result, 120);
        res.json(result);
    } catch (error) {
        console.error('Get bundles for product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/bundles — create bundle (admin)
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { name, description, image, bundlePrice, displayOn, startDate, endDate, items } = req.body;

        if (!name || bundlePrice === undefined) {
            return res.status(400).json({ error: 'Name and bundlePrice are required' });
        }

        const bundle = await prisma.bundle.create({
            data: {
                name,
                description: description || null,
                image: image || null,
                bundlePrice: parseFloat(bundlePrice),
                displayOn: Array.isArray(displayOn) ? displayOn : ['home'],
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                items: {
                    create: (items || []).map(item => ({
                        productId: item.productId ? parseInt(item.productId) : null,
                        variantId: item.variantId ? parseInt(item.variantId) : null,
                        quantity: parseInt(item.quantity) || 1,
                        serviceTypeId: item.serviceTypeId ? parseInt(item.serviceTypeId) : null,
                        courseId: item.courseId ? parseInt(item.courseId) : null,
                        itemType: item.itemType || 'product',
                    })),
                },
            },
            include: bundleInclude,
        });

        cache.delByPrefix('bundles:');
        logAudit({
            userId: req.user.id, action: 'CREATE', entity: 'Bundle', entityId: bundle.id,
            details: { after: { name: bundle.name, bundlePrice: bundle.bundlePrice } },
            req,
        });

        res.status(201).json(enrichBundle(bundle));
    } catch (error) {
        console.error('Create bundle error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/bundles/:id — update bundle (admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const bundleId = parseInt(req.params.id);
        const { name, description, image, bundlePrice, isActive, displayOn, startDate, endDate, items } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (image !== undefined) updateData.image = image;
        if (bundlePrice !== undefined) updateData.bundlePrice = parseFloat(bundlePrice);
        if (isActive !== undefined) updateData.isActive = isActive;
        if (displayOn !== undefined) updateData.displayOn = displayOn;
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

        const bundle = await prisma.bundle.update({
            where: { id: bundleId },
            data: updateData,
        });

        if (Array.isArray(items)) {
            await prisma.bundleItem.deleteMany({ where: { bundleId } });
            await prisma.bundleItem.createMany({
                data: items.map(item => ({
                    bundleId,
                    productId: item.productId ? parseInt(item.productId) : null,
                    variantId: item.variantId ? parseInt(item.variantId) : null,
                    quantity: parseInt(item.quantity) || 1,
                    serviceTypeId: item.serviceTypeId ? parseInt(item.serviceTypeId) : null,
                    courseId: item.courseId ? parseInt(item.courseId) : null,
                    itemType: item.itemType || 'product',
                })),
            });
        }

        const updated = await prisma.bundle.findUnique({
            where: { id: bundleId },
            include: bundleInclude,
        });

        cache.delByPrefix('bundles:');
        logAudit({
            userId: req.user.id, action: 'UPDATE', entity: 'Bundle', entityId: bundleId,
            details: { changedFields: Object.keys(updateData) },
            req,
        });

        res.json(enrichBundle(updated));
    } catch (error) {
        console.error('Update bundle error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/bundles/:id — soft delete (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const bundleId = parseInt(req.params.id);
        await prisma.bundle.update({
            where: { id: bundleId },
            data: { isActive: false },
        });

        cache.delByPrefix('bundles:');
        logAudit({
            userId: req.user.id, action: 'DELETE', entity: 'Bundle', entityId: bundleId,
            details: { meta: 'Soft-deleted (isActive → false)' },
            req,
        });

        res.json({ message: 'Bundle deleted' });
    } catch (error) {
        console.error('Delete bundle error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
