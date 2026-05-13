import pino from 'pino';
import crypto from 'node:crypto';

// Single shared logger. JSON in production (Render's log viewer reads stdout
// directly — no aggregator needed), human-readable in dev so the terminal
// stays readable.
const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
    level: process.env.LOG_LEVEL || (isProd ? 'info' : isTest ? 'silent' : 'debug'),
    base: isProd ? { service: 'shoptify-api' } : undefined,
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            'password',
            'token',
            '*.password',
            '*.token',
        ],
        censor: '[REDACTED]',
    },
    transport: !isProd && !isTest
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname,service' } }
        : undefined,
});

/** Generate a short request id. URL-safe base32-ish — easy to grep, copy/paste. */
export const newRequestId = () => crypto.randomBytes(6).toString('base64url');

/** Express middleware: attaches `req.id` and `req.log`. Mount before routes. */
export const requestLoggingMiddleware = (req, res, next) => {
    const id = req.headers['x-request-id'] || newRequestId();
    req.id = id;
    req.log = logger.child({ reqId: id });
    res.setHeader('X-Request-Id', id);
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const lvl = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        req.log[lvl]({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            durationMs: duration,
        }, 'request');
    });
    next();
};
