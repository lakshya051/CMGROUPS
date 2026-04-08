import express from 'express';
import prisma from '../lib/prisma.js';
import cache from '../lib/cache.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';
import { syncRecord, debouncedSyncProducts } from '../utils/sheetsSync.js';

const router = express.Router();

// ─── GET /api/products (Public) ───────────────────────────────────────────────
// Supports:
//   ?category=GPU  ?search=rtx  ?sort=price_asc  ?minPrice=  ?maxPrice=
//   ?isSecondHand=true
router.get('/', async (req, res) => {
    try {
        const { category, search, sort, minPrice, maxPrice, isSecondHand, onSale, isDeal, page, limit } = req.query;

        // Build where clause
        let where = { isActive: true };

        if (category) {
            const categories = category.split(',').map(c => c.trim()).filter(Boolean);
            if (categories.length > 0) where.category = { in: categories };
        }
        if (isSecondHand !== undefined) where.isSecondHand = isSecondHand === 'true';
        if (isDeal === 'true') where.isDeal = true;
        if (search) where.title = { contains: search, mode: 'insensitive' };
        if (minPrice || maxPrice) {
            where.price = {};
            const parsedMin = parseFloat(minPrice);
            const parsedMax = parseFloat(maxPrice);
            if (Number.isFinite(parsedMin)) where.price.gte = parsedMin;
            if (Number.isFinite(parsedMax)) where.price.lte = parsedMax;
            if (Object.keys(where.price).length === 0) delete where.price;
        }
        if (onSale === 'true') {
            where.originalPrice = { not: null };
        }

        // Build orderBy (single field — used for both in-stock and out-of-stock groups)
        let orderBy;
        switch (sort) {
            case 'price-low':
            case 'price_asc':
                orderBy = { price: 'asc' };
                break;
            case 'price-high':
            case 'price_desc':
                orderBy = { price: 'desc' };
                break;
            case 'rating':
                orderBy = { rating: 'desc' };
                break;
            case 'name':
                orderBy = { title: 'asc' };
                break;
            case 'newest':
            default:
                orderBy = { id: 'desc' };
                break;
        }

        // ── Cache key ──────────────────────────────────────────────────────────
        const parsedPage = Number.parseInt(page, 10);
        const parsedLimit = Number.parseInt(limit, 10);
        const cachePage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        const cacheLimit = Math.max(1, Number.isFinite(parsedLimit) ? Math.min(parsedLimit, 500) : 20);
        const cacheKeyData = { ...req.query, page: cachePage, limit: cacheLimit };
        const cacheKey = `products:${JSON.stringify(cacheKeyData)}`;

        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const take = cacheLimit;
        const skip = (cachePage - 1) * take;

        // Out-of-stock last: fetch in-stock and out-of-stock separately with same sort, then merge
        const whereInStock = { ...where, stock: { gt: 0 } };
        const whereOutOfStock = { ...where, stock: { lte: 0 } };

        // Sequential queries via $transaction to use one DB connection at a time for this handler.
        // Parallel Promise.all was exhausting the pool (P2024) under concurrent /api/products traffic.
        const [total, inStockCount] = await prisma.$transaction([
            prisma.product.count({ where }),
            prisma.product.count({ where: whereInStock }),
        ]);

        const inStockSkip = Math.min(skip, inStockCount);
        const inStockTake = Math.min(take, inStockCount - inStockSkip);
        const outOfStockSkip = Math.max(0, skip - inStockCount);
        const outOfStockTake = take - inStockTake;

        const variantInclude = {
            variantOptions: {
                include: { values: { orderBy: { position: 'asc' } } },
                orderBy: { position: 'asc' }
            },
            variants: {
                where: { isActive: true },
                orderBy: { price: 'asc' }
            }
        };

        const [inStockProducts, outOfStockProducts] = await prisma.$transaction(async (tx) => {
            const inStock = inStockTake > 0
                ? await tx.product.findMany({
                    where: whereInStock,
                    orderBy,
                    skip: inStockSkip,
                    take: inStockTake,
                    include: variantInclude,
                })
                : [];
            const outOfStock = outOfStockTake > 0
                ? await tx.product.findMany({
                    where: whereOutOfStock,
                    orderBy,
                    skip: outOfStockSkip,
                    take: outOfStockTake,
                    include: variantInclude,
                })
                : [];
            return [inStock, outOfStock];
        }, { timeout: 30_000 });

        const allFetched = [...inStockProducts, ...outOfStockProducts].map(p => {
            const variantStock = p.hasVariants && p.variants.length > 0
                ? p.variants.reduce((sum, v) => sum + v.stock, 0)
                : null;
            const effectiveStock = variantStock !== null ? variantStock : p.stock;

            if (p.hasVariants && p.variants.length > 0) {
                const cheapest = p.variants[0];
                return {
                    ...p,
                    displayPrice: cheapest.price,
                    displayMrp: cheapest.originalPrice != null && cheapest.originalPrice > cheapest.price ? cheapest.originalPrice : null,
                    totalStock: effectiveStock,
                };
            }
            return {
                ...p,
                displayPrice: p.price,
                displayMrp: p.originalPrice != null && p.originalPrice > p.price ? p.originalPrice : null,
                totalStock: effectiveStock,
            };
        });

        // Re-sort: variable products with variant stock > 0 should appear with in-stock items
        const inStock = allFetched.filter(p => p.totalStock > 0);
        const outOfStock = allFetched.filter(p => p.totalStock <= 0);
        const products = [...inStock, ...outOfStock];

        const result = {
            data: products,
            pagination: {
                total,
                page: cachePage,
                limit: take,
                totalPages: Math.ceil(total / take)
            }
        };

        cache.set(cacheKey, result, 300);
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

        const paramId = parseInt(req.params.id);
        if (Number.isNaN(paramId)) return res.status(400).json({ error: 'Invalid product ID' });
        const product = await prisma.product.findFirst({
            where: { id: paramId, isActive: true },
            include: {
                variantOptions: {
                    include: { values: { orderBy: { position: 'asc' } } },
                    orderBy: { position: 'asc' }
                },
                variants: {
                    where: { isActive: true }
                },
                reviews: {
                    include: { user: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' }
                },
                quantityTiers: {
                    orderBy: { minQty: 'asc' }
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

// GET /api/products/:id/related (Public — co-occurrence + same-category fallback)
router.get('/:id/related', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const product = await prisma.product.findFirst({
            where: { id: productId, isActive: true },
            select: { id: true, category: true },
        });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const LIMIT = 8;
        let related = [];

        // Co-occurrence: products bought together in the same orders
        const orderIds = await prisma.orderItem.findMany({
            where: { productId },
            select: { orderId: true },
            distinct: ['orderId'],
            take: 50,
        });

        if (orderIds.length > 0) {
            const coItems = await prisma.orderItem.findMany({
                where: {
                    orderId: { in: orderIds.map(o => o.orderId) },
                    productId: { not: productId },
                    product: { isActive: true },
                },
                select: { productId: true },
            });

            const freq = {};
            coItems.forEach(i => { freq[i.productId] = (freq[i.productId] || 0) + 1; });
            const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, LIMIT);

            if (sorted.length > 0) {
                related = await prisma.product.findMany({
                    where: { id: { in: sorted.map(([id]) => parseInt(id)) }, isActive: true },
                    select: { id: true, title: true, price: true, images: true, rating: true, stock: true, category: true },
                });
                // Re-sort by frequency
                const idOrder = sorted.map(([id]) => parseInt(id));
                related.sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));
            }
        }

        // Fallback: fill with same-category products
        if (related.length < LIMIT) {
            const excludeIds = [productId, ...related.map(r => r.id)];
            const fallback = await prisma.product.findMany({
                where: { category: product.category, isActive: true, id: { notIn: excludeIds }, stock: { gt: 0 } },
                select: { id: true, title: true, price: true, images: true, rating: true, stock: true, category: true },
                orderBy: { rating: 'desc' },
                take: LIMIT - related.length,
            });
            related = [...related, ...fallback];
        }

        res.json(related);
    } catch (error) {
        console.error('Get related products error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/products/:id/co-purchased — co-purchased products with caching
router.get('/:id/co-purchased', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Invalid product ID' });

        const cacheKey = `coPurchased:${productId}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const orderIds = await prisma.orderItem.findMany({
            where: { productId },
            select: { orderId: true },
            distinct: ['orderId'],
            take: 100,
        });

        if (orderIds.length === 0) return res.json([]);

        const coItems = await prisma.orderItem.findMany({
            where: {
                orderId: { in: orderIds.map(o => o.orderId) },
                productId: { not: productId },
                product: { isActive: true },
            },
            select: { productId: true },
        });

        const freq = {};
        coItems.forEach(i => { freq[i.productId] = (freq[i.productId] || 0) + 1; });
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);

        let products = [];
        if (sorted.length > 0) {
            products = await prisma.product.findMany({
                where: { id: { in: sorted.map(([id]) => parseInt(id)) }, isActive: true, stock: { gt: 0 } },
                select: { id: true, title: true, price: true, originalPrice: true, images: true, rating: true, stock: true, category: true },
            });
            const idOrder = sorted.map(([id]) => parseInt(id));
            products.sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));
        }

        cache.set(cacheKey, products, 300);
        res.json(products);
    } catch (error) {
        console.error('Get co-purchased products error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/products (Admin only)
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { title, price, originalPrice, stock, category, brand, image, images, description, specs, condition, isSecondHand, isReturnable, returnWindowDays, referrerPoints, refereePoints, hasVariants, sellerName } = req.body;

        const productImages = Array.isArray(images) ? images : (image ? [image] : []);

        if (!title || price === undefined || stock === undefined || !category || productImages.length === 0) {
            return res.status(400).json({ error: 'Title, price, stock, category, and at least one image are required.' });
        }

        const product = await prisma.product.create({
            data: {
                title,
                price: parseFloat(price),
                originalPrice: originalPrice != null && originalPrice !== '' ? parseFloat(originalPrice) : null,
                stock: parseInt(stock),
                category,
                brand: brand || null,
                images: productImages,
                description: description || null,
                specs: specs || null,
                condition: condition || 'New',
                isSecondHand: isSecondHand === true || isSecondHand === 'true',
                isRefurbished: false,
                isReturnable: isReturnable !== undefined ? (isReturnable === true || isReturnable === 'true') : true,
                returnWindowDays: returnWindowDays !== undefined ? parseInt(returnWindowDays) : 3,
                referrerPoints: referrerPoints !== undefined && referrerPoints !== null ? parseFloat(referrerPoints) : null,
                refereePoints: refereePoints !== undefined && refereePoints !== null ? parseFloat(refereePoints) : null,
                hasVariants: hasVariants === true || hasVariants === 'true',
                sellerName: sellerName?.trim() || null
            }
        });

        cache.delByPrefix('products:');

        logAudit({
            userId: req.user.id, action: 'CREATE', entity: 'Product', entityId: product.id,
            details: { after: { title: product.title, price: product.price, category: product.category } },
            req,
        });

        syncRecord('Products', product).catch(console.error);

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
        if (Number.isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID' });
        const body = req.body;

        const oldProduct = await prisma.product.findUnique({ where: { id: productId } });
        if (!oldProduct) return res.status(404).json({ error: 'Product not found' });

        const updateData = {};
        if (body.title !== undefined) updateData.title = String(body.title);
        if (body.description !== undefined) updateData.description = body.description;
        if (body.category !== undefined) updateData.category = String(body.category);
        if (body.brand !== undefined) updateData.brand = body.brand;
        if (body.price !== undefined) {
            const p = parseFloat(body.price);
            if (!Number.isFinite(p) || p < 0) return res.status(400).json({ error: 'Invalid price' });
            updateData.price = p;
        }
        if (body.stock !== undefined) {
            const s = parseInt(body.stock);
            if (Number.isNaN(s) || s < 0) return res.status(400).json({ error: 'Invalid stock' });
            updateData.stock = s;
        }
        if (body.isActive !== undefined) updateData.isActive = body.isActive === true || body.isActive === 'true';
        if (body.referrerPoints !== undefined) updateData.referrerPoints = body.referrerPoints === null ? null : parseFloat(body.referrerPoints);
        if (body.refereePoints !== undefined) updateData.refereePoints = body.refereePoints === null ? null : parseFloat(body.refereePoints);

        if (body.images !== undefined) {
            updateData.images = Array.isArray(body.images) ? body.images : [];
        } else if (body.image !== undefined) {
            updateData.images = body.image ? [body.image] : [];
        }

        if (body.isReturnable !== undefined) updateData.isReturnable = body.isReturnable === true || body.isReturnable === 'true';
        if (body.returnWindowDays !== undefined) updateData.returnWindowDays = parseInt(body.returnWindowDays);
        if (body.originalPrice !== undefined) updateData.originalPrice = body.originalPrice == null || body.originalPrice === '' ? null : parseFloat(body.originalPrice);
        if (body.hasVariants !== undefined) updateData.hasVariants = body.hasVariants === true || body.hasVariants === 'true';
        if (body.sellerName !== undefined) updateData.sellerName = body.sellerName?.trim() || null;

        const product = await prisma.product.update({
            where: { id: productId },
            data: updateData
        });

        cache.delByPrefix('products:');

        logAudit({
            userId: req.user.id, action: 'UPDATE', entity: 'Product', entityId: productId,
            details: { before: { title: oldProduct?.title, price: oldProduct?.price }, after: { title: product.title, price: product.price }, changedFields: Object.keys(updateData) },
            req,
        });

        syncRecord('Products', product).catch(console.error);

        // Background Alert Check (non-blocking)
        (async () => {
            if (!oldProduct) return;
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
        })().catch(err => console.error('Unhandled alert background error:', err));

        res.json(product);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/products/:id/deal (Admin only) — toggle isDeal flag
router.patch('/:id/deal', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        if (Number.isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID' });

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const updated = await prisma.product.update({
            where: { id: productId },
            data: { isDeal: !product.isDeal }
        });

        cache.delByPrefix('products:');

        logAudit({
            userId: req.user.id, action: 'UPDATE', entity: 'Product', entityId: productId,
            details: { field: 'isDeal', before: product.isDeal, after: updated.isDeal },
            req,
        });

        res.json(updated);
    } catch (error) {
        console.error('Toggle deal error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/products/:id (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        if (Number.isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID' });

        const existing = await prisma.product.findUnique({ where: { id: productId } });
        if (!existing) return res.status(404).json({ error: 'Product not found' });

        await prisma.product.update({
            where: { id: productId },
            data: { isActive: false }
        });

        cache.delByPrefix('products:');

        logAudit({
            userId: req.user.id, action: 'DELETE', entity: 'Product', entityId: productId,
            details: { meta: 'Soft-deleted (isActive → false)' },
            req,
        });

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
            where: { productId: parseInt(req.params.id), isActive: true },
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
        const { name, price, originalPrice, stock, sku, combination, isActive, image } = req.body;
        const productId = parseInt(req.params.id);

        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock || 0);
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return res.status(400).json({ error: 'Invalid variant price' });
        if (Number.isNaN(parsedStock) || parsedStock < 0) return res.status(400).json({ error: 'Invalid variant stock' });

        const variantData = {
            productId,
            name: name || null,
            price: parsedPrice,
            stock: parsedStock,
            sku: sku || null,
            combination: combination || null,
            isActive: isActive !== undefined ? isActive : true,
            image: image || null
        };
        if (originalPrice != null && originalPrice !== '' && !isNaN(parseFloat(originalPrice))) {
            variantData.originalPrice = parseFloat(originalPrice);
        }
        const variant = await prisma.productVariant.create({ data: variantData });

        cache.delByPrefix('products:');
        debouncedSyncProducts();
        res.status(201).json(variant);
    } catch (error) {
        console.error('Create variant error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/products/:id/variants/:variantId (Admin only)
router.put('/:id/variants/:variantId', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const variantId = parseInt(req.params.variantId);
        const { name, price, originalPrice, stock, sku, combination, isActive, image } = req.body;

        const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
        if (!existing || existing.productId !== productId) {
            return res.status(404).json({ error: 'Variant not found for this product' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (originalPrice !== undefined) updateData.originalPrice = originalPrice != null && originalPrice !== '' ? parseFloat(originalPrice) : null;
        if (stock !== undefined) updateData.stock = parseInt(stock);
        if (sku !== undefined) updateData.sku = sku || null;
        if (combination !== undefined) updateData.combination = combination;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (image !== undefined) updateData.image = image || null;

        const variant = await prisma.productVariant.update({
            where: { id: variantId },
            data: updateData
        });

        cache.delByPrefix('products:');
        debouncedSyncProducts();
        res.json(variant);
    } catch (error) {
        console.error('Update variant error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/products/:id/variants/:variantId (Admin only)
router.delete('/:id/variants/:variantId', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const variantId = parseInt(req.params.variantId);

        const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
        if (!existing || existing.productId !== productId) {
            return res.status(404).json({ error: 'Variant not found for this product' });
        }

        await prisma.productVariant.delete({
            where: { id: variantId }
        });

        cache.delByPrefix('products:');
        debouncedSyncProducts();
        res.json({ message: 'Variant deleted' });
    } catch (error) {
        console.error('Delete variant error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/products/:id/variants/bulk — save all variants in one call
router.post('/:id/variants/bulk', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { variants } = req.body;
        if (!Array.isArray(variants)) return res.status(400).json({ error: 'variants array is required' });

        const results = [];
        for (const v of variants) {
            const data = {
                productId,
                name: v.name || null,
                combination: v.combination || null,
                price: parseFloat(v.price),
                originalPrice: v.originalPrice != null && v.originalPrice !== '' ? parseFloat(v.originalPrice) : null,
                stock: parseInt(v.stock || 0),
                sku: v.sku || null,
                isActive: v.isActive !== undefined ? v.isActive : true,
                image: v.image || null
            };
            const parsedId = v.id != null ? Number(v.id) : null;
            if (parsedId && Number.isInteger(parsedId)) {
                const existing = await prisma.productVariant.findUnique({ where: { id: parsedId } });
                if (!existing || existing.productId !== productId) {
                    return res.status(400).json({ error: `Variant ID ${parsedId} does not belong to this product` });
                }
                const updated = await prisma.productVariant.update({ where: { id: parsedId }, data });
                results.push(updated);
            } else {
                const created = await prisma.productVariant.create({ data });
                results.push(created);
            }
        }

        cache.delByPrefix('products:');
        debouncedSyncProducts();
        res.json({ variants: results });
    } catch (error) {
        console.error('Bulk save variants error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// VARIANT OPTIONS (Admin)
// ─────────────────────────────────────────────

// POST /api/products/:id/options — add a new option with values
router.post('/:id/options', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { name, values } = req.body;
        if (!name || !Array.isArray(values) || values.length === 0) {
            return res.status(400).json({ error: 'name and values array are required' });
        }

        const existingCount = await prisma.variantOption.count({ where: { productId } });

        const option = await prisma.variantOption.create({
            data: {
                productId,
                name: name.trim(),
                position: existingCount,
                values: {
                    create: values.map((val, idx) => ({ value: String(val).trim(), position: idx }))
                }
            },
            include: { values: { orderBy: { position: 'asc' } } }
        });

        cache.delByPrefix('products:');
        res.status(201).json(option);
    } catch (error) {
        console.error('Create option error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/products/:id/options/:optionId — update option name and/or values
router.put('/:id/options/:optionId', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const optionId = parseInt(req.params.optionId);
        const { name, values } = req.body;

        const existing = await prisma.variantOption.findUnique({ where: { id: optionId } });
        if (!existing || existing.productId !== productId) {
            return res.status(404).json({ error: 'Option not found for this product' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();

        const option = await prisma.variantOption.update({
            where: { id: optionId },
            data: updateData,
        });

        if (Array.isArray(values)) {
            await prisma.variantOptionValue.deleteMany({ where: { optionId } });
            await prisma.variantOptionValue.createMany({
                data: values.map((val, idx) => ({
                    optionId,
                    value: String(val).trim(),
                    position: idx
                }))
            });
        }

        const updated = await prisma.variantOption.findUnique({
            where: { id: optionId },
            include: { values: { orderBy: { position: 'asc' } } }
        });

        cache.delByPrefix('products:');
        res.json(updated);
    } catch (error) {
        console.error('Update option error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/products/:id/options/:optionId — delete option and its values
router.delete('/:id/options/:optionId', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const optionId = parseInt(req.params.optionId);
        const existing = await prisma.variantOption.findUnique({ where: { id: optionId } });
        if (!existing || existing.productId !== productId) {
            return res.status(404).json({ error: 'Option not found for this product' });
        }
        await prisma.variantOption.delete({ where: { id: optionId } });
        cache.delByPrefix('products:');
        res.json({ message: 'Option deleted' });
    } catch (error) {
        console.error('Delete option error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/products/:id/options — get all options with values for a product
router.get('/:id/options', async (req, res) => {
    try {
        const options = await prisma.variantOption.findMany({
            where: { productId: parseInt(req.params.id) },
            include: { values: { orderBy: { position: 'asc' } } },
            orderBy: { position: 'asc' }
        });
        res.json(options);
    } catch (error) {
        console.error('Get options error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/products/:id/variants/generate — auto-generate all combinations
router.post('/:id/variants/generate', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const options = await prisma.variantOption.findMany({
            where: { productId },
            include: { values: { orderBy: { position: 'asc' } } },
            orderBy: { position: 'asc' }
        });

        if (options.length === 0) return res.status(400).json({ error: 'No options defined. Add options first.' });

        const cartesian = (arrays) => {
            return arrays.reduce((acc, curr) => {
                const result = [];
                for (const a of acc) {
                    for (const b of curr) {
                        result.push([...a, b]);
                    }
                }
                return result;
            }, [[]]);
        };

        const optionArrays = options.map(opt => opt.values.map(v => ({ optionName: opt.name, value: v.value })));
        const totalCombinations = optionArrays.reduce((acc, arr) => acc * arr.length, 1);
        if (totalCombinations > 500) {
            return res.status(400).json({ error: `Too many combinations (${totalCombinations}). Maximum 500 allowed. Reduce option values.` });
        }
        const combinations = cartesian(optionArrays);

        const existingVariants = await prisma.productVariant.findMany({ where: { productId } });

        const combToKey = (comb) => JSON.stringify(
            Object.fromEntries(comb.map(c => [c.optionName, c.value]).sort((a, b) => a[0].localeCompare(b[0])))
        );

        const existingKeys = new Set(
            existingVariants
                .filter(v => v.combination)
                .map(v => JSON.stringify(
                    Object.fromEntries(Object.entries(v.combination).sort((a, b) => a[0].localeCompare(b[0])))
                ))
        );

        let created = 0;
        for (const combo of combinations) {
            const key = combToKey(combo);
            if (existingKeys.has(key)) continue;

            const combination = Object.fromEntries(combo.map(c => [c.optionName, c.value]));
            const comboName = combo.map(c => c.value).join(' / ');

            await prisma.productVariant.create({
                data: {
                    productId,
                    name: comboName,
                    combination,
                    price: product.price || 0,
                    originalPrice: product.originalPrice || null,
                    stock: 0,
                    isActive: true
                }
            });
            created++;
        }

        const allVariants = await prisma.productVariant.findMany({
            where: { productId },
            orderBy: { price: 'asc' }
        });

        cache.delByPrefix('products:');
        debouncedSyncProducts();
        res.json({ created, total: allVariants.length, variants: allVariants });
    } catch (error) {
        console.error('Generate variants error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// QUANTITY TIERS (Volume Discounts)
// ─────────────────────────────────────────────

// GET /api/products/:id/quantity-tiers (Public)
router.get('/:id/quantity-tiers', async (req, res) => {
    try {
        const tiers = await prisma.quantityTier.findMany({
            where: { productId: parseInt(req.params.id) },
            orderBy: { minQty: 'asc' },
        });
        res.json(tiers);
    } catch (error) {
        console.error('Get quantity tiers error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/products/:id/quantity-tiers (Admin) — replace all tiers
router.put('/:id/quantity-tiers', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { tiers } = req.body;
        if (!Array.isArray(tiers)) return res.status(400).json({ error: 'tiers array is required' });

        await prisma.$transaction(async (tx) => {
            await tx.quantityTier.deleteMany({ where: { productId } });
            if (tiers.length > 0) {
                const validatedTiers = tiers.map(t => {
                    const minQty = parseInt(t.minQty);
                    const price = parseFloat(t.price);
                    if (!Number.isFinite(minQty) || minQty <= 0) throw new Error('Each tier must have a valid minQty > 0');
                    if (!Number.isFinite(price) || price < 0) throw new Error('Each tier must have a valid price >= 0');
                    return { productId, minQty, price };
                });
                await tx.quantityTier.createMany({ data: validatedTiers });
            }
        });

        const updated = await prisma.quantityTier.findMany({
            where: { productId },
            orderBy: { minQty: 'asc' },
        });

        cache.delByPrefix('products:');
        logAudit({
            userId: req.user.id, action: 'UPDATE', entity: 'QuantityTier', entityId: productId,
            details: { tiersCount: updated.length },
            req,
        });

        res.json(updated);
    } catch (error) {
        if (error.message && (error.message.includes('valid minQty') || error.message.includes('valid price'))) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Update quantity tiers error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/products/:id/toggle-variants — toggle hasVariants on/off
router.patch('/:id/toggle-variants', protect, adminOnly, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { hasVariants } = req.body;

        const product = await prisma.product.update({
            where: { id: productId },
            data: { hasVariants: hasVariants === true || hasVariants === 'true' }
        });

        cache.delByPrefix('products:');
        res.json(product);
    } catch (error) {
        console.error('Toggle variants error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
