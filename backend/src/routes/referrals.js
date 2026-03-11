import express from 'express';
import prisma from '../lib/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/referrals/my-stats — Get my referral code, wallet, stats
router.get('/my-stats', protect, async (req, res) => {
    try {
        const [
            user,
            totalReferrals,
            successfulReferrals,
            pendingReferrals,
            shoppingReferrals,
            courseReferrals,
            serviceReferrals,
            totalEarnings,
            myReceivedEarnings
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: req.user.id },
                select: { referralCode: true, walletBalance: true }
            }),
            prisma.referral.count({
                where: { referrerId: req.user.id }
            }),
            prisma.referral.count({
                where: { referrerId: req.user.id, status: 'rewarded' }
            }),
            prisma.referral.count({
                where: { referrerId: req.user.id, status: 'pending' }
            }),
            prisma.referral.count({
                where: { referrerId: req.user.id, source: 'shopping' }
            }),
            prisma.referral.count({
                where: { referrerId: req.user.id, source: 'course' }
            }),
            prisma.referral.count({
                where: { referrerId: req.user.id, source: 'service' }
            }),
            prisma.referral.aggregate({
                where: { referrerId: req.user.id, status: 'rewarded' },
                _sum: { rewardAmount: true }
            }),
            prisma.referral.aggregate({
                where: { refereeId: req.user.id, status: 'rewarded' },
                _sum: { refereeReward: true }
            })
        ]);

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        res.json({
            referralCode: user.referralCode,
            walletBalance: user.walletBalance,
            totalReferrals,
            successfulReferrals,
            pendingReferrals,
            shoppingReferrals,
            courseReferrals,
            serviceReferrals,
            totalEarnings: totalEarnings._sum.rewardAmount || 0,
            myReceivedEarnings: myReceivedEarnings._sum.refereeReward || 0,
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
        const { source } = req.query; // 'shopping' | 'course' | 'service' | undefined
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

// GET /api/referrals/my-received — Referrals where I was the referee
router.get('/my-received', protect, async (req, res) => {
    try {
        const referrals = await prisma.referral.findMany({
            where: { refereeId: req.user.id },
            include: {
                referrer: {
                    select: { id: true, name: true, email: true, referralCode: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(referrals);
    } catch (error) {
        console.error('Get my received referrals error:', error);
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

export default router;
