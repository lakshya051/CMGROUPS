import express from 'express';
import prisma from '../lib/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

const createHttpError = (status, message) => Object.assign(new Error(message), { status });

const parseId = (value, fieldName) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw createHttpError(400, `${fieldName} must be a positive integer`);
    }
    return parsed;
};

const parseQuantity = (value, { allowZero = false } = {}) => {
    const parsed = Number(value);
    const isValid = Number.isInteger(parsed) && (allowZero ? parsed >= 0 : parsed > 0);

    if (!isValid) {
        throw createHttpError(
            400,
            allowZero ? 'quantity must be a non-negative integer' : 'quantity must be a positive integer'
        );
    }

    return parsed;
};

const getStockTarget = async (db, productId, variantId = null) => {
    const product = await db.product.findUnique({
        where: { id: productId },
        select: { id: true, title: true, stock: true, hasVariants: true },
    });

    if (!product) {
        throw createHttpError(404, 'Product not found');
    }

    if (product.hasVariants && variantId == null) {
        throw createHttpError(400, 'Please select a variant');
    }

    if (variantId == null) {
        return {
            label: product.title,
            stock: product.stock,
        };
    }

    const variant = await db.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, productId: true, name: true, stock: true, isActive: true },
    });

    if (!variant || variant.productId !== productId) {
        throw createHttpError(404, 'Product variant not found');
    }

    if (!variant.isActive) {
        throw createHttpError(400, 'This variant is no longer available');
    }

    return {
        label: variant.name || 'Variant',
        stock: variant.stock,
    };
};

const assertAvailableStock = async (db, { productId, variantId = null, requestedQuantity }) => {
    const target = await getStockTarget(db, productId, variantId);

    if (target.stock < requestedQuantity) {
        throw createHttpError(
            400,
            `Insufficient stock for "${target.label}". Available: ${target.stock}, Requested: ${requestedQuantity}`
        );
    }
};

const formatCartItem = (item, bundleMap = {}) => {
    const base = item.product;
    const variant = item.variant;
    const variantId = variant ? variant.id : null;

    const result = {
        ...base,
        uniqueId: variantId ? `${base.id}-${variantId}` : `${base.id}`,
        variantId,
        variantName: variant ? variant.name : null,
        variantCombination: variant ? variant.combination : null,
        variantSku: variant ? variant.sku : null,
        price: variant ? variant.price : base.price,
        originalPrice: variant ? (variant.originalPrice || base.originalPrice) : base.originalPrice,
        stock: variant ? variant.stock : base.stock,
        quantity: item.quantity,
        cartItemId: item.id,
    };

    if (item.bundleInstanceId) {
        result.uniqueId = variantId
            ? `${base.id}-${variantId}-${item.bundleInstanceId}`
            : `${base.id}-${item.bundleInstanceId}`;
        const bundleData = bundleMap[item.bundleId] || {};
        result.bundleInfo = {
            bundleId: item.bundleId || null,
            bundleInstanceId: item.bundleInstanceId,
            bundleName: bundleData.name || null,
            bundlePrice: bundleData.bundlePrice ?? null,
            hasService: bundleData.hasService || false,
            isGiftable: bundleData.isGiftable || false,
            serviceNames: bundleData.serviceNames || [],
        };
    }

    return result;
};

