import express from 'express';
import prisma, { isDatabaseUnavailable } from '../lib/prisma.js';
import cache from '../lib/cache.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';
import { getFeatureFlags } from '../lib/featureFlags.js';

const router = express.Router();

// Gate every public (non-admin) bundle read behind the bundlesEnabled flag.
// When the feature is off, list endpoints return [] and detail endpoints
// return 404 so customers can't reach bundle data through cached client code
// or direct URLs even if the UI happens to show stale links. Admin routes
// still operate normally — the admin needs to manage bundles and re-enable
// them later. Mount before any specific GET route so the gate runs first.
router.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();
    // Anything under /admin (e.g. /admin, /admin/123) is admin-only and is
    // protected by `protect, adminOnly` further down. Let it through so the
    // admin UI keeps working when the public surface is off.
    const isAdminPath = req.path === '/admin' || req.path.startsWith('/admin/');
    if (isAdminPath) return next();

    try {
        const flags = await getFeatureFlags();
        if (flags.bundlesEnabled) return next();
    } catch {
        // If the flag read fails for any reason, default to "off" so we never
        // accidentally leak bundle data we promised was hidden.
        return res.json([]);
    }

    // Disabled — return a shape the client knows how to render as empty.
    if (req.path === '/' || req.path === '/suggestions' || req.path === '/analytics') {
        return res.json([]);
    }
    return res.status(404).json({ error: 'Not found' });
});

