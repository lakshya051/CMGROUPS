const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { protect } = require('../middleware/auth');

const router = express.Router();

function generateReferralCode() {
    return 'TN' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// GET /api/auth/me (Protected — Clerk auth)
router.get('/me', protect, async (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            phone: req.user.phone,
            referralCode: req.user.referralCode,
            walletBalance: req.user.walletBalance
        }
    });
});

// POST /api/auth/onboarding (Protected — collect phone after Clerk sign-up)
router.post('/onboarding', protect, async (req, res) => {
    try {
        const { phone, name } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const existingPhone = await prisma.user.findFirst({
            where: { phone, NOT: { id: req.user.id } }
        });
        if (existingPhone) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        const updateData = { phone };
        if (name) updateData.name = name;

        if (!req.user.referralCode) {
            let newCode;
            let codeUnique = false;
            while (!codeUnique) {
                newCode = generateReferralCode();
                const existing = await prisma.user.findFirst({ where: { referralCode: newCode } });
                if (!existing) codeUnique = true;
            }
            updateData.referralCode = newCode;
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData
        });

        res.json({
            success: true,
            message: 'Onboarding complete',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                referralCode: updatedUser.referralCode,
                walletBalance: updatedUser.walletBalance
            }
        });
    } catch (error) {
        console.error('Onboarding error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/auth/profile (Protected — update name and phone)
router.put('/profile', protect, async (req, res) => {
    try {
        const { name, phone } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone || null;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No changes to save' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                referralCode: updatedUser.referralCode,
                walletBalance: updatedUser.walletBalance
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
