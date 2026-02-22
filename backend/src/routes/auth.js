const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { generateToken } = require('../utils/jwt');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/nodemailer');
const { sendSMS } = require('../utils/smsNotifications');

const router = express.Router();

// Generate a unique referral code like TN + 6 hex chars
function generateReferralCode() {
    return 'TN' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ error: 'Name, email, phone, and password are required' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const existingPhone = await prisma.user.findFirst({ where: { phone } });
        if (existingPhone) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        let newCode;
        let codeUnique = false;
        while (!codeUnique) {
            newCode = generateReferralCode();
            const existing = await prisma.user.findFirst({ where: { referralCode: newCode } });
            if (!existing) codeUnique = true;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate 6-digit OTP for email verification
        const verificationOtp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone: phone,
                role: 'customer',
                referralCode: newCode,
                isVerified: false,
                otp: verificationOtp,
                otpExpires: otpExpires
            }
        });

        // Send Verification Email
        const emailSent = await sendVerificationEmail(email, verificationOtp);
        if (!emailSent) {
            console.error(`Failed to send verification email to ${email}`);
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please check your email to verify your account.',
            userId: user.id
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ error: 'User is already verified' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // Check expiry
        if (user.otpExpires && new Date() > user.otpExpires) {
            return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        }

        // Verify user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                otp: null,
                otpExpires: null
            }
        });

        res.json({
            success: true,
            message: 'Email verified successfully! You can now login.'
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ error: 'Account already verified' });
        }

        const verificationOtp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp: verificationOtp,
                otpExpires: otpExpires
            }
        });

        const emailSent = await sendVerificationEmail(email, verificationOtp);

        res.json({
            success: emailSent,
            message: emailSent ? 'Verification email sent successfully' : 'Failed to send verification email'
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Email/phone and password are required' });
        }

        // Try to find user by email first, then by phone
        let user = await prisma.user.findUnique({ where: { email: identifier } });
        if (!user) {
            user = await prisma.user.findFirst({ where: { phone: identifier } });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ error: 'Account not verified. Please check your email.', isVerified: false });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user.id, user.role);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                referralCode: user.referralCode,
                walletBalance: user.walletBalance
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


// GET /api/auth/me (Protected)
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

// PUT /api/auth/profile (Protected - update name, phone, password)
router.put('/profile', protect, async (req, res) => {
    try {
        const { name, phone, currentPassword, newPassword } = req.body;

        const updateData = {};

        if (name) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone || null;

        // Password change
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required to set a new password' });
            }

            const user = await prisma.user.findUnique({ where: { id: req.user.id } });
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }

            updateData.password = await bcrypt.hash(newPassword, 10);
        }

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
