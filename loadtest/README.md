# Local load tests

Lightweight HTTP load tests for the CMGroups backend (`:5000`) and frontend
(`:5173`) **dev servers**, powered by [autocannon](https://github.com/mcollina/autocannon).

> Read-only by design. Only safe public `GET` endpoints are exercised — no auth,
> no admin, no mutating requests.

## Prerequisites

Both dev servers must be running locally:

```bash
# In one terminal
cd backend && npm run dev          # http://localhost:5000

# In another
cd frontend && npm run dev         # http://localhost:5173
```

Then install dependencies once:

```bash
cd loadtest && npm install
```

## Running

```bash
npm run smoke          # quick 5s sanity sweep, low concurrency
npm run load           # default (15s, 25 connections per scenario)
npm run load:heavy     # 30s, 50 connections — stress the dev box
npm run load:api       # only the DB-backed API endpoints
npm run load:frontend  # only the Vite-served HTML shell
npm run load:health    # only the backend / health route (no DB)
npm run load:bootstrap # /api/home-bootstrap + /api/products?fields=card
```

### Saturation ramp

Find the connection count at which RPS plateaus and p99 latency jumps:

```bash
npm run load:saturation                # /api/home-bootstrap, 10/50/100/200 conns × 20 s
npm run load:saturation:bootstrap      # same as above (alias)
npm run load:saturation:products       # /api/products?limit=20 instead
node run-saturation.mjs --steps=10,25,50,100,200 --duration=15
```

The script auto-detects the "knee" — the rung where p99 latency exceeds 2× the
baseline — and prints ASCII plots so you don't need a graphing tool open.

### Comparing before / after

After landing a change, re-run the suite and diff the JSON outputs:

```bash
node compare.mjs results/loadtest-<before>.json results/loadtest-<after>.json
# Or via npm:
npm run compare -- results/loadtest-<before>.json results/loadtest-<after>.json
```

Paste the resulting table into your PR description so reviewers can see the delta.

### Soak test — sustained load, leak detection

`run.mjs` only runs for ~15 seconds, which is not long enough to catch slow-burn
problems like p99 drifting upwards, RSS climbing, or the breaker flapping.
`run-soak.mjs` keeps a route under steady load for 5-30 minutes and samples
`/metrics` between bins so you get a per-minute view of latency AND memory.

```bash
npm run soak             # 30 min × 60 s bins on /api/home-bootstrap
npm run soak:short       # 5 min  × 30 s bins (good for CI smoke)
npm run soak:long        # 30 min × 60 s bins (use overnight)
node run-soak.mjs --duration=900 --bin=60 --target=/api/products?limit=20 --connections=20
METRICS_TOKEN=<token> npm run soak    # scrape the protected /metrics endpoint
```

At the end the script prints:

- a per-bin table (RPS, p50/p90/p97.5/p99/p99.9, RSS MB, heap MB, event-loop lag, breaker state),
- linear-regression slopes for p99 latency, RSS, and heap (positive slope = trouble),
- ASCII sparklines for each series.

`Findings:` lines flag drifts above a threshold so you don't have to read every column.

### Cold vs warm latency

How big is the gap between "first user after a deploy" and "steady state"?

```bash
npm run cold-vs-warm                     # default: 20 cold + 200 warm per route
COLD_RUNS=50 WARM_RUNS=500 npm run cold-vs-warm
```

The script calls `DELETE /api/__test/cache` between cold samples so every cold
hit is genuinely cold. The endpoint is **token-gated, dev-only**: enable it by
setting `TEST_FLUSH_TOKEN=<some secret>` in `backend/.env` (defaults to
`loadtest`). It returns 404 in production regardless of token.

### DB-slowdown / failure simulator

To exercise the resilience stack without breaking Neon for everyone else,
set any combination of the following in `backend/.env`:

```ini
DB_INJECT_DELAY_MS=200    # every Prisma op pauses 200 ms before executing
DB_INJECT_JITTER_MS=50    # ± jitter on top of the fixed delay
DB_INJECT_FAIL_PCT=100    # % of ops that throw a synthetic Prisma P1001
```

Then `touch backend/src/server.js` to trigger a nodemon reload. The injector
logs a `db-slowdown active` warning at boot so you can't forget it's on. All
three are **hard-locked to `NODE_ENV !== 'production'`** — they are silently
ignored if anyone sets them on Render.

Useful checks once active:

- with `DELAY_MS=150` — measure cold p99 inflation, confirm warm cache hits stay fast
- with `FAIL_PCT=100` — confirm public routes return `200` + empty arrays (not 500), and `/api/health/db` reports `breaker: open` after 5 sequential failures
- with `FAIL_PCT=30` — exercise the SWR fallback path under flaky-DB conditions

### Cache invariants

Two complementary checks for the stale-while-revalidate cache:

```bash
npm run test:cache                       # state-machine tests for cache.js
npm run validate:cache-invalidation      # static audit of route files
```

`test:cache` drives the cache module through every transition (miss → fresh →
stale → fresh again, stampede protection, failure paths, del/flush). Uses
`node:assert` — no test runner needed.

`validate:cache-invalidation` walks `backend/src/routes/*.js` and asserts:

1. Every cached prefix is invalidated **somewhere**.
2. Every file that both reads AND mutates a cache prefix invalidates it.
3. Every site that busts a home-bootstrap source family (`banners:`,
   `products:`, etc.) also busts `home:` (via `cache.bustWithHome` or an
   explicit `cache.delByPrefix('home:')`). Wire this into CI to keep the
   homepage from serving 10-minute-stale data after admin changes.

### Authenticated scenario (optional)

To validate the 60-second auth user cache from Phase 0 of the perf overhaul,
generate a Firebase ID token (e.g. via `firebase auth:export` or a quick
sign-in script) and re-run with the token in the env:

```bash
LOADTEST_FIREBASE_TOKEN=eyJ... npm run load
```

This adds the `auth-cached` scenario hitting `GET /api/auth/me` repeatedly.
Without the token the scenario is silently skipped.

Override anything with flags:

```bash
node run.mjs --duration=20 --connections=40 --pipelining=2
node run.mjs --only=api-products,api-categories
BACKEND_URL=http://127.0.0.1:5000 FRONTEND_URL=http://127.0.0.1:5173 node run.mjs
```

## Output

- Per-scenario summary in the terminal (RPS, p50/p90/p99 latency, error rate).
- Machine-readable JSON dropped into `results/loadtest-<timestamp>.json` after
  every run for diffing across changes.

## Scope notes

- The backend has Express rate limiters (500 req / 15 min global, 60 / 15 min
  on `/api/orders` & `/api/services`, 20 / hr on `/api/auth`). At any non-trivial
  concurrency from a single localhost IP these caps are hit in microseconds and
  every subsequent request returns **HTTP 429**, drowning out the real signal.
- For meaningful local numbers, set `DISABLE_RATE_LIMIT=1` in `backend/.env`
  before running. The flag is gated to `NODE_ENV !== 'production'` in
  `backend/src/app.js`, so it cannot leak to production.

  ```bash
  echo 'DISABLE_RATE_LIMIT=1' >> backend/.env   # opt in
  # nodemon will pick up the change after the next save in src/, or:
  touch backend/src/server.js
  npm --prefix loadtest run load
  # remember to remove the line when done if you want default behaviour back:
  sed -i '' '/^DISABLE_RATE_LIMIT=/d' backend/.env
  ```

- DB-backed routes (`/api/products` etc.) honour the in-process 60s cache, so
  RPS for repeated identical queries reflects cache-hit performance, not raw
  Postgres throughput. The `api-products-search` scenario uses unique query
  params to bypass the cache key on the first hit.
- If your local Postgres / Neon connection is down, those routes will return
  `500` after the Prisma 5-second timeout. RPS will collapse to roughly
  `connections / 5` (each connection is held for one timeout), and p50 latency
  will pin at ~5000 ms. The test still completes and the JSON output makes the
  failure mode obvious.
