const express = require('express');
const prisma = require('../lib/prisma');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews/:productId (Protected)
router.post('/:productId', protect, async (req, res) => {
    try {
        const { rating, comment, images } = req.body;
        const productId = parseInt(req.params.productId);

        // Check if already reviewed
        const existing = await prisma.review.findFirst({
            where: { userId: req.user.id, productId }
        });
        if (existing) {
            return res.status(400).json({ error: 'Already reviewed this product' });
        }

        const hasBought = await prisma.orderItem.findFirst({
            where: {
                productId: productId,
                order: { userId: req.user.id, status: 'Delivered' }
            }
        });

        const review = await prisma.review.create({
            data: {
                userId: req.user.id,
                productId,
                rating,
                comment,
                images: images || [],
                isVerified: !!hasBought
            }
        });

        // Update product rating
        const allReviews = await prisma.review.findMany({ where: { productId } });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await prisma.product.update({
            where: { id: productId },
            data: { rating: Math.round(avgRating * 10) / 10, numReviews: allReviews.length }
        });

        res.status(201).json(review);
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/reviews/:productId (Public)
router.get('/:productId', async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { productId: parseInt(req.params.productId) },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/reviews/:reviewId/helpful (Protected)
router.post('/:reviewId/helpful', protect, async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const review = await prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) return res.status(404).json({ error: 'Review not found' });

        const userId = req.user.id;

        let voters = review.voters || [];
        if (voters.includes(userId)) {
            voters = voters.filter(id => id !== userId);
        } else {
            voters.push(userId);
        }

        const updated = await prisma.review.update({
            where: { id: reviewId },
            data: { voters: voters, helpfulVotes: voters.length }
        });

        res.json(updated);
    } catch (error) {
        console.error('Help vote error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
