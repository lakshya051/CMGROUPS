import express from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import admin from '../utils/firebase.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

function generateReferralCode() {
    return 'TN' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// POST /api/auth/register — idempotent, called after every Firebase sign-in/up
router.post('/register', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const { name } = req.body;

        // 1. Already linked by firebaseUid — return existing user
        const byUid = await prisma.user.findUnique({
            where: { firebaseUid: decoded.uid },
        });
        if (byUid) {
            return res.json({
                user: {
                    id: byUid.id,
                    name: byUid.name,
                    email: byUid.email,
                    role: byUid.role,
                    phone: byUid.phone,
                    referralCode: byUid.referralCode,
                    walletBalance: byUid.walletBalance,
                },
            });
        }

        // 2. Migration: existing user (from Clerk era) signing in via Firebase for first time
        if (decoded.email) {
            const byEmail = await prisma.user.findUnique({
                where: { email: decoded.email },
            });
            if (byEmail) {
                const migrated = await prisma.user.update({
                    where: { email: decoded.email },
                    data: { firebaseUid: decoded.uid },
                });
                return res.json({
                    user: {
                        id: migrated.id,
                        name: migrated.name,
                        email: migrated.email,
                        role: migrated.role,
                        phone: migrated.phone,
                        referralCode: migrated.referralCode,
                        walletBalance: migrated.walletBalance,
                    },
                });
            }
        }

        // 3. Truly new user
        let referralCode;
        let unique = false;
        while (!unique) {
            referralCode = generateReferralCode();
            const found = await prisma.user.findFirst({ where: { referralCode } });
            if (!found) unique = true;
        }

        const newUser = await prisma.user.create({
            data: {
                firebaseUid: decoded.uid,
                email: decoded.email || `firebase_${decoded.uid}@noemail.local`,
                name: name || decoded.name || null,
                referralCode,
                role: 'customer',
            },
        });

        return res.status(201).json({
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                phone: newUser.phone,
                referralCode: newUser.referralCode,
                walletBalance: newUser.walletBalance,
            },
        });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            phone: req.user.phone,
            referralCode: req.user.referralCode,
            walletBalance: req.user.walletBalance,
        },
    });
});

// POST /api/auth/onboarding (collect phone after sign-up)
router.post('/onboarding', protect, async (req, res) => {
    try {
        const { phone, name } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const existingPhone = await prisma.user.findFirst({
            where: { phone, NOT: { id: req.user.id } },
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

        let updatedUser;
        try {
            updatedUser = await prisma.user.update({
                where: { id: req.user.id },
                data: updateData,
            });
        } catch (err) {
            if (err.code === 'P2002' && err.meta?.target?.includes('referralCode')) {
                return res.status(409).json({ error: 'Referral code collision, please try again.' });
            }
            throw err;
        }

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
                walletBalance: updatedUser.walletBalance,
            },
        });
    } catch (error) {
        console.error('Onboarding error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/auth/profile (update name and phone)
router.put('/profile', protect, async (req, res) => {
    try {
        const { name, phone } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (phone !== undefined && phone) {
            const existingPhone = await prisma.user.findFirst({
                where: { phone, NOT: { id: req.user.id } },
            });
            if (existingPhone) {
                return res.status(400).json({ error: 'Phone number already registered to another account' });
            }
            updateData.phone = phone;
        } else if (phone !== undefined) {
            updateData.phone = null;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No changes to save' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
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
                walletBalance: updatedUser.walletBalance,
            },
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
