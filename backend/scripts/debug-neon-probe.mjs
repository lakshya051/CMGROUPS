// #region agent log
// Diagnostic probe — does NOT modify backend source. Safe to delete.
// Exercises four things and logs each step to .cursor/debug-69721d.log:
//   1) DNS resolution for the Neon host
//   2) Raw TCP connect to :5432
//   3) Postgres SSLRequest byte exchange (server should reply 'S' to accept TLS, or 'N' to refuse)
//   4) Full pg client connect + SELECT 1 with timeout
import dns from 'node:dns/promises';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const LOG_PATH = '/Users/ar-lakshya.varshney/Downloads/CMGROUPS-main 3/.cursor/debug-69721d.log';
const SESSION_ID = '69721d';

function log(location, message, data = {}) {
    const entry = {
        sessionId: SESSION_ID,
        runId: 'neon-probe',
        location,
        message,
        data,
        timestamp: Date.now(),
    };
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
    console.log(`[${location}] ${message}`, data);
}

const url = new URL(process.env.DATABASE_URL);
const HOST = url.hostname;
const PORT = Number(url.port || 5432);
log('probe:start', 'env loaded', { host: HOST, port: PORT, hasPwd: !!url.password });

// 1) DNS
try {
    const a = await dns.resolve4(HOST).catch(() => []);
    const aaaa = await dns.resolve6(HOST).catch(() => []);
    const lookup = await dns.lookup(HOST, { all: true }).catch(() => []);
    log('probe:dns', 'resolved', { a, aaaa, lookup });
} catch (e) {
    log('probe:dns:error', e.message, {});
}

// 2) Raw TCP connect (with explicit short timeout) and also data exchange
async function tcpProbe(family) {
    return await new Promise((resolve) => {
        const result = { family, connected: false, error: null, sslReply: null, sslReplyMs: null, bytesRead: 0 };
        const sock = net.connect({ host: HOST, port: PORT, family });
        const t0 = Date.now();
        const tConn = setTimeout(() => { result.error = 'tcp-connect-timeout-5s'; sock.destroy(); resolve(result); }, 5000);
        sock.once('connect', () => {
            clearTimeout(tConn);
            result.connected = true;
            result.connectMs = Date.now() - t0;
            // Send Postgres SSLRequest: 8-byte msg = length(4)=8, code(4)=80877103 (0x04D2162F)
            const buf = Buffer.alloc(8);
            buf.writeInt32BE(8, 0);
            buf.writeInt32BE(80877103, 4);
            sock.write(buf);
            const tSsl = setTimeout(() => { result.error = 'no-ssl-reply-8s'; sock.destroy(); resolve(result); }, 8000);
            sock.once('data', (d) => {
                clearTimeout(tSsl);
                result.sslReply = d.toString('utf8', 0, 1);
                result.sslReplyMs = Date.now() - t0;
                result.bytesRead = d.length;
                sock.destroy();
                resolve(result);
            });
            sock.on('error', (e) => { clearTimeout(tSsl); result.error = e.message; resolve(result); });
            sock.on('end', () => { clearTimeout(tSsl); if (!result.sslReply) { result.error = result.error || 'server-closed-before-reply'; resolve(result); } });
        });
        sock.once('error', (e) => { clearTimeout(tConn); result.error = e.message; resolve(result); });
    });
}
const v4 = await tcpProbe(4);
log('probe:tcp:v4', 'tcp+ssl handshake probe', v4);

// 3) pg client with finite timeout
try {
    const { default: pg } = await import('pg');
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        statement_timeout: 5000,
    });
    const t0 = Date.now();
    try {
        await client.connect();
        const r = await client.query('SELECT 1 as ok, current_database() db');
        log('probe:pg:ok', 'connected and queried', { ms: Date.now() - t0, rows: r.rows });
    } catch (e) {
        log('probe:pg:err', e.message, { ms: Date.now() - t0, code: e.code, name: e.name });
    } finally {
        try { await client.end(); } catch (_) { }
    }
} catch (e) {
    log('probe:pg:load:err', e.message, {});
}

log('probe:done', 'probe complete', {});
process.exit(0);
// #endregion
