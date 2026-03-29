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

const { default: app } = await import('./app.js');
await import('./cron/referrals.js');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
