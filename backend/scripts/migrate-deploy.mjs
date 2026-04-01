/**
 * Render / Neon deploy wrapper for `prisma migrate deploy`.
 *
 * Neon serverless Postgres suspends compute after idle. The first connection
 * can take 3-8s to wake, eating into Prisma's hard-coded 10s advisory-lock
 * timeout (P1002). This script:
 *   1. Warms Neon compute with a simple query via DIRECT_URL before migrating.
 *   2. Disables advisory locking (safe: single deploy runner on Render).
 *   3. Retries on transient failures.
 */
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import pg from 'pg';
const { Client } = pg;

async function warmupNeon() {
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!url) return;
    console.log('[migrate-deploy] Warming up Neon compute...');
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 30000 });
    try {
        await client.connect();
        await client.query('SELECT 1');
        console.log('[migrate-deploy] Neon compute is awake.');
    } catch (e) {
        console.warn('[migrate-deploy] Warmup query failed (will still attempt migrate):', e.message);
    } finally {
        await client.end().catch(() => {});
    }
}

function runMigrate() {
    return new Promise((resolve) => {
        const child = spawn('npx', ['prisma', 'migrate', 'deploy'], {
            stdio: 'inherit',
            env: {
                ...process.env,
                PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1',
            },
            shell: process.platform === 'win32',
        });
        child.on('close', (code) => resolve(code ?? 1));
        child.on('error', () => resolve(1));
    });
}

const maxAttempts = 3;
const delayMs = 10000;

async function main() {
    console.log('[migrate-deploy] Advisory locking disabled (single Render deploy runner).');

    await warmupNeon();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const code = await runMigrate();
        if (code === 0) {
            process.exit(0);
        }
        console.error(`[migrate-deploy] attempt ${attempt}/${maxAttempts} failed (exit ${code})`);
        if (attempt < maxAttempts) {
            console.error(`[migrate-deploy] retrying in ${delayMs / 1000}s...`);
            await warmupNeon();
            await delay(delayMs);
        }
    }
    process.exit(1);
}

main();
