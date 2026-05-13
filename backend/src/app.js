import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { PostgresStore } from '@acpr/rate-limit-postgresql';
import prisma, { isBreakerOpen, DBUnavailableError } from './lib/prisma.js';
import cache from './lib/cache.js';
import { logger, requestLoggingMiddleware } from './lib/logger.js';
import { httpMetricsMiddleware, renderMetrics, metricsContentType } from './lib/metrics.js';

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
import adminNotificationRoutes from './routes/adminNotifications.js';
import homeBootstrapRoutes from './routes/homeBootstrap.js';
import featureFlagsRoutes from './routes/featureFlags.js';

const app = express();
// Render, Heroku, etc. set X-Forwarded-For; express-rate-limit requires trust proxy when that header exists.
if (process.env.TRUST_PROXY !== undefined) {
    const proxyVal = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isNaN(proxyVal) ? 1 : proxyVal);
} else if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    app.set('trust proxy', 1);
}

// Dev-only escape hatch: skip all rate limiters when DISABLE_RATE_LIMIT=1.
// Hard-locked to non-production so it can never accidentally ship.
const rateLimitDisabled =
    process.env.NODE_ENV !== 'production' &&
    (process.env.DISABLE_RATE_LIMIT === '1' || process.env.DISABLE_RATE_LIMIT === 'true');
if (rateLimitDisabled) {
    logger.warn('rate limiters disabled (DISABLE_RATE_LIMIT=1, dev only)');
}
const skipWhenDisabled = () => rateLimitDisabled;

// Skip rate limiting on safe `GET` reads. The original 500-req-per-15-min
// global cap was only useful as protection against write abuse; on a single
// shared NAT (office, college, mobile carrier) legitimate browsing would
// exhaust it in seconds. Per-route limiters in middleware/rateLimiters.js
// already cover the actual abuse vectors (reviews, addresses, contact, bookings).
const skipGlobalForReads = (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';

// Per-user keying — when a user is authenticated, key on their user id rather
// than their IP. Same NAT no longer pools all users into one limit bucket.
// Falls back to IP (via the ipv6-safe `ipKeyGenerator` helper) for
// unauthenticated requests; without that helper express-rate-limit refuses to
// boot because IPv6 users could otherwise share a single /128 bucket.
//
// `req.user` is populated by `protect`/`optionalProtect` middleware; for routes
// that haven't run those (eg /api/auth/*) we always fall back to ip.
const perUserOrIpKey = (req) => {
    if (req.user?.id) return `u:${req.user.id}`;
    return ipKeyGenerator(req.ip);
};

// ─── Postgres-backed store ────────────────────────────────────────────────────
// Uses your existing Neon connection (DATABASE_URL) — no Redis required.
// Multi-instance ready: limit counters are shared across Render instances.
//
// TODO: When request volume grows past ~5 K req/min OR you scale beyond a
// handful of Render instances, swap PostgresStore → RedisStore (e.g.
// `rate-limit-redis` against Upstash free tier) for lower per-check latency.
// The express-rate-limit Store interface is identical so it's a one-line
// swap on this file plus a new env var.
const buildStore = (prefix) => {
    if (!process.env.DATABASE_URL) {
        // Dev / test: no DB → fall back to default in-memory store.
        return undefined;
    }
    try {
        const store = new PostgresStore(
            { connectionString: process.env.DATABASE_URL },
            prefix,
        );
        // Fail-open wrapper. If the limiter's DB query fails (Neon cold-start,
        // schema not yet migrated, network blip), we silently treat the
        // request as not-yet-rate-limited rather than serving a 500. A rate
        // limiter is best-effort security, not a correctness invariant —
        // breaking real users because our counter table is sad is much worse
        // than briefly under-counting hits.
        const failOpen = (fn, defaultReturn) => async function (...args) {
            try {
                return await fn.apply(store, args);
            } catch (err) {
                if (process.env.NODE_ENV !== 'test') {
                    console.warn(`[rate-limit ${prefix}] store call failed, failing open:`, err.message);
                }
                return defaultReturn;
            }
        };
        const proxy = Object.create(store);
        proxy.init = (opts) => store.init(opts);
        proxy.increment = failOpen(store.increment, { totalHits: 0, resetTime: undefined });
        proxy.decrement = failOpen(store.decrement);
        proxy.resetKey = failOpen(store.resetKey);
        proxy.resetAll = failOpen(store.resetAll);
        return proxy;
    } catch (err) {
        console.warn(`[rate-limit ${prefix}] failed to construct PostgresStore, falling back to memory:`, err.message);
        return undefined;
    }
};

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => skipWhenDisabled() || skipGlobalForReads(req),
    keyGenerator: perUserOrIpKey,
    store: buildStore('global'),
    message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: skipWhenDisabled,
    // Auth routes intentionally still IP-keyed: pre-login `req.user` is undefined
    // anyway, and we want this to defend against credential-stuffing from a
    // single attacker IP, not from an authenticated session.
    store: buildStore('auth'),
    message: { error: 'Too many login attempts from this IP, please try again after an hour' }
});

