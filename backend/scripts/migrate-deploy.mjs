/**
 * Render / Neon: `prisma migrate deploy` can fail with P1002 (advisory lock timeout)
 * when compute is cold or a previous deploy held the lock. Retries with backoff.
 *
 * Optional env (Render → Environment):
 *   PRISMA_MIGRATE_MAX_ATTEMPTS=5
 *   PRISMA_MIGRATE_RETRY_DELAY_MS=20000
 *   PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1  — last resort if retries still fail (single-writer only)
 */
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';

function runMigrate() {
    return new Promise((resolve) => {
        const child = spawn('npx', ['prisma', 'migrate', 'deploy'], {
            stdio: 'inherit',
            env: { ...process.env },
            shell: process.platform === 'win32',
        });
        child.on('close', (code) => resolve(code ?? 1));
        child.on('error', () => resolve(1));
    });
}

const maxAttempts = Math.max(1, Number.parseInt(process.env.PRISMA_MIGRATE_MAX_ATTEMPTS || '5', 10));
const delayMs = Math.max(0, Number.parseInt(process.env.PRISMA_MIGRATE_RETRY_DELAY_MS || '20000', 10));

async function main() {
    if (process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK === '1') {
        console.warn('[migrate-deploy] PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 — use only when a single deploy runs migrations.');
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const code = await runMigrate();
        if (code === 0) {
            process.exit(0);
        }
        console.error(`[migrate-deploy] attempt ${attempt}/${maxAttempts} failed (exit ${code})`);
        if (attempt < maxAttempts) {
            console.error(`[migrate-deploy] retrying in ${delayMs / 1000}s (Neon cold start / lock contention)...`);
            await delay(delayMs);
        }
    }
    process.exit(1);
}

main();
