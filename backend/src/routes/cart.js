import express from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
// Apply requireAuth middleware to all cart routes
router.use(requireAuth);

// GET /api/cart
// Fetch the user's current cart from the database
router.get('/', async (req, res) => {
    try {
        const cartItems = await prisma.cartItem.findMany({
            where: { userId: req.user.id },
            include: {
                product: true,
                variant: true
            }
        });

        // Format items to match the frontend expected structure
        const formattedCart = cartItems.map(item => {
            const baseProduct = item.product;
            const variant = item.variant;

            const variantId = variant ? variant.id : null;
            const uniqueId = variantId ? `${baseProduct.id}-${variantId}` : `${baseProduct.id}`;

            return {
                ...baseProduct,
                uniqueId,
                variantId,
                variantName: variant ? variant.name : null,
                price: variant ? variant.price : baseProduct.price,
                stock: variant ? variant.stock : baseProduct.stock,
                quantity: item.quantity,
                cartItemId: item.id // Keep track of the DB id if needed
            };
        });

        res.json(formattedCart);
    } catch (error) {
        console.error('Fetch cart error:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// POST /api/cart/sync
// Sync local cart items with the database. Merges the two, keeping the higher quantity.
router.post('/sync', async (req, res) => {
    try {
        const { items } = req.body; // Array of items from frontend localStorage
        const userId = req.user.id;

        // Fetch current DB cart
        const dbItems = await prisma.cartItem.findMany({
            where: { userId }
        });

        // Map DB items by a unique key for easy lookup
        const dbItemsMap = new Map();
        dbItems.forEach(item => {
            const key = item.variantId ? `${item.productId}-${item.variantId}` : `${item.productId}-null`;
            dbItemsMap.set(key, item);
        });

        const updatedDbItems = [];

        // Process incoming items from frontend
        if (items && Array.isArray(items)) {
            for (const localItem of items) {
                const productId = Number(localItem.id) || Number(localItem.productId); // Depends on how frontend sends it, usually localItem.id is the product id
                if (!productId) continue;

                const variantId = localItem.variantId ? Number(localItem.variantId) : null;
                const quantity = Number(localItem.quantity) || 1;
                const key = variantId ? `${productId}-${variantId}` : `${productId}-null`;

                if (dbItemsMap.has(key)) {
                    // Item exists in DB, update quantity to whichever is higher
                    const dbItem = dbItemsMap.get(key);
                    const newQuantity = Math.max(dbItem.quantity, quantity);

                    if (newQuantity !== dbItem.quantity) {
                        await prisma.cartItem.update({
                            where: { id: dbItem.id },
                            data: { quantity: newQuantity }
                        });
                        dbItem.quantity = newQuantity; // Update local map object
                    }
                    updatedDbItems.push(dbItem);
                    dbItemsMap.delete(key); // Remove from map so we know what's left
                } else {
                    // Item doesn't exist in DB, create it
                    try {
                        const newItem = await prisma.cartItem.create({
                            data: {
                                userId,
                                productId,
                                variantId,
                                quantity
                            }
                        });
                        updatedDbItems.push(newItem);
                    } catch (err) {
                        console.error(`Failed to add item to DB cart. ProductId: ${productId}`, err);
                    }
                }
            }
        }

        // Add remaining DB items that weren't in the local cart
        updatedDbItems.push(...dbItemsMap.values());

        // Fetch the fully populated cart to return to the frontend
        const finalCartItems = await prisma.cartItem.findMany({
            where: { userId },
            include: {
                product: true,
                variant: true
            }
        });

        // Format
        const formattedCart = finalCartItems.map(item => {
            const baseProduct = item.product;
            const variant = item.variant;

            const variantId = variant ? variant.id : null;
            const uniqueId = variantId ? `${baseProduct.id}-${variantId}` : `${baseProduct.id}`;

            return {
                ...baseProduct,
                uniqueId,
                variantId,
                variantName: variant ? variant.name : null,
                price: variant ? variant.price : baseProduct.price,
                stock: variant ? variant.stock : baseProduct.stock,
                quantity: item.quantity,
                cartItemId: item.id
            };
        });

        res.json({ success: true, cart: formattedCart });
    } catch (error) {
        console.error('Sync cart error:', error);
        res.status(500).json({ error: 'Failed to sync cart' });
    }
});

// DELETE /api/cart
// Clear the entire cart for a user (called after order placement)
router.delete('/', async (req, res) => {
    try {
        await prisma.cartItem.deleteMany({
            where: { userId: req.user.id }
        });
        res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

export default router;
