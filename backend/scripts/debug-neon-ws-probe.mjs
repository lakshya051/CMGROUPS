// #region agent log
// Probe: does Neon's serverless driver (WS over 443) work on this network?
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const LOG_PATH = '/Users/ar-lakshya.varshney/Downloads/CMGROUPS-main 3/.cursor/debug-69721d.log';
function log(location, message, data = {}) {
    const entry = { sessionId: '69721d', runId: 'neon-ws-probe', location, message, data, timestamp: Date.now() };
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
    console.log(`[${location}] ${message}`, data);
}

log('ws-probe:start', 'beginning', { hasUrl: !!process.env.DATABASE_URL });

try {
    const neon = await import('@neondatabase/serverless');
    if (neon.neonConfig && typeof globalThis.WebSocket === 'undefined') {
        const { default: ws } = await import('ws');
        neon.neonConfig.webSocketConstructor = ws;
    }
    const sql = neon.neon(process.env.DATABASE_URL);
    const t0 = Date.now();
    const rows = await sql`SELECT 1 as ok, current_database() as db, now() as ts`;
    log('ws-probe:ok', 'query succeeded over WS/443', { ms: Date.now() - t0, rows });
} catch (e) {
    log('ws-probe:err', e.message, { name: e.name, code: e.code, stack: (e.stack || '').split('\n').slice(0, 5).join(' | ') });
}

log('ws-probe:done', 'complete', {});
process.exit(0);
// #endregion
