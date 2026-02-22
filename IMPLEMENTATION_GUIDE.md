# PHASED IMPLEMENTATION GUIDE
## Step-by-Step Instructions to Fix All Issues

**Last Updated:** February 22, 2026

---

## 🎯 OVERVIEW

This guide walks you through implementing all fixes in the correct order, ensuring each phase builds on the previous one.

**Total Phases:** 6  
**Estimated Total Time:** 120-160 hours  
**Start with:** Phase 1 (Critical Issues)

---

## 📋 PRE-REQUISITES

Before starting, ensure you have:

- [ ] Node.js and npm installed
- [ ] PostgreSQL database running (or Neon DB connection)
- [ ] Git repository initialized (for version control)
- [ ] `.env` file with `DATABASE_URL`
- [ ] Fast2SMS API key (get from https://www.fast2sms.com/)
- [ ] Gmail SMTP credentials (for email verification - optional)

---

## 🔴 PHASE 1 — CRITICAL ISSUES (Must Fix First)

**Estimated Time:** 25-35 hours  
**Priority:** CRITICAL - App cannot function correctly without these

### Phase 1.1: Phone OTP Verification at Registration

**Time:** 6-8 hours  
**Dependencies:** Fast2SMS API key

#### Step 1: Install Fast2SMS Package

```bash
cd backend
npm install axios  # We'll use axios for Fast2SMS API calls
```

#### Step 2: Create Fast2SMS Utility

Create `backend/src/utils/fast2sms.js`:

```javascript
const axios = require('axios');

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

/**
 * Send OTP via Fast2SMS
 * @param {string} phoneNumber - 10-digit phone number
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<boolean>} - Success status
 */
async function sendOTP(phoneNumber, otp) {
    try {
        // Remove any spaces, dashes, or country code
        const cleanPhone = phoneNumber.replace(/[\s\-+]|^91/g, '');
        
        if (cleanPhone.length !== 10) {
            throw new Error('Invalid phone number format');
        }

        const message = `Your TechNova verification code is ${otp}. Valid for 10 minutes. Do not share this code.`;
        
        const response = await axios.post(FAST2SMS_URL, {
            message,
            language: 'english',
            route: 'q',
            numbers: cleanPhone
        }, {
            headers: {
                'authorization': FAST2SMS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.return === true) {
            console.log(`OTP sent to ${cleanPhone}: ${otp}`);
            return true;
        } else {
            console.error('Fast2SMS error:', response.data);
            return false;
        }
    } catch (error) {
        console.error('Failed to send OTP:', error.message);
        return false;
    }
}

module.exports = { sendOTP };
```

#### Step 3: Add Environment Variable

Add to `backend/.env`:

```env
FAST2SMS_API_KEY=your_fast2sms_api_key_here
```

#### Step 4: Modify Registration Endpoint

Update `backend/src/routes/auth.js`:

**BEFORE (lines 17-77):**
```javascript
router.post('/register', async (req, res) => {
    // Creates user immediately - WRONG
    const user = await prisma.user.create({...});
    const token = generateToken(user.id, user.role);
    res.status(201).json({ success: true, token, user });
});
```

**AFTER:**
```javascript
const { sendOTP } = require('../utils/fast2sms');

// POST /api/auth/register - Step 1: Send OTP
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ error: 'Name, email, phone, and password are required' });
        }

        // Check if email exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check if phone exists
        const existingPhone = await prisma.user.findFirst({ where: { phone } });
        if (existingPhone) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create user with isVerified: false
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate unique referral code
        let newCode;
        let codeUnique = false;
        while (!codeUnique) {
            newCode = generateReferralCode();
            const existing = await prisma.user.findFirst({ where: { referralCode: newCode } });
            if (!existing) codeUnique = true;
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone: phone,
                role: 'customer',
                referralCode: newCode,
                isVerified: false, // NOT verified yet
                otp: otp,
                otpExpires: otpExpires
            }
        });

        // Send OTP via Fast2SMS
        const otpSent = await sendOTP(phone, otp);
        if (!otpSent) {
            // If SMS fails, still create user but log error
            console.error(`Failed to send OTP to ${phone}, but user created`);
        }

        // DO NOT return token - user must verify OTP first
        res.status(201).json({
            success: true,
            message: 'OTP sent to your phone. Please verify to activate your account.',
            userId: user.id,
            phone: user.phone
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/verify-phone-otp - Step 2: Verify OTP and activate account
router.post('/verify-phone-otp', async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({ error: 'User ID and OTP are required' });
        }

        const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ error: 'Account already verified' });
        }

        // Check OTP
        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // Check expiry
        if (user.otpExpires && new Date() > user.otpExpires) {
            return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        }

        // Verify account
        const verifiedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                otp: null,
                otpExpires: null
            }
        });

        // Generate token and login
        const token = generateToken(verifiedUser.id, verifiedUser.role);

        res.json({
            success: true,
            message: 'Phone verified successfully!',
            token,
            user: {
                id: verifiedUser.id,
                name: verifiedUser.name,
                email: verifiedUser.email,
                role: verifiedUser.role,
                phone: verifiedUser.phone,
                referralCode: verifiedUser.referralCode,
                walletBalance: verifiedUser.walletBalance
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/resend-otp - Resend OTP if expired
router.post('/resend-otp', async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ error: 'Account already verified' });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: { otp, otpExpires }
        });

        const otpSent = await sendOTP(user.phone, otp);

        res.json({
            success: otpSent,
            message: otpSent ? 'OTP sent successfully' : 'Failed to send OTP'
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
```

#### Step 5: Update Frontend Signup Page

Update `frontend/src/pages/Signup.jsx` to add OTP verification step:

```jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { User, Mail, Lock, Phone, Shield } from 'lucide-react';

const Signup = () => {
    const [step, setStep] = useState(1); // 1: Registration form, 2: OTP verification
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', password: ''
    });
    const [otp, setOtp] = useState('');
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (step === 1) {
            // Step 1: Submit registration form
            try {
                const response = await fetch('http://localhost:5000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    setUserId(data.userId);
                    setStep(2); // Move to OTP step
                } else {
                    setError(data.error || 'Registration failed');
                }
            } catch (err) {
                setError('Something went wrong. Please try again.');
            }
        } else {
            // Step 2: Verify OTP
            try {
                const response = await fetch('http://localhost:5000/api/auth/verify-phone-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, otp })
                });

                const data = await response.json();

                if (response.ok) {
                    // Store token and user
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    navigate('/dashboard');
                } else {
                    setError(data.error || 'Invalid OTP');
                }
            } catch (err) {
                setError('Verification failed. Please try again.');
            }
        }
    };

    const handleResendOTP = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await response.json();
            if (data.success) {
                alert('OTP resent successfully!');
            }
        } catch (err) {
            alert('Failed to resend OTP');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
            <div className="w-full max-w-md p-8 glass-panel animate-in fade-in zoom-in duration-300">
                {step === 1 ? (
                    <>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-heading font-bold text-text-main mb-2">Create Account</h1>
                            <p className="text-text-muted">Join TechNova today</p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Registration form fields - same as before */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        name="name"
                                        type="text"
                                        className="input-field pl-10"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            {/* ... other fields (email, phone, password) ... */}
                            <Button type="submit" className="w-full mt-4" size="lg">Sign Up</Button>
                        </form>
                    </>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield size={32} />
                            </div>
                            <h1 className="text-3xl font-heading font-bold text-text-main mb-2">Verify Your Phone</h1>
                            <p className="text-text-muted">We sent a 6-digit code to {formData.phone}</p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">Enter OTP</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        className="input-field pl-10 text-center text-2xl font-mono tracking-widest"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength={6}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full" size="lg">Verify & Activate</Button>
                            
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                className="w-full text-sm text-primary hover:underline"
                            >
                                Didn't receive? Resend OTP
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default Signup;
```

#### Step 6: Test

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Try registering a new user
4. Check phone for OTP
5. Enter OTP to verify
6. Verify user can login after verification

---

### Phase 1.2: Remove Firebase Integration

**Time:** 1-2 hours  
**Dependencies:** None

#### Step 1: Delete Firebase Files

```bash
# Delete backend Firebase file
rm backend/src/lib/firebaseAdmin.js

# Delete frontend Firebase file
rm frontend/src/lib/firebase.js
```

#### Step 2: Remove Firebase Login Endpoint

In `backend/src/routes/auth.js`, **DELETE** lines 79-162 (the entire `/firebase-login` endpoint).

#### Step 3: Remove Firebase Dependencies

In `backend/package.json`, remove:
```json
"firebase-admin": "^13.6.1"
```

In `frontend/package.json`, if Firebase is listed, remove it.

#### Step 4: Remove Firebase from Frontend (if used)

Search `frontend/src` for any imports of `firebase.js` and remove them.

#### Step 5: Remove Environment Variables

Remove from `.env` files:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `VITE_FIREBASE_API_KEY` (frontend)

#### Step 6: Test

1. Restart backend
2. Verify no Firebase errors in console
3. Test normal login/registration still works

---

### Phase 1.3: Fix Referral Points Logic

**Time:** 4-6 hours  
**Dependencies:** None

#### Step 1: Remove Immediate Credit from Order Creation

In `backend/src/routes/orders.js`, **REMOVE** lines 85-114 (the referral reward block that credits immediately).

**BEFORE:**
```javascript
// Decrease stock AFTER successful order creation
for (const item of items) {
    await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
    });
}

// *** ORDER-BASED REFERRAL REWARD ***
// If a valid referral code was provided, reward the referrer
if (referrer) {
    try {
        const rewardAmount = 200; // ₹200 per referral
        // ... credits wallet immediately - WRONG!
    }
}
```

**AFTER:**
```javascript
// Decrease stock AFTER successful order creation
for (const item of items) {
    await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
    });
}

// Store referral code in order for later (when payment verified)
// We'll credit points in verify-payment handler
```

#### Step 2: Add Referral Code to Order Model

Check if Order model has a field to store referral code. If not, add migration:

```bash
cd backend
npx prisma migrate dev --name add_referral_code_to_order
```

In migration, add:
```sql
ALTER TABLE "Order" ADD COLUMN "referralCodeUsed" TEXT;
```

Or update `backend/prisma/schema.prisma`:
```prisma
model Order {
  // ... existing fields ...
  referralCodeUsed String?  // Store referral code used at checkout
}
```

Then run migration.

#### Step 3: Store Referral Code When Creating Order

In `backend/src/routes/orders.js`, modify order creation to store referral code:

```javascript
const order = await prisma.order.create({
    data: {
        userId: req.user.id,
        total,
        status: 'Processing',
        paymentMethod: paymentMethod || 'pay_at_store',
        paymentOtp: otp,
        isPaid: false,
        shippingAddress: shippingAddress || null,
        referralCodeUsed: referralCode ? referralCode.trim().toUpperCase() : null, // Store referral code
        items: {
            create: items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
            }))
        }
    },
    include: { items: true }
});
```

#### Step 4: Add Referral Credit Logic to Verify-Payment Handler

In `backend/src/routes/orders.js`, find the `POST /api/orders/:id/verify-payment` handler (around line 220) and **ADD** referral credit logic:

```javascript
// POST /api/orders/:id/verify-payment (Admin - verify OTP to mark as paid)
router.post('/:id/verify-payment', protect, adminOnly, async (req, res) => {
    try {
        const { otp } = req.body;
        const orderId = parseInt(req.params.id);

        const order = await prisma.order.findUnique({ 
            where: { id: orderId },
            include: { user: true } // Include user to get buyer info
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.isPaid) {
            return res.status(400).json({ error: 'Order is already paid' });
        }

        if (order.paymentOtp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Payment not verified.' });
        }

        // Mark order as paid
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                isPaid: true,
                paymentOtp: null,
                status: 'Confirmed'
            }
        });

        // *** REFERRAL REWARD - Credit points ONLY after payment verified ***
        if (order.referralCodeUsed) {
            try {
                const rewardAmount = 200; // TODO: Get from admin settings (Phase 3.1)

                // Find referrer by code
                const referrer = await prisma.user.findFirst({
                    where: { referralCode: order.referralCodeUsed }
                });

                if (referrer && referrer.id !== order.userId) {
                    // Credit referrer
                    await prisma.user.update({
                        where: { id: referrer.id },
                        data: { walletBalance: { increment: rewardAmount } }
                    });

                    // Create referral record for referrer
                    await prisma.referral.create({
                        data: {
                            referrerId: referrer.id,
                            refereeId: order.userId,
                            status: 'rewarded',
                            rewardAmount,
                            orderId: order.id,
                            completedAt: new Date()
                        }
                    });

                    // Credit buyer (person who made purchase)
                    await prisma.user.update({
                        where: { id: order.userId },
                        data: { walletBalance: { increment: rewardAmount } }
                    });

                    // Create referral record for buyer (optional - or track in same record)
                    // For now, we'll just credit the wallet

                    console.log(`Referral reward: ₹${rewardAmount} credited to referrer ${referrer.id} and buyer ${order.userId} from order ${order.id}`);
                }
            } catch (refErr) {
                // Don't fail payment verification if referral reward fails
                console.error('Referral reward error (non-blocking):', refErr);
            }
        }

        res.json({ 
            success: true, 
            message: 'Payment verified successfully!', 
            order: updatedOrder 
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
```

#### Step 5: Test

1. Create an order with a referral code
2. Verify order is created but **no points credited yet**
3. Admin verifies payment via OTP
4. Check both referrer and buyer wallets are credited
5. Verify referral records are created

---

## ✅ PHASE 1 COMPLETE CHECKLIST

- [ ] Phone OTP verification working at registration
- [ ] Users cannot login until phone verified
- [ ] Firebase completely removed
- [ ] No Firebase errors in console
- [ ] Referral points NOT credited at order creation
- [ ] Referral points credited ONLY when admin verifies payment
- [ ] Both referrer AND buyer receive points
- [ ] All tests passing

---

## 🟡 PHASE 2 — CORE FEATURES

**Estimated Time:** 30-40 hours  
**Priority:** High - Main functionality

### Phase 2.1: Phone + OTP Login

**Time:** 4-6 hours  
**Dependencies:** Fast2SMS (Phase 1.1)

#### Step 1: Add Phone OTP Login Endpoints

In `backend/src/routes/auth.js`, add:

```javascript
// POST /api/auth/login-phone-otp - Send OTP for phone login
router.post('/login-phone-otp', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Find user by phone
        const user = await prisma.user.findFirst({ where: { phone } });

        if (!user) {
            return res.status(404).json({ error: 'No account found with this phone number' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        // Store OTP
        await prisma.user.update({
            where: { id: user.id },
            data: { otp, otpExpires }
        });

        // Send OTP
        const otpSent = await sendOTP(phone, otp);

        res.json({
            success: otpSent,
            message: otpSent ? 'OTP sent to your phone' : 'Failed to send OTP',
            userId: user.id
        });
    } catch (error) {
        console.error('Login OTP error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/verify-login-otp - Verify OTP and login
router.post('/verify-login-otp', async (req, res) => {
    try {
        const { userId, otp } = req.body;

        const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (user.otpExpires && new Date() > user.otpExpires) {
            return res.status(400).json({ error: 'OTP expired' });
        }

        // Clear OTP
        await prisma.user.update({
            where: { id: user.id },
            data: { otp: null, otpExpires: null }
        });

        // Generate token
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
        console.error('Verify login OTP error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
```

#### Step 2: Update Frontend Login Page

In `frontend/src/pages/Login.jsx`, add OTP flow when phone method is selected:

```jsx
const [otpStep, setOtpStep] = useState(false); // true when OTP sent
const [otp, setOtp] = useState('');
const [loginUserId, setLoginUserId] = useState(null);

// When phone method selected and form submitted:
if (loginMethod === 'phone' && !otpStep) {
    // Send OTP
    const response = await fetch('http://localhost:5000/api/auth/login-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identifier })
    });
    const data = await response.json();
    if (data.success) {
        setOtpStep(true);
        setLoginUserId(data.userId);
    }
} else if (loginMethod === 'phone' && otpStep) {
    // Verify OTP
    const response = await fetch('http://localhost:5000/api/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loginUserId, otp })
    });
    // ... handle login
}
```

---

### Phase 2.2: Email Verification (Optional)

**Time:** 3-4 hours  
**Dependencies:** Nodemailer, Gmail SMTP

#### Step 1: Install Nodemailer

```bash
cd backend
npm install nodemailer
```

#### Step 2: Create Email Utility

Create `backend/src/utils/nodemailer.js`:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // App password, not regular password
    }
});

