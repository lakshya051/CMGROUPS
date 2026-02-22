const express = require('express');
const prisma = require('../lib/prisma');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/referrals/my-stats — Get my referral code, wallet, stats
router.get('/my-stats', protect, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { referralCode: true, walletBalance: true }
        });

        const totalReferrals = await prisma.referral.count({
            where: { referrerId: req.user.id }
        });

        const successfulReferrals = await prisma.referral.count({
            where: { referrerId: req.user.id, status: 'rewarded' }
        });

        const pendingReferrals = await prisma.referral.count({
            where: { referrerId: req.user.id, status: 'pending' }
        });

        const shoppingReferrals = await prisma.referral.count({
            where: { referrerId: req.user.id, source: 'shopping' }
        });

        const courseReferrals = await prisma.referral.count({
            where: { referrerId: req.user.id, source: 'course' }
        });

        const totalEarnings = await prisma.referral.aggregate({
            where: { referrerId: req.user.id, status: 'rewarded' },
            _sum: { rewardAmount: true }
        });

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        res.json({
            referralCode: user.referralCode,
            walletBalance: user.walletBalance,
            totalReferrals,
            successfulReferrals,
            pendingReferrals,
            shoppingReferrals,
            courseReferrals,
            totalEarnings: totalEarnings._sum.rewardAmount || 0,
            referralLink: `${baseUrl}/signup?ref=${user.referralCode}`
        });
    } catch (error) {
        console.error('Get referral stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/referrals/my-referrals — List all people I referred (optionally filtered by ?source=)
router.get('/my-referrals', protect, async (req, res) => {
    try {
        const { source } = req.query; // 'shopping' | 'course' | undefined (all)
        const where = { referrerId: req.user.id };
        if (source) where.source = source;

        const referrals = await prisma.referral.findMany({
            where,
            include: {
                referee: {
                    select: { id: true, name: true, email: true, createdAt: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(referrals);
    } catch (error) {
        console.error('Get my referrals error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/referrals/apply-wallet — Validate wallet amount at checkout (no DB deduction)
// Actual deduction happens inside the order creation transaction
router.post('/apply-wallet', protect, async (req, res) => {
    try {
        const { amount } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { walletBalance: true }
        });

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const applicableAmount = Math.min(amount, user.walletBalance);

        if (applicableAmount === 0) {
            return res.status(400).json({ error: 'No wallet balance available' });
        }

        // Only return the calculated amount — do NOT update the database
        res.json({
            success: true,
            appliedAmount: applicableAmount,
            remainingBalance: user.walletBalance - applicableAmount
        });
    } catch (error) {
        console.error('Apply wallet error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
