import express from 'express';
import prisma from '../lib/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// POST /api/reviews/:productId (Protected)
router.post('/:productId', protect, async (req, res) => {
    try {
        const { rating, comment, images } = req.body;
        const productId = parseInt(req.params.productId);

        const parsedRating = Number(rating);
        if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
        }

        if (comment && typeof comment === 'string' && comment.length > 2000) {
            return res.status(400).json({ error: 'Comment must be 2000 characters or fewer' });
        }

        if (images && (!Array.isArray(images) || images.length > 5)) {
            return res.status(400).json({ error: 'Maximum 5 review images allowed' });
        }

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
                rating: parsedRating,
                comment,
                images: images || [],
                isVerified: !!hasBought
            }
        });

        // Update product rating using DB aggregate instead of loading all reviews in memory.
        const aggregate = await prisma.review.aggregate({
            where: { productId },
            _avg: { rating: true },
            _count: { id: true }
        });
        const avgRating = aggregate._avg.rating || 0;
        const totalReviews = aggregate._count.id || 0;

        await prisma.product.update({
            where: { id: productId },
            data: { rating: Math.round(avgRating * 10) / 10, numReviews: totalReviews }
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

// ============ BUNDLE REVIEWS ============

// POST /api/reviews/bundle/:bundleId (Protected)
router.post('/bundle/:bundleId', protect, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const bundleId = parseInt(req.params.bundleId);

        const parsedRating = Number(rating);
        if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
        }

        if (comment && typeof comment === 'string' && comment.length > 2000) {
            return res.status(400).json({ error: 'Comment must be 2000 characters or fewer' });
        }

        const existing = await prisma.bundleReview.findFirst({
            where: { userId: req.user.id, bundleId },
        });
        if (existing) {
            return res.status(400).json({ error: 'Already reviewed this bundle' });
        }

        const hasBought = await prisma.orderItem.findFirst({
            where: {
                bundleId,
                order: { userId: req.user.id, status: 'Delivered' },
            },
        });

        const review = await prisma.bundleReview.create({
            data: {
                userId: req.user.id,
                bundleId,
                rating: parsedRating,
                comment: comment || null,
                isVerified: !!hasBought,
            },
        });

        res.status(201).json(review);
    } catch (error) {
        console.error('Create bundle review error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/reviews/bundle/:bundleId (Public)
router.get('/bundle/:bundleId', async (req, res) => {
    try {
        const reviews = await prisma.bundleReview.findMany({
            where: { bundleId: parseInt(req.params.bundleId) },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(reviews);
    } catch (error) {
        console.error('Get bundle reviews error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/reviews/bundle/:reviewId/helpful (Protected)
router.post('/bundle/:reviewId/helpful', protect, async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const review = await prisma.bundleReview.findUnique({ where: { id: reviewId } });
        if (!review) return res.status(404).json({ error: 'Review not found' });

        const userId = req.user.id;
        let voters = review.voters || [];
        if (voters.includes(userId)) {
            voters = voters.filter(id => id !== userId);
        } else {
            voters.push(userId);
        }

        const updated = await prisma.bundleReview.update({
            where: { id: reviewId },
            data: { voters, helpfulVotes: voters.length },
        });

        res.json(updated);
    } catch (error) {
        console.error('Bundle review help vote error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/reviews/pending-bundles (Protected - get user's bundles pending review)
router.get('/pending-bundles', protect, async (req, res) => {
    try {
        const deliveredBundleItems = await prisma.orderItem.findMany({
            where: {
                order: { userId: req.user.id, status: 'Delivered' },
                bundleId: { not: null },
            },
            select: { bundleId: true },
            distinct: ['bundleId'],
        });

        const bundleIds = deliveredBundleItems.map(i => i.bundleId).filter(Boolean);
        if (bundleIds.length === 0) return res.json([]);

        const alreadyReviewed = await prisma.bundleReview.findMany({
            where: { userId: req.user.id, bundleId: { in: bundleIds } },
            select: { bundleId: true },
        });
        const reviewedSet = new Set(alreadyReviewed.map(r => r.bundleId));

        const pendingIds = bundleIds.filter(id => !reviewedSet.has(id));
        if (pendingIds.length === 0) return res.json([]);

        const bundles = await prisma.bundle.findMany({
            where: { id: { in: pendingIds } },
            select: { id: true, name: true, image: true, slug: true },
        });

        res.json(bundles);
    } catch (error) {
        console.error('Pending bundle reviews error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
