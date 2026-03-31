import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

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
import cctvRoutes from './routes/cctv.js';
import cartRoutes from './routes/cart.js';
import bannerRoutes from './routes/banners.js';
import addressRoutes from './routes/addresses.js';
import pushRoutes from './routes/push.js';
import uploadRoutes from './routes/upload.js';
import contactRoutes from './routes/contact.js';
import bundleRoutes from './routes/bundles.js';
import bundleTemplateRoutes from './routes/bundleTemplates.js';
import sheetsRoutes from './routes/sheets.js';

const app = express();
if (process.env.TRUST_PROXY) {
    const proxyVal = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isNaN(proxyVal) ? 1 : proxyVal);
}

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

const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' }
});

app.use(compression());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"],
        },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        next();
    });
}
app.use(limiter);
const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://cmgroups.vercel.app',
];
const envOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];
const corsOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;
app.use(cors({
    origin: corsOrigins,
    credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static('uploads', {
    maxAge: '30d',
    etag: true,
}));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', sensitiveLimiter, orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/services', sensitiveLimiter, serviceRoutes);
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
app.use('/api/cctv', cctvRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/push', sensitiveLimiter, pushRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/bundle-templates', bundleTemplateRoutes);
app.use('/api/admin/sheets', sheetsRoutes);

app.get('/', (req, res) => {
    res.json({ status: 'Shoptify API is running', version: '2.0.0' });
});

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
    console.error(err instanceof Error ? err.stack : err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? (err instanceof Error ? err.message : String(err)) : undefined
    });
});

export default app;
