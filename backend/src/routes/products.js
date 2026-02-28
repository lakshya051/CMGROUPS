import express from 'express';
import prisma from '../lib/prisma.js';
import cache from '../lib/cache.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/products (Public) ───────────────────────────────────────────────
// Supports:
//   ?category=GPU  ?search=rtx  ?sort=price_asc  ?minPrice=  ?maxPrice=
//   ?isSecondHand=true
router.get('/', async (req, res) => {
    cache.flush(); // FORCE FLUSH for schema consistency
    try {
        const { category, search, sort, minPrice, maxPrice, isSecondHand, page, limit } = req.query;

        // Build where clause
        let where = {};
        if (category) {
            const categories = category.split(',').map(c => c.trim()).filter(Boolean);
            if (categories.length > 0) where.category = { in: categories };
        }
        if (isSecondHand !== undefined) where.isSecondHand = isSecondHand === 'true';
        if (search) where.title = { contains: search, mode: 'insensitive' };
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price.gte = parseFloat(minPrice);
            if (maxPrice) where.price.lte = parseFloat(maxPrice);
        }

        // Build orderBy
        let orderBy = {};
        if (sort === 'price_asc') orderBy = { price: 'asc' };
        else if (sort === 'price_desc') orderBy = { price: 'desc' };
        else if (sort === 'rating') orderBy = { rating: 'desc' };
        else orderBy = { id: 'desc' };

        // ── Cache key ──────────────────────────────────────────────────────────
        // Ensure pagination values are in cache key even if not provided by client
        const cachePage = parseInt(page) || 1;
        const cacheLimit = parseInt(limit) || 20;
        const cacheKeyData = { ...req.query, page: cachePage, limit: cacheLimit };
        const cacheKey = `products:${JSON.stringify(cacheKeyData)}`;

        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // ── Pagination ─────────────────────────────────────────────────────────
        const take = cacheLimit;
        const skip = (cachePage - 1) * take;

        const [products, total] = await Promise.all([
            prisma.product.findMany({ where, orderBy, take, skip, include: { variants: true } }),
            prisma.product.count({ where }),
        ]);

        const result = {
            data: products,
            pagination: {
                total,
                page: cachePage,
                limit: take,
                totalPages: Math.ceil(total / take)
            }
        };

        cache.set(cacheKey, result);
        res.json(result);

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/products/:id (Public)
router.get('/:id', async (req, res) => {
    try {
        const cacheKey = `products:single:${req.params.id}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const product = await prisma.product.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                variants: true,
                reviews: {
                    include: { user: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!product) return res.status(404).json({ error: 'Product not found' });

        cache.set(cacheKey, product, 120); // cache individual products for 2 min
        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/products (Admin only)
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { title, price, stock, category, brand, image, description, specs, condition, isSecondHand, isReturnable, returnWindowDays, referrerPoints, refereePoints } = req.body;

        if (!title || price === undefined || stock === undefined || !category || !image) {
            return res.status(400).json({ error: 'Title, price, stock, category, and image are required.' });
        }

        const product = await prisma.product.create({
            data: {
                title,
                price: parseFloat(price),
                stock: parseInt(stock),
                category,
                brand: brand || null,
                image,
                description: description || null,
                specs: specs || null,
                condition: condition || 'New',
                isSecondHand: isSecondHand === true || isSecondHand === 'true',
                isReturnable: isReturnable !== undefined ? (isReturnable === true || isReturnable === 'true') : true,
                returnWindowDays: returnWindowDays !== undefined ? parseInt(returnWindowDays) : 3,
                referrerPoints: referrerPoints !== undefined && referrerPoints !== null ? parseFloat(referrerPoints) : null,
                refereePoints: refereePoints !== undefined && refereePoints !== null ? parseFloat(refereePoints) : null
            }
        });

        // Invalidate all product list caches
        cache.delByPrefix('products:');

        res.status(201).json(product);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/products/:id (Admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { referrerPoints, refereePoints, isReturnable, returnWindowDays, sku, ...otherData } = req.body;

        const oldProduct = await prisma.product.findUnique({ where: { id: productId } });

        const updateData = {
            ...otherData,
            referrerPoints: referrerPoints !== undefined ? (referrerPoints === null ? null : parseFloat(referrerPoints)) : undefined,
            refereePoints: refereePoints !== undefined ? (refereePoints === null ? null : parseFloat(refereePoints)) : undefined
        };

        if (isReturnable !== undefined) updateData.isReturnable = isReturnable === true || isReturnable === 'true';
        if (returnWindowDays !== undefined) updateData.returnWindowDays = parseInt(returnWindowDays);

        const product = await prisma.product.update({
            where: { id: productId },
            data: updateData
        });

        // Invalidate caches
        cache.delByPrefix('products:');

        // Background Alert Check (non-blocking)
        (async () => {
            try {
                // 1. Stock Alert: If stock was 0 and now > 0
                if (oldProduct.stock === 0 && product.stock > 0) {
                    const alerts = await prisma.productAlert.findMany({
                        where: { productId: product.id, type: 'STOCK', isActive: true }
                    });

                    if (alerts.length > 0) {
                        const notifications = alerts.map(alert => ({
                            userId: alert.userId,
                            title: 'Back in Stock!',
                            message: `Good news! "${product.title}" is back in stock. Hurry up!`,
                            type: 'ALERT',
                            link: `/product/${product.id}`
                        }));

                        await prisma.notification.createMany({ data: notifications });
                        await prisma.productAlert.deleteMany({
                            where: { id: { in: alerts.map(a => a.id) } }
                        });
                        console.log(`Sent ${alerts.length} stock alerts for product ${product.id}`);
                    }
                }

                // 2. Price Alert: If price dropped
                if (product.price < oldProduct.price) {
                    const alerts = await prisma.productAlert.findMany({
                        where: { productId: product.id, type: 'PRICE_DROP', isActive: true }
                    });

                    const notifications = [];
                    const alertsToRemove = [];

                    for (const alert of alerts) {
                        if (!alert.priceThreshold || product.price <= alert.priceThreshold) {
                            notifications.push({
                                userId: alert.userId,
                                title: 'Price Drop Alert!',
                                message: `Price dropped for "${product.title}" to ₹${product.price.toLocaleString()}!`,
                                type: 'ALERT',
                                link: `/product/${product.id}`
                            });
                            if (alert.priceThreshold) alertsToRemove.push(alert.id);
                        }
                    }

                    if (notifications.length > 0) {
                        await prisma.notification.createMany({ data: notifications });
                        if (alertsToRemove.length > 0) {
                            await prisma.productAlert.deleteMany({ where: { id: { in: alertsToRemove } } });
                        }
                        console.log(`Sent ${notifications.length} price alerts for product ${product.id}`);
                    }
                }
            } catch (err) {
                console.error('Alert trigger error:', err);
            }
        })();

        res.json(product);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/products/:id (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: parseInt(req.params.id) } });

        // Invalidate caches
        cache.delByPrefix('products:');

        res.json({ message: 'Product deleted' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// PRODUCT VARIANTS (Admin / Public for GET)
// ─────────────────────────────────────────────

// GET /api/products/:id/variants (Public)
router.get('/:id/variants', async (req, res) => {
    try {
        const variants = await prisma.productVariant.findMany({
            where: { productId: parseInt(req.params.id) },
            orderBy: { price: 'asc' }
        });
        res.json(variants);
    } catch (error) {
        console.error('Get variants error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/products/:id/variants (Admin only)
router.post('/:id/variants', protect, adminOnly, async (req, res) => {
    try {
        const { name, price, stock, sku } = req.body;
        const productId = parseInt(req.params.id);

        const variant = await prisma.productVariant.create({
            data: {
                productId,
                name,
                price: parseFloat(price),
                stock: parseInt(stock),
                sku: sku || null
            }
        });

        cache.delByPrefix('products:'); // full cache flush for simplicity
        res.status(201).json(variant);
    } catch (error) {
        console.error('Create variant error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/products/:id/variants/:variantId (Admin only)
router.put('/:id/variants/:variantId', protect, adminOnly, async (req, res) => {
    try {
        const { name, price, stock, sku } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (stock !== undefined) updateData.stock = parseInt(stock);
        if (sku !== undefined) updateData.sku = sku || null;

        const variant = await prisma.productVariant.update({
            where: { id: parseInt(req.params.variantId) },
            data: updateData
        });

        cache.delByPrefix('products:');
        res.json(variant);
    } catch (error) {
        console.error('Update variant error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/products/:id/variants/:variantId (Admin only)
router.delete('/:id/variants/:variantId', protect, adminOnly, async (req, res) => {
    try {
        await prisma.productVariant.delete({
            where: { id: parseInt(req.params.variantId) }
        });

        cache.delByPrefix('products:');
        res.json({ message: 'Variant deleted' });
    } catch (error) {
        console.error('Delete variant error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
