import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { clerkMiddleware } from '@clerk/express';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import serviceRoutes from './routes/services.js';
import couponRoutes from './routes/coupons.js';
import adminRoutes from './routes/admin.js';
import categoryRoutes from './routes/categories.js';
import referralRoutes from './routes/referrals.js';
import alertRoutes from './routes/alerts.js';
import notificationRoutes from './routes/notifications.js';
import courseRoutes from './routes/courses.js';
import applicationRoutes from './routes/applications.js';
import wishlistRoutes from './routes/wishlist.js';
import tallyRoutes from './routes/tally.js';
import webhookRoutes from './routes/webhooks.js';
import cartRoutes from './routes/cart.js';
import bannerRoutes from './routes/banners.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render)

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many login attempts from this IP, please try again after an hour' }
});

app.use(limiter);
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'https://cmgroups.vercel.app',
        // Capacitor mobile origins
        'capacitor://localhost',   // iOS
        'http://localhost',        // Android WebView internal
    ],
    credentials: true
}));

// Webhook route must come before express.json() — svix needs the raw body
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(clerkMiddleware());

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/tally', tallyRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/banners', bannerRoutes);


app.get('/', (req, res) => {
    res.json({ status: 'TechNova API is running', version: '1.0.0' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

export default app;
