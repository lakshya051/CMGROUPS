const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    limit: 20, // Limit each IP to 20 auth requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many login attempts from this IP, please try again after an hour' }
});

// Middleware
app.use(limiter); // apply standard rate limiter to all requests
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Input Validation/Sanitization Middleware (Basic XSS protection)
const sanitizeInput = (req, res, next) => {
    // Basic string sanitization (could be replaced with a library like DOMPurify for more robust logic)
    const sanitizeObj = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                // Strip out basic script tags
                obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            } else if (typeof obj[key] === 'object') {
                sanitizeObj(obj[key]);
            }
        }
    };

    sanitizeObj(req.body);
    sanitizeObj(req.query);
    sanitizeObj(req.params);
    next();
};

app.use(sanitizeInput);

// API Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/services', require('./routes/services'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/tally', require('./routes/tally'));

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'TechNova API is running', version: '1.0.0' });
});

// Error handling middleware
// Error handling middleware
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

module.exports = app;
