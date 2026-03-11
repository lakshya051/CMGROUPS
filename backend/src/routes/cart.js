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
        select: { id: true, title: true, stock: true },
    });

    if (!product) {
        throw createHttpError(404, 'Product not found');
    }

    if (variantId == null) {
        return {
            label: product.title,
            stock: product.stock,
        };
    }

    const variant = await db.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, productId: true, name: true, stock: true },
    });

    if (!variant || variant.productId !== productId) {
        throw createHttpError(404, 'Product variant not found');
    }

    return {
        label: variant.name,
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

const formatCartItem = (item) => {
    const base = item.product;
    const variant = item.variant;
    const variantId = variant ? variant.id : null;

    return {
        ...base,
        uniqueId: variantId ? `${base.id}-${variantId}` : `${base.id}`,
        variantId,
        variantName: variant ? variant.name : null,
        price: variant ? variant.price : base.price,
        stock: variant ? variant.stock : base.stock,
        quantity: item.quantity,
        cartItemId: item.id,
    };
};

const fetchFullCart = async (userId) => {
    const items = await prisma.cartItem.findMany({
        where: { userId },
        include: { product: true, variant: true },
        orderBy: { createdAt: 'asc' },
    });
    return items.map(formatCartItem);
};

const findCartItem = (db, userId, productId, variantId) =>
    db.cartItem.findFirst({
        where: {
            userId,
            productId,
            variantId,
        },
    });

const cartItemKey = (productId, variantId) =>
    `${Number(productId)}:${variantId == null ? 'null' : Number(variantId)}`;

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
        const { productId, variantId = null, quantity = 1 } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({ error: 'productId is required' });
        }

        const numProductId = parseId(productId, 'productId');
        const numVariantId = variantId == null ? null : parseId(variantId, 'variantId');
        const numQuantity = parseQuantity(quantity);

        await prisma.$transaction(async (tx) => {
            const existing = await findCartItem(tx, userId, numProductId, numVariantId);
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
        const { productId, variantId = null, quantity } = req.body;
        const userId = req.user.id;

        if (!productId || quantity == null) {
            return res.status(400).json({ error: 'productId and quantity are required' });
        }

        const numProductId = parseId(productId, 'productId');
        const numVariantId = variantId == null ? null : parseId(variantId, 'variantId');
        const numQuantity = parseQuantity(quantity, { allowZero: true });

        await prisma.$transaction(async (tx) => {
            const existing = await findCartItem(tx, userId, numProductId, numVariantId);
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
        const { productId, variantId = null } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({ error: 'productId is required' });
        }

        const numProductId = parseId(productId, 'productId');
        const numVariantId = variantId == null ? null : parseId(variantId, 'variantId');
        const existing = await findCartItem(prisma, userId, numProductId, numVariantId);

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

        if (items && Array.isArray(items)) {
            const incomingItems = new Map();

            for (const localItem of items) {
                const productId = Number(localItem.id) || Number(localItem.productId);
                if (!Number.isInteger(productId) || productId <= 0) continue;

                const variantId = localItem.variantId == null ? null : Number(localItem.variantId);
                if (variantId != null && (!Number.isInteger(variantId) || variantId <= 0)) continue;

                const quantity = Number(localItem.quantity) || 1;
                if (!Number.isInteger(quantity) || quantity <= 0) continue;

                const key = cartItemKey(productId, variantId);
                const existingIncoming = incomingItems.get(key);

                if (!existingIncoming || quantity > existingIncoming.quantity) {
                    incomingItems.set(key, { productId, variantId, quantity });
                }
            }

            const existingItems = await prisma.cartItem.findMany({
                where: { userId },
                select: { id: true, productId: true, variantId: true, quantity: true },
            });
            const existingByKey = new Map(
                existingItems.map((item) => [cartItemKey(item.productId, item.variantId), item])
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
                const key = cartItemKey(incoming.productId, incoming.variantId);
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
                        target = { label: variant.name, stock: variant.stock };
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
                        },
                    });
                } catch (err) {
                    console.error(`Failed to sync cart item productId=${incoming.productId}:`, err.message);
                }
            }
        }

        const cart = await fetchFullCart(userId);
        res.json({ success: true, cart });
    } catch (error) {
        console.error('Sync cart error:', error);
        res.status(500).json({ error: 'Failed to sync cart' });
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