const bundleInclude = {
    items: {
        orderBy: { position: 'asc' },
        include: {
            product: {
                select: {
                    id: true, title: true, price: true, images: true, stock: true, category: true, rating: true,
                    hasVariants: true,
                    variants: { where: { isActive: true }, orderBy: { price: 'asc' }, select: { id: true, name: true, price: true, stock: true, combination: true } }
                }
            },
            serviceType: {
                select: { id: true, title: true, description: true, icon: true, price: true }
            },
            course: {
                select: { id: true, title: true, description: true, thumbnail: true, durations: { select: { id: true, label: true, totalFee: true }, take: 1, orderBy: { totalFee: 'asc' } } }
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

function parseServicePrice(priceStr) {
    if (!priceStr) return 0;
    const digits = String(priceStr).replace(/[^0-9.]/g, '');
    return parseFloat(digits) || 0;
}

function enrichBundle(bundle) {
    const itemTotal = bundle.items.reduce((sum, bi) => {
        if (bi.itemType === 'product' && bi.product) {
            const variant = bi.variantId && bi.product.variants?.length > 0
                ? bi.product.variants.find(v => v.id === bi.variantId)
                : null;
            const unitPrice = variant ? variant.price : bi.product.price;
            return sum + unitPrice * bi.quantity;
        }
        if (bi.itemType === 'service' && bi.serviceType?.price) {
            return sum + parseServicePrice(bi.serviceType.price) * bi.quantity;
        }
        if (bi.itemType === 'course' && bi.course) {
            const courseFee = bi.course.durations?.[0]?.totalFee ?? 0;
            return sum + courseFee * bi.quantity;
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

        const result = await cache.getOrRefresh(cacheKey, 120, 600, async () => {
            const bundles = await prisma.bundle.findMany({
                where: { isActive: true },
                include: bundleInclude,
                orderBy: { createdAt: 'desc' },
            });
            let active = bundles.filter(isActiveBundle);
            if (displayOn) {
                active = active.filter(b => Array.isArray(b.displayOn) && b.displayOn.includes(displayOn));
            }
            return active.map(enrichBundle);
        });

        res.json(result);
    } catch (error) {
        if (isDatabaseUnavailable(error)) return res.json([]);
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

// GET /api/bundles/suggestions — suggest bundles based on cart product IDs
router.get('/suggestions', async (req, res) => {
    try {
        const productIdsParam = req.query.productIds;
        if (!productIdsParam) return res.json([]);

        const productIds = productIdsParam.split(',').map(Number).filter(Number.isFinite);
        if (productIds.length === 0) return res.json([]);

        const bundles = await prisma.bundle.findMany({
            where: {
                isActive: true,
                items: { some: { productId: { in: productIds }, itemType: 'product' } },
            },
            include: bundleInclude,
        });

        const suggestions = bundles.filter(isActiveBundle).map(bundle => {
            const bundleProductIds = bundle.items.filter(bi => bi.itemType === 'product' && bi.productId).map(bi => bi.productId);
            const owned = bundleProductIds.filter(pid => productIds.includes(pid));
            const missing = bundleProductIds.filter(pid => !productIds.includes(pid));
            if (missing.length === 0 || owned.length === 0) return null;
            return { ...enrichBundle(bundle), ownedCount: owned.length, totalCount: bundleProductIds.length, missingProductIds: missing };
        }).filter(Boolean).sort((a, b) => (b.ownedCount / b.totalCount) - (a.ownedCount / a.totalCount));

        res.json(suggestions.slice(0, 3));
    } catch (error) {
        console.error('Get bundle suggestions error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/bundles/analytics — bundle performance stats (admin)
router.get('/analytics', protect, adminOnly, async (req, res) => {
    try {
        const bundleOrderItems = await prisma.orderItem.groupBy({
            by: ['bundleId'],
            where: { bundleId: { not: null } },
            _count: { id: true },
            _sum: { price: true, quantity: true },
        });

        const templateOrderItems = await prisma.orderItem.groupBy({
            by: ['bundleTemplateId'],
            where: { bundleTemplateId: { not: null } },
            _count: { id: true },
            _sum: { price: true, quantity: true },
        });

        const bundleIds = bundleOrderItems.map(b => b.bundleId).filter(Number.isFinite);
        const templateIds = templateOrderItems.map(t => t.bundleTemplateId).filter(Number.isFinite);

        const [bundles, templates] = await Promise.all([
            bundleIds.length > 0 ? prisma.bundle.findMany({ where: { id: { in: bundleIds } }, select: { id: true, name: true, bundlePrice: true, image: true } }) : [],
            templateIds.length > 0 ? prisma.bundleTemplate.findMany({ where: { id: { in: templateIds } }, select: { id: true, name: true, discount: true, image: true } }) : [],
        ]);

        const bundleMap = Object.fromEntries(bundles.map(b => [b.id, b]));
        const templateMap = Object.fromEntries(templates.map(t => [t.id, t]));

        const fixedBundleStats = bundleOrderItems.map(row => ({
            type: 'fixed',
            bundleId: row.bundleId,
            name: bundleMap[row.bundleId]?.name || `Bundle #${row.bundleId}`,
            image: bundleMap[row.bundleId]?.image || null,
            unitsSold: row._sum.quantity || 0,
            lineItems: row._count.id,
            revenue: row._sum.price || 0,
        }));

        const templateStats = templateOrderItems.map(row => ({
            type: 'byob',
            templateId: row.bundleTemplateId,
            name: templateMap[row.bundleTemplateId]?.name || `Template #${row.bundleTemplateId}`,
            image: templateMap[row.bundleTemplateId]?.image || null,
            unitsSold: row._sum.quantity || 0,
            lineItems: row._count.id,
            revenue: row._sum.price || 0,
        }));

        res.json({ fixedBundles: fixedBundleStats, byobTemplates: templateStats });
    } catch (error) {
        console.error('Get bundle analytics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/bundles/by-slug/:slug — single bundle by slug
router.get('/by-slug/:slug', async (req, res) => {
    try {
        const bundle = await prisma.bundle.findUnique({
            where: { slug: req.params.slug },
            include: bundleInclude,
        });
        if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
        if (!isActiveBundle(bundle)) return res.status(404).json({ error: 'Bundle not found' });
        res.json(enrichBundle(bundle));
    } catch (error) {
        console.error('Get bundle by slug error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/bundles/:id — single bundle (only active/unexpired for public access)
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid bundle ID' });

        const bundle = await prisma.bundle.findUnique({
            where: { id },
            include: bundleInclude,
        });
        if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
        if (!isActiveBundle(bundle)) return res.status(404).json({ error: 'Bundle not found' });
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

function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// POST /api/bundles — create bundle (admin)
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { name, description, image, bundlePrice, displayOn, startDate, endDate, items, isGiftable, slug: customSlug } = req.body;

        if (!name || bundlePrice === undefined) {
            return res.status(400).json({ error: 'Name and bundlePrice are required' });
        }

        const baseSlug = customSlug || generateSlug(name);
        const itemsData = (items || []).map((item, idx) => ({
            productId: item.productId ? parseInt(item.productId) : null,
            variantId: item.variantId ? parseInt(item.variantId) : null,
            quantity: parseInt(item.quantity) || 1,
            serviceTypeId: item.serviceTypeId ? parseInt(item.serviceTypeId) : null,
            courseId: item.courseId ? parseInt(item.courseId) : null,
            itemType: item.itemType || 'product',
            position: idx,
        }));

        let bundle;
        for (let attempt = 0; attempt < 3; attempt++) {
            let slug = baseSlug;
            if (attempt > 0) {
                slug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            } else {
                const existing = await prisma.bundle.findUnique({ where: { slug } });
                if (existing) slug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            }
            try {
                bundle = await prisma.bundle.create({
                    data: {
                        name,
                        slug,
                        description: description || null,
                        image: image || null,
                        bundlePrice: parseFloat(bundlePrice),
                        isGiftable: isGiftable || false,
                        displayOn: Array.isArray(displayOn) ? displayOn : ['home'],
                        startDate: startDate ? new Date(startDate) : null,
                        endDate: endDate ? new Date(endDate) : null,
                        items: { create: itemsData },
                    },
                    include: bundleInclude,
                });
                break;
            } catch (err) {
                if (err.code === 'P2002' && attempt < 2) continue;
                throw err;
            }
        }

        cache.bustWithHome('bundles:');
        logAudit({
            userId: req.user.id, action: 'CREATE', entity: 'Bundle', entityId: bundle.id,
            details: { after: { name: bundle.name, bundlePrice: bundle.bundlePrice } },
            req,
        });

        res.status(201).json(enrichBundle(bundle));
    } catch (error) {
        console.error('Create bundle error:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'A bundle with this slug already exists. Please use a different name or custom slug.' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/bundles/:id — update bundle (admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const bundleId = parseInt(req.params.id);
        if (!Number.isFinite(bundleId)) return res.status(400).json({ error: 'Invalid bundle ID' });

        const { name, description, image, bundlePrice, isActive, isGiftable, displayOn, startDate, endDate, items } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (image !== undefined) updateData.image = image;
        if (bundlePrice !== undefined) updateData.bundlePrice = parseFloat(bundlePrice);
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isGiftable !== undefined) updateData.isGiftable = isGiftable;
        if (displayOn !== undefined) updateData.displayOn = displayOn;
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

        await prisma.$transaction(async (tx) => {
            await tx.bundle.update({
                where: { id: bundleId },
                data: updateData,
            });

            if (Array.isArray(items)) {
                await tx.bundleItem.deleteMany({ where: { bundleId } });
                await tx.bundleItem.createMany({
                    data: items.map((item, idx) => ({
                        bundleId,
                        productId: item.productId ? parseInt(item.productId) : null,
                        variantId: item.variantId ? parseInt(item.variantId) : null,
                        quantity: parseInt(item.quantity) || 1,
                        serviceTypeId: item.serviceTypeId ? parseInt(item.serviceTypeId) : null,
                        courseId: item.courseId ? parseInt(item.courseId) : null,
                        itemType: item.itemType || 'product',
                        position: idx,
                    })),
                });
            }
        });

        const updated = await prisma.bundle.findUnique({
            where: { id: bundleId },
            include: bundleInclude,
        });

        cache.bustWithHome('bundles:');
        logAudit({
            userId: req.user.id, action: 'UPDATE', entity: 'Bundle', entityId: bundleId,
            details: { changedFields: Object.keys(updateData) },
            req,
        });

        res.json(enrichBundle(updated));
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Bundle not found' });
        }
        console.error('Update bundle error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/bundles/:id — soft delete (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const bundleId = parseInt(req.params.id);
        if (!Number.isFinite(bundleId)) return res.status(400).json({ error: 'Invalid bundle ID' });

        const referencedByOrders = await prisma.orderItem.count({
            where: { bundleId },
        });

        if (referencedByOrders > 0) {
            await prisma.bundle.update({
                where: { id: bundleId },
                data: { isActive: false },
            });
            cache.bustWithHome('bundles:');
            logAudit({
                userId: req.user.id, action: 'DELETE', entity: 'Bundle', entityId: bundleId,
                details: { meta: 'Soft-deleted (isActive → false) — referenced by orders' },
                req,
            });
            return res.json({ message: 'Bundle deactivated (referenced by existing orders)' });
        }

        await prisma.bundle.delete({ where: { id: bundleId } });

        cache.bustWithHome('bundles:');
        logAudit({
            userId: req.user.id, action: 'DELETE', entity: 'Bundle', entityId: bundleId,
            details: { meta: 'Hard-deleted' },
            req,
        });

        res.json({ message: 'Bundle deleted' });
    } catch (error) {
        console.error('Delete bundle error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
