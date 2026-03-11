import 'dotenv/config';

// Allow TLS with self-signed certs (e.g. corporate proxy) — set ALLOW_INSECURE_TLS=1 in .env for local dev only.
// Must run before app/firebase load, so we use dynamic import below.
if (process.env.ALLOW_INSECURE_TLS === '1' || process.env.ALLOW_INSECURE_TLS === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { default: app } = await import('./app.js');
await import('./cron/referrals.js');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
