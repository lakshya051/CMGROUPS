import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { slowQueriesTotal, breakerStateChanges, dbBreakerOpen } from './metrics.js';

let basePrisma;
const useNeonHttp = process.env.USE_NEON_HTTP === '1' || process.env.USE_NEON_HTTP === 'true';

// Subscribe to Prisma's `query` event to flag any single query > 100 ms. Cheap
// to add (Prisma already builds the log message) and has caught more "why is
// this page slow" mysteries than any APM I've worked with.
const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_MS || '100', 10);

if (useNeonHttp) {
    // Local dev only: tunnel Postgres over Neon's WebSocket-on-443 to bypass
    // local networks that block outbound :5432. Render and other clouds leave
    // USE_NEON_HTTP unset and use the standard binary engine.
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const ws = (await import('ws')).default;
    const { PrismaNeon } = await import('@prisma/adapter-neon');
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaNeon(pool);
    basePrisma = new PrismaClient({
        adapter,
        errorFormat: 'minimal',
        log: [
            { level: 'error', emit: 'event' },
            { level: 'query', emit: 'event' },
        ],
    });
} else {
    basePrisma = new PrismaClient({
        errorFormat: 'minimal',
        log: [
            { level: 'error', emit: 'event' },
            { level: 'query', emit: 'event' },
        ],
    });
}

basePrisma.$on('error', (e) => {
    logger.error({ prismaError: e.message }, 'prisma error');
});

basePrisma.$on('query', (e) => {
    if (e.duration > SLOW_QUERY_MS) {
        slowQueriesTotal.inc();
        logger.warn({
            durationMs: e.duration,
            query: e.query,
            params: e.params,
        }, 'slow query');
    }
});

// ─── Circuit breaker ──────────────────────────────────────────────────────────
// When the database is unreachable, every Prisma call hangs for the full client
// timeout (~5 s) before throwing P1001. With 25 concurrent users that pins all
// 25 sockets at once and the homepage takes 22 s to "fail" after the frontend's
// retry storm. Breaker opens after 5 consecutive failures and then short-circuits
// for 30 s, throwing DBUnavailableError immediately so handlers can fall back to
// stale cache or empty payloads.
const BREAKER_THRESHOLD = 5;
const BREAKER_OPEN_MS = 30_000;
const TRIPPING_ERRORS = new Set([
    'P1001', // Can't reach database server
    'P1002', // Database server timeout
    'P1008', // Operations timed out
    'P1017', // Server has closed the connection
]);

let consecutiveFailures = 0;
let openUntil = 0;
let breakerListeners = [];

export class DBUnavailableError extends Error {
    constructor() {
        super('Database temporarily unavailable');
        this.name = 'DBUnavailableError';
        this.code = 'DB_CIRCUIT_OPEN';
    }
}

const isTrippingError = (err) => {
    if (!err) return false;
    if (TRIPPING_ERRORS.has(err.code)) return true;
    // Connection-pool-exhausted (P2024) is symptomatic of a sick DB too.
    if (err.code === 'P2024') return true;
    if (err.name === 'PrismaClientInitializationError') return true;
    return false;
};

const recordSuccess = () => {
    if (consecutiveFailures !== 0 || openUntil !== 0) {
        consecutiveFailures = 0;
        openUntil = 0;
        dbBreakerOpen.set(0);
        breakerStateChanges.inc({ state: 'closed' });
        logger.info({ event: 'db_breaker' }, 'db breaker closed');
        breakerListeners.forEach(fn => { try { fn('closed'); } catch { /* ignore */ } });
    }
};

const recordFailure = (err) => {
    if (!isTrippingError(err)) return;
    consecutiveFailures++;
    if (consecutiveFailures >= BREAKER_THRESHOLD) {
        const wasClosed = openUntil < Date.now();
        openUntil = Date.now() + BREAKER_OPEN_MS;
        if (wasClosed) {
            dbBreakerOpen.set(1);
            breakerStateChanges.inc({ state: 'open' });
            logger.warn({
                event: 'db_breaker',
                code: err?.code,
                message: err?.message,
            }, 'db breaker opened');
            breakerListeners.forEach(fn => { try { fn('open'); } catch { /* ignore */ } });
        }
    }
};

export const onBreakerStateChange = (fn) => {
    breakerListeners.push(fn);
    return () => { breakerListeners = breakerListeners.filter(l => l !== fn); };
};

export const isBreakerOpen = () => openUntil > Date.now();

