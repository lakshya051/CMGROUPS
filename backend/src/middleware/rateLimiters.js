import rateLimit from 'express-rate-limit';

/**
 * Per-route rate limiters for sensitive mutations.
 *
 * The global limiter in app.js caps total requests per IP, which is good for
 * reads but too loose for write endpoints that can abuse the system (spammy
 * reviews, reset-password flooding, address table bloat, contact-form spam).
 * These stricter limiters apply to specific write endpoints only, so they
 * don't interfere with normal browsing.
 */

const common = {
    standardHeaders: 'draft-7',
    legacyHeaders: false,
};

// Password reset: expensive (sends emails), abusable for enumeration.
export const resetPasswordLimiter = rateLimit({
    ...common,
    windowMs: 60 * 60 * 1000,
    limit: 5,
    message: { error: 'Too many password reset requests. Please try again later.' },
});

// Write review / helpful vote: 10 per 15 minutes per IP.
export const reviewWriteLimiter = rateLimit({
    ...common,
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: { error: 'Too many review submissions. Please slow down.' },
});

// Address create/update/delete: 30 per 15 minutes per IP.
export const addressWriteLimiter = rateLimit({
    ...common,
    windowMs: 15 * 60 * 1000,
    limit: 30,
    message: { error: 'Too many address updates. Please try again later.' },
});

// Contact / enquiry form submissions: 5 per hour per IP.
export const contactFormLimiter = rateLimit({
    ...common,
    windowMs: 60 * 60 * 1000,
    limit: 5,
    message: { error: 'Too many enquiry submissions from this IP. Please try again later.' },
});

// Service booking / application submissions: 10 per hour per IP.
export const bookingCreateLimiter = rateLimit({
    ...common,
    windowMs: 60 * 60 * 1000,
    limit: 10,
    message: { error: 'Too many booking submissions. Please slow down.' },
});
