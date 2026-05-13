import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Allow TLS with self-signed certs (e.g. corporate proxy / local Neon) — set ALLOW_INSECURE_TLS=1 in .env for local dev only. Do NOT set on Render.
// Must run before app/firebase load, so we use dynamic import below.
if (process.env.NODE_ENV !== 'production' &&
    (process.env.ALLOW_INSECURE_TLS === '1' || process.env.ALLOW_INSECURE_TLS === 'true')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn('WARNING: TLS certificate verification disabled (dev only)');
}

const requiredEnvVars = ['DATABASE_URL'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`FATAL: Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

// Fail closed: production must have ADMIN_EMAILS explicitly configured.
// Previously the code fell back to a hardcoded personal gmail, which meant a
// misconfigured deploy would auto-promote that account to admin.
if (process.env.NODE_ENV === 'production') {
    const adminEmailsRaw = (process.env.ADMIN_EMAILS || '').trim();
    const adminEmails = adminEmailsRaw
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
    if (adminEmails.length === 0) {
        console.error('FATAL: ADMIN_EMAILS must be set in production (comma-separated list)');
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});

const { default: app } = await import('./app.js');
await import('./cron/referrals.js');

const scheduleDailySync = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight - now;

    setTimeout(async () => {
        console.log('[Sheets] Running scheduled daily backup...');
        try {
            const { syncAllSheets } = await import('./utils/sheetsSync.js');
            await syncAllSheets();
            console.log('[Sheets] Daily backup complete');
        } catch (err) {
            console.error('[Sheets] Daily backup failed:', err);
        }
        scheduleDailySync();
    }, msUntilMidnight);
};

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    if (process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
        scheduleDailySync();
        console.log('[Sheets] Daily sync scheduler started');
    }
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`FATAL: Port ${PORT} is already in use`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