const fetchFullCart = async (userId) => {
    const items = await prisma.cartItem.findMany({
        where: { userId },
        include: { product: true, variant: true },
        orderBy: { createdAt: 'asc' },
    });

    const bundleIdStrs = [...new Set(items.filter(i => i.bundleId).map(i => i.bundleId))];
    const numericBundleIds = bundleIdStrs.map(s => parseInt(s)).filter(Number.isFinite);
    const byobTemplateIds = bundleIdStrs
        .filter(s => s.startsWith('byob-'))
        .map(s => parseInt(s.split('-')[1]))
        .filter(Number.isFinite);
    let bundleMap = {};

    const [bundles, templates] = await Promise.all([
        numericBundleIds.length > 0
            ? prisma.bundle.findMany({
                where: { id: { in: numericBundleIds } },
                select: {
                    id: true, name: true, bundlePrice: true, isGiftable: true,
                    items: {
                        where: { itemType: 'service' },
                        select: { id: true, serviceType: { select: { title: true } } },
                    },
                },
            })
            : [],
        byobTemplateIds.length > 0
            ? prisma.bundleTemplate.findMany({
                where: { id: { in: byobTemplateIds } },
                select: { id: true, name: true, discount: true },
            })
            : [],
    ]);

    for (const b of bundles) {
        const serviceNames = b.items.map(si => si.serviceType?.title).filter(Boolean);
        bundleMap[String(b.id)] = {
            name: b.name,
            bundlePrice: b.bundlePrice,
            hasService: b.items.length > 0,
            isGiftable: b.isGiftable || false,
            serviceNames,
        };
    }

    for (const t of templates) {
        bundleMap[`byob-${t.id}`] = { name: t.name, discount: t.discount, isByob: true };
    }

    const byobInstancePrices = {};
    for (const item of items) {
        if (!item.bundleId || !item.bundleId.startsWith('byob-') || !item.bundleInstanceId) continue;
        const key = item.bundleInstanceId;
        if (!byobInstancePrices[key]) byobInstancePrices[key] = { catalogTotal: 0, discount: bundleMap[item.bundleId]?.discount || 0 };
        const unitPrice = item.variant ? item.variant.price : item.product?.price || 0;
        byobInstancePrices[key].catalogTotal += unitPrice * item.quantity;
    }
    for (const [key, info] of Object.entries(byobInstancePrices)) {
        byobInstancePrices[key].bundlePrice = Math.round(info.catalogTotal * (1 - info.discount / 100));
    }

    return items.map(item => {
        const formatted = formatCartItem(item, bundleMap);
        if (formatted.bundleInfo && item.bundleId?.startsWith('byob-') && item.bundleInstanceId) {
            const instancePrice = byobInstancePrices[item.bundleInstanceId];
            if (instancePrice) {
                formatted.bundleInfo.bundlePrice = instancePrice.bundlePrice;
            }
        }
        return formatted;
    });
};

const findCartItem = (db, userId, productId, variantId, bundleInstanceId = '') =>
    db.cartItem.findFirst({
        where: {
            userId,
            productId,
            variantId,
            bundleInstanceId,
        },
    });

const cartItemKey = (productId, variantId, bundleInstanceId = '') =>
    `${Number(productId)}:${variantId == null ? 'null' : Number(variantId)}:${bundleInstanceId}`;

