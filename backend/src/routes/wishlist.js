const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protect } = require('../middleware/auth');

// @route   GET /api/wishlist
// @desc    Get user's wishlist items
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const wishlistItems = await prisma.wishlist.findMany({
            where: { userId: req.user.id },
            include: { product: true },
            orderBy: { createdAt: 'desc' }
        });

        // Return only the products
        const products = wishlistItems.map(item => item.product);
        res.json(products);
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/wishlist/:productId
// @desc    Add product to wishlist
// @access  Private
router.post('/:productId', protect, async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);

        // Check if product exists
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const existingItem = await prisma.wishlist.findUnique({
            where: {
                userId_productId: {
                    userId: req.user.id,
                    productId: productId
                }
            }
        });

        if (existingItem) {
            return res.status(400).json({ error: 'Product already in wishlist' });
        }

        const wishlistItem = await prisma.wishlist.create({
            data: {
                userId: req.user.id,
                productId: productId
            },
            include: { product: true }
        });

        res.status(201).json(wishlistItem.product);
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/wishlist/:productId
// @desc    Remove product from wishlist
// @access  Private
router.delete('/:productId', protect, async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);

        await prisma.wishlist.delete({
            where: {
                userId_productId: {
                    userId: req.user.id,
                    productId: productId
                }
            }
        });

        res.json({ message: 'Product removed from wishlist', productId });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(400).json({ error: 'Product not in wishlist' });
        }
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/wishlist
// @desc    Clear entire wishlist
// @access  Private
router.delete('/', protect, async (req, res) => {
    try {
        await prisma.wishlist.deleteMany({
            where: { userId: req.user.id }
        });

        res.json({ message: 'Wishlist cleared' });
    } catch (error) {
        console.error('Clear wishlist error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