async function sendVerificationEmail(email, verificationToken) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email - TechNova',
        html: `
            <h2>Email Verification</h2>
            <p>Click the link below to verify your email:</p>
            <a href="${verificationLink}">Verify Email</a>
            <p>Or copy this link: ${verificationLink}</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        return false;
    }
}

module.exports = { sendVerificationEmail };
```

#### Step 3: Add Email Verification Endpoints

In `backend/src/routes/auth.js`, add endpoints for sending and verifying email.

---

### Phase 2.3: Fast2SMS Transactional SMS

**Time:** 2-3 hours  
**Dependencies:** Fast2SMS (Phase 1.1)

#### Step 1: Create SMS Notification Helper

Create `backend/src/utils/smsNotifications.js`:

```javascript
const { sendOTP } = require('./fast2sms');

async function sendOrderConfirmationSMS(phone, orderId) {
    const message = `Your order #${orderId} has been confirmed. Thank you for shopping with TechNova!`;
    // Use Fast2SMS API for transactional SMS
    // Implementation similar to sendOTP
}

async function sendServiceBookingSMS(phone, bookingId, otp) {
    const message = `Your service booking #${bookingId} is confirmed. Pickup OTP: ${otp}. Show this to our technician.`;
    // Send SMS
}

module.exports = { sendOrderConfirmationSMS, sendServiceBookingSMS };
```

#### Step 2: Integrate in Order Routes

In `backend/src/routes/orders.js`, after payment verification, send SMS.

---

### Phase 2.4: Nodemailer Email Notifications

**Time:** 2-3 hours  
**Dependencies:** Nodemailer (Phase 2.2)

Similar to SMS, create email notification helpers and integrate in routes.

---

### Phase 2.5: Course Enrollment Payment

**Time:** 2-3 hours  
**Dependencies:** None (keeping pay at institute)

Add optional "fee received" flag when admin marks course fee collected.

---

## ✅ PHASE 2 COMPLETE CHECKLIST

- [ ] Phone + OTP login working
- [ ] Email verification optional (if implemented)
- [ ] SMS notifications sent for orders/services
- [ ] Email notifications sent for key events
- [ ] Course enrollment payment tracking (optional)

---

## 🟢 PHASE 3 — BUSINESS LOGIC

**Estimated Time:** 20-30 hours  
**Priority:** Medium-High

### Phase 3.1: Admin Referral Settings

**Time:** 8-10 hours

#### Step 1: Create ReferralSettings Model

In `backend/prisma/schema.prisma`:

```prisma
model ReferralSettings {
  id                        Int      @id @default(autoincrement())
  pointsPerProductPurchase  Float    @default(200)
  pointsPerServiceBooking   Float    @default(100)
  pointsPerCourseEnrollment Float    @default(300)
  pointToRupeeRate          Float    @default(100) // 100 points = ₹10
  pointExpiryDays           Int?     // null = no expiry
  tierSystemEnabled         Boolean  @default(false)
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  
  @@unique([id]) // Single settings record
}
```

Run migration.

#### Step 2: Create Default Settings

Create seed or migration to insert default settings.

#### Step 3: Create Admin Endpoints

In `backend/src/routes/admin.js`, add:

```javascript
// GET /api/admin/referral-settings
router.get('/referral-settings', protect, adminOnly, async (req, res) => {
    // Get settings
});

