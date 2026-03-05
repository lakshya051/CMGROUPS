import express from 'express';
import prisma from '../lib/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

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

const findCartItem = (userId, productId, variantId) => {
    return prisma.cartItem.findFirst({
        where: {
            userId,
            productId: Number(productId),
            variantId: variantId ? Number(variantId) : null,
        },
    });
};

const cartItemKey = (productId, variantId) =>
    `${Number(productId)}:${variantId == null ? 'null' : Number(variantId)}`;

// GET /api/cart — fetch full cart from DB
router.get('/', async (req, res) => {
    try {
        const cart = await fetchFullCart(req.user.id);
        res.json(cart);
    } catch (error) {
        console.error('Fetch cart error:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// POST /api/cart/items — add item or increment quantity (race-condition safe)
router.post('/items', async (req, res) => {
    try {
        const { productId, variantId = null, quantity = 1 } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({ error: 'productId is required' });
        }

        const numProductId = Number(productId);
        const numVariantId = variantId ? Number(variantId) : null;
        const numQuantity = Math.max(1, Number(quantity));

        const product = await prisma.product.findUnique({ where: { id: numProductId } });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (numVariantId) {
            // When variantId is present the @@unique([userId, productId, variantId]) index
            // is fully populated — Prisma upsert works atomically.
            await prisma.cartItem.upsert({
                where: {
                    userId_productId_variantId: {
                        userId,
                        productId: numProductId,
                        variantId: numVariantId,
                    },
                },
                update: { quantity: { increment: numQuantity } },
                create: { userId, productId: numProductId, variantId: numVariantId, quantity: numQuantity },
            });
        } else {
            // variantId IS NULL — PostgreSQL treats NULL != NULL so the unique index does NOT
            // prevent duplicate inserts. Use a Serializable transaction to guarantee atomicity.
            await prisma.$transaction(async (tx) => {
                const existing = await tx.cartItem.findFirst({
                    where: { userId, productId: numProductId, variantId: null },
                });
                if (existing) {
                    await tx.cartItem.update({
                        where: { id: existing.id },
                        data: { quantity: { increment: numQuantity } },
                    });
                } else {
                    await tx.cartItem.create({
                        data: { userId, productId: numProductId, variantId: null, quantity: numQuantity },
                    });
                }
            }, { isolationLevel: 'Serializable' });
        }

        const cart = await fetchFullCart(userId);
        res.json({ success: true, cart });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// PATCH /api/cart/items — set exact quantity for an item
router.patch('/items', async (req, res) => {
    try {
        const { productId, variantId = null, quantity } = req.body;
        const userId = req.user.id;

        if (!productId || quantity == null) {
            return res.status(400).json({ error: 'productId and quantity are required' });
        }

        const existing = await findCartItem(userId, productId, variantId);
        if (!existing) {
            return res.status(404).json({ error: 'Item not in cart' });
        }

        const numQuantity = Number(quantity);

        if (numQuantity <= 0) {
            await prisma.cartItem.delete({ where: { id: existing.id } });
        } else {
            await prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: numQuantity },
            });
        }

        const cart = await fetchFullCart(userId);
        res.json({ success: true, cart });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({ error: 'Failed to update cart item' });
    }
});

// POST /api/cart/items/remove — remove a specific item
// Using POST instead of DELETE because DELETE with body is unreliable across proxies
router.post('/items/remove', async (req, res) => {
    try {
        const { productId, variantId = null } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({ error: 'productId is required' });
        }

        const existing = await findCartItem(userId, productId, variantId);
        if (existing) {
            await prisma.cartItem.delete({ where: { id: existing.id } });
        }

        const cart = await fetchFullCart(userId);
        res.json({ success: true, cart });
    } catch (error) {
        console.error('Remove cart item error:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});

// POST /api/cart/sync — merge local cart with DB (migration helper)
router.post('/sync', async (req, res) => {
    try {
        const { items } = req.body;
        const userId = req.user.id;

        if (items && Array.isArray(items)) {
            // Deduplicate incoming local items first to avoid repeated writes for the same key.
            const incomingItems = new Map();
            for (const localItem of items) {
                const productId = Number(localItem.id) || Number(localItem.productId);
                if (!productId) continue;

                const variantId = localItem.variantId ? Number(localItem.variantId) : null;
                const quantity = Math.max(1, Number(localItem.quantity) || 1);
                const key = cartItemKey(productId, variantId);
                const existingIncoming = incomingItems.get(key);

                if (!existingIncoming || quantity > existingIncoming.quantity) {
                    incomingItems.set(key, { productId, variantId, quantity });
                }
            }

            const existingItems = await prisma.cartItem.findMany({
                where: { userId },
                select: { id: true, productId: true, variantId: true, quantity: true }
            });
            const existingByKey = new Map(
                existingItems.map((item) => [cartItemKey(item.productId, item.variantId), item])
            );

            for (const incoming of incomingItems.values()) {
                const key = cartItemKey(incoming.productId, incoming.variantId);
                const existing = existingByKey.get(key);

                if (existing) {
                    const newQty = Math.max(existing.quantity, incoming.quantity);
                    if (newQty !== existing.quantity) {
                        await prisma.cartItem.update({
                            where: { id: existing.id },
                            data: { quantity: newQty },
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
                            quantity: incoming.quantity
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

// DELETE /api/cart — clear entire cart
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