/** True if the error indicates a database connectivity / availability problem
 *  rather than a logic / data problem. Public read routes use this to decide
 *  whether to fall back to an empty payload (preserving the homepage UX) or
 *  surface a real 500 to the caller. */
export const isDatabaseUnavailable = (err) => {
    if (!err) return false;
    if (err instanceof DBUnavailableError) return true;
    if (TRIPPING_ERRORS.has(err?.code)) return true;
    if (err?.code === 'P2024') return true;
    if (err?.name === 'PrismaClientInitializationError') return true;
    return false;
};

// ─── DB-slowdown simulator (dev / test only) ──────────────────────────────────
// Lets a developer locally validate that the circuit breaker, stale-while-
// revalidate path, and frontend timeouts behave correctly under a degraded DB,
// WITHOUT actually breaking Neon for everyone else on the project.
//
// Knobs (read once at boot; restart to change):
//   DB_INJECT_DELAY_MS=200   → every Prisma op pauses 200 ms before executing.
//   DB_INJECT_JITTER_MS=50   → adds ± up to N ms of uniform jitter to that delay.
//   DB_INJECT_FAIL_PCT=10    → 10 % of ops throw a synthetic P1001 (DB unreachable).
//
// All three are hard-locked to non-production. If anyone sets them on Render
// with NODE_ENV=production they are ignored — the warning still logs so
// misconfig is visible.
const RAW_DELAY = parseInt(process.env.DB_INJECT_DELAY_MS || '0', 10);
const RAW_JITTER = parseInt(process.env.DB_INJECT_JITTER_MS || '0', 10);
const RAW_FAIL_PCT = parseFloat(process.env.DB_INJECT_FAIL_PCT || '0');
const injectActive = process.env.NODE_ENV !== 'production'
    && (RAW_DELAY > 0 || RAW_JITTER > 0 || RAW_FAIL_PCT > 0);
const injectDelayMs = injectActive ? Math.max(0, RAW_DELAY) : 0;
const injectJitterMs = injectActive ? Math.max(0, RAW_JITTER) : 0;
const injectFailPct = injectActive ? Math.min(100, Math.max(0, RAW_FAIL_PCT)) : 0;

if (process.env.NODE_ENV === 'production'
    && (RAW_DELAY > 0 || RAW_JITTER > 0 || RAW_FAIL_PCT > 0)) {
    logger.warn({
        DB_INJECT_DELAY_MS: RAW_DELAY,
        DB_INJECT_JITTER_MS: RAW_JITTER,
        DB_INJECT_FAIL_PCT: RAW_FAIL_PCT,
    }, 'DB_INJECT_* env vars are set but NODE_ENV=production — IGNORED');
}
if (injectActive) {
    logger.warn({
        DB_INJECT_DELAY_MS: injectDelayMs,
        DB_INJECT_JITTER_MS: injectJitterMs,
        DB_INJECT_FAIL_PCT: injectFailPct,
    }, 'DB slowdown simulator is ACTIVE — every Prisma op is artificially impaired');
}

class InjectedDbFailure extends Error {
    constructor() {
        super('Synthetic DB failure (DB_INJECT_FAIL_PCT)');
        this.code = 'P1001'; // pretend to be Prisma's "can't reach server"
        this.name = 'InjectedDbFailure';
    }
}

const maybeInject = async () => {
    if (!injectActive) return;
    if (injectFailPct > 0 && Math.random() * 100 < injectFailPct) {
        throw new InjectedDbFailure();
    }
    if (injectDelayMs > 0 || injectJitterMs > 0) {
        const jitter = injectJitterMs > 0 ? (Math.random() * 2 - 1) * injectJitterMs : 0;
        const total = Math.max(0, injectDelayMs + jitter);
        if (total > 0) await new Promise((r) => setTimeout(r, total));
    }
};

// Wrap the Prisma client so every model operation flows through the breaker.
// We use Prisma's `$extends` API which works for both the standard engine and
// the Neon driver adapter.
const prisma = basePrisma.$extends({
    name: 'circuit-breaker',
    query: {
        $allOperations: async ({ query, args }) => {
            if (isBreakerOpen()) {
                throw new DBUnavailableError();
            }
            try {
                // maybeInject() is inside the try so a synthetic failure also
                // counts toward the breaker — otherwise the validation suite
                // can't exercise the breaker by setting DB_INJECT_FAIL_PCT.
                await maybeInject();
                const result = await query(args);
                recordSuccess();
                return result;
            } catch (err) {
                recordFailure(err);
                throw err;
            }
        },
    },
});

const shutdown = async () => {
    await basePrisma.$disconnect();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { basePrisma };
export default prisma;
