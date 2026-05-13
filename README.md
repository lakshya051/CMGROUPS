# CMGroups (Shoptify)

E‑commerce + services + courses platform for CMGroups, deployed as:

- **Backend** — Node.js / Express / Prisma / PostgreSQL on Render
- **Frontend** — React + Vite PWA on Vercel
- **Mobile** — Android TWA shell (`frontend/twa/`) for the Play Store

## Repository layout

```
backend/      Express API (Prisma + PostgreSQL, Firebase Admin auth)
frontend/     React + Vite PWA (Tailwind, Workbox service worker)
frontend/twa/ Trusted Web Activity wrapper for the Play Store build
docs/         Long-form notes (deferred work, ops runbooks)
.github/      CI workflows (APK build, dependency audit)
```

## Local development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (local or Docker)
- A Firebase project (Email/Password + Google providers enabled)
- A Cloudinary account for image uploads

### 1. Backend

```bash
cd backend
cp .env.example .env        # then fill in the values listed below
npm install
npx prisma migrate dev
npm run dev                 # http://localhost:5000
```

Required environment variables (see `backend/.env.example`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Admin SDK credentials for verifying ID tokens |
| `ADMIN_EMAILS` | Comma-separated list of emails granted the `admin` role. **Required in production** — the server refuses to boot without it. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image uploads |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Outbound email (order confirmations, OTPs) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push notifications |
| `FRONTEND_URL` | Used in email templates and CORS allow-list |
| `DISABLE_RATE_LIMIT` | Dev-only: set to `1` to bypass every rate limiter (load testing). Hard-disabled in `NODE_ENV=production`. |
| `METRICS_TOKEN` | Shared secret for `/metrics` Prometheus endpoint. Generate with `openssl rand -hex 32`. Required in production. Without it, the endpoint 404s for any non-localhost caller. |
| `SLOW_QUERY_MS` | Threshold (ms) above which a Prisma query is logged at `WARN` and counted in `shoptify_db_slow_queries_total`. Default `100`. |
| `DISABLE_NEON_KEEPALIVE` | Set to `1` to disable the in-process `SELECT 1` ping that runs every 4 minutes (default ON). |
| `LOG_KEEPALIVE` | Set to `1` if you want failed keep-alive pings logged. |
| `LOG_LEVEL` | Pino log level (`trace` / `debug` / `info` / `warn` / `error`). Defaults to `info` in production, `debug` in dev. |
| `TRUST_PROXY` | Proxy hop count; set to `1` on Render so `req.ip` is the real client. |
| `TEST_FLUSH_TOKEN` | Shared secret for the dev-only `DELETE /api/__test/cache` endpoint used by `loadtest/run-cold-vs-warm.mjs`. Defaults to `loadtest`. 404s in production regardless of token. |
| `DB_INJECT_DELAY_MS` / `DB_INJECT_JITTER_MS` / `DB_INJECT_FAIL_PCT` | Dev-only DB-slowdown simulator used to validate the breaker, SWR fallback, and frontend retry policy. Every Prisma op is delayed by `DELAY_MS ± JITTER_MS` and has a `FAIL_PCT` chance of throwing P1001. Hard-locked to `NODE_ENV != production`. See [`loadtest/README.md`](./loadtest/README.md#db-slowdown--failure-simulator). |

#### Rate limiting

Limit state lives in Postgres (via `@acpr/rate-limit-postgresql`) using the same `DATABASE_URL` as the rest of the app — there is no Redis dependency. On first boot the package creates a `rate_limit` schema; the user in `DATABASE_URL` therefore needs CREATE-schema permission on the database. The store is wrapped to fail-open: if the rate-limit table is unreachable, requests are allowed through rather than 5xx'd.

GET / HEAD / OPTIONS are exempt from the global limiter (legitimate browsing should never be rate-limited). Authenticated routes key on `req.user.id`, falling back to IPv6-safe `ipKeyGenerator(req.ip)` for unauthenticated traffic so users behind a shared NAT no longer share one bucket.

#### Observability

- **Logs**: structured JSON via [pino](https://github.com/pinojs/pino). Render's log viewer reads stdout — no aggregator needed. Each request gets an 8-character `X-Request-Id` (generated if the client doesn't send one) and the same id appears on every log line emitted while handling the request.
- **Metrics**: Prometheus-format histograms / counters at `GET /metrics` (token via `METRICS_TOKEN`, see env table above). Includes per-route latency / error counts, cache hit & miss totals (label per cache key prefix), DB circuit breaker state, slow-query counter, and Node.js process metrics (event loop lag, GC, heap).
- **Slow queries**: Prisma queries above `SLOW_QUERY_MS` (default 100 ms) are logged at WARN with the SQL + params and incremented on `shoptify_db_slow_queries_total`.
- **Uptime**: point [UptimeRobot](https://uptimerobot.com) (free, 5-min interval, 50 monitors) or [BetterStack](https://betterstack.com) (free, 3-min interval, 10 monitors) at `https://<your-render-url>/api/health/db`. The same monitor doubles as a Neon keep-alive (Phase 3).
- **Optional dashboards**: free [Grafana Cloud](https://grafana.com/products/cloud/) (10K active series free tier) can scrape `/metrics` over the public URL.

### 2. Frontend

```bash
cd frontend
cp .env.example .env        # set VITE_API_URL + Firebase web config
npm install
npm run dev                 # http://localhost:5173
```

Frontend environment variables:

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the backend, e.g. `http://localhost:5000/api`. Read once from `src/lib/config.js`. |
| `VITE_FIREBASE_*` | Firebase web SDK config (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) |
| `VITE_RECAPTCHA_SITE_KEY` | App Check (optional, recommended in production) |
| `VITE_VAPID_PUBLIC_KEY` | Public VAPID key for browser push subscriptions |

## Deploying

- **Backend → Render.** `render.yaml` defines the service; set the env
  vars from the table above. `prisma migrate deploy` runs as part of the
  build command.
- **Frontend → Vercel.** Project root must be `frontend/`. Set the
  `VITE_*` env vars per environment (Preview vs Production).
- **Android TWA → Play Console.** See `frontend/twa/README.md`.

## CI

- `.github/workflows/build-apk.yml` — builds the TWA bundle.
- `.github/workflows/dependency-audit.yml` — runs `npm audit
  --audit-level=high` against backend and frontend on every PR and
  weekly on a schedule.

## Documentation

- [`docs/FOLLOW_UPS.md`](docs/FOLLOW_UPS.md) — work that was identified
  during the security/quality audit but deferred to its own PR (money
  Decimal migration, multi-zone delivery, real payment gateway, etc.).