// PUT /api/admin/referral-settings
router.put('/referral-settings', protect, adminOnly, async (req, res) => {
    // Update settings
});
```

#### Step 4: Create Admin UI

Create `frontend/src/pages/admin/AdminReferralSettings.jsx` with form to update settings.

#### Step 5: Use Settings in Referral Logic

Update `backend/src/routes/orders.js` verify-payment handler to use settings instead of hardcoded 200.

---

### Phase 3.2: Tier System Infrastructure

**Time:** 6-8 hours

Add tier fields to User model, TierConfig model, admin toggle.

---

### Phase 3.3: Referral Points Redemption

**Time:** 3-4 hours

Enhance existing redemption logic in checkout.

---

## ✅ PHASE 3 COMPLETE CHECKLIST

- [ ] Admin can configure referral reward amounts
- [ ] Reward amounts used instead of hardcoded values
- [ ] Tier system infrastructure in database
- [ ] Tier system toggle in admin (OFF by default)
- [ ] Points redemption working at checkout

---

## 🔵 PHASE 4-6 — CONTINUE SIMILARLY

Follow the same pattern:
1. Read the issue description in AUDIT_REPORT.md
2. Create/modify files as specified
3. Test thoroughly
4. Move to next item

---

## 🧪 TESTING STRATEGY

After each phase:

1. **Unit Tests:** Test individual functions
2. **Integration Tests:** Test API endpoints
3. **Manual Testing:** Test in browser
4. **Edge Cases:** Test error scenarios

---

## 📝 NOTES

- **Always commit after each phase** - Use git to save progress
- **Test before moving to next phase** - Don't accumulate bugs
- **Read error messages carefully** - They tell you what's wrong
- **Check console logs** - Backend and frontend logs help debug

---

## 🆘 TROUBLESHOOTING

### Fast2SMS not sending OTP
- Check API key in `.env`
- Verify phone number format (10 digits)
- Check Fast2SMS dashboard for credits

### Database errors
- Run migrations: `npx prisma migrate dev`
- Reset if needed: `npx prisma migrate reset` (⚠️ deletes data)

### Frontend not connecting to backend
- Check backend is running on port 5000
- Check CORS settings in `backend/src/app.js`
- Check API URLs in frontend

---

**END OF IMPLEMENTATION GUIDE**