const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: skipWhenDisabled,
    keyGenerator: perUserOrIpKey,
    store: buildStore('sensitive'),
    message: { error: 'Too many requests, please try again later' }
});

// Request id + structured logging — mounted before everything so `req.log` is
// available in every later middleware including the rate limiters.
app.use(requestLoggingMiddleware);

// Per-request metrics (latency histogram + total counter) — mounted near the
// top so timing measures the full middleware chain, not just route handlers.
app.use(httpMetricsMiddleware);

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

// HTTP caching for public, idempotent reads. Vercel's edge, Cloudflare, and
// browsers will honour `s-maxage` for shared caches and `stale-while-revalidate`
// to serve a slightly old payload while a refresh runs in the background.
// `private` is intentionally NOT used so a CDN can cache. None of these routes
// vary by user — anything per-user goes through `protect` middleware which is
// not in this list.
const publicReadCachePaths = [
    '/api/products',
    '/api/categories',
    '/api/banners',
    '/api/courses',
    '/api/bundles',
    '/api/bundle-templates',
    '/api/home-bootstrap',
];
app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (!publicReadCachePaths.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
        return next();
    }
    // Skip caching for admin sub-paths (e.g. /api/bundles/admin) — they're
    // protected and may contain inactive items.
    if (req.path.endsWith('/admin') || req.path.includes('/admin/')) return next();
    res.setHeader(
        'Cache-Control',
        'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
    );
    next();
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/home-bootstrap', homeBootstrapRoutes);
app.use('/api/feature-flags', featureFlagsRoutes);
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
app.use('/api/admin/notifications', adminNotificationRoutes);

app.get('/', (req, res) => {
    res.json({ status: 'Shoptify API is running', version: '2.0.0' });
});

// Prometheus-format metrics for scraping. Token-protected via the same
// admin Firebase credentials as the rest of /api/admin (cheap, no new auth
// surface). Anyone with the token can `curl /metrics` and pull histograms,
// counters, breaker state, slow-query counts, etc.
//
// `METRICS_TOKEN` is intentionally a plain shared secret, not OAuth or per-user
// — this is a private observability surface, not a user-facing API. Generate
// one with `openssl rand -hex 32` and store in Render env. If unset (dev) the
// endpoint is open on localhost only.
app.get('/metrics', async (req, res) => {
    const expected = process.env.METRICS_TOKEN;
    if (expected) {
        const got = req.headers['x-metrics-token']
            || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        if (got !== expected) return res.status(401).end();
    } else if (process.env.NODE_ENV === 'production') {
        return res.status(404).end();
    } else if (req.ip && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip)) {
        return res.status(404).end();
    }
    res.setHeader('Content-Type', metricsContentType);
    res.end(await renderMetrics());
});

// DB-aware health check. Use this as the Render health check URL instead of `/`
// so the platform restarts the instance if Postgres is permanently unreachable.
// Test-only cache flush. Lets the cold-vs-warm validation script reset the
// in-memory cache between samples so every "cold" request is actually cold.
// Locked to:
//   • NODE_ENV !== production (no prod surface area)
//   • A static token in the X-Test-Flush-Token header
// If either condition fails we return 404 (don't even acknowledge the route).
app.delete('/api/__test/cache', (req, res) => {
    if (process.env.NODE_ENV === 'production') return res.status(404).end();
    const expected = process.env.TEST_FLUSH_TOKEN || 'loadtest';
    const got = req.headers['x-test-flush-token'];
    if (got !== expected) return res.status(404).end();
    cache.flush();
    res.status(204).end();
});

app.get('/api/health/db', async (req, res) => {
    if (isBreakerOpen()) {
        return res.status(503).json({ db: 'down', breaker: 'open', error: 'circuit-open' });
    }
    const start = Date.now();
    let timer;
    try {
        // 2 s timeout — we don't want this endpoint itself to hang for the full
        // Prisma client timeout when the DB is sick.
        const queryPromise = prisma.$queryRaw`SELECT 1 AS ok`;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('health-check-timeout')), 2000);
        });
        await Promise.race([queryPromise, timeoutPromise]);
        clearTimeout(timer);
        return res.json({ db: 'up', latencyMs: Date.now() - start });
    } catch (err) {
        clearTimeout(timer);
        const isBreaker = err instanceof DBUnavailableError;
        return res.status(503).json({
            db: 'down',
            breaker: isBreaker ? 'open' : 'closed',
            latencyMs: Date.now() - start,
            error: err.message,
        });
    }
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
