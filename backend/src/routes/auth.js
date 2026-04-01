import express from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import admin from '../utils/firebase.js';
import { protect } from '../middleware/auth.js';
import { transporter } from '../utils/nodemailer.js';

const router = express.Router();

function generateReferralCode() {
    return 'TN' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

/** Comma-separated in ADMIN_EMAILS; defaults to primary owner account. */
function adminEmailSet() {
    const raw = process.env.ADMIN_EMAILS || 'lakshyavarshney2003@gmail.com';
    return new Set(raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

function isAdminEmail(email) {
    return Boolean(email && adminEmailSet().has(email.trim().toLowerCase()));
}

// POST /api/auth/register — idempotent, called after every Firebase sign-in/up
router.post('/register', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];
        if (!token) return res.status(401).json({ error: 'Malformed authorization header' });

        let decoded;
        try {
            decoded = await admin.auth().verifyIdToken(token);
        } catch (verifyErr) {
            console.error('verifyIdToken error:', verifyErr);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        const { name, referredByCode } = req.body;

        // 1. Already linked by firebaseUid — return existing user
        const byUid = await prisma.user.findUnique({
            where: { firebaseUid: decoded.uid },
        });
        if (byUid) {
            let userRow = byUid;
            if (isAdminEmail(byUid.email) && byUid.role !== 'admin') {
                userRow = await prisma.user.update({
                    where: { id: byUid.id },
                    data: { role: 'admin' },
                });
            }
            return res.json({
                user: {
                    id: userRow.id,
                    name: userRow.name,
                    email: userRow.email,
                    role: userRow.role,
                    phone: userRow.phone,
                    referralCode: userRow.referralCode,
                    walletBalance: userRow.walletBalance,
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
                    data: {
                        firebaseUid: decoded.uid,
                        ...(isAdminEmail(decoded.email) ? { role: 'admin' } : {}),
                    },
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

        let referredById = null;
        if (referredByCode) {
            const referrer = await prisma.user.findFirst({
                where: { referralCode: referredByCode.trim().toUpperCase() },
            });
            if (referrer) referredById = referrer.id;
        }

        const newUser = await prisma.user.create({
            data: {
                firebaseUid: decoded.uid,
                email: decoded.email || `firebase_${decoded.uid}@noemail.local`,
                name: name || decoded.name || null,
                referralCode,
                referredById,
                role: isAdminEmail(decoded.email) ? 'admin' : 'customer',
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

// POST /api/auth/forgot-password — generate reset link & send branded email
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    // Always respond with success to prevent email enumeration
    const okResponse = { success: true, message: 'If an account exists, a reset link has been sent.' };

    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const actionCodeSettings = {
            url: `${frontendUrl}/sign-in`,
            handleCodeInApp: false,
        };

        const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

        const year = new Date().getFullYear();

        const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 50%,#EC4899 100%);padding:40px 40px 32px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Shoptify</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Password Reset</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 16px;">
              <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1a2e;">Reset your password</h2>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#555770;">
                We received a request to reset the password for your Shoptify account. Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 0 32px;">
                    <a href="${resetLink}" target="_blank"
                       style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(79,70,229,0.35);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #e8e8ef;padding:24px 0 0;"></td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Button not working? Copy this link:</p>
              <p style="margin:0 0 28px;font-size:13px;line-height:1.5;color:#4F46E5;word-break:break-all;">
                <a href="${resetLink}" target="_blank" style="color:#4F46E5;text-decoration:underline;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- Security notice -->
          <tr>
            <td style="padding:0 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f7ff;border-radius:12px;border:1px solid #ede9fe;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#4F46E5;">Didn't request this?</p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#555770;">
                      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9fb;padding:28px 40px;border-top:1px solid #eeecf5;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#999;">Shoptify</p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#b0b0c0;">
                Your marketplace, learning hub &amp; tech partner.<br>
                &copy; ${year} Shoptify. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('\n[LOCAL DEV MOCK: Password Reset Email]');
            console.log(`To: ${email}`);
            console.log(`Subject: Reset your Shoptify password`);
            console.log(`Reset link: ${resetLink}`);
            console.log('----------------------------------------\n');
            return res.json(okResponse);
        }

        await transporter.sendMail({
            from: `"Shoptify" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Reset your Shoptify password',
            html,
        });

        return res.json(okResponse);
    } catch (err) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
            return res.json(okResponse);
        }
        console.error('Forgot-password error:', err);
        return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
    }
});

export default router;