// GET /api/cart - fetch full cart from DB
router.get('/', async (req, res) => {
    try {
        const cart = await fetchFullCart(req.user.id);
        res.json(cart);
    } catch (error) {
        console.error('Fetch cart error:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// POST /api/cart/items - add item or increment quantity
router.post('/items', async (req, res) => {
    try {
        const { productId, variantId = null, quantity = 1, bundleId = null, bundleInstanceId = '' } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({ error: 'productId is required' });
        }

        const numProductId = parseId(productId, 'productId');
        const numVariantId = variantId == null ? null : parseId(variantId, 'variantId');
        const numQuantity = parseQuantity(quantity);
        const safeBundleInstanceId = bundleInstanceId ? String(bundleInstanceId) : '';
        const safeBundleId = bundleId ? String(bundleId) : null;

        await prisma.$transaction(async (tx) => {
            const existing = await findCartItem(tx, userId, numProductId, numVariantId, safeBundleInstanceId);
            const nextQuantity = (existing?.quantity || 0) + numQuantity;

            await assertAvailableStock(tx, {
                productId: numProductId,
                variantId: numVariantId,
                requestedQuantity: nextQuantity,
            });

            if (existing) {
                await tx.cartItem.update({
                    where: { id: existing.id },
                    data: { quantity: nextQuantity },
                });
                return;
            }

            await tx.cartItem.create({
                data: {
                    userId,
                    productId: numProductId,
                    variantId: numVariantId,
                    quantity: numQuantity,
                    bundleId: safeBundleId,
                    bundleInstanceId: safeBundleInstanceId,
                },
            });
        }, { isolationLevel: 'Serializable' });

        const cart = await fetchFullCart(userId);
        res.json({ success: true, cart });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(error.status || 500).json({
            error: error.status ? error.message : 'Failed to add item to cart',
        });
    }
});

// PATCH /api/cart/items - set exact quantity for an item
router.patch('/items', async (req, res) => {
    try {
        const { productId, variantId = null, quantity, bundleInstanceId = '' } = req.body;
        const userId = req.user.id;

        if (!productId || quantity == null) {
            return res.status(400).json({ error: 'productId and quantity are required' });
        }

        const numProductId = parseId(productId, 'productId');
        const numVariantId = variantId == null ? null : parseId(variantId, 'variantId');
        const numQuantity = parseQuantity(quantity, { allowZero: true });
        const safeBundleInstanceId = bundleInstanceId ? String(bundleInstanceId) : '';

        await prisma.$transaction(async (tx) => {
            const existing = await findCartItem(tx, userId, numProductId, numVariantId, safeBundleInstanceId);
            if (!existing) {
                throw createHttpError(404, 'Item not in cart');
            }

            if (numQuantity === 0) {
                await tx.cartItem.delete({ where: { id: existing.id } });
                return;
            }

            await assertAvailableStock(tx, {
                productId: numProductId,
                variantId: numVariantId,
                requestedQuantity: numQuantity,
            });

            await tx.cartItem.update({
                where: { id: existing.id },
                data: { quantity: numQuantity },
            });
        }, { isolationLevel: 'Serializable' });

        const cart = await fetchFullCart(userId);
        res.json({ success: true, cart });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(error.status || 500).json({
            error: error.status ? error.message : 'Failed to update cart item',
        });
    }
});

// POST /api/cart/items/remove - remove a specific item
// Using POST instead of DELETE because DELETE with body is unreliable across proxies
router.post('/items/remove', async (req, res) => {
    try {
        const { productId, variantId = null, bundleInstanceId = '' } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({ error: 'productId is required' });
        }

        const numProductId = parseId(productId, 'productId');
        const numVariantId = variantId == null ? null : parseId(variantId, 'variantId');
        const safeBundleInstanceId = bundleInstanceId ? String(bundleInstanceId) : '';
        const existing = await findCartItem(prisma, userId, numProductId, numVariantId, safeBundleInstanceId);

        if (existing) {
            await prisma.cartItem.delete({ where: { id: existing.id } });
        }

        const cart = await fetchFullCart(userId);
        res.json({ success: true, cart });
    } catch (error) {
        console.error('Remove cart item error:', error);
        res.status(error.status || 500).json({
            error: error.status ? error.message : 'Failed to remove item from cart',
        });
    }
});

// POST /api/cart/sync - merge local cart with DB
router.post('/sync', async (req, res) => {
    try {
        const { items } = req.body;
        const userId = req.user.id;

        const syncWarnings = [];
        if (items && Array.isArray(items)) {
            const incomingItems = new Map();

            for (const localItem of items) {
                const productId = Number(localItem.id) || Number(localItem.productId);
                if (!Number.isInteger(productId) || productId <= 0) continue;

                const variantId = localItem.variantId == null ? null : Number(localItem.variantId);
                if (variantId != null && (!Number.isInteger(variantId) || variantId <= 0)) continue;

                const quantity = Number(localItem.quantity) || 1;
                if (!Number.isInteger(quantity) || quantity <= 0) continue;

                const bundleInstanceId = localItem.bundleInfo?.bundleInstanceId || '';
                const bundleId = localItem.bundleInfo?.bundleId ? String(localItem.bundleInfo.bundleId) : null;

                const key = cartItemKey(productId, variantId, bundleInstanceId);
                const existingIncoming = incomingItems.get(key);

                if (!existingIncoming || quantity > existingIncoming.quantity) {
                    incomingItems.set(key, { productId, variantId, quantity, bundleId, bundleInstanceId });
                }
            }

            const existingItems = await prisma.cartItem.findMany({
                where: { userId },
                select: { id: true, productId: true, variantId: true, quantity: true, bundleInstanceId: true, bundleId: true },
            });
            const existingByKey = new Map(
                existingItems.map((item) => [cartItemKey(item.productId, item.variantId, item.bundleInstanceId || ''), item])
            );

            const productIds = [...new Set([...incomingItems.values()].map(i => i.productId))];
            const variantIds = [...new Set(
                [...incomingItems.values()].filter(i => i.variantId != null).map(i => i.variantId)
            )];

            const [products, variants] = await Promise.all([
                prisma.product.findMany({
                    where: { id: { in: productIds } },
                    select: { id: true, title: true, stock: true },
                }),
                variantIds.length > 0
                    ? prisma.productVariant.findMany({
                        where: { id: { in: variantIds } },
                        select: { id: true, productId: true, name: true, stock: true },
                    })
                    : [],
            ]);

            const productMap = new Map(products.map(p => [p.id, p]));
            const variantMap = new Map(variants.map(v => [v.id, v]));

            for (const incoming of incomingItems.values()) {
                const key = cartItemKey(incoming.productId, incoming.variantId, incoming.bundleInstanceId || '');
                const existing = existingByKey.get(key);
                let allowedQuantity = 0;

                try {
                    const product = productMap.get(incoming.productId);
                    if (!product) throw createHttpError(404, 'Product not found');

                    let target;
                    if (incoming.variantId == null) {
                        target = { label: product.title, stock: product.stock };
                    } else {
                        const variant = variantMap.get(incoming.variantId);
                        if (!variant || variant.productId !== incoming.productId) {
                            throw createHttpError(404, 'Product variant not found');
                        }
                        target = { label: variant.name || 'Variant', stock: variant.stock };
                    }

                    const desiredQuantity = existing
                        ? Math.max(existing.quantity, incoming.quantity)
                        : incoming.quantity;
                    allowedQuantity = Math.min(desiredQuantity, target.stock);
                } catch (err) {
                    console.error(
                        `Failed to validate stock for cart item productId=${incoming.productId}:`,
                        err.message
                    );
                    syncWarnings.push({ productId: incoming.productId, error: err.message });
                    continue;
                }

                if (allowedQuantity <= 0) {
                    if (existing) {
                        await prisma.cartItem.delete({ where: { id: existing.id } });
                    }
                    continue;
                }

                if (existing) {
                    if (allowedQuantity !== existing.quantity) {
                        await prisma.cartItem.update({
                            where: { id: existing.id },
                            data: { quantity: allowedQuantity },
                        });
                    }
                    continue;
                }

                try {
                    await prisma.cartItem.create({
                        data: {
                            userId,
                            productId: incoming.productId,
                            variantId: incoming.variantId,
                            quantity: allowedQuantity,
                            bundleId: incoming.bundleId || null,
                            bundleInstanceId: incoming.bundleInstanceId || '',
                        },
                    });
                } catch (err) {
                    console.error(`Failed to sync cart item productId=${incoming.productId}:`, err.message);
                }
            }
        }

        const cart = await fetchFullCart(userId);
        res.json({ success: true, cart, warnings: syncWarnings.length > 0 ? syncWarnings : undefined });
    } catch (error) {
        console.error('Sync cart error:', error);
        res.status(500).json({ error: 'Failed to sync cart' });
    }
});

// POST /api/cart/bundle/remove - remove all items in a bundle instance
router.post('/bundle/remove', async (req, res) => {
    try {
        const { bundleInstanceId } = req.body;
        if (!bundleInstanceId) {
            return res.status(400).json({ error: 'bundleInstanceId is required' });
        }
        await prisma.cartItem.deleteMany({
            where: { userId: req.user.id, bundleInstanceId: String(bundleInstanceId) },
        });
        const cart = await fetchFullCart(req.user.id);
        res.json({ success: true, cart });
    } catch (error) {
        console.error('Remove bundle from cart error:', error);
        res.status(500).json({ error: 'Failed to remove bundle from cart' });
    }
});

// DELETE /api/cart - clear entire cart
router.delete('/', async (req, res) => {
    try {
        await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });
        res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

export default router;
