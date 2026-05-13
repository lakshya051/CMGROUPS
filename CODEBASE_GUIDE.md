# CODEBASE_GUIDE.md — CMGroups / Shoptify

> A deep, file-by-file walkthrough of the CMGroups (Shoptify) full-stack
> e-commerce, services, and education super-app. Read this start-to-finish
> and you will know every meaningful module, route, table, and gotcha in
> the codebase.

**Stack at a glance**

| Layer        | Tech                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Frontend     | React 18 + Vite 7, React Router DOM 6, Tailwind CSS, Workbox SW, Firebase Web SDK              |
| Backend      | Node.js 20+ / Express 5 (ESM), Prisma 5 ORM, Firebase Admin SDK                                 |
| Database     | PostgreSQL (NeonDB serverless in prod; standard Postgres on Render or local)                    |
| Mobile       | Trusted Web Activity (Bubblewrap) wrapper around the PWA, published as `com.cmgroups.shopnow`   |
| Hosting      | Backend → Render, Frontend → Vercel, Images → Cloudinary, Email → SMTP, Push → web-push (VAPID) |
| Identity     | Firebase Auth (Email/Password + Google) — backend verifies ID tokens via Admin SDK              |

> The frontend is **Vite + React**, NOT Next.js. There is no `pages/` or
> `app/` directory under Next.js conventions, no `next.config.js`,
> `_app.js`, or `_document.js`. Routing is fully client-side via
> `react-router-dom`. Where the original prompt asked about Next.js
> specifics, this guide answers using the actual Vite/React equivalents.

---

## TABLE OF CONTENTS

1.  [Project Structure Overview](#1-project-structure-overview)
2.  [App Configuration & Entry Points](#2-app-configuration--entry-points)
3.  [Routing & Pages](#3-routing--pages)
4.  [Frontend Components](#4-frontend-components)
5.  [State Management & Data Flow](#5-state-management--data-flow)
6.  [API Layer — Frontend Side](#6-api-layer--frontend-side)
7.  [Backend — Express API](#7-backend--express-api)
8.  [Database — NeonDB (Postgres)](#8-database--neondb-postgres)
9.  [Authentication & Authorization](#9-authentication--authorization)
10. [E-commerce Core Flows](#10-e-commerce-core-flows)
11. [PWA Setup](#11-pwa-setup)
12. [TWA (Trusted Web Activity) Setup](#12-twa-trusted-web-activity-setup)
13. [Styling & UI](#13-styling--ui)
14. [Utilities & Helpers](#14-utilities--helpers)
15. [Build & Deployment](#15-build--deployment)
16. [Known Patterns & Gotchas](#16-known-patterns--gotchas)
17. [Full Data Flow Diagram](#17-full-data-flow-diagram)

---

## 1. Project Structure Overview

The repository is a flat monorepo with three top-level workspaces (`backend/`,
`frontend/`, `frontend/twa/`) plus shared infra (CI, deployment manifests,
docs).

```
CMGROUPS-main/
├── README.md                    Quickstart, env table, deploy instructions
├── render.yaml                  Render Blueprint for the backend service
├── docs/
│   └── FOLLOW_UPS.md            Deferred work from the security audit
├── .github/
│   └── workflows/
│       ├── build-apk.yml        Manual APK build (Bubblewrap → Gradle)
│       └── dependency-audit.yml `npm audit` on PR + weekly cron
│
├── backend/                     ▼ EXPRESS / PRISMA / POSTGRES API ▼
│   ├── package.json             Node 20+, ESM (`type: "module"`), Prisma scripts
│   ├── prisma/
│   │   ├── schema.prisma        Single source of truth: 35+ models
│   │   ├── migrations/          Versioned SQL migrations (Prisma Migrate)
│   │   ├── seed.js              Idempotent seed: tiers, banners, categories
│   │   └── seed-bulk-products.js Demo product loader for empty DBs
│   ├── scripts/
│   │   ├── promote-admin.js     Manually flip a user's role to "admin"
│   │   ├── sync-firebase-users-to-prisma.js  One-shot Firebase → Prisma sync
│   │   ├── backfill-referral-codes.js        One-shot referralCode backfill
│   │   ├── migrate-deploy.mjs   Used by `npm run build` on Render
│   │   ├── check-products.js    Smoke test for product visibility
│   │   └── debug-*.mjs          Neon connectivity + refund-math probes
│   └── src/
│       ├── server.js            Loads .env, validates env, boots app.js
│       ├── app.js               Express middleware + route mounting
│       ├── lib/
│       │   ├── prisma.js        Prisma client (Neon WS adapter optional)
│       │   └── cache.js         60s in-memory cache (node-cache wrapper)
│       ├── middleware/
│       │   ├── auth.js          `protect`, `optionalProtect`, `adminOnly`
│       │   └── rateLimiters.js  Per-route rate limiters for sensitive writes
│       ├── routes/              26 route modules (see §7 for the table)
│       ├── cron/
│       │   └── referrals.js     Daily 00:00 referral payout reconciler
│       └── utils/
│           ├── firebase.js      Firebase Admin SDK init
│           ├── nodemailer.js    SMTP transporter (lazy, optional)
│           ├── emailNotifications.js     Branded HTML emails
│           ├── notifications.js          DB notification + push fan-out
│           ├── webPush.js                VAPID web-push wrapper
│           ├── auditLog.js               Admin audit trail writer
│           ├── cloudinary.js             Image upload + namespace guard
│           ├── invoiceGenerator.js       Order PDF (PDFKit)
│           ├── serviceInvoiceGenerator.js Service PDF + GST breakdown
│           ├── certificateGenerator.js   Course completion PDF
│           ├── googleSheets.js           Google Sheets API helper
│           ├── sheetsSync.js             DB ↔ Sheets two-way sync
│           ├── serviceNotifications.js   Booking-specific notification copy
│           ├── couponUserRules.js        Per-user coupon usage validation
│           ├── escapeHtml.js             Email-template escaping
│           └── referralHelper.js         Per-item referral reward math
│
├── frontend/                    ▼ REACT + VITE PWA ▼
│   ├── package.json             Vite 7, React 18, Tailwind, Workbox
│   ├── vite.config.js           Vite + VitePWA + chunk splitting + visualizer
│   ├── tailwind.config.js       Theme tokens (colors, fonts, shadows, spacing)
│   ├── postcss.config.js        Tailwind + autoprefixer
│   ├── index.html               HTML shell with CSP, fonts preload, manifest
│   ├── vercel.json              SPA rewrites + asset-link content-type headers
│   ├── public/
│   │   ├── icons/               PNG app icons (multiple sizes + maskable)
│   │   ├── icon.svg             SVG favicon
│   │   ├── offline.html         Offline fallback page (bilingual EN/HI)
│   │   ├── placeholder-product.svg   Generic product placeholder
│   │   ├── robots.txt           SEO crawler directives
│   │   ├── sitemap.xml          Static sitemap
│   │   └── .well-known/
│   │       ├── assetlinks.json  Digital Asset Links → TWA verification
│   │       └── security.txt     Security disclosure contact
│   ├── twa/
│   │   ├── twa-manifest.json    Bubblewrap config (package, icons, shortcuts)
│   │   ├── README.md            How to regenerate the APK locally
│   │   └── PLAY_STORE_LISTING.md  Copy used on the Play Store listing
│   ├── scripts/
│   │   └── generate-pwa-icons.mjs    Builds all icon sizes from a source
│   └── src/
│       ├── main.jsx             ReactDOM root + SW registration
│       ├── App.jsx              Provider tree + Router definition
│       ├── index.css            Tailwind layers + PWA shell rules
│       ├── sw.js                Workbox service worker (custom)
│       ├── constants.js         Pincode, thresholds, storage keys
│       ├── lib/
│       │   ├── api.js           Centralised fetch client + endpoint groups
│       │   ├── config.js        `API_BASE` resolution (env → localhost)
│       │   ├── firebase.js      Firebase web SDK + AppCheck init
│       │   ├── authProfile.js   `needsPhoneCapture(user)` helper
│       │   ├── firebaseAuthErrors.js   Friendly Firebase error mapping
│       │   └── utils.js         `cn()` (clsx + tailwind-merge)
│       ├── context/
│       │   ├── AuthContext.jsx  React Context + `useAuth` hook (consumer)
│       │   ├── AuthProvider.jsx Auth state machine (Firebase ↔ Prisma)
│       │   ├── ShopContext.jsx  React Context + `useShop` hook (consumer)
│       │   ├── ShopProvider.jsx Cart / wishlist / compare / coupon engine
│       │   └── NotificationContext.jsx  Notification poller + actions
│       ├── hooks/
│       │   ├── useSEO.js                document.title + meta sync
│       │   ├── useRecentlyViewed.js     localStorage history (10 items)
│       │   ├── usePushNotifications.js  Subscribe / unsubscribe / refresh
│       │   └── useInstallPrompt.js      `beforeinstallprompt` capture
│       ├── utils/
│       │   ├── image.js                  Image URL resolver + placeholder
│       │   ├── sanitize.js               Safe internal-path validator
│       │   ├── couponPricing.js          Cart-side coupon discount math
│       │   ├── bundleUtils.js            Bundle-aware subtotal calculator
│       │   └── validationSchemas.js      Yup validators (used with Formik)
│       ├── components/
│       │   ├── ErrorBoundary.jsx
│       │   ├── auth/
│       │   │   ├── AuthPageLayout.jsx     Two-column hero shell for sign-in/up
│       │   │   └── ProtectedRoute.jsx     Route guard (signed-in + admin + phone)
│       │   ├── home/                     Hero, deals, brands, BYOB, etc.
│       │   ├── shop/                     Product card, filter, bundles, FBT
│       │   ├── layout/                   Navbar, Footer, BottomNav, Drawer
│       │   ├── notifications/
│       │   ├── pwa/                      Install banners (Android + iOS)
│       │   ├── system/                   PushNotificationsBridge
│       │   ├── common/                   PriceDisplay
│       │   └── ui/                       Modal, Button, BackToTop, etc.
│       └── pages/
│           ├── (root)                    Home, Services, TallyERP, CCTV, etc.
│           ├── shop/                     Products, ProductDetail, Cart, ...
│           ├── courses/                  Courses, CourseDetail, CoursePlayer
│           ├── dashboard/                User dashboard pages
│           ├── admin/                    Admin pages
│           └── services/                 BookingModal, ServiceCard
```

**Folder responsibility, in one line each**

| Folder                                | Role                                                                |
| ------------------------------------- | ------------------------------------------------------------------- |
| `backend/`                            | Express REST API, Prisma DB layer, cron jobs                       |
| `backend/prisma/`                     | DB schema, migrations, seed scripts                                |
| `backend/src/routes/`                 | Per-resource Express routers (mounted in `app.js`)                 |
| `backend/src/middleware/`             | Auth + rate-limiting middleware                                    |
| `backend/src/utils/`                  | Cross-cutting helpers (mail, push, sheets, PDFs, audit)            |
| `backend/src/lib/`                    | Long-lived clients (Prisma, in-memory cache)                       |
| `backend/scripts/`                    | One-off ops scripts run via `node`/`npm run …`                     |
| `frontend/`                           | Vite/React PWA codebase                                            |
| `frontend/public/`                    | Static assets served as-is (icons, offline page, well-known files) |
| `frontend/twa/`                       | Trusted Web Activity (Android wrapper) configuration               |
| `frontend/src/`                       | Application source                                                 |
| `frontend/src/lib/`                   | Side-effecting clients (api, firebase) + small helpers             |
| `frontend/src/context/`               | React Context providers + consumer hooks                           |
| `frontend/src/hooks/`                 | Reusable React hooks                                               |
| `frontend/src/utils/`                 | Pure utilities (no React)                                          |
| `frontend/src/components/`            | Visual building blocks (no routing concerns)                       |
| `frontend/src/pages/`                 | Route-level components (one file = one URL)                        |
| `frontend/scripts/`                   | Build-side scripts (e.g. `generate-pwa-icons.mjs`)                 |
| `docs/`                               | Long-form notes (deferred work, ops runbooks)                      |
| `.github/workflows/`                  | CI: dependency audit + manual APK build                            |

---

## 2. App Configuration & Entry Points

### 2.1 Why no `next.config.js`?

There is no Next.js. The frontend uses **Vite** with its own config at
`frontend/vite.config.js`. The original prompt asked about Next.js specifics
(`next.config.js`, `_app.js`, `_document.js`); the equivalents in this
codebase are:

| Next.js convention   | This codebase                                            |
| -------------------- | -------------------------------------------------------- |
| `next.config.js`     | `frontend/vite.config.js`                                |
| `_app.js` / `_app.tsx` | `frontend/src/main.jsx` + `frontend/src/App.jsx`       |
| `_document.js`       | `frontend/index.html`                                    |
| `pages/` directory   | `frontend/src/pages/` (paired with `App.jsx` route map)  |
| `middleware.ts`      | `ProtectedRoute` component + Express middleware          |

### 2.2 `frontend/vite.config.js`

A single `defineConfig(({ mode }) => ({ ... }))` that branches on the build
mode. Key blocks:

| Option                                                | Purpose                                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `base: '/'`                                           | App is served at the root path (Vercel default).                                                |
| `plugins: [react(), VitePWA(...), visualizer()]`      | React fast refresh; PWA service worker; bundle-size visualizer (only in `--mode analyze`).      |
| `VitePWA({ strategies: 'injectManifest' })`           | Don't auto-generate the SW; we ship a hand-written `src/sw.js`.                                 |
| `srcDir: 'src'`, `filename: 'sw.js'`                  | Where Vite picks up the SW source.                                                              |
| `registerType: 'autoUpdate'`                          | New SW takes over on the next page load (no in-app prompt needed).                              |
| `injectRegister: null`                                | We register the SW manually in `main.jsx` so push works before `window.load`.                   |
| `includeAssets: [...]`                                | Static assets pre-cached at install time (icons, offline.html, screenshots).                    |
| `manifest: { ... }`                                   | The Web App Manifest (see §11). Generates `manifest.webmanifest` at build.                       |
| `manifest.shortcuts`                                  | App-icon long-press shortcuts (Orders, Services, Courses, Shop).                                |
| `manifest.share_target`                               | Lets the OS hand off shared text/URLs to `/products` (used by Android share sheet).             |
| `injectManifest: { globPatterns }`                    | What gets pre-cached: js/css/html/ico/png/svg/woff2.                                            |
| `devOptions.enabled: mode === 'development'`          | Enables a controlling SW in `vite dev` so DevTools "Offline" actually serves `offline.html`.    |
| `resolve.alias: { '@': './src' }`                     | Path alias for cleaner imports.                                                                 |
| `optimizeDeps.include`                                | Pre-bundles Workbox sub-packages so dev-server doesn't repeatedly "discover" them and reload.   |
| `esbuild.drop: ['console', 'debugger']`               | Strips `console.*` and `debugger` statements from the production bundle.                        |
| `build.target: 'es2015'`                              | Down-levels output for older Android WebViews (safe baseline for TWA).                          |
| `build.chunkSizeWarningLimit: 500`                    | Warn at 500 KB rather than the default 250 KB.                                                  |
| `build.sourcemap: false`                              | Don't ship sourcemaps to production.                                                            |
| `build.rollupOptions.output.manualChunks`             | Vendor splitting: `react-vendor`, `vendor-firebase`, `ui` (lucide), `recharts`, `vendor-motion`, `forms` (formik+yup), `utils` (clsx, tailwind-merge, react-hot-toast). |

### 2.3 `frontend/package.json` scripts

| Script                  | What it does                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `dev`                   | `vite` — starts the dev server on port 5173 with HMR + dev-mode SW.                                |
| `build`                 | `vite build` — outputs to `dist/`; runs Workbox `injectManifest`.                                  |
| `build:analyze`         | `vite build --mode analyze` — same as build but launches the bundle visualizer (`dist/stats.html`). |
| `lint`                  | `eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0` — strict CI linting.   |
| `preview`               | `vite preview` — serves `dist/` locally (used to QA the production build).                         |
| `generate-icons`        | `node scripts/generate-pwa-icons.mjs` — regenerates every PWA icon size from a master SVG/PNG.     |

### 2.4 `backend/package.json` scripts

| Script                            | What it does                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `start`                           | `node src/server.js` — production entry (Render runs this).                                               |
| `dev`                             | `nodemon src/server.js` — local dev with auto-reload.                                                     |
| `build`                           | `node scripts/migrate-deploy.mjs && npx prisma generate` — applies migrations then re-emits the client.   |
| `seed`                            | `dotenv -e .env -- node prisma/seed.js` — idempotent reference-data seed.                                 |
| `seed:bulk-products`              | Demo data loader for an empty product catalog.                                                            |
| `promote-admin`                   | One-off script to mark a user as admin by email.                                                          |
| `sync-firebase-users`             | Imports every Firebase Auth user into Prisma `User` (used during migrations / DR).                       |
| `sync-firebase-users:corp-tls`    | Same, but with `FIREBASE_ADMIN_INSECURE_TLS=1` so it works through corporate MITM proxies.               |

`prisma.seed` is also wired in `package.json` so `npx prisma db seed` runs `prisma/seed.js`.

### 2.5 Environment variables (no values, just purpose)

#### Backend (`backend/.env` — see `README.md` for full list)

| Variable                                                                                       | Purpose                                                                                         |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                                                     | `development` / `production`. Many guards key off this (HSTS, ADMIN_EMAILS check, error verbosity). |
| `PORT`                                                                                         | HTTP port. Defaults to 5000.                                                                    |
| `DATABASE_URL`                                                                                 | Postgres pooled connection (e.g. NeonDB pooler). **Required**; server `process.exit(1)` on miss. |
| `DIRECT_URL`                                                                                   | Non-pooled DB URL — Prisma migrate uses this to avoid advisory-lock timeouts (P1002).           |
| `USE_NEON_HTTP`                                                                                | `1`/`true` switches Prisma to the Neon WebSocket adapter (handy when `:5432` is blocked locally). |
| `ALLOW_INSECURE_TLS`                                                                           | Dev-only escape hatch: disables certificate verification (useful behind corporate MITM).        |
| `TRUST_PROXY`                                                                                  | Number of forwarded-for hops to trust. Defaults to 1 in production / on Render.                 |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`                       | Admin SDK credentials for verifying ID tokens.                                                  |
| `FIREBASE_SERVICE_ACCOUNT_PATH`                                                                | Optional dev-only fallback to a JSON keyfile if the env vars are missing.                       |
| `FIREBASE_ADMIN_INSECURE_TLS`                                                                  | Dev-only TLS bypass for the Admin SDK behind corporate proxies.                                 |
| `ADMIN_EMAILS`                                                                                 | Comma-separated allowlist auto-promoted to `role=admin` in `auth.js`. **Required in prod**.     |
| `CORS_ORIGINS`                                                                                 | Comma-separated allow-list. Defaults to `localhost:5173/5174/3000` + the prod Vercel domain.    |
| `FRONTEND_URL`                                                                                 | Public URL of the React app — used in email templates and password-reset links.                 |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`                       | Cloudinary image upload credentials.                                                            |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`                            | Outbound email (order confirms, OTPs, contact form).                                            |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`                                     | Web Push (server side).                                                                          |
| `GOOGLE_SHEETS_SPREADSHEET_ID`                                                                 | Optional. When set, the daily 00:00 sync runs and admin Sheets endpoints work.                  |
| `GOOGLE_SHEETS_CREDENTIALS`                                                                    | JSON service-account credentials for the Sheets API.                                            |

#### Frontend (`frontend/.env` — read at build time by Vite)

| Variable                                                                                              | Purpose                                                              |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `VITE_API_URL`                                                                                        | Backend base URL (incl. `/api`). Falls back to `http://localhost:5000/api`. |
| `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_STORAGE_BUCKET` / `VITE_FIREBASE_MESSAGING_SENDER_ID` / `VITE_FIREBASE_APP_ID` | Firebase web SDK config. |
| `VITE_RECAPTCHA_SITE_KEY`                                                                             | Optional. Enables Firebase App Check (reCAPTCHA v3).                 |
| `VITE_VAPID_PUBLIC_KEY`                                                                               | Public VAPID key — needed for `pushManager.subscribe()`.             |

### 2.6 `frontend/src/main.jsx` — client bootstrap

```5:19:frontend/src/main.jsx
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ErrorBoundary>
    </React.StrictMode>,
);
```

What it does, in order:

1.  Imports global CSS (Tailwind layers + PWA shell rules).
2.  `registerSW({ immediate: true })` — registers `sw.js` *before* `window.onload`. This is critical for mobile PWAs: Android Chrome will not deliver a push if the SW registers late.
3.  Mounts `<App />` inside `React.StrictMode`, an `ErrorBoundary`, and a `BrowserRouter`.

### 2.7 `frontend/src/App.jsx` — provider tree + route map

`App.jsx` is the closest thing to Next.js's `_app.js`. It:

1.  Wraps children in `AuthProvider → NotificationProvider → ShopProvider`. Order matters: `ShopProvider` calls `useAuth()`, and `NotificationProvider` calls `useAuth()` too.
2.  Mounts always-on overlays: `Toaster` (react-hot-toast), `CompareWidget` (floating compare drawer), `InstallPromptBanner` (Android `beforeinstallprompt`), `IOSInstallPrompt` (manual iOS instructions), `PushNotificationsBridge` (system bus for SW ↔ React).
3.  Defines `lazyRetry`: a `React.lazy` wrapper that, on chunk-load failure, reloads the page up to twice (uses `sessionStorage`). This is the standard fix for stale-chunk errors after a Vercel deploy.
4.  Declares the entire route table (see §3).

### 2.8 `frontend/index.html` — custom HTML shell (the "_document" equivalent)

The `<head>` is hand-tuned for PWA + SEO:

-   `viewport-fit=cover` so the app paints under the iOS notch / home indicator.
-   Strict inline `Content-Security-Policy` allowing only Firebase, Cloudinary, Google APIs, and `data:`/`blob:` images.
-   Font preconnect + `display=optional` for Inter/Outfit (better CLS than `swap`).
-   Apple PWA meta (`apple-mobile-web-app-capable`, status bar style, multi-size touch icons, multi-device splash screens).
-   Open Graph + Twitter Card meta for shared links.
-   `<div id="root"></div>` and `<script type="module" src="/src/main.jsx"></script>` close the body.

There is no `_document.js` to customise. To change the shell, edit
`index.html` directly.

### 2.9 `backend/src/server.js` — Express bootstrap

```16:48:backend/src/server.js
const requiredEnvVars = ['DATABASE_URL'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`FATAL: Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

if (process.env.NODE_ENV === 'production') {
    const adminEmailsRaw = (process.env.ADMIN_EMAILS || '').trim();
    const adminEmails = adminEmailsRaw
        .split(',').map((e) => e.trim()).filter(Boolean);
    if (adminEmails.length === 0) {
        console.error('FATAL: ADMIN_EMAILS must be set in production (comma-separated list)');
        process.exit(1);
    }
}
```

Notable behaviours:

-   Loads `backend/.env` via `dotenv` BEFORE any `import`s of `app.js` / `firebase.js` (this is why `app.js` is dynamically imported below).
-   Optionally disables TLS verification only when `NODE_ENV !== 'production' && ALLOW_INSECURE_TLS=1` (corporate-MITM convenience).
-   Fails closed on missing env vars: missing `DATABASE_URL` (always) or `ADMIN_EMAILS` (production) → `process.exit(1)`. This was a deliberate fix: the previous fall-back hardcoded a personal Gmail.
-   Wires global `unhandledRejection` (log only) and `uncaughtException` (log + exit) handlers.
-   Dynamically imports `./app.js` then `./cron/referrals.js` (registers the daily referral cron).
-   If `GOOGLE_SHEETS_SPREADSHEET_ID` is set, schedules `syncAllSheets()` at the next 00:00 and re-schedules itself afterwards.

### 2.10 `backend/src/app.js` — Express middleware + route mounting

In order:

1.  `app.set('trust proxy', …)` so `express-rate-limit` honours `X-Forwarded-For` on Render.
2.  Three rate limiters (`limiter` global, `authLimiter`, `sensitiveLimiter`).
3.  `compression()` (gzip).
4.  `helmet()` with a strict CSP and `cross-origin` resource policy. In production, also adds `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
5.  Global `limiter` (500 req / 15 min / IP).
6.  CORS — origins from `CORS_ORIGINS` env or fall back to localhost dev origins + the prod Vercel domain. `credentials: true`.
7.  `express.json({ limit: '2mb' })` (Cloudinary base64 uploads need the headroom).
8.  Static `/uploads` (legacy local upload dir; new uploads go to Cloudinary).
9.  Mounts each route module under its `/api/...` prefix (see §7 for the full table).
10. Generic `/api` 404 + global 404 + `(err, req, res, next)` 500 handler that hides stack traces in production.

---

## 3. Routing & Pages

Routing is **client-side**, declared in `frontend/src/App.jsx` using
`react-router-dom@6` with `<BrowserRouter>` (set in `main.jsx`). Pages are
loaded with `React.lazy` (via `lazyRetry`) and split into vendor chunks (see
`vite.config.js`).

### 3.1 Layout wrappers

| Layout                | Used for                                | What it renders                                                                                          |
| --------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `SharedLayout`        | All public + protected pages            | `Navbar` + `<Outlet />` + `Footer` + mobile `BottomNav` + `MobileDrawer` + `BackToTop`. Also redirects signed-in users with no phone to `/onboarding`. |
| `DashboardLayout`     | `/dashboard/*` and `/admin/*`           | Sidebar nav + content area; switches sidebar based on `role` prop (`customer` vs `admin`).               |
| `AuthPageLayout`      | `/sign-in`, `/sign-up`                  | Two-column hero on desktop, single column on mobile; shared by sign-in and sign-up.                       |

### 3.2 Route table — every URL in the app

#### Public (under `<SharedLayout>`)

| URL                              | Page component       | Data fetched                                           | Access                |
| -------------------------------- | -------------------- | ------------------------------------------------------ | --------------------- |
| `/`                              | `Home`               | `productsAPI.getAll({ sort: 'rating', limit: 10 })`, plus banners (`bannersAPI.getPublic`), categories, deals — most components fetch their own. | Anyone                |
| `/refurbished`                   | `<Navigate to="/products" replace />` | n/a                                  | Anyone — legacy URL redirect |
| `/products`                      | `Products`           | `productsAPI.getAll(filters)` (search, category, price, sort, page) | Anyone                |
| `/products/category/:slug`       | `CategoryPage`       | `categoriesAPI.getBySlug` + filtered product list      | Anyone                |
| `/products/:id`                  | `ProductDetail`      | `productsAPI.getById(id)` + reviews + related + co-purchased + bundles-for-product | Anyone (read-only) |
| `/bundles`                       | `Bundles`            | `bundlesAPI.getAll`                                    | Anyone                |
| `/bundles/:idOrSlug`             | `BundleDetail`       | `bundlesAPI.getById` or `getBySlug`                    | Anyone                |
| `/cart`                          | `Cart`               | Reads from `ShopProvider` (server cart for logged-in, local for guest) | Anyone — checkout requires login |
| `/wishlist`                      | `Wishlist`           | `wishlistAPI.get` (or local for guest)                 | Anyone                |
| `/compare`                       | `Compare`            | Reads from `ShopProvider.compareList` + product detail | Anyone                |
| `/checkout`                      | `Checkout`           | `addressesAPI.getAll`, `couponsAPI.validate`, `referralsAPI.getMyStats` | **Protected**       |
| `/services`                      | `Services`           | `serviceTypesAPI.getAll`                               | **Protected**         |
| `/courses`                       | `Courses`            | `coursesAPI.getAll`                                    | Anyone                |
| `/courses/:id`                   | `CourseDetail`       | `coursesAPI.getById` + duration/batch list              | Anyone                |
| `/courses/:id/player`            | `CoursePlayer`       | `coursesAPI.getCoursePlayer(id)` (materials + progress) | **Protected** — also requires enrollment |
| `/tally-erp`, `/tally-prime`     | `TallyERP`           | Static landing + enquiry form `POST /api/tally/enquiry` | Anyone               |
| `/cctv`                          | `CCTVSecurity`       | Static landing + enquiry form                           | Anyone               |
| `/our-companies`                 | `OurCompanies`       | Static                                                  | Anyone               |
| `/privacy-policy`                | `PrivacyPolicy`      | Static                                                  | Anyone               |
| `/terms-of-service`              | `TermsOfService`     | Static                                                  | Anyone               |
| `/refund-policy`                 | `RefundPolicy`       | Static                                                  | Anyone               |
| `/faq`                           | `FAQ`                | Static                                                  | Anyone               |
| `/contact`                       | `ContactUs`          | `POST /api/contact` on submit                           | Anyone               |
| `/notifications`                 | `Notifications`      | `notificationsAPI.getAll`                               | **Protected**         |

#### Auth (no layout)

| URL              | Page          | Notes                                                                                                                                 |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/sign-in`       | `SignIn`      | Email/password + Google. Honours `state.from.pathname` redirect (sanitised). Shows reset-mode toggle. If unverified → `/verify-email`. |
| `/sign-up`       | `SignUp`      | Email/password + Google. Captures `?ref=CODE` to seed `referredByCode`.                                                              |
| `/verify-email`  | `VerifyEmail` | Polls Firebase user reload; on verified, navigates to `state.from` (or `/`).                                                          |
| `/onboarding`    | `OnboardingPage` | Captures phone + name; calls `POST /auth/onboarding`. Has a "Skip for now" that sets `sessionStorage.onboardingSkipped`.            |

#### User dashboard (under `<DashboardLayout role="customer">`, `<ProtectedRoute>`)

| URL                          | Page             | Data fetched                                                |
| ---------------------------- | ---------------- | ----------------------------------------------------------- |
| `/dashboard`                 | `UserDashboard`  | `ordersAPI.getMyStats` + summary cards                      |
| `/dashboard/orders`          | `UserOrders`     | `ordersAPI.getMyOrders({ page, limit })`                    |
| `/dashboard/orders/:id`      | `OrderDetail`    | `ordersAPI.getById(id)` + `cancel`/`return`/`download-invoice` actions |
| `/dashboard/services`        | `UserServices`   | `servicesAPI.getMyBookings`                                 |
| `/dashboard/courses`         | `UserCourses`    | `coursesAPI.getMyApplications` + `getMyEnrollments`         |
| `/dashboard/profile`         | `UserProfile`    | `authAPI.getMe` + `addressesAPI.getAll` (CRUD)              |
| `/dashboard/settings`        | `UserSettings`   | Push subscribe/unsubscribe via `usePushNotifications`       |
| `/dashboard/referrals`       | `UserReferrals`  | `referralsAPI.getMyStats` + `getMyReferrals` + `getMyReceivedReferrals` |

#### Admin dashboard (under `<DashboardLayout role="admin">`, `<ProtectedRoute adminOnly>`)

| URL                                | Page                       |
| ---------------------------------- | -------------------------- |
| `/admin`                           | `AdminDashboard` (charts via `adminAPI.getStats`) |
| `/admin/products`                  | `AdminProducts` (CRUD + variants + tiers)         |
| `/admin/orders`                    | `AdminOrders` (status, refund approve/reject)     |
| `/admin/services`                  | `AdminServices` (assign technician, OTPs, status) |
| `/admin/coupons`                   | `AdminCoupons`             |
| `/admin/users`                     | `AdminUsers` (search, role flip)                  |
| `/admin/categories`                | `AdminCategories`          |
| `/admin/service-types`             | `AdminServiceTypes`        |
| `/admin/referrals`                 | `AdminReferrals`           |
| `/admin/referral-settings`         | `AdminReferralSettings` (rates, tiers)            |
| `/admin/courses`                   | `AdminCourses` (course/duration/batch CRUD)       |
| `/admin/enrollments`               | `AdminEnrollments` (apps + fee payments)          |
| `/admin/tally-enquiries`           | `AdminTallyEnquiries`      |
| `/admin/cctv-enquiries`            | `AdminCCTVEnquiries`       |
| `/admin/banners`                   | `AdminBanners` (drag-reorder)                      |
| `/admin/bundles`                   | `AdminBundles` (fixed combos)                      |
| `/admin/bundle-templates`          | `AdminBundleTemplates` (BYOB rules)                |
| `/admin/sheets`                    | `AdminSheetsSync`          |
| `/admin/notifications`             | `AdminNotifications` (broadcast)                   |
| `/admin/audit-log`                 | `AdminAuditLog`            |

#### Catch-all

`*` → `<NotFound />` rendered inside `SharedLayout`.

### 3.3 Dynamic routes

`react-router-dom` URL params (read with `useParams()`):

| Pattern                           | Param           | Notes                                                                                       |
| --------------------------------- | --------------- | ------------------------------------------------------------------------------------------- |
| `/products/:id`                   | `id`            | Numeric DB id. Stored as integer.                                                           |
| `/products/category/:slug`        | `slug`          | Lowercase URL-safe category slug.                                                           |
| `/bundles/:idOrSlug`              | `idOrSlug`      | The page tries `getById` (numeric) first; if that fails, falls back to `getBySlug`.         |
| `/courses/:id`                    | `id`            | Numeric.                                                                                    |
| `/courses/:id/player`             | `id`            | Numeric. Backend additionally enforces enrollment.                                           |
| `/dashboard/orders/:id`           | `id`            | Numeric.                                                                                    |

Query strings handled in pages:
-   `/products?search=…&category=…&minPrice=…&maxPrice=…&onSale=true&isDeal=true&sort=price_asc|price_desc|rating|newest&page=N`
-   `/sign-up?ref=CODE` — stored in `localStorage.referralCode` and consumed by Auth flow.

### 3.4 "Middleware" — `<ProtectedRoute>`

There is no Express-style middleware on the frontend. Instead the
`ProtectedRoute` component (`frontend/src/components/auth/ProtectedRoute.jsx`)
is wrapped around protected routes:

```5:30:frontend/src/components/auth/ProtectedRoute.jsx
const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { isSignedIn, user, loading, requiresEmailVerification } = useAuth();
    const location = useLocation();
    if (loading) return <div className="min-h-screen bg-page-bg" />;
    if (!isSignedIn) return <Navigate to="/sign-in" state={{ from: location }} replace />;
    if (requiresEmailVerification) return <Navigate to="/verify-email" state={{ from: location }} replace />;
    if (adminOnly && user?.role !== 'admin') return <Navigate to="/" replace />;
    if (needsPhoneCapture(user)) return <Navigate to="/onboarding" state={{ from: location }} replace />;
    return children;
};
```

Logic order matters:

1.  `loading` → render an empty placeholder (avoids flash of redirect).
2.  Not signed in → bounce to `/sign-in` with `state.from = location` so the page can return after auth (the `safeInternalPath` helper in `SignIn.jsx` validates this against open-redirect attacks).
3.  Email not verified → `/verify-email`.
4.  `adminOnly` requested but `role !== 'admin'` → `/` (silent denial).
5.  Phone missing (and not admin) → `/onboarding`.

`SharedLayout` performs a parallel check so even pages that are NOT wrapped
in `ProtectedRoute` redirect to `/onboarding` once a user signs in but has no
phone (unless they hit "Skip for now").

---

## 4. Frontend Components

Components are grouped by domain. All are functional components; React 18
hooks throughout. Tailwind for styling. `lucide-react` for icons.

### 4.1 Layout & navigation (`components/layout/`)

| Component             | Renders                                                                                            | Props                              | Internal state                                           | Events / callbacks                                              |
| --------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| `SharedLayout`        | Top-level layout for public + protected pages: skip-link, `Navbar`, `<Outlet />`, `Footer`, `BottomNav`, `MobileDrawer`, `BackToTop`. | none                               | `drawerOpen` (boolean)                                   | `openDrawer`, `closeDrawer` passed to `BottomNav` / `MobileDrawer`. |
| `DashboardLayout`     | Sidebar (varies by role) + header + main `<Outlet />`. Hides bottom nav on mobile (separate dashboard nav).                            | `role: 'customer' \| 'admin'`     | sidebar open (mobile), nav collapse                       | Sign-out via `useAuth().logout`.                                |
| `Navbar`              | Logo, search bar (md+), account dropdown, cart/wishlist counters, deliver-to strip on mobile.                                          | none                               | mobile-menu open, search focus                            | `useShop` for cart count; `useNotifications` for unread badge.  |
| `Footer`              | Sitemap-style footer: companies, shop, services, courses, social, privacy/terms links.                                                 | none                               | none                                                       | none                                                            |
| `BottomNav`           | Sticky bottom tab bar (mobile only): Home / Categories / Cart / Account / Menu.                                                        | `onMenuClick`                      | active route (derived)                                    | Calls `onMenuClick` to open drawer.                             |
| `MobileDrawer`        | Slide-in side drawer on mobile (account, services, languages, etc.).                                                                   | `isOpen`, `onClose`                | none                                                       | `onClose`. Re-uses `AccountDropdown` items.                     |
| `SearchBar`           | Auto-suggest search input. Calls `productsAPI.getAll({ search, limit })` debounced.                                                    | `onResultClick?`                   | query, suggestions, focus                                 | Navigates to `/products/:id` on click.                          |
| `AccountDropdown`     | Hover/click menu: Sign in / Profile / Orders / Admin / Logout.                                                                          | none                               | open (boolean)                                            | `useAuth` for state; closes on outside click.                   |

### 4.2 Auth (`components/auth/`)

| Component         | Renders                                                                                                        | Props          | Internal state                | Events                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------- | --------------------------------------- |
| `AuthPageLayout`  | Two-column hero shell: left = brand pitch, right = the form (`children`). Single column on mobile.             | `headline`, `subheadline`, `children` | none                          | none                                    |
| `ProtectedRoute`  | Route guard (see §3.4).                                                                                         | `children`, `adminOnly` | none                  | Redirect via `<Navigate />`.            |

### 4.3 Home page (`components/home/`)

These are composed top-to-bottom on `Home.jsx`:

| Component             | Renders                                                                                            | Data source                                    |
| --------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `HeroBannerSlider`    | Auto-rotating banner carousel.                                                                     | `bannersAPI.getPublic()`                       |
| `TrustStrip`          | Static "100% genuine / Etah delivery / GST invoice" strip.                                         | static                                         |
| `WhatWeOffer`         | 4-vertical grid: Shop, Services, Courses, Tally/CCTV.                                              | static                                         |
| `OurBusinesses`       | Marketing card linking to `/our-companies`.                                                        | static                                         |
| `CategoryGrid`        | Top categories rendered as tiles.                                                                  | `categoriesAPI.getAll()`                       |
| `DealOfTheDay`        | Highlight product flagged `isDeal`.                                                                | `productsAPI.getAll({ isDeal: true })`         |
| `ProductRow`          | Horizontal product carousel with optional desktop grid.                                            | `products` prop (parent fetches)               |
| `BundleRow`           | Horizontal carousel of fixed bundles, filterable by `displayOn`.                                   | `bundlesAPI.getAll({ displayOn })`             |
| `BYOBSection`         | "Build Your Own Bundle" entry point — links to first active template.                              | `bundleTemplatesAPI.getAll()`                  |
| `ServicesShowcase`    | Top services tiles (Repair, CCTV, etc.).                                                           | `serviceTypesAPI.getAll()`                     |
| `AcademyTeaser`       | Course module teaser.                                                                              | `coursesAPI.getAll()` (slice).                 |
| `BrandStrip`          | Logo grid of partner brands.                                                                       | static                                         |
| `B2BStrip`            | Marketing strip targeting bulk buyers.                                                             | static                                         |
| `PWAInstallSection`   | Promo card showing the PWA install CTA on supported devices.                                        | `useInstallPrompt`                             |

### 4.4 Shop (`components/shop/`)

| Component                   | Renders                                                                                                         | Props                                                              | State / events                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `ProductCard`               | Image, title, price (sale/original), rating stars, badges, add-to-cart, wishlist heart.                          | `product`                                                          | Toggles wishlist via `useShop`; cart add via `addToCart`. Toast feedback.     |
| `FilterSidebar`             | Category, price range, brand, rating filters; collapses to bottom sheet on mobile.                              | `filters`, `onChange`, available `categories`, `brands`           | local form state; `onChange` debounced.                                        |
| `BundleBuilder`             | Slot-based BYOB UI: pick products per slot, live discount preview via `bundleTemplatesAPI.calculate`.            | `template`                                                         | `selections` (object: slotId → productIds); `onAddToCart` callback.            |
| `BundleCard`                | Bundle thumbnail + price + savings badge.                                                                       | `bundle`                                                           | "Add bundle" → `useShop.addBundleToCart`.                                      |
| `CompareWidget`             | Floating bottom card showing items in compare list (max 3).                                                      | none                                                               | Reads `useShop.compareList`; clear/remove actions.                              |
| `FrequentlyBoughtTogether`  | Suggestions block on PDP: top co-purchased products (`getCoPurchased`) + "Add all to cart".                      | `productId`                                                        | local fetch; toggles selected items.                                            |
| `ReviewSection`             | Reviews list, summary stars, write-review form (logged-in + verified buyer).                                    | `productId`                                                        | local form state; submit via `reviewsAPI.create`.                              |
| `QuantityTierDisplay`       | Volume discount table for products with `quantityTiers`.                                                         | `tiers[]`                                                          | none                                                                           |

### 4.5 PWA / Install (`components/pwa/`)

| Component             | Renders                                                                                                | Props      | State                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------- |
| `InstallPromptBanner` | Bottom banner on Android Chrome captured `beforeinstallprompt` event. Shows "Install app".              | none       | `deferredPrompt`, `dismissed` (localStorage `installDismissedAt`).         |
| `IOSInstallPrompt`    | Manual instructions modal for iOS Safari (no programmatic install API).                                 | none       | `dismissed` (localStorage); shown only on iOS standalone-capable devices.  |

### 4.6 Notifications (`components/notifications/`)

| Component               | Renders                                                                                                  | Props      | State                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| `NotificationDropdown`  | Bell icon with unread badge; dropdown of latest 50 notifications. Click → mark read + navigate to `link`. | none       | `useNotifications` context.                            |

### 4.7 System (`components/system/`)

| Component                  | Purpose                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PushNotificationsBridge`  | Mounted once at the root. Listens for `navigator.serviceWorker` `message` events: `cmgroups:push-received` (refresh notifications via context) and `cmgroups:subscription-changed` (re-POST the new subscription via the push API). |

### 4.8 UI primitives (`components/ui/`)

| Component        | Renders                                                                            | Notes                                              |
| ---------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- |
| `Button`         | Themed button with `variant` and `size` props (uses `cn()`).                        | Primary, outline, ghost, destructive variants.     |
| `Modal`          | Accessible modal (focus trap, ESC/overlay close).                                   | Used by AdminProducts, BookingModal, etc.          |
| `ConfirmDialog`  | Wraps `Modal` to ask Yes/No.                                                        | Promise-based (resolves true/false).               |
| `BottomSheet`    | Mobile-only swipe-up sheet.                                                         | Used for mobile filters / mobile actions.          |
| `BackToTop`      | Floating button — appears after scrolling 600 px.                                   | None.                                              |
| `SectionLoader`  | Skeleton loader for product rows / list sections.                                   | Pure presentation.                                 |
| `PointsBadge`    | Small badge showing wallet/referral points.                                          | Used in Navbar and dashboard cards.                |
| `index.jsx`      | Re-export barrel for the UI module.                                                 |                                                    |

### 4.9 Common (`components/common/`)

| Component        | Renders                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `PriceDisplay`   | Formats `price` and optional `originalPrice` into a striped sale display with discount %. Used widely.           |

### 4.10 Page-internal helpers (`pages/services/` and `pages/shop/checkout/`)

These are tightly coupled to a specific page so they live next to it:

| Component                   | Path                                          | Used by                |
| --------------------------- | --------------------------------------------- | ---------------------- |
| `BookingModal`              | `pages/services/BookingModal.jsx`             | `Services.jsx`         |
| `ServiceCard`               | `pages/services/ServiceCard.jsx`              | `Services.jsx`         |
| `AddressCard`               | `pages/shop/checkout/AddressCard.jsx`         | `Checkout.jsx`         |
| `ShippingStep`              | `pages/shop/checkout/ShippingStep.jsx`        | `Checkout.jsx`         |
| `PaymentStep`               | `pages/shop/checkout/PaymentStep.jsx`         | `Checkout.jsx`         |
| `BundleServiceScheduler`    | `pages/shop/checkout/BundleServiceScheduler.jsx` | `Checkout.jsx`     |
| `ApplicationForm`           | `pages/courses/ApplicationForm.jsx`           | `CourseDetail.jsx`     |

---

## 5. State Management & Data Flow

The app uses **React Context** (no Redux, Zustand, or Recoil). The split is
intentional: each context owns one domain so re-renders stay contained.

### 5.1 Context tree (set up in `App.jsx`)

```
<AuthProvider>
  └── <NotificationProvider>          (depends on user via useAuth)
        └── <ShopProvider>            (depends on user via useAuth)
              └── <Routes ... />
```

### 5.2 `AuthContext` / `AuthProvider`  (`src/context/Auth*.jsx`)

State held:

| State                       | Shape / type                              | Source                                      |
| --------------------------- | ----------------------------------------- | ------------------------------------------- |
| `user`                      | `{ id, name, email, role, phone, referralCode, walletBalance, createdAt }` (DB row) | `GET /api/auth/me` after Firebase token ready |
| `firebaseUser`              | Firebase `User` object                    | `onAuthStateChanged(auth)`                   |
| `emailVerified`             | boolean                                   | `firebaseUser.emailVerified`                 |
| `loading`                   | boolean — true until first auth resolution | initialised true; flipped in `onAuthStateChanged` |
| `tokenRef.current` (ref)    | Latest Firebase ID token                  | Refreshed in onAuth callback + every 50 min  |

Actions exported on the context value:

| Action                          | What it does                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `loginWithEmail(email, pw)`     | `signInWithEmailAndPassword`, fetches/creates DB user via `fetchMeOrRegister`, sets context.       |
| `registerWithEmail(...)`        | `createUserWithEmailAndPassword`, sends verification email, calls `POST /auth/register`.           |
| `loginWithGoogle(referredByCode)` | `signInWithPopup` (falls back to redirect on `popup-blocked`); on success, calls `/auth/register`. |
| `logout()`                      | Clears context state, calls `signOut(auth)`.                                                       |
| `resendVerificationEmail()`     | `sendEmailVerification(firebaseUser)`.                                                              |
| `reloadFirebaseUser()`          | `auth.currentUser.reload()` — used by `/verify-email` polling.                                     |
| `resetPassword(email)`          | Calls `POST /auth/forgot-password` (branded email; not the Firebase default).                      |
| `refreshUser()`                 | Re-fetches `GET /auth/me` to pick up updated wallet / role.                                         |

Derived flags exported:
-   `isSignedIn = !!firebaseUser`
-   `isAdmin = user?.role === 'admin'`
-   `firebaseConfigured = !!auth` (false when env vars missing — UI shows a helpful banner instead of crashing).
-   `requiresEmailVerification = !!firebaseUser && !emailVerified`

The provider also calls `setTokenGetter()` on the `lib/api.js` client so every
fetch automatically includes a Bearer header. On sign-out the getter is set
to null. Token auto-refresh: a `setInterval` calls `getIdToken(true)` every
50 minutes (Firebase tokens expire at 60 min).

### 5.3 `ShopContext` / `ShopProvider`  (`src/context/Shop*.jsx`)

State held:

| State                  | Persisted?                                          | What it is                                                                                  |
| ---------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `cart`                 | Server (DB) when signed-in; **not** in localStorage | Array of cart items (each = `{ id, productId, variantId, quantity, title, price, ... }`).    |
| `cartLoading`          | no                                                  | True during refetch.                                                                          |
| `wishlist`             | `localStorage.wishlist` (always)                    | Array of products (just IDs + minimal snapshot).                                              |
| `compareList`          | `localStorage.compareList`                          | Array of products (max 3, capped via `MAX_COMPARE_ITEMS`).                                    |
| `coupon`               | `localStorage.appliedCoupon`                        | The applied coupon `{ code, discountType, value, ... }`.                                      |
| `buyNowItems`          | `sessionStorage.buyNowItems`                        | Items used by "Buy now" flow that bypasses the cart for a single checkout.                    |

Actions:

-   **Cart**: `addToCart(product, qty, options)`, `updateCartQuantity(...)`, `removeFromCart(...)`, `clearCart()`, `addBundleToCart(bundle)`, `removeBundleFromCart(instanceId)`, `placeOrder(...)`.
-   **Wishlist**: `toggleWishlist(product)`, `clearWishlist()`. Local-first; merged into server with `wishlistAPI.merge` on sign-in.
-   **Compare**: `addToCompare`, `removeFromCompare`, `clearCompare`.
-   **Coupon**: `applyCoupon(code)` (calls `couponsAPI.validate`), `removeCoupon()`.
-   **Buy now**: `initBuyNow(item)`, `initBuyNowMultiple(items[])`, `clearBuyNow()`.

Cross-cutting concerns implemented inside the provider:

-   **Stock reconciliation** — `reconcileCartStock` clamps quantities to `item.stock` after fetch and toasts a warning. Prevents a cart that quietly oversells.
-   **Cart queue** — `cartQueue` is a tiny in-memory promise chain that serialises mutations to the server cart. Without this, two rapid `+` clicks could race and produce inconsistent quantities.
-   **Bundle-aware subtotal** — `computeBundleAwareSubtotal()` (in `utils/bundleUtils.js`) takes precedence over per-item price for any cart entry tagged with `bundleInstanceId`.
-   **Coupon discount** — `computeCouponDiscountFromRules()` (in `utils/couponPricing.js`) runs the same rules the server uses, so the UI shows the exact discount that the server will apply.

Data flow on sign-in:

1.  `AuthProvider` resolves DB user → `ShopProvider` re-runs its sync effect.
2.  Local wishlist (if any) is `wishlistAPI.merge`d into the server wishlist.
3.  Server cart is fetched via `cartAPI.get()` and reconciled against stock.
4.  Coupon is re-validated against the new cart.

On sign-out: cart and wishlist state in memory are cleared; localStorage entries are kept (so the user sees their guest wishlist again).

### 5.4 `NotificationContext`  (`src/context/NotificationContext.jsx`)

State: `notifications[]`, `unreadCount`, `loading`, `error`.
Actions: `markRead(id)`, `markAllRead()`, `delete(id)`, `refresh()`.

Refresh triggers:
-   Polling: every 60 seconds while signed in.
-   `window.focus` event.
-   Custom event `cmgroups:notifications:refresh` — dispatched by `PushNotificationsBridge` whenever a push arrives in the SW (so the bell badge updates without waiting for the 60 s poll).

### 5.5 Persistence summary

| Storage                    | Keys                                                                                       | Why                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `localStorage`             | `wishlist`, `compareList`, `appliedCoupon`, `tn_recently_viewed`, `tn_compare`, `tn_saved_later`, `cmgroups_push_subscribed`, `referralCode`, `installDismissedAt` | Survive app restarts / device reboots.                            |
| `sessionStorage`           | `buyNowItems`, `onboardingSkipped`, `chunk_reload`                                         | Tab-scoped; cleared when the tab closes.                          |
| `cookies`                  | None set by app code. (Firebase Auth uses IndexedDB; Vercel may set its own.)              |                                                                  |

### 5.6 Component-level vs context state

Local component state (`useState`) is used for everything that is not
needed by other parts of the app: form values, modal open/closed flags,
search input, pagination cursors, etc. The contexts above hold only
truly global state.

### 5.7 Parent → child → back up

Typical pattern:

1.  Page (e.g. `ProductDetail`) reads global state with `useShop()` / `useAuth()`.
2.  Page passes plain values + callbacks down to dumb components (`ProductCard`, `ReviewSection`).
3.  Children call the callbacks; the callback updates context state, which re-renders the page automatically.

There is no Redux-style action dispatcher, no event bus other than the
small custom-events used by `NotificationContext` ↔ `PushNotificationsBridge`.

---

## 6. API Layer — Frontend Side

The frontend never imports `axios`, `swr`, or `react-query`. Every request
goes through a single hand-rolled `fetch`-based client:
`frontend/src/lib/api.js`.

### 6.1 The `apiFetch` core

```19:83:frontend/src/lib/api.js
const apiFetch = async (endpoint, options = {}, { timeout = 15000, retries = 3 } = {}) => {
    // ...AbortController for timeouts...
    for (let attempt = 0; attempt < retries; attempt++) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        // ...JSON parse, error normalisation, retry on 5xx with exp backoff...
    }
    throw lastError;
};
```

Behaviour worth knowing:

-   **Bearer header injection** — `getAuthHeaders()` calls a token getter that `AuthProvider` wires up via `setTokenGetter()`. No request needs to remember to attach the token.
-   **Timeout** — default 15 s per attempt via `AbortController`. Sheets endpoints override to 60–180 s.
-   **Retries** — up to 3 attempts on network errors / 5xx. Exponential backoff (1 s, 2 s, 4 s).
-   **Caller cancellation** — `options.signal` is honoured; if the caller aborts, the inner controller aborts too and the loop exits with `'Request cancelled'`.
-   **Error shape** — non-2xx → `Error` with `.status`. Timeout → `.isTimeout = true`. JSON parse failures degrade gracefully.

### 6.2 Endpoint groups

`api.js` exports a curated client per resource. Each method maps 1:1 to a
backend route and is the **only** place in the codebase that knows the
exact URL.

| Group                    | Methods (selected)                                                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authAPI`                | `getMe`, `register({name, referredByCode})`, `onboarding`, `updateProfile`, `forgotPassword`                                                                                                                                |
| `productsAPI`            | `getAll(params)`, `getById`, `getRelated`, `getCoPurchased`, `create`, `update`, `delete`, `addVariant`, `updateVariant`, `deleteVariant`, `bulkSaveVariants`, `generateVariants`, `toggleVariants`, `getOptions`, `addOption`, `updateOption`, `deleteOption`, `toggleDeal` |
| `ordersAPI`              | `place(items, total, ...)`, `getById`, `getMyOrders`, `getMyStats`, `getAll`, `updateStatus`, `verifyPayment`, `cancel`, `returnOrder`, `processRefund`, `downloadInvoice`                                                  |
| `addressesAPI`           | `getAll`, `create`, `delete`                                                                                                                                                                                                  |
| `cartAPI`                | `get`, `addItem`, `updateItem`, `removeItem`, `sync`, `removeBundle`, `clear`                                                                                                                                                 |
| `wishlistAPI`            | `get`, `add`, `remove`, `clear`, `merge`                                                                                                                                                                                      |
| `alertsAPI`              | `getAll`, `toggle`                                                                                                                                                                                                            |
| `notificationsAPI`       | `getAll`, `markRead`, `markAllRead`, `delete`                                                                                                                                                                                  |
| `reviewsAPI`             | `getForProduct`, `create`, `voteHelpful`, `getForBundle`, `createBundleReview`, `voteBundleHelpful`, `getPendingBundles`                                                                                                       |
| `servicesAPI`            | `getAvailableSlots(date)`, `book`, `getMyBookings`, `getAll`, `updateStatus`, `assignTechnician`, `verifyOtp`, `getBooking`, `regenerateOtp`, `verifyDeliveryOtp`, `regenerateDeliveryOtp`, `cancelBooking`                  |
| `techniciansAPI`         | `getAll`, `create`, `update`                                                                                                                                                                                                  |
| `coursesAPI`             | `getAll`, `getById`, `getCoursePlayer`, `apply`, `getMyApplications`, `getMyEnrollments`, `create`, `update`, `delete`, `addDuration`, `updateDuration`, `deleteDuration`, `addBatch`, `updateBatch`, `deleteBatch`, `getAllApplications`, `updateStatus`, `recordFeePayment`, `downloadCertificate` |
| `categoriesAPI`          | `getAll`, `getBySlug`, `create`, `delete`                                                                                                                                                                                     |
| `serviceTypesAPI`        | `getAll` (active), `getAllAdmin`, `create`, `update`, `delete`                                                                                                                                                                |
| `couponsAPI`             | `validate(code, cartItems, orderSubtotal)`, `getAll`, `create`, `update`, `delete`                                                                                                                                            |
| `adminAPI`               | `getStats`, `getUsers`, `getUserDetails`, `updateUserRole`, `getReferrals`, `getReferralSettings`, `updateReferralSettings`, `getAuditLogs`                                                                                   |
| `bannersAPI`             | `getPublic`, `getAll`, `create`, `update`, `toggle`, `reorder`, `delete`                                                                                                                                                      |
| `uploadAPI`              | `upload(base64, folder)`, `uploadMultiple`, `deleteImage(url)`                                                                                                                                                                |
| `bundlesAPI`             | `getAll`, `getById`, `getBySlug`, `getForProduct`, `getSuggestions`, `getAnalytics`, `getAllAdmin`, `create`, `update`, `delete`                                                                                              |
| `bundleTemplatesAPI`     | `getAll`, `getById`, `getProducts`, `calculate`, `getAllAdmin`, `create`, `update`, `delete`                                                                                                                                  |
| `quantityTiersAPI`       | `get`, `update`                                                                                                                                                                                                                |
| `sheetsAPI`              | `getStatus`, `syncAll`, `syncSheet`, `importProducts`                                                                                                                                                                          |
| `adminNotificationsAPI`  | `send`, `getHistory`, `getStats`                                                                                                                                                                                               |
| `referralsAPI`           | `getMyStats`, `getMyReferrals(source)`, `getMyReceivedReferrals`, `applyWallet(amount)`, `getPublicSettings`                                                                                                                  |

### 6.3 Hooks built on the API client

There are **no** custom data-fetching hooks (no `useProducts`, etc.).
Pages call `productsAPI.getAll()` directly inside `useEffect`. This was a
deliberate choice given the small surface and the strong typing already
expressed at the API level.

The following hooks wrap *non-network* concerns:

| Hook                                | What it does                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useSEO({ title, description })`    | Mutates `document.title` and the `<meta name="description">` content. Restores previous values on unmount.                                                  |
| `useRecentlyViewed(excludeId?)`     | Reads/writes `localStorage.tn_recently_viewed` (10-item ring buffer). Returns `{ items, save(product) }`.                                                    |
| `usePushNotifications()`            | Subscribes/unsubscribes the browser to web-push. Reconciles `localStorage.cmgroups_push_subscribed` with the actual `pushManager.getSubscription()`.        |
| `useInstallPrompt()`                | Captures the browser's `beforeinstallprompt` event so the install banner can present it later.                                                              |

### 6.4 Special non-`apiFetch` flows

A handful of endpoints stream binary content or need different headers.
They build their own `fetch` calls but reuse `getAuthHeaders()`:

-   `ordersAPI.downloadInvoice(id)` — fetches `/orders/:id/invoice`, blob, triggers a download via a temp `<a>`.
-   `coursesAPI.downloadCertificate(courseId)` — same pattern for `/courses/:id/certificate`.
-   Push subscribe/unsubscribe in `usePushNotifications()` — direct `fetch()` because the body shape is more web-API-idiomatic.

---

## 7. Backend — Express API

### 7.1 Entry point

`backend/src/server.js` (described in §2.9) loads env, validates it, then
dynamically imports `app.js`. `app.js` (§2.10) is the Express application.

### 7.2 Mounted route table

Every route module is mounted with a base path in `app.js`:

| Mount                            | File                                       | What it owns                                              |
| -------------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| `/api/auth`                      | `routes/auth.js`                           | Register / me / onboarding / profile / forgot-password   |
| `/api/products`                  | `routes/products.js`                       | Products + variants + options + quantity tiers            |
| `/api/orders`                    | `routes/orders.js`                         | Place / list / status / cancel / return / refund / invoice |
| `/api/reviews`                   | `routes/reviews.js`                        | Product + bundle reviews + helpful votes                  |
| `/api/services`                  | `routes/services.js`                       | Service bookings + slots + OTPs + status                  |
| `/api/coupons`                   | `routes/coupons.js`                        | Coupon validate (public-ish) + admin CRUD                 |
| `/api/admin`                     | `routes/admin.js`                          | Admin: users, stats, referrals, settings, banners, technicians, audit |
| `/api/categories`                | `routes/categories.js`                     | Categories + service types (active vs all)                 |
| `/api/referrals`                 | `routes/referrals.js`                      | Referral stats / lists / public settings / wallet validate |
| `/api/alerts`                    | `routes/alerts.js`                         | Stock + price-drop alerts                                  |
| `/api/notifications`             | `routes/notifications.js`                  | User in-app notifications                                  |
| `/api/courses`                   | `routes/courses.js`                        | Courses + applications + durations + batches + materials  |
| `/api/applications`              | `routes/applications.js`                   | Course-application alternative path (used by older pages) |
| `/api/wishlist`                  | `routes/wishlist.js`                       | Wishlist CRUD + merge                                      |
| `/api/tally`                     | `routes/tally.js`                          | Tally enquiries (public form + admin)                      |
| `/api/cctv`                      | `routes/cctv.js`                           | CCTV enquiries (public form + admin)                       |
| `/api/cart`                      | `routes/cart.js`                           | Server-side cart (replaces local-only cart on sign-in)     |
| `/api/banners`                   | `routes/banners.js`                        | Public-facing banner list (admin lives in `/api/admin/banners`) |
| `/api/addresses`                 | `routes/addresses.js`                      | User shipping addresses                                    |
| `/api/push`                      | `routes/push.js`                           | Web-push subscribe / unsubscribe / test                    |
| `/api/upload`                    | `routes/upload.js`                         | Cloudinary upload + delete                                 |
| `/api/contact`                   | `routes/contact.js`                        | Contact-form submissions                                   |
| `/api/bundles`                   | `routes/bundles.js`                        | Fixed bundles (CRUD + analytics + suggestions)             |
| `/api/bundle-templates`          | `routes/bundleTemplates.js`                | BYOB templates (slots, mix-match, calculate)               |
| `/api/admin/sheets`              | `routes/sheets.js`                         | Google Sheets sync                                         |
| `/api/admin/notifications`       | `routes/adminNotifications.js`             | Broadcast notifications + history + stats                  |

Three rate-limit "tiers" are applied above:

1.  `limiter` — global 500 req / 15 min / IP.
2.  `authLimiter` — `/api/auth/*` 20 req / hour / IP.
3.  `sensitiveLimiter` — `/api/orders`, `/api/services`, `/api/push` 60 req / 15 min / IP.

Plus per-route limiters in `middleware/rateLimiters.js`:

-   `resetPasswordLimiter` (5/hr) — applied to `POST /api/auth/forgot-password`.
-   `reviewWriteLimiter` (10/15min) — applied to `POST /api/reviews/:productId` and `POST /api/reviews/bundle/:bundleId`.
-   `addressWriteLimiter` (30/15min) — applied to `POST /api/addresses` and `DELETE /api/addresses/:id`.
-   `contactFormLimiter` (5/hr) — applied to `POST /api/contact`, `POST /api/tally/enquiry`, `POST /api/cctv/enquiry`.
-   `bookingCreateLimiter` (10/hr) — applied to `POST /api/services/book` and course apply.

### 7.3 Per-route reference (high-density)

Notation: `🔓 public`, `🔐 protect`, `❓ optional`, `👮 adminOnly`.

#### `/api/auth` (`routes/auth.js`)

| Method | Path                | Guards                          | Body / params                          | Behaviour                                                                                                                                |
| ------ | ------------------- | ------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/register`         | 🔐 (Firebase ID token in header) | `{ name, referredByCode? }`            | Idempotent upsert of `User` keyed by `firebaseUid`. Generates unique `referralCode`. If email matches `ADMIN_EMAILS`, sets `role='admin'`. |
| GET    | `/me`               | 🔐                              | —                                      | Returns the safe profile (no firebase uid).                                                                                              |
| POST   | `/onboarding`       | 🔐                              | `{ phone, name? }`                     | Patches phone (and name if missing). Creates a referral code if absent.                                                                  |
| PUT    | `/profile`          | 🔐                              | `{ name, phone }`                      | Update name / phone.                                                                                                                      |
| POST   | `/forgot-password`  | 🔓 + `resetPasswordLimiter`     | `{ email }`                            | Always returns 200 (anti-enumeration). Generates a Firebase password-reset link via Admin SDK and emails a branded message.              |

#### `/api/products` (`routes/products.js`)

| Method | Path                                                   | Guards          | Notes                                                                                                                                                              |
| ------ | ------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/`                                                    | 🔓             | Filter (category, search, price, onSale, isDeal), sort (price/rating/name/newest), paginate. Out-of-stock items pushed to the end. Cached 60 s in `node-cache`.    |
| GET    | `/:id`                                                 | 🔓             | Full product incl. variant options, variants, reviews, quantity tiers. Cached 60 s.                                                                                |
| GET    | `/:id/related`                                         | 🔓             | Co-occurrence in orders → fall back to same-category.                                                                                                              |
| GET    | `/:id/co-purchased`                                    | 🔓             | Frequently bought together.                                                                                                                                        |
| POST   | `/`                                                    | 👮             | Create product. Invalidates cache. Audit log + Sheets sync.                                                                                                        |
| PUT    | `/:id`                                                 | 👮             | Update. Triggers stock-back & price-drop alerts on relevant transitions.                                                                                            |
| PATCH  | `/:id/deal`                                            | 👮             | Flip `isDeal`.                                                                                                                                                      |
| DELETE | `/:id`                                                 | 👮             | Soft delete (`isActive=false`).                                                                                                                                     |
| GET / POST / PUT / DELETE | `/:id/variants…`                            | 👮 for writes  | Variant CRUD + `bulk` save + `generate` combinations.                                                                                                              |
| GET / POST / PUT / DELETE | `/:id/options…`                             | 👮 for writes  | Variant option CRUD.                                                                                                                                                |
| GET / PUT     | `/:id/quantity-tiers`                              | 👮 for writes  | Volume-discount tiers.                                                                                                                                              |
| PATCH  | `/:id/toggle-variants`                                 | 👮             | Enable/disable variants on the product.                                                                                                                             |

#### `/api/orders` (`routes/orders.js`)

| Method | Path                          | Guards                                  | Notes                                                                                                                                                                                                                       |
| ------ | ----------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/`                           | ❓ + `sensitiveLimiter`                 | Place order. Server recomputes prices (incl. quantity tiers + bundles); rejects mismatch with the client `total`. Stock decrement + wallet debit + coupon usage in a transaction. Sends email + notification.                |
| GET    | `/detail/:id`                 | 🔐                                      | Owner or admin only.                                                                                                                                                                                                         |
| GET    | `/my-orders`                  | 🔐                                      | Pagination.                                                                                                                                                                                                                  |
| GET    | `/my-stats`                   | 🔐                                      | For dashboard cards.                                                                                                                                                                                                          |
| GET    | `/`                           | 👮                                      | All orders. Filter + paginate.                                                                                                                                                                                               |
| PATCH  | `/:id/status`                 | 👮                                      | Status transition. On `Cancelled` → restore stock; on `Delivered` and non-returnable → trigger referral payout immediately; otherwise on `Delivered` it sets `referralEligibleAt = now + returnWindowDays` for the cron.    |
| POST   | `/:id/verify-payment`         | 👮                                      | OTP verification for `pay_at_store`. Marks paid; may trigger referral immediately if all items non-returnable.                                                                                                              |
| POST   | `/:id/cancel`                 | 🔐                                      | Owner or admin. Only when status `Processing`. Refunds wallet, restores stock.                                                                                                                                              |
| POST   | `/:id/return`                 | 🔐                                      | Owner. Only `Delivered` and within `returnWindowDays`.                                                                                                                                                                       |
| PUT    | `/:id/refund`                 | 👮                                      | Approve / reject return. Approve → credit wallet (registered user) + optional stock restore.                                                                                                                                |
| GET    | `/:id/invoice`                | 🔐                                      | Streams a PDFKit-generated invoice for paid orders.                                                                                                                                                                          |

#### `/api/cart` (`routes/cart.js`) — all 🔐

| Method | Path                  | Notes                                                                                                                                                  |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/`                   | Full cart with product/variant/bundle pricing.                                                                                                          |
| POST   | `/items`              | Add or increment. Stock-validated in a SERIALIZABLE transaction.                                                                                        |
| PATCH  | `/items`              | Set absolute quantity. Setting 0 removes the item.                                                                                                      |
| POST   | `/items/remove`       | Remove specific line item.                                                                                                                              |
| POST   | `/sync`               | Merge a guest cart into the server cart, clamping at stock.                                                                                            |
| POST   | `/bundle/remove`      | Remove every line under a `bundleInstanceId`.                                                                                                           |
| DELETE | `/`                   | Empty the cart.                                                                                                                                          |

#### `/api/services` (`routes/services.js`)

| Method | Path                                | Guards                  | Notes                                                                                                                                                            |
| ------ | ----------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/available-slots`                  | 🔓                     | Per `ServiceSettings.timeSlots` and the per-slot booking cap. Returns sane defaults if DB row is missing.                                                         |
| POST   | `/book`                             | 🔐 + `bookingCreateLimiter` | Atomic slot check + insert. Generates a `pickupOtp` on `Confirmed`. Sends email + notification.                                                              |
| GET    | `/my-bookings`                      | 🔐                     | Owner's bookings, includes delivery OTP after Completed.                                                                                                          |
| GET    | `/`                                 | 👮                     | All bookings + status counts.                                                                                                                                     |
| GET    | `/:id`                              | 👮                     | Booking detail.                                                                                                                                                    |
| PATCH  | `/:id/assign`                       | 👮                     | Assign technician.                                                                                                                                                 |
| PATCH  | `/:id/status`                       | 👮                     | State machine: requires customer OTP for `Picked Up`, generates delivery OTP on `Completed`, triggers invoice + referral on `Delivered`.                          |
| POST   | `/:id/verify-otp`                   | 🔐 (owner) / 👮         | Verifies pickup OTP. Customer can self-verify; admin override audit-logs.                                                                                          |
| POST   | `/:id/regenerate-otp`               | 👮                     | Generate a new pickup OTP and notify the customer.                                                                                                                |
| POST   | `/:id/verify-delivery-otp`          | 👮                     | Verifies delivery OTP at handover.                                                                                                                                |
| POST   | `/:id/regenerate-delivery-otp`      | 👮                     | Re-issue + notify.                                                                                                                                                |

#### `/api/admin` (`routes/admin.js`) — all 👮

User mgmt (`/users`, `/users/:id`, `/users/:id/role`),
dashboard (`/stats`),
referrals (`/referrals`, `/referral-settings`),
service settings (`/service-settings`),
banner CRUD (`/banners…`),
technician CRUD (`/technicians…`),
audit log (`/audit-logs`).

#### `/api/coupons` (`routes/coupons.js`)

| Method | Path        | Guards | Notes                                                                                                                |
| ------ | ----------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| POST   | `/validate` | ❓     | Validate without consuming. Checks `active`, `expiresAt`, `maxUses`, `maxUsesPerUser`, `firstOrderOnly`, applicability. |
| GET    | `/`         | 👮     | List all.                                                                                                             |
| POST   | `/`         | 👮     | Create. Validates discount type ∈ {percentage, fixed}; value sanity; date sanity.                                     |
| PATCH  | `/:id`      | 👮     | Update.                                                                                                               |
| DELETE | `/:id`      | 👮     | Delete.                                                                                                               |

#### `/api/wishlist` (`routes/wishlist.js`) — all 🔐

`GET /`, `POST /:productId`, `DELETE /:productId`, `POST /merge`, `DELETE /`.

#### `/api/reviews` (`routes/reviews.js`)

`GET /pending-bundles` 🔐, `POST /:productId` 🔐 + `reviewWriteLimiter` (sets `isVerified` if user has bought it, recomputes product's avg rating), `GET /:productId` 🔓, `POST /:reviewId/helpful` 🔐. Bundle equivalents at `/bundle/...`.

#### `/api/categories` (`routes/categories.js`)

`GET /` (cached), `GET /:slug`, `POST /` 👮, `DELETE /:id` 👮. Service types live under `/service-types*` with the same shape.

#### `/api/referrals` (`routes/referrals.js`)

`GET /public-settings` 🔓, `GET /my-stats` 🔐, `GET /my-referrals?source=` 🔐, `GET /my-received` 🔐, `POST /apply-wallet` 🔐.

#### `/api/notifications` (`routes/notifications.js`) — all 🔐

`GET /` (latest 50 + unread), `PATCH /:id/read`, `POST /read-all`, `DELETE /:id`.

#### `/api/upload` (`routes/upload.js`) — all 👮 + `sensitiveLimiter`

`POST /` (single base64 → Cloudinary), `POST /multiple` (up to 10), `DELETE /` (delete by URL, namespace-guarded — see §16).

#### `/api/addresses` (`routes/addresses.js`) — all 🔐

`GET /`, `POST /` (+ `addressWriteLimiter`, enforces `DELIVERY_PINCODE`), `DELETE /:id` (+ limiter).

#### `/api/applications` & `/api/courses` (`routes/applications.js`, `routes/courses.js`)

Course applications, durations, batches, fee payments, materials, certificate. Approval flow: Pending → Approved → Enrolled (after first fee), → Completed. First fee payment (going from Approved → Enrolled) credits the referrer/referee atomically.

#### `/api/push` (`routes/push.js`)

`POST /subscribe` 🔐, `DELETE /unsubscribe` 🔐, `POST /test` 👮 (sends a push to the admin's own devices).

#### `/api/banners` (`routes/banners.js`)

`GET /` 🔓 — only active banners, sorted by `displayOrder`. Cached. Admin lives under `/api/admin/banners`.

#### `/api/bundles` (`routes/bundles.js`)

`GET /` 🔓 (active, optional `displayOn`), `GET /admin` 👮, `GET /suggestions` 🔓, `GET /analytics` 👮, `GET /by-slug/:slug` 🔓, `GET /:id` 🔓, `GET /for-product/:productId` 🔓 (cached), `POST /` 👮, `PUT /:id` 👮, `DELETE /:id` 👮 (soft when used).

#### `/api/bundle-templates` (`routes/bundleTemplates.js`)

`GET /` 🔓 (cached), `GET /admin` 👮, `GET /:id` 🔓, `GET /:id/products` 🔓 (grouped by slot category), `POST /:id/calculate` 🔓 (preview discount), `POST /` 👮, `PUT /:id` 👮, `DELETE /:id` 👮.

#### `/api/contact` (`routes/contact.js`)

`POST /` 🔓 + `contactFormLimiter`. Validates required fields, emails admin, creates an `Notification` row for every admin (`createAdminNotification`).

#### `/api/tally` & `/api/cctv` (`routes/tally.js`, `routes/cctv.js`)

`POST /enquiry` 🔓 + `contactFormLimiter` (10-digit Indian phone validation, persisted to `TallyEnquiry` / `CCTVEnquiry`, admin alerted).
`GET /admin/enquiries` 👮.
`PUT|PATCH /admin/enquiries/:id` 👮 (status, seller, notes; audit-logged + Sheets-synced).

#### `/api/alerts` (`routes/alerts.js`) — all 🔐

`GET /`, `POST /:productId` (toggle subscribe/unsubscribe; price-drop alerts seed `priceThreshold = currentPrice`).

#### `/api/admin/sheets` (`routes/sheets.js`) — all 👮

`POST /sync` (full DB → Sheets), `POST /sync/:sheetName` (single tab), `POST /import/products` (Sheets → DB), `GET /status` (row counts).

#### `/api/admin/notifications` (`routes/adminNotifications.js`) — all 👮

`POST /send` (broadcast to all or selected user IDs; batched for performance), `GET /history` (pagination), `GET /stats`.

### 7.4 Middleware reference

| Middleware                          | Where                                           | Behaviour                                                                                                  |
| ----------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `compression()`                     | global                                          | gzip output.                                                                                                |
| `helmet({ csp, ...})`               | global                                          | Sane security headers + custom CSP. HSTS added in production.                                               |
| `cors({ origin, credentials })`     | global                                          | Allow-listed origins.                                                                                        |
| `express.json({ limit: '2mb' })`    | global                                          | JSON body parser.                                                                                           |
| `limiter`                           | global                                          | 500 req / 15 min / IP.                                                                                       |
| `authLimiter`                       | `/api/auth`                                     | 20 / hour.                                                                                                   |
| `sensitiveLimiter`                  | `/api/orders`, `/api/services`, `/api/push`     | 60 / 15 min.                                                                                                 |
| `protect`                           | per-route                                       | Verifies Firebase ID token, loads `User` row, attaches `req.user` (safe select).                             |
| `optionalProtect`                   | per-route                                       | Same as `protect` but always proceeds (used by `POST /orders` to support guest checkout).                    |
| `adminOnly`                         | per-route                                       | 403 unless `req.user.role === 'admin'`.                                                                     |
| Per-route limiters                  | see `middleware/rateLimiters.js`                | Tighter caps for sensitive writes.                                                                          |

### 7.5 Error handling strategy

-   Routes use plain `try/catch` + `res.status(...).json({ error: '...' })` for known errors.
-   `helpers/createHttpError` (in `routes/cart.js`) is occasionally re-used for typed throws.
-   Any uncaught exception falls through to the global `(err, req, res, next)` handler in `app.js`, which logs and returns a generic 500 (with `message` only in development).
-   `process.on('unhandledRejection')` and `process.on('uncaughtException')` log; the latter exits to keep the process honest.

---

## 8. Database — NeonDB (Postgres)

### 8.1 Connection

`backend/prisma/schema.prisma`:

```9:14:backend/prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

`DATABASE_URL` is the pooled connection (e.g. NeonDB's PgBouncer/HTTP
pooler). `DIRECT_URL` is a direct (non-pooled) URL — Prisma migrate uses
this to acquire advisory locks without hitting pooler timeouts (P1002).

`backend/src/lib/prisma.js` exports a singleton `PrismaClient`. By default
it uses Prisma's binary engine over TCP `:5432`. When `USE_NEON_HTTP=1`,
it switches to `@prisma/adapter-neon` + `@neondatabase/serverless` over a
WebSocket — useful when local networks block outbound `:5432`.

```17:39:backend/src/lib/prisma.js
if (useNeonHttp) {
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const ws = (await import('ws')).default;
    const { PrismaNeon } = await import('@prisma/adapter-neon');
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaNeon(pool);
    prisma = new PrismaClient({ adapter, errorFormat: 'minimal', log: ['error'] });
}
```

`SIGINT`/`SIGTERM` handlers call `prisma.$disconnect()` then `process.exit(0)`
so connections drain on Render redeploys.

### 8.2 Tables (Prisma models) and their columns

The schema is intentionally exhaustive (e-commerce + services + courses
+ referrals + admin tooling). Below is every model with a short purpose
note. Field types follow Prisma syntax.

| Model                  | Notable columns                                                                                                                                                                                                                                                                                                                                                | Purpose                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`                 | `id Int` PK, `firebaseUid String? @unique`, `email String @unique`, `name`, `phone`, `referralCode String? @unique`, `walletBalance Float`, `tier String`, `tierPoints Float`, `referredById Int? → User`, `role String` ("customer"/"admin"), `createdAt`                                                                                                  | Core user. One-to-many: orders, reviews, bookings, wishlist, cart, addresses, alerts, notifications, push subs, audit logs, course apps, enrollments.                |
| `Course`               | `id`, `title`, `description`, `instructor`, `category`, `thumbnail`, `hasCertificate Boolean`, `isPublished Boolean`, `referrerPoints?`, `refereePoints?`, `sellerName?`, timestamps                                                                                                                                                                          | A course offering.                                                                                                                                                      |
| `CourseDuration`       | `id`, `courseId → Course`, `label` ("3 Months"), `totalFee`, `fullPayDiscount`, `installments`                                                                                                                                                                                                                                                              | Variant fee plans for a course.                                                                                                                                          |
| `CourseBatch`          | `id`, `durationId → CourseDuration`, `name`, `timing`, `seatLimit`                                                                                                                                                                                                                                                                                          | Time-slot batches per duration.                                                                                                                                          |
| `CourseApplication`    | `id`, `userId`, `courseId`, `durationId?`, `batchId?`, contact info, `paymentMode`, `referralCode`, `status` (Pending/Approved/Rejected/Enrolled/Completed), `enrolledAt`, `completedAt`, `feePayments[]`                                                                                                                                                  | Student application for a course.                                                                                                                                        |
| `FeePayment`           | `id`, `applicationId → CourseApplication onDelete: Cascade`, `amount`, `note`, `paidAt`, `markedBy`                                                                                                                                                                                                                                                       | Per-instalment payment record.                                                                                                                                            |
| `Enrollment`           | `id`, `userId+courseId @unique`, `status`, `progress`, `paymentStatus`, `feePaid`, `attendances[]`                                                                                                                                                                                                                                                          | Active enrollment after first payment.                                                                                                                                   |
| `CourseMaterial`       | `id`, `courseId`, `title`, `fileUrl`, `fileType` (PDF/Video/Link/Document)                                                                                                                                                                                                                                                                                  | Learning resources.                                                                                                                                                       |
| `Attendance`           | `enrollmentId+date @unique`, `status` (Present/Absent/Late)                                                                                                                                                                                                                                                                                                  | Daily attendance.                                                                                                                                                          |
| `WalletTransaction`    | `id`, `userId`, `amount`, `type` (CREDIT/DEBIT), `description`, `orderId?`                                                                                                                                                                                                                                                                                  | Ledger of wallet movement (refunds, referral payouts).                                                                                                                   |
| `Product`              | `id`, `title`, `price`, `originalPrice?`, `stock`, `category`, `brand`, `sellerName?`, `images String[]`, `description`, `specs Json?`, `rating`, `numReviews`, `condition` (New/Refurbished), `isSecondHand`, `isRefurbished`, `isReturnable`, `returnWindowDays`, `referrerPoints?`, `refereePoints?`, `isActive`, `isDeal`, `hasVariants`            | Catalog item.                                                                                                                                                            |
| `Wishlist`             | `userId+productId @unique`                                                                                                                                                                                                                                                                                                                                | User-product join. Cascade on either side.                                                                                                                              |
| `CartItem`             | `userId+productId+variantId+bundleInstanceId @unique`                                                                                                                                                                                                                                                                                                       | Server-side cart row. `bundleInstanceId` distinguishes the same product in two different bundle instances.                                                              |
| `Order`                | `id`, `userId?`, `total`, `walletUsed`, `status`, `paymentMethod` (pay_at_store), `paymentOtp?`, `isPaid`, `shippingAddress Json?`, `guestInfo Json?`, `referralCodeUsed?`, `couponCode?`, `discountAmount`, gift fields, lat/lng, `cancelReason?`, `returnReason?`, `returnStatus`, `refundStatus`, `refundAmount?`, `deliveredAt?`, `referralEligibleAt?` | The order header.                                                                                                                                                          |
| `OrderItem`            | `orderId`, `productId? → Product` (ondelete kept loose to allow deletes), `quantity`, `price` (snapshot), `variantId?`, `bundleId?`, `bundleInstanceId?`, `bundleTemplateId?`                                                                                                                                                                              | Line item. Bundle context preserved for refund math.                                                                                                                        |
| `Review`               | `userId`, `productId`, `rating`, `comment?`, `images[]`, `isVerified`, `helpfulVotes`, `voters Int[]`                                                                                                                                                                                                                                                       | Product review. `voters` array prevents repeat votes.                                                                                                                       |
| `BundleReview`         | analogous for bundles                                                                                                                                                                                                                                                                                                                                       |                                                                                                                                                                              |
| `ServiceBooking`       | `id`, `userId`, `orderId?`, `serviceType`, `description`, `deviceType`, `deviceBrand`, `date`, `timeSlot`, `status`, `referralCodeUsed`, `customFields Json?`, customer + address fields, lat/lng, admin pricing fields, `pickupOtp?`, `deliveryOtp?`, `deliveryOtpVerified`, `otpVerified`, `otpGeneratedAt?`, `technicianId?`, timestamps     | Service repair / install booking.                                                                                                                                            |
| `Technician`           | `id`, `name`, `phone @unique`, `email? @unique`, `skills String[]`, `isActive`                                                                                                                                                                                                                                                                              | Technician roster.                                                                                                                                                            |
| `ServiceInvoice`       | `bookingId @unique`, `invoiceNumber @unique`, `serviceType`, `technicianName`, `laborCost`, `partsCost`, `partsNotes`, `gst`, `totalAmount`, `pdfUrl?`                                                                                                                                                                                                  | GST invoice for a completed service.                                                                                                                                         |
| `Coupon`               | `code @unique`, `discountType`, `value`, `active`, `expiresAt?`, `minOrderAmount?`, `maxUses?`, `usedCount`, `applicableTo`, `firstOrderOnly`, `maxUsesPerUser?`                                                                                                                                                                                       | Promotion code.                                                                                                                                                                |
| `Referral`             | `referrerId`, `refereeId`, `status` (pending/completed/rewarded), `rewardAmount`, `refereeReward?`, `orderId? @unique`, `source` ("shopping"/"course"), `courseName?`, timestamps                                                                                                                                                                       | Referral payout audit. `orderId` is unique to make the daily cron idempotent (P2002 on retry).                                                                                |
| `Category`             | `name @unique`, `slug @unique`, `image?`, `description?`                                                                                                                                                                                                                                                                                                   | Product category.                                                                                                                                                              |
| `ServiceType`          | `title @unique`, `description`, `icon`, `price` (string label), `features Json`, `formFields Json`, `active`, `referrerPoints?`, `refereePoints?`, `sellerName?`                                                                                                                                                                                       | Service catalog. `formFields` describes a dynamic booking form.                                                                                                                |
| `VariantOption` / `VariantOptionValue` | productId, name, position; option values                                                                                                                                                                                                                                                                                                       | Free-form option definitions (e.g. RAM, Color).                                                                                                                                |
| `ProductVariant`       | `productId`, `name?`, `combination Json?`, `price`, `originalPrice?`, `stock`, `sku? @unique`, `isActive`, `image?`                                                                                                                                                                                                                                       | Specific SKU/combination of options.                                                                                                                                            |
| `ProductAlert`         | `userId+productId+type @unique`, `priceThreshold?`, `isActive`                                                                                                                                                                                                                                                                                              | Stock-back / price-drop subscription.                                                                                                                                          |
| `Notification`         | `userId`, `title`, `message`, `type`, `isRead`, `link?`                                                                                                                                                                                                                                                                                                  | In-app notification.                                                                                                                                                            |
| `PushSubscription`     | `userId`, `endpoint @unique`, `p256dh`, `auth`                                                                                                                                                                                                                                                                                                            | Browser push subscription.                                                                                                                                                       |
| `ReferralSettings`     | singleton row: `pointsPerProductPurchase`, `pointsPerServiceBooking`, `pointsPerCourseEnrollment`, `pointToRupeeRate`, `pointExpiryDays?`, `tierSystemEnabled`                                                                                                                                                                                          | Global referral configuration.                                                                                                                                                   |
| `TierConfig`           | `tierName @unique`, `minPoints`, `color`                                                                                                                                                                                                                                                                                                                   | Bronze/Silver/Gold/Platinum thresholds.                                                                                                                                          |
| `TallyEnquiry` / `CCTVEnquiry` | enquiry fields, `status`, `sellerName?`, `adminNotes?`, timestamps                                                                                                                                                                                                                                                                                | Public enquiry forms.                                                                                                                                                          |
| `ServiceSettings`      | `timeSlots String[]`, `maxBookingsPerSlot`                                                                                                                                                                                                                                                                                                              | Global slot config.                                                                                                                                                              |
| `Banner`               | `title`, `subtitle?`, `ctaLabel`, `ctaLink`, `image?`, `gradient?`, `displayOrder`, `active`                                                                                                                                                                                                                                                            | Hero banners.                                                                                                                                                                    |
| `Address`              | `id String @id @default(uuid)`, `userId`, `label?`, `address`, `city`, `pincode`, `phone`, lat/lng, `isDefault`                                                                                                                                                                                                                                          | Saved shipping address.                                                                                                                                                          |
| `AuditLog`             | `userId`, `action`, `entity`, `entityId`, `details Json?`, `ipAddress?`                                                                                                                                                                                                                                                                                  | Admin trail.                                                                                                                                                                      |
| `Bundle`               | `id`, `name`, `slug? @unique`, `description?`, `image?`, `bundlePrice`, `isActive`, `isGiftable`, `displayOn String[]`, `startDate?`, `endDate?`                                                                                                                                                                                                       | Fixed combo.                                                                                                                                                                      |
| `BundleItem`           | `bundleId`, `productId?`, `variantId?`, `quantity`, `serviceTypeId?`, `courseId?`, `itemType`, `position`                                                                                                                                                                                                                                            | Components of a bundle (heterogeneous: products, services, or courses).                                                                                                        |
| `BundleTemplate`       | `id`, `name`, `description?`, `image?`, `discount`, `discountType` (flat/tiered/mix-match), `discountTiers Json?`, `templateType` (slot/mix-match), `mixMatchQty?`, `mixMatchPrice?`, `isActive`                                                                                                                                                       | "Build Your Own Bundle" rules.                                                                                                                                                    |
| `BundleTemplateSlot`   | `templateId`, `label`, `category`, `minQty`, `maxQty`, `required`, `position`                                                                                                                                                                                                                                                                              | Slot definition for a BYOB template.                                                                                                                                              |
| `QuantityTier`         | `productId+minQty @unique`, `price`                                                                                                                                                                                                                                                                                                                       | Volume pricing.                                                                                                                                                                  |
| `AdminNotificationLog` | `adminId`, `title`, `message`, `type`, `target`, `recipientCount`, `link?`                                                                                                                                                                                                                                                                                | Audit of admin broadcasts.                                                                                                                                                       |

### 8.3 Foreign-key map (the joins you need to know)

```
User 1───* Order             OrderItem *──1 Order
User 1───* OrderItem (via Order)        OrderItem *──1 Product (?)
User 1───* CartItem          CartItem *──1 Product *──1 ProductVariant?
User 1───* Wishlist          Wishlist *──1 Product
User 1───* Address
User 1───* Notification
User 1───* PushSubscription
User 1───* WalletTransaction
User 1───* ProductAlert      ProductAlert *──1 Product
User 1───* Review            Review *──1 Product
User 1───* BundleReview      BundleReview *──1 Bundle
User 1───* ServiceBooking    ServiceBooking 0..1──1 Order, ServiceBooking 0..1──1 Technician, 1──0..1 ServiceInvoice
User 1───* CourseApplication CourseApplication *──1 Course, *──0..1 CourseDuration, *──0..1 CourseBatch, 1───* FeePayment
User 1───* Enrollment        Enrollment *──1 Course, 1───* Attendance
User 1───* AuditLog
User self-ref: User.referredById ─→ User.id
User 1───* Referral (as Referrer/Referee, two relations)
Referral *──0..1 Order

Course 1───* CourseDuration 1───* CourseBatch
Course 1───* CourseMaterial
Course 1───* BundleItem (when itemType="course")

Product 1───* ProductVariant (variants)
Product 1───* VariantOption 1───* VariantOptionValue
Product 1───* QuantityTier
Product 1───* OrderItem
Product 1───* Wishlist / CartItem / ProductAlert / Review / BundleItem

Bundle 1───* BundleItem (productId? / variantId? / serviceTypeId? / courseId?)
Bundle 1───* BundleReview
Bundle 1───* OrderItem
BundleTemplate 1───* BundleTemplateSlot
BundleTemplate 1───* OrderItem
```

`@@unique` constraints worth re-stating:

-   `Wishlist (userId, productId)` — no duplicate wishlist entries.
-   `CartItem (userId, productId, variantId, bundleInstanceId)` — same product can exist twice in a cart only if it's part of two different bundles.
-   `Enrollment (userId, courseId)` — one enrollment per user per course.
-   `Attendance (enrollmentId, date)` — one row per day per enrollment.
-   `Referral (orderId)` — guarantees the cron is idempotent.
-   `ProductAlert (userId, productId, type)` — one alert per kind per product.
-   `QuantityTier (productId, minQty)` — no overlapping volume tiers.

### 8.4 Notable indexes

The schema is heavily indexed for the most common access paths:
`User(firebaseUid)`, `User(role)`, `User(createdAt)`, `Order(userId)`,
`Order(status)`, `Order(createdAt)`, `Order(returnStatus)`, `Order(isPaid, createdAt)`,
`OrderItem(orderId)`, `OrderItem(productId)`, `OrderItem(bundleId)`,
`Product(category)`, `Product(price)`, `Product(rating)`,
`ServiceBooking(date, timeSlot, status)` (used by the slot-availability query),
`ServiceBooking(technicianId)`, `Notification(userId, isRead)`,
`Coupon(code @unique)`, `Address(userId)`, `AuditLog(entity, entityId)`,
`Bundle(isActive, startDate, endDate)`, plus all the FK `@@index`es Prisma
emits automatically.

### 8.5 Migrations

`backend/prisma/migrations/` contains the SQL migrations (managed by
`prisma migrate`). On Render, `npm run build` runs `migrate-deploy.mjs` →
`prisma generate`. There are 4+ named migrations in this checkout
(`order_item_product_optional`, `add_admin_notification_log`,
`remove_device_registration`, `add_coupon_user_rules`).

### 8.6 Seeds

-   `backend/prisma/seed.js` — idempotent. Populates `ReferralSettings`, `TierConfig`, default categories, sample banners, and default `ServiceSettings`. Wired up via `package.json` so `npx prisma db seed` works.
-   `backend/prisma/seed-bulk-products.js` — bulk inserts demo products to make the catalog usable for screenshots / dev.

### 8.7 Where queries actually live

Every Prisma call is in a route file or a `utils/*` helper. The convention
is to colocate the query with the handler that needs it. There are no
repository / DAO classes. Two notable patterns:

-   **Transactions** for multi-table writes — `prisma.$transaction(async (tx) => { ... })` around order placement, refund processing, referral payout, course-fee payments, and slot booking.
-   **Manual cache invalidation** — write paths call `cache.delByPrefix('products:')` (etc.) after mutations to evict the 60 s in-memory cache populated by GET handlers.

---

## 9. Authentication & Authorization

### 9.1 Strategy

Auth is delegated to **Firebase Auth** (Email/Password + Google). The
backend never sees the password — it only verifies the **Firebase ID
token** (a short-lived JWT) using `firebase-admin`. The Prisma `User`
table is the source of truth for app-domain data (role, wallet, phone,
referral code), keyed to Firebase by `firebaseUid` (also `email` is unique).

There are **no application sessions** and **no cookies**. Every API call
sends `Authorization: Bearer <Firebase ID token>`.

### 9.2 Sign-up flow

```
SignUp.jsx
  └── useAuth().registerWithEmail(email, pw, name, referredByCode)
       ├── createUserWithEmailAndPassword(auth, email, pw)
       ├── sendEmailVerification(cred.user)
       ├── cred.user.getIdToken()  ← stored in tokenRef + setTokenGetter()
       └── POST /api/auth/register { name, referredByCode }
              └── verifies idToken via firebase-admin
              └── upserts User (firebaseUid, email, name)
              └── generates unique referralCode
              └── if email ∈ ADMIN_EMAILS → role='admin'
              └── if referredByCode → set referredById
              └── returns { user }
```

After sign-up the UI navigates to `/verify-email`. `VerifyEmail.jsx`
polls `auth.currentUser.reload()` until `emailVerified` is true, then
redirects to `state.from || '/'` (or `/onboarding` if phone is missing).

### 9.3 Google sign-in flow

```
SignIn.jsx
  └── useAuth().loginWithGoogle()
       ├── signInWithPopup(auth, GoogleAuthProvider)
       │     fallback if popup-blocked: signInWithRedirect → handled in
       │     getRedirectResult on app boot in AuthProvider
       ├── cred.user.getIdToken()
       └── POST /api/auth/register
              └── creates DB row if missing, idempotent on rerun
              └── returns { user }
```

A localStorage `referralCode` (set by `/sign-up?ref=CODE`) is consumed and
cleared on success.

### 9.4 Email/password sign-in flow

```
SignIn.jsx
  └── useAuth().loginWithEmail(email, pw)
       ├── signInWithEmailAndPassword(auth, email, pw)
       ├── getIdToken()
       ├── fetchMeOrRegister():
       │      GET /api/auth/me  (200 → use)  OR
       │      POST /api/auth/register (recovery if /me returns 401, e.g. brand-new firebase account)
       └── set context user
```

If `cred.user.emailVerified === false` the UI bounces to `/verify-email`
even though Firebase will accept the token. After sign-in, if the DB
`user.phone` is missing the UI bounces to `/onboarding`.

### 9.5 How protected requests work

Frontend:

```9:15:frontend/src/lib/api.js
const getAuthHeaders = async () => {
    const token = _tokenGetter ? await _tokenGetter() : null;
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
};
```

`AuthProvider` calls `setTokenGetter(() => Promise.resolve(tokenRef.current))`
so every `apiFetch` automatically attaches the token.

A `setInterval` rotates the token every 50 minutes
(`firebaseUser.getIdToken(true)` forces a refresh) so we never ship an
expired token.

Backend:

```15:41:backend/src/middleware/auth.js
export const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401)...;
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid }, select: SAFE_USER_SELECT });
    if (!user) return res.status(401)...;
    req.user = user;
    req.firebaseUid = decoded.uid;
    next();
};
```

`SAFE_USER_SELECT` excludes anything we don't want shipped to handlers
(passwords are never stored anyway; this is hygiene).

`optionalProtect` is the same flow but always calls `next()`, used by
`POST /api/orders` and a few public-but-personalised reads.

`adminOnly` simply checks `req.user.role === 'admin'`.

### 9.6 Route protection

| Layer       | What it guards                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend    | `<ProtectedRoute>` (signed-in + verified + phone) and `<ProtectedRoute adminOnly>` for `/admin/*`. Plus `SharedLayout`'s onboarding bounce.                  |
| API         | `protect` for any read/write that needs a user; `adminOnly` after `protect` for admin-only operations. `optionalProtect` for routes that need to know who *might* be logged in. |
| Per-route   | Rate limiters on sensitive writes (auth, services, orders, push, address, contact, reviews).                                                                 |

### 9.7 Storage of credentials

-   The browser keeps the Firebase ID token / refresh token in **IndexedDB** (Firebase SDK handles this; not in `localStorage`).
-   The backend keeps a Firebase Admin SDK service account either in env vars (`FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY`) or, in dev, a `serviceAccountKey.json` file.
-   `localStorage` does hold the **referral code** captured from a `?ref=` URL until sign-up consumes it.
-   No JWTs, no sessions, no cookies issued by the application server.

### 9.8 App Check (optional)

If `VITE_RECAPTCHA_SITE_KEY` is set, `lib/firebase.js` initialises Firebase
App Check with `ReCaptchaV3Provider` and `isTokenAutoRefreshEnabled: true`.
This adds a second token layer that protects against abuse from non-app
clients hitting Firebase APIs directly. It's **optional** — the app works
without it.

### 9.9 Password reset

`POST /api/auth/forgot-password` is the only place we don't rely on
Firebase's default email template. The handler:

1.  Returns 200 regardless of whether the email exists (anti-enumeration).
2.  Looks up the user via Firebase Admin SDK.
3.  Generates a password-reset link with `auth().generatePasswordResetLink()`.
4.  Sends a branded HTML email via Nodemailer (`utils/emailNotifications.js`).
5.  Rate limits at 5 / hour / IP.

---

## 10. E-commerce Core Flows

### 10.1 Product Listing — `/products`

```
Products.jsx
  ├── reads URL query: search, category, minPrice, maxPrice, onSale, isDeal, sort, page
  ├── productsAPI.getAll(params)  → GET /api/products?...
  │     └── routes/products.js → /
  │           - Reads `cache.get('products:'+key)`; if hit, return cached page.
  │           - Builds Prisma `where` from filters; `orderBy` from sort key
  │             (price_asc | price_desc | rating | name_asc | newest).
  │           - Two-pass logic for stock: query in-stock first, then out-of-stock,
  │             concatenate. Out-of-stock items always rank last.
  │           - For products with `hasVariants=true`, computes display price
  │             from `variants` (min active variant price) and total stock
  │             across variants — so the listing reflects what the buyer will
  │             actually see on the PDP.
  │           - Caches and returns `{ data, total, page, limit }`.
  ├── Renders ProductCard grid using ProductGrid layout.
  ├── FilterSidebar mutates URL query (debounced) → component re-fetches.
  └── Pagination via ?page= URL param.
```

Filters supported:
-   **Search** — exact substring match on `title`, `description`, `brand`.
-   **Category** — exact match on `category` field (slug normalised).
-   **Price** — `minPrice`/`maxPrice` numeric.
-   **`onSale`** — `originalPrice > price`.
-   **`isDeal`** — `isDeal: true` (admin-flagged).
-   **`sort`** — see above.

### 10.2 Product Detail — `/products/:id`

```
ProductDetail.jsx
  ├── productsAPI.getById(id)               → /api/products/:id (full record + reviews + variants + tiers)
  ├── productsAPI.getRelated(id)            → /api/products/:id/related
  ├── productsAPI.getCoPurchased(id)        → /api/products/:id/co-purchased
  ├── bundlesAPI.getForProduct(id)          → /api/bundles/for-product/:productId
  ├── reviewsAPI.getForProduct(id)          → /api/reviews/:productId
  ├── alertsAPI.getAll()                    (if logged in) to highlight active alerts
  └── useRecentlyViewed().save(product)     → localStorage ring buffer
```

Features:
-   **Image gallery** — `images[]` plus the variant's image when a variant is selected.
-   **Variant selector** — option groups (e.g. RAM/Color) computed from `VariantOption` + values; price + stock + image swap as the user picks.
-   **Quantity tiers** — `QuantityTierDisplay` shows volume discount thresholds.
-   **Add to cart** — `useShop.addToCart(product, qty, { variantId })` (uses cart queue + server cart).
-   **Buy now** — `useShop.initBuyNow(item)` then navigates to `/checkout` (skips the cart).
-   **Wishlist heart** — `useShop.toggleWishlist`.
-   **Stock-back / price-drop alerts** — `alertsAPI.toggle(productId, type, threshold)`.
-   **Review form** — `ReviewSection` (logged-in only; `isVerified` flag set if the user has bought it).

### 10.3 Search

Server-side. The `SearchBar` component debounces input, calls
`productsAPI.getAll({ search: query, limit: 8 })`, and renders the results
in a dropdown. Clicking navigates to `/products/:id`. Pressing Enter on
the input navigates to `/products?search=…`.

Search uses Prisma's `contains` (Postgres `ILIKE`) on `title`, `description`,
and `brand`. Index recommendations live in `docs/FOLLOW_UPS.md` (full-text
search via `pg_trgm` is on the deferred list).

### 10.4 Cart

Two cart layers cohabit:

| Layer    | Owner                                  | When used                                                           |
| -------- | -------------------------------------- | ------------------------------------------------------------------- |
| Client   | `useShop.cart` (in-memory)             | Always — the rendering source.                                      |
| Server   | `CartItem` table                       | When the user is signed in. Persisted across devices.                |
| Local    | None                                   | Guest carts are intentionally **not** persisted to localStorage.     |

Operations:

```
ProductCard.add()
  └── ShopProvider.addToCart(product, qty, options)
       └── cart queue:
            ├── if user signed in → cartAPI.addItem(productId, variantId, qty, bundleId, bundleInstanceId)
            │      └── routes/cart.js POST /items (SERIALIZABLE TX validates stock)
            │      └── re-fetch cart via cartAPI.get
            └── if guest → mutate local React state only
                  on sign-in: ShopProvider runs cartAPI.sync(local items) once
```

Stock reconciliation (`reconcileCartStock`) clamps quantities after every
fetch and toasts a warning. Cart line keys: `productId|variantId|bundleInstanceId`.

### 10.5 Checkout — `/checkout`

`Checkout.jsx` is a multi-step wizard composed of three sub-components:

1.  **`ShippingStep`** — pick or add address (`addressesAPI.getAll/create`). Frontend enforces `DELIVERY_PINCODE` ("207001"). Optional: gift wrap, gift message, GPS lat/lng.
2.  **`BundleServiceScheduler`** — for any bundle in the cart that contains a service item, the user picks a date + time slot for that service (will become a `ServiceBooking` after the order is placed).
3.  **`PaymentStep`** — choose payment method, apply coupon, choose how much wallet to use, confirm referral code, place order.

Coupon application:
-   `couponsAPI.validate(code, cartItems, orderSubtotal)` — full server-side validation.
-   On success `applyCoupon(coupon)` stores it in `localStorage.appliedCoupon` so a refresh keeps the discount.
-   `computeCouponDiscountFromRules` runs client-side to display the same discount the server will apply.

Wallet usage:
-   `referralsAPI.applyWallet(amount)` validates the requested amount against the user's `walletBalance` (does not deduct; deduction happens at order placement).

Place order — `ShopProvider.placeOrder(items, paymentMethod, shippingAddress, referralCode, useWallet, walletUsed, couponCode, _discount, lat, lng, mapLink, giftWrap, giftMessage, bundleServiceSchedules, serviceOnlyBundles)`
forwards to `ordersAPI.place(...)`. Items are stripped to
`{ productId, variantId, quantity, bundleId, bundleInstanceId }` — no
client-side prices flow through.

Server (`routes/orders.js POST /`):

1.  Loads each product + variant + bundle item from DB.
2.  Recomputes:
    -   Per-item price (variant if any; quantity tier override if applicable).
    -   Bundle price (sum of `bundleItems` priced at the bundle rate, when `bundleInstanceId` is present).
    -   Coupon discount (server-side validation + math).
    -   Wallet deduction.
3.  Compares server `total` with the client's `total`. **Mismatch → 400 reject.** This is the H6 fix called out in `api.js`.
4.  Inside a `prisma.$transaction(async (tx) => { ... })`:
    -   `User.update({ walletBalance: { decrement: walletUsed }})` if applicable.
    -   `Product.update({ stock: { decrement: qty }})` per item.
    -   `Coupon.update({ usedCount: { increment: 1 }})`.
    -   `Order.create` + `OrderItem.createMany`.
    -   `WalletTransaction.create` rows for the debit (and any prior credit refunds).
    -   For service items inside bundles: `ServiceBooking.create` per scheduled service.
5.  Outside the transaction:
    -   Sends an order-confirmation email + a `Notification` row.
    -   Triggers low-stock alerts and price-drop alerts where the threshold was crossed.
    -   If item is non-returnable AND `pay_at_store` is verified at place-time, immediately credits referrer.

Returns: `{ order: { id, ... } }`.

### 10.6 Orders — listing, detail, cancellation, returns, refunds

| Page                      | API                                                            | Notes                                                                                                                          |
| ------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `UserOrders`              | `ordersAPI.getMyOrders({ page, limit })`                       | Paginated with status pills.                                                                                                   |
| `OrderDetail`             | `ordersAPI.getById(id)`                                        | Shows items, totals, addresses, OTPs (for `pay_at_store`), invoice download.                                                   |
| Admin `AdminOrders`       | `ordersAPI.getAll({...})`                                      | Filter by status / search by id/email.                                                                                          |
| Cancellation (user)       | `POST /api/orders/:id/cancel { reason }`                       | Only when status `Processing`. Refunds wallet portion, restores stock.                                                          |
| Return request (user)     | `POST /api/orders/:id/return { reason }`                       | Only `Delivered` items, only within `returnWindowDays`.                                                                          |
| Return decision (admin)   | `PUT /api/orders/:id/refund { action: 'approve' \| 'reject' }` | Approve → wallet credit + optional stock restore. Triggers a notification.                                                       |
| Status update (admin)     | `PATCH /api/orders/:id/status { status }`                      | State machine. On `Delivered` non-returnable items → instant referral. On `Cancelled` → stock restore.                          |
| Invoice                   | `GET /api/orders/:id/invoice`                                  | PDFKit-generated, gst-aware. Streamed to the browser by `ordersAPI.downloadInvoice`.                                            |

### 10.7 Payments

There is **no integrated payment gateway** in the current codebase. The
only payment method is `pay_at_store`, with an OTP-based payment-verified
flow:

1.  Customer places order → server picks a 4–6 digit `paymentOtp`.
2.  Customer comes to the store with the order id; staff/admin enters the OTP.
3.  `POST /api/orders/:id/verify-payment { otp }` (admin-only) marks `isPaid = true` and may push the status forward.
4.  If the order is non-returnable AND now paid AND delivered, the referral payout fires immediately.
5.  Otherwise the daily cron handles referral after the return window closes.

A real gateway integration is on the deferred-work list (`docs/FOLLOW_UPS.md`).

### 10.8 Service flow (CMGroups is also a marketplace for tech services)

This is the closest thing to a "vendor" flow.

1.  Customer browses `/services` (rendered from `ServiceType` table) and opens a `BookingModal`.
2.  Modal calls `servicesAPI.getAvailableSlots(date)` → checks `ServiceSettings.timeSlots` and counts existing bookings to advertise availability.
3.  Customer submits `servicesAPI.book(...)` → `POST /api/services/book` does a SERIALIZABLE transaction:
    -   Re-checks slot capacity.
    -   Creates `ServiceBooking`.
    -   Generates a `pickupOtp` if the workflow auto-confirms (`Confirmed` status).
    -   Sends notification + email.
4.  Admin assigns a technician (`PATCH /:id/assign`) and walks the state machine via `PATCH /:id/status`:
    -   `Confirmed` → customer hands over the device, OTP verified (`POST /:id/verify-otp`).
    -   `In Progress` → admin updates `estimatedPrice`, `adminNotes`.
    -   `Completed` → a delivery OTP is generated; `serviceInvoiceGenerator` produces a GST PDF; a referral payout fires for the service booking.
    -   `Delivered` → final state, after delivery OTP verified.
5.  Customer receives in-app + push notifications throughout, and can leave a `customerRating + customerReview`.

### 10.9 Bundles & "Build Your Own Bundle"

-   **Fixed bundles** (`Bundle` + `BundleItem`) — pre-built combos. `bundlePrice` is the absolute price; the saving is computed by `enrichBundle` against the sum of MRPs.
-   **BYOB** (`BundleTemplate` + `BundleTemplateSlot`) — slot-based picker. `discountType` ∈ {flat, tiered, mix-match}; `discountTiers` is JSON like `[{minQty: 2, off: 5}, {minQty: 3, off: 10}]`. The server has a `POST /api/bundle-templates/:id/calculate` endpoint so the UI can preview the price before adding.

When added to the cart, every line gets a unique `bundleInstanceId` so a
user can have two of the same bundle in their cart with separate
quantities and individual `bundle/remove` operations. Order placement
preserves `bundleId`/`bundleInstanceId`/`bundleTemplateId` on
`OrderItem` for downstream refund math.

---

## 11. PWA Setup

### 11.1 Web App Manifest

The manifest is generated by `vite-plugin-pwa` from `vite.config.js` and
emitted as `manifest.webmanifest` at build time. Every field, with notes:

| Field                                                  | Value (from `vite.config.js`)                                                                                                                                                                                       | Why                                                                                                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                                                 | `Shoptify`                                                                                                                                                                                                          | Long name shown during install.                                                                                                                                                                  |
| `short_name`                                           | `Shoptify`                                                                                                                                                                                                          | Used on the home-screen icon.                                                                                                                                                                    |
| `description`                                          | `Shop, Book Services, Learn Courses & More — Your Local Super App`                                                                                                                                                  | Install dialog and store metadata.                                                                                                                                                               |
| `start_url`                                            | `/`                                                                                                                                                                                                                 | Always boots into the home page.                                                                                                                                                                  |
| `scope`                                                | `/`                                                                                                                                                                                                                 | The whole origin is in-scope; other URLs would open in the browser.                                                                                                                              |
| `display`                                              | `standalone`                                                                                                                                                                                                        | Hides browser UI when installed.                                                                                                                                                                  |
| `theme_color`                                          | `#e91e63`                                                                                                                                                                                                           | Status bar / system-UI tint.                                                                                                                                                                      |
| `background_color`                                     | `#ffffff`                                                                                                                                                                                                           | Splash background.                                                                                                                                                                                |
| `orientation`                                          | `portrait`                                                                                                                                                                                                          | Locked for the TWA.                                                                                                                                                                                |
| `lang`, `dir`                                          | `en`, `ltr`                                                                                                                                                                                                         | Localisation hints.                                                                                                                                                                                |
| `id`                                                   | `/`                                                                                                                                                                                                                 | Manifest identity.                                                                                                                                                                                 |
| `categories`                                           | `['shopping','education','lifestyle']`                                                                                                                                                                              | App-store style hints.                                                                                                                                                                              |
| `prefer_related_applications`                          | `false`                                                                                                                                                                                                             | Don't shadow the PWA in favour of an Android app.                                                                                                                                                  |
| `handle_links`                                         | `preferred`                                                                                                                                                                                                         | The PWA prefers to handle in-scope links over the browser.                                                                                                                                         |
| `icons[]`                                              | `48,72,96,128,144,152,192,384,512` PNGs in `/icons/` plus 192/512 maskable                                                                                                                                            | Multiple sizes + dedicated maskable icons for Android adaptive icons.                                                                                                                              |
| `shortcuts[]`                                          | `My Orders → /dashboard/orders`, `Book Service → /services`, `My Courses → /courses`, `Shop Now → /products`                                                                                                       | Long-press shortcuts on Android.                                                                                                                                                                  |
| `screenshots[]`                                        | `home.png`, `products.png` (1080×1920, narrow form factor)                                                                                                                                                          | Used by the Android Chrome install prompt and Play Store.                                                                                                                                          |
| `share_target`                                         | `{ action: '/products', method: 'GET', params: { title, text, url } }`                                                                                                                                              | Other Android apps can share text/URLs to Shoptify; the receiver lands on `/products?title=...&text=...&url=...`.                                                                                  |

Static assets (`includeAssets`) precached at install: app icons, the SVG
favicon, `offline.html`, the placeholder product image, and screenshots.

### 11.2 Service Worker — `frontend/src/sw.js`

Built with **Workbox** (`workbox-precaching`, `workbox-routing`,
`workbox-strategies`, `workbox-expiration`, `workbox-cacheable-response`)
and registered via `vite-plugin-pwa`'s `injectManifest` strategy.

Caching strategies, in order of declaration:

| Match                                                                                            | Strategy                                              | Why                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `precacheAndRoute(self.__WB_MANIFEST)`                                                           | Workbox precache                                      | Every JS/CSS/HTML/PNG/SVG/WOFF2 from the build is precached so first paint can be offline.                                                                     |
| `NavigationRoute(NetworkFirst, denylist=[/^\/api\//, /^\/.well-known\//])`                       | Network-first w/ 3 s timeout, fallback to `offline.html` | Navigation requests prefer fresh; if offline, serve `offline.html`. `denylist` keeps API and well-known requests off the navigation route.                     |
| Google Fonts CSS / files                                                                         | CacheFirst — 365 days, max 10 entries                 | Fonts rarely change; CacheFirst eliminates layout shift.                                                                                                        |
| `/api/(categories|banners)`                                                                      | NetworkFirst — 5 s timeout, 60 s max-age, 50 entries   | Public, low-volatility catalog metadata that's safe to cache briefly.                                                                                            |
| `/api/(orders|wallet|notifications|user|cart|auth|products|courses|coupons|bundles)`             | **NetworkOnly**                                       | Anything that influences a purchase / personalised data is never cached — prevents "stale price" bugs in the checkout total mismatch check.                     |
| `request.destination === 'image'`                                                                | CacheFirst — 30 days, max 200 entries                 | Cloudinary images are content-hashed → safe to cache aggressively.                                                                                              |

Lifecycle:

-   `install` → `self.skipWaiting()` and `caches.open('offline-fallback').then(c => c.add('/offline.html'))`. Activates on the next page load.
-   `activate` → `self.clients.claim()` so the SW takes control of open tabs immediately.
-   `cleanupOutdatedCaches()` runs on every load to prune older Workbox caches when versions change.

### 11.3 Offline behaviour

With the SW installed:

-   **Cached pages** (any page the user has visited) load from cache when offline. Heroes / hero images often work too because Cloudinary images are CacheFirst.
-   **Navigations to a cold URL** fall back to `offline.html` after the 3 s network timeout — a friendly EN/HI page with a "Try again" button.
-   **Mutation APIs** (POST / PATCH / DELETE) are NetworkOnly. The UI surfaces "Request timed out" via `apiFetch`.
-   **GET catalog APIs** (`/api/categories`, `/api/banners`) work briefly offline thanks to NetworkFirst with a 60 s cache.
-   **Read of products / cart / auth** intentionally fails offline (NetworkOnly) — we'd rather show an error than serve stale prices.

### 11.4 Push notifications

Push is implemented end-to-end:

| Layer                | File                                                              | What it does                                                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend hook        | `hooks/usePushNotifications.js`                                   | `subscribe()` / `unsubscribe()` / `refreshSubscription()`. POSTs to `/api/push/subscribe`. Reconciles `localStorage.cmgroups_push_subscribed` against the actual `pushManager.getSubscription()` (handles iOS reinstall).      |
| Frontend bridge      | `components/system/PushNotificationsBridge.jsx`                   | Listens for SW `message` events `cmgroups:push-received` (refreshes the bell badge) and `cmgroups:subscription-changed` (re-POST the new endpoint).                                                                            |
| Service Worker       | `sw.js` `push`, `pushsubscriptionchange`, `notificationclick`     | Decodes the push payload, calls `showNotification`, dispatches a message to all clients. Click → focuses or opens the (sanitised) `data.url`. `pushsubscriptionchange` re-subscribes silently.                                |
| Backend route        | `routes/push.js`                                                  | `POST /subscribe` upserts `PushSubscription`, `DELETE /unsubscribe` removes it. `POST /test` (admin) sends a self-test push.                                                                                                  |
| Backend send helper  | `utils/webPush.js`                                                | `sendPushNotification(sub, payload)` using `web-push` + VAPID. On 404/410 it deletes the dead subscription.                                                                                                                    |
| Fan-out helper       | `utils/notifications.js → createUserNotification`                 | Writes to `Notification` table and (optionally) sends a push to every device the user has registered.                                                                                                                        |

VAPID keys are configured via `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (server) and `VITE_VAPID_PUBLIC_KEY` (browser).

URL safety: `normalizeNotificationUrl` in `sw.js` rejects `javascript:`, protocol-relative `//`, and external origins; the click handler always opens an in-app path or `/`.

### 11.5 Install prompts

-   `useInstallPrompt` listens for `beforeinstallprompt` and stores the event.
-   `<InstallPromptBanner />` shows a non-intrusive bottom banner on Android Chrome with "Install" and "Not now". Dismissal is remembered in `localStorage.installDismissedAt` for 7 days.
-   `<IOSInstallPrompt />` detects iOS Safari (and standalone-mode capability) and shows the manual "Add to Home Screen" instructions (iOS has no programmatic install).

---

## 12. TWA (Trusted Web Activity) Setup

### 12.1 Configuration — `frontend/twa/twa-manifest.json`

Bubblewrap CLI is used to convert this manifest into a fully signed
Android Studio project. Key fields:

| Field                                | Value                                                                                  | Notes                                                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packageId`                          | `com.cmgroups.shopnow`                                                                 | Play Store package ID.                                                                                                                                         |
| `host`                               | `cmgroups.vercel.app`                                                                  | The TWA opens this host in a Chrome Custom Tab without browser chrome.                                                                                          |
| `name` / `launcherName`              | "Shoptify - Technology, Services & Education" / "Shoptify"                             | App + launcher name.                                                                                                                                            |
| `display` / `orientation`            | `standalone` / `portrait`                                                              | Match the manifest.                                                                                                                                              |
| `themeColor` / `backgroundColor`     | `#e91e63` / `#ffffff`                                                                  | Splash + status bar.                                                                                                                                            |
| `startUrl`                           | `/`                                                                                    |                                                                                                                                                                  |
| `iconUrl` / `maskableIconUrl`        | hosted icons (512 px, both regular and maskable)                                       | Used to generate Android icons.                                                                                                                                  |
| `shortcuts[]`                        | Browse Products / My Cart / My Orders / Courses                                         | Long-press shortcuts.                                                                                                                                            |
| `signing`                            | `cmgroups-upload-key.jks` + alias `cmgroups-upload`                                    | The keystore used for Play Console upload signing.                                                                                                              |
| `enableNotifications`                | `true`                                                                                 | Enables web-push delivery via Android system notifications.                                                                                                      |
| `splashScreenFadeOutDuration`        | 300 ms                                                                                 |                                                                                                                                                                  |
| `fallbackType`                       | `customtabs`                                                                           | Falls back to a Custom Tab if the device doesn't support TWA.                                                                                                    |
| `enableSiteSettingsShortcut`         | `true`                                                                                 | Lets users tap into Chrome's site settings.                                                                                                                      |
| `minSdkVersion`                      | `24`                                                                                   | Android 7+.                                                                                                                                                       |
| `navigationColor`/`Dark` / `Divider` | branded chrome colors for nav bar and divider                                          | Light + dark variants.                                                                                                                                            |

### 12.2 Digital Asset Links — `frontend/public/.well-known/assetlinks.json`

The TWA only renders without browser chrome if the website "vouches" for
the Android app via Digital Asset Links. The file currently lists **two**
delegations:

```json
[
  { "relation": ["delegate_permission/common.handle_all_urls"],
    "target": { "namespace": "android_app",
                "package_name": "app.vercel.cmgroups.twa",
                "sha256_cert_fingerprints": ["B1:DF:..."] } },
  { "relation": ["delegate_permission/common.handle_all_urls"],
    "target": { "namespace": "android_app",
                "package_name": "com.cmgroups.shopnow",
                "sha256_cert_fingerprints": ["B1:DF:..."] } }
]
```

The first entry is a legacy package id used during early dev; the second
is the production package. Both share the same upload-key SHA-256
fingerprint so a single TWA build verifies for either id (Play App
Signing actually re-signs with a different key — when that happens the
fingerprint here must be the one shown in Play Console → "Setup → App
integrity → App signing key certificate").

`vercel.json` ensures the file is served with
`Content-Type: application/json` and `Cache-Control: public, max-age=3600`
(per the Digital Asset Links spec).

### 12.3 Wrapping the PWA as Android

The high-level pipeline (see `frontend/twa/README.md` for the current
exact commands):

1.  `bubblewrap init` consumes `twa-manifest.json` and emits an Android Studio project under (e.g.) `frontend/android/`.
2.  `bubblewrap update` reapplies any manifest tweaks.
3.  `./gradlew bundleRelease` (or `assembleRelease`) builds an `.aab` / `.apk`.
4.  Upload to Play Console.

The `.github/workflows/build-apk.yml` workflow automates this on a
manual trigger (it currently uses `npx cap sync android` in a
Capacitor-style pipeline, which is the path used to produce the APK
artifact attached to the workflow run).

### 12.4 TWA-specific behaviour

-   The wrapper fully respects the PWA manifest, so all the same shortcuts and share targets work.
-   Web-push notifications are delivered as Android notifications by the WebView; the SW's `push` handler runs identically.
-   `display-mode: standalone` and `display-mode: fullscreen` CSS guards in `index.css` adjust user-select rules and safe-area paddings inside the Android shell (see §13).
-   No Java/Kotlin code in this repo — the Android project is generated, not hand-edited.

---

## 13. Styling & UI

### 13.1 CSS approach

**Tailwind CSS** (utility-first), augmented with a small set of custom
component classes in `frontend/src/index.css`. No CSS Modules, no
styled-components, no MUI/Chakra. Icons come from `lucide-react`.
Animations use `tailwindcss-animate` and (sparingly) `framer-motion`.

`tailwind.config.js` is the single source of truth for the design
system. `cn()` (in `lib/utils.js`) merges classes via `clsx` +
`tailwind-merge` so runtime overrides never duplicate utility classes.

### 13.2 Design tokens (extracted from `tailwind.config.js`)

**Brand colors**

| Token            | Hex       | Where used                                           |
| ---------------- | --------- | ---------------------------------------------------- |
| `primary`        | `#e91e63` | Pink — CTAs, theme color.                            |
| `secondary`      | `#7c3aed` | Violet — gradients with primary.                     |
| `accent`         | `#ff6d00` | Orange — bestseller badges.                          |
| `success`        | `#007600` |                                                      |
| `warning`        | `#ffab00` |                                                      |
| `error`          | `#d50000` |                                                      |
| `background`     | `#f8f9fc` | Default page background.                              |
| `page-bg`        | `#EAEDED` | Amazon-like neutral for product pages.                |
| `surface`        | `#ffffff` | Card background.                                      |
| `surface-hover`  | `#F7FAFA` |                                                      |

**Marketplace tokens** (Amazon-inspired, intentional)

| Token                  | Hex       | Where used                                |
| ---------------------- | --------- | ----------------------------------------- |
| `buy-primary`          | `#FFD814` | Yellow buy buttons.                        |
| `buy-primary-hover`    | `#F7CA00` |                                            |
| `buy-secondary`        | `#FF9F00` | Add-to-cart variants.                      |
| `urgency`              | `#C7511F` | Stock warnings.                             |
| `deal`                 | `#CC0C39` | Deal badges.                                |
| `trust`                | `#007185` | Sign-in, links.                             |
| `text-primary`         | `#0F1111` | Body text.                                  |
| `text-secondary`       | `#565959` |                                            |
| `text-muted`           | `#767676` |                                            |
| `badge-bestseller`     | `#FF6D00` |                                            |
| `badge-choice`         | `#1a1a1a` |                                            |
| `discount-green`       | `#16a34a` |                                            |

**Fonts**

-   Sans: `Inter`, system fallbacks (Segoe UI, Roboto, Helvetica Neue).
-   Heading: `Outfit`, then `Inter`, then system.
-   Loaded with `display=optional` (better CLS than `swap`).

**Type scale**

Tailwind defaults plus custom price sizes:
`price` (1.5 rem), `price-lg` (1.875 rem), `price-xl` (2.25 rem).

**Spacing scale**

Custom additions: `xs:4px`, `sm:8px`, `md:12px`, `lg:16px`, `xl:24px`, `2xl:32px`.

**Shadows**

Custom: `glow` (pink glow), `glass`, `card`, `card-hover`.

**Transitions**

`fast:100ms`, `base:150ms`, `smooth:250ms`, `slow:400ms`.

`safelist` in the config pins a few utility classes that Tailwind would
otherwise tree-shake away because they're only ever resolved dynamically.

### 13.3 Component classes (from `index.css`)

Defined in `@layer components`:

-   `.min-touch` — 44 × 44 pixel hit-target shim for mobile (Apple HIG).
-   `.safe-pt`, `.safe-pb` — safe-area paddings with min `1rem`.
-   `.btn`, `.btn-primary`, `.btn-outline` — button base + presets.
-   `.glass-panel`, `.input-field`, `.table-scroll`, `.word-break`, `.page-pad` — common layout helpers.

### 13.4 PWA / mobile rules

`index.css` also includes a long block of "PWA shell" rules:

-   `body { overscroll-behavior: none; }` — disable pull-to-refresh.
-   `* { -webkit-tap-highlight-color: transparent; }` — kill iOS blue flash.
-   `@media (display-mode: standalone)` — disable user-select except in content elements; keep inputs selectable.
-   `@media (display-mode: fullscreen)` — extra safe-area padding for Android TWA fullscreen.
-   `@media (prefers-reduced-motion: reduce)` — respects OS motion preferences (collapse animation/transition durations).

### 13.5 Responsive strategy

Mobile-first. Breakpoints follow Tailwind defaults (`sm:640px`, `md:768px`,
`lg:1024px`, `xl:1280px`). Two important runtime CSS variables (`:root`)
control layout chrome:

```10:18:frontend/src/index.css
:root {
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --nav-h: 10rem;       /* mobile: logo + search + deliver strip */
    --bottom-nav-h: 3.5rem;
}
@media (min-width: 768px) {
    :root { --nav-h: 6.5rem; --bottom-nav-h: 0px; }
}
```

These are used by `SharedLayout` (`pt-[var(--nav-h)]`) and `BottomNav`
(`bottom-0 h-[var(--bottom-nav-h)]`) so layout adjustments require zero
JS.

`Navbar` collapses into a 2-row layout on mobile (logo + search + deliver
strip) and a single row on `md+`. `BottomNav` only renders on mobile.

---

## 14. Utilities & Helpers

### 14.1 Backend (`backend/src/utils/`)

| File                              | Exports                                                                                                                                | Purpose                                                                                                                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `firebase.js`                     | `default` (Firebase Admin app)                                                                                                          | Initialises the Admin SDK from env or a JSON keyfile.                                                                                                                                              |
| `cloudinary.js`                   | `uploadImage`, `uploadPdfBuffer`, `deleteImage`, `getPublicIdFromUrl`                                                                  | Uploads images (with byte-sniffing + 3 MB cap), uploads PDFs as raw resources, deletes images **only inside the `cmgroups/` namespace** (multi-tenant safety).                                    |
| `nodemailer.js`                   | `sendEmail`, transporter init                                                                                                          | Lazy SMTP transporter; in dev without SMTP it logs to console.                                                                                                                                      |
| `emailNotifications.js`           | Branded HTML email builders                                                                                                            | Order confirmation, password reset, OTP delivery, etc.                                                                                                                                              |
| `notifications.js`                | `createUserNotification`, `createAdminNotification`                                                                                     | Writes a `Notification` row, optionally sends a push fan-out to all the user's devices.                                                                                                            |
| `webPush.js`                      | `sendPushNotification`                                                                                                                  | `web-push` wrapper. On 404/410 deletes the dead subscription.                                                                                                                                       |
| `auditLog.js`                     | `logAudit({ userId, action, entity, entityId, details, req })`                                                                          | Fire-and-forget audit row. Captures IP via `req.ip` / `X-Forwarded-For`.                                                                                                                            |
| `referralHelper.js`               | `calculateReferralReward`, `calculateOrderReferralPoints`                                                                              | Per-item referral math: item override > global default > zero. Half-of-referrer for referee unless overridden.                                                                                     |
| `couponUserRules.js`              | Validation helpers                                                                                                                     | Per-user coupon usage limits + first-order-only checks.                                                                                                                                             |
| `escapeHtml.js`                   | `escapeHtml(str)`                                                                                                                       | Escapes user-supplied strings before they're embedded in HTML emails.                                                                                                                              |
| `invoiceGenerator.js`             | `generateOrderInvoice(order)`                                                                                                           | PDFKit. Streams a PDF for `GET /orders/:id/invoice`.                                                                                                                                                |
| `serviceInvoiceGenerator.js`      | `generateServiceInvoice(booking)`                                                                                                       | PDFKit + GST split. Saves the URL to `ServiceInvoice.pdfUrl` (Cloudinary).                                                                                                                         |
| `certificateGenerator.js`         | `generateCertificate(course, user)`                                                                                                    | PDFKit course completion certificate.                                                                                                                                                                |
| `googleSheets.js`                 | Sheets API helper (read/append/update)                                                                                                 | Wraps `googleapis` with auth via service-account JSON.                                                                                                                                              |
| `sheetsSync.js`                   | `syncAllSheets`, `syncSheet`, `importProductsFromSheet`                                                                                 | Two-way sync between DB and Google Sheets — used by the daily 00:00 backup and admin Sheets endpoints.                                                                                              |
| `serviceNotifications.js`         | Notification copy generators per booking state                                                                                          | Centralises the strings emitted as users pass through Confirmed → In Progress → Completed → Delivered.                                                                                              |

### 14.2 Frontend (`frontend/src/`)

| File                                  | Exports                                                                                                       | Purpose                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/api.js`                          | `apiFetch`, `setTokenGetter`, `getAuthHeaders` and one client object per resource                              | Single source of truth for backend communication.                                                                                              |
| `lib/config.js`                       | `API_BASE`                                                                                                     | Resolves the API base URL from `VITE_API_URL` (or localhost for dev).                                                                          |
| `lib/firebase.js`                     | `auth`, `appCheck`, default `app`                                                                              | Initialises Firebase Web SDK + AppCheck (when reCAPTCHA key is present).                                                                       |
| `lib/utils.js`                        | `cn(...inputs)`                                                                                                | Class-name merger (`clsx` + `tailwind-merge`).                                                                                                  |
| `lib/authProfile.js`                  | `needsPhoneCapture(user)`                                                                                       | True for non-admin users with no phone — used by router guards.                                                                                |
| `lib/firebaseAuthErrors.js`           | Error message map + `FIREBASE_OPERATION_NOT_ALLOWED`                                                            | Friendly copy for common Firebase error codes.                                                                                                  |
| `utils/image.js`                      | `getProductImageUrl`, `resolveImageUrl`, `getLineItemImageUrl`, `getOrderLineThumbUrl`, `handleImageError`     | Pick the best image URL for a product / variant / cart line; falls back to `/placeholder-product.svg`.                                          |
| `utils/sanitize.js`                   | `toSafeInternalPath(link)`                                                                                     | Validates a string as a safe in-app path (no protocol-relative, no `javascript:`).                                                              |
| `utils/couponPricing.js`              | `computeCouponDiscountFromRules`                                                                                | Mirrors backend coupon math so the UI shows accurate totals.                                                                                    |
| `utils/bundleUtils.js`                | `computeBundleAwareSubtotal`                                                                                   | Sums non-bundle lines at sale price, bundle lines at the bundle's flat price.                                                                   |
| `utils/validationSchemas.js`          | Yup schemas (sign-up, address, booking, etc.)                                                                   | Used with Formik on forms.                                                                                                                       |
| `hooks/useSEO.js`                     | `useSEO({ title, description })`                                                                                | Updates `document.title` and the `description` meta. Restores on unmount.                                                                        |
| `hooks/useRecentlyViewed.js`          | `useRecentlyViewed(excludeId?)` → `{ items, save }`                                                              | localStorage ring buffer (10 items).                                                                                                              |
| `hooks/usePushNotifications.js`       | `{ isSupported, isSubscribed, subscribe, unsubscribe, refreshSubscription, permission }`                         | Browser ↔ backend push subscription helper.                                                                                                       |
| `hooks/useInstallPrompt.js`           | `useInstallPrompt()`                                                                                            | Captures `beforeinstallprompt`.                                                                                                                  |
| `constants.js`                        | `DELIVERY_PINCODE`, `FREE_DELIVERY_THRESHOLD`, `LOW_STOCK_THRESHOLD`, `MAX_COMPARE_ITEMS`, `ABANDONED_CART_HOURS`, `EMI_MINIMUM_ORDER`, `SESSION_TIMEOUT_DAYS`, `MAX_CART_QUANTITY`, `DELIVERY_CUTOFF_HOUR`, storage keys | Centralised constants used throughout.                                                                                                            |

### 14.3 Cron jobs

`backend/src/cron/referrals.js` schedules `'0 0 * * *'` (00:00 server time)
to look for `Order` rows that:

-   `status = 'Delivered'`,
-   `isPaid = true`,
-   `referralCodeUsed != null`,
-   `referralEligibleAt <= now`,
-   no existing `Referral` (the `@@unique([orderId])` makes this idempotent).

For each, it calls `calculateOrderReferralPoints(items)`, finds the
referrer by `referralCode`, then in a single transaction:
creates the `Referral` row, increments the referrer's `walletBalance` (and
`tierPoints` if tiers are enabled), and credits the referee's wallet too
(half by default unless overridden per item). On `P2002` it skips and
moves on, so partial failures and retries are safe.

The other cron-like loop is `scheduleDailySync` in `server.js` (Sheets backup).

---

## 15. Build & Deployment

### 15.1 Frontend build

`npm run build` (in `frontend/`) runs `vite build`. Steps:

1.  Vite compiles JSX with `@vitejs/plugin-react`.
2.  Drops `console.*` and `debugger` (esbuild option in `vite.config.js`).
3.  Runs Workbox `injectManifest` over `src/sw.js`, replacing `self.__WB_MANIFEST` with the precache manifest.
4.  Splits vendors into the chunks listed in `manualChunks`.
5.  Emits `dist/` containing `index.html`, hashed JS/CSS, `manifest.webmanifest`, the SW, and copies of `public/*`.

`npm run build:analyze` does the same and opens `dist/stats.html` (treemap)
via `rollup-plugin-visualizer` so you can spot bloat.

### 15.2 Backend build

`npm run build` (in `backend/`) runs:

```12:12:backend/package.json
"build": "node scripts/migrate-deploy.mjs && npx prisma generate"
```

`scripts/migrate-deploy.mjs` invokes `prisma migrate deploy` (production-safe
migrations — no schema drift checks) and is the single point of contact
for Render's build phase.

### 15.3 Environments

| Environment           | Distinguishing config                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local dev             | Vite on 5173, Express on 5000, Postgres locally or via `USE_NEON_HTTP=1`. SW runs in dev mode for offline testing. `ALLOW_INSECURE_TLS=1` available behind proxies.   |
| Render (prod backend) | `NODE_ENV=production`, `TRUST_PROXY=1` implicit, HSTS enabled, `ADMIN_EMAILS` required, `prisma migrate deploy` runs in build, `DATABASE_URL` is NeonDB pooled.        |
| Vercel (prod frontend)| `VITE_API_URL` points at Render backend, all `VITE_FIREBASE_*` set, `VITE_VAPID_PUBLIC_KEY` set, `VITE_RECAPTCHA_SITE_KEY` set if AppCheck is on.                       |
| Play Store TWA        | Built via Bubblewrap from `frontend/twa/twa-manifest.json`. Verified by `assetlinks.json` at `cmgroups.vercel.app/.well-known/assetlinks.json`.                          |

### 15.4 Deployment manifests

-   `render.yaml` — Render Blueprint:

    ```yaml
    services:
      - type: web
        name: cmgroups-backend
        runtime: node
        rootDir: backend
        buildCommand: npm install && npm run build
        startCommand: npm start
        envVars:
          - key: NODE_VERSION
            value: "20"
    ```

    All other env vars are set in the dashboard (DB URLs, Firebase, Cloudinary, SMTP, VAPID).

-   `frontend/vercel.json` — SPA rewrites + correct content-types:

    -   Rewrites `/(.*)` → `/index.html` so `react-router-dom` handles client routes.
    -   Sets `Content-Type: application/json; charset=utf-8` and `Cache-Control: public, max-age=3600` for `/.well-known/assetlinks.json` (Digital Asset Links spec compliance).
    -   Sets `Content-Type: application/manifest+json; charset=utf-8` for the PWA manifest.

### 15.5 CI/CD

`.github/workflows/dependency-audit.yml` runs `npm audit --omit=dev
--audit-level=high` for both `backend/` and `frontend/` on every PR, on
every push to `main`, and weekly on Mondays at 06:00 UTC. Moderate
advisories are tolerated until the baseline is clean.

`.github/workflows/build-apk.yml` is a manual workflow that builds the
Android APK using Capacitor + Gradle. Inputs `VITE_API_URL`,
`SIGNING_KEY_*` are GitHub secrets. The artifact `Shoptify-App` is the
release APK.

### 15.6 Local dev steps (concise)

```bash
# Backend
cd backend
cp .env.example .env       # fill in values from README
npm install
npx prisma migrate dev
npm run dev                # http://localhost:5000

# Frontend
cd ../frontend
cp .env.example .env       # set VITE_API_URL etc.
npm install
npm run dev                # http://localhost:5173
```

---

## 16. Known Patterns & Gotchas

The code is well-commented; a number of subtle behaviours live behind
short labels (e.g. "H1", "H6", "H8", "H9", "H11"). Each refers to an
issue from a prior security/quality audit. The biggest ones to know:

### 16.1 H6 — Server is the source of truth on prices

`POST /api/orders` recomputes every line price, every quantity tier,
every bundle aggregate, every coupon discount, and rejects the request if
the client-supplied `total` doesn't match. `ordersAPI.place(...)` (in
`api.js`) explicitly **strips `item.price`** from the payload to make
this guarantee impossible to circumvent client-side.

### 16.2 H8 — Open-redirect protection on sign-in

`SignIn.jsx`'s `safeInternalPath` validates `state.from.pathname` so a
crafted `/sign-in?from=https://evil.example` cannot redirect users
externally after auth. The same idea is in `frontend/src/utils/sanitize.js`
(`toSafeInternalPath`) and again in `sw.js` (`normalizeNotificationUrl`).

### 16.3 H9 — Selective SW caching

The SW caches `/api/categories` and `/api/banners` only. Anything that
influences a purchase decision (`/api/products`, `/api/orders`,
`/api/cart`, `/api/coupons`, `/api/bundles`, `/api/auth`, etc.) is
NetworkOnly so the H6 mismatch check never trips on stale prices.

### 16.4 H11 — Onboarding "Skip for now"

If a user dismisses `/onboarding`, `sessionStorage.onboardingSkipped` is
set so they aren't bounced again on every navigation. Actions that
genuinely require a phone (checkout, service booking) prompt inline.

### 16.5 H1 — Tier points math fix in the cron

In `cron/referrals.js` the buyer's tier points are incremented by the
**referee** reward (not the referrer's). A code comment flags this
("BUG FIX (H1)").

### 16.6 H7 — Wishlist merge (not replace)

`POST /api/wishlist/merge` merges a guest's local wishlist into the
server wishlist on sign-in instead of overwriting. Avoids losing items
collected offline.

### 16.7 Cloudinary namespace guard

`backend/src/utils/cloudinary.js` refuses to delete any asset whose
public id does not start with `cmgroups/`. This prevents a compromised
admin account (or a buggy admin UI) from destroying assets belonging to
other apps that share the same Cloudinary account. See `CLOUDINARY_NAMESPACE`.

### 16.8 Image upload byte-sniffing

The same file decodes the base64 client payload, sniffs the magic bytes
to verify it's a real JPEG/PNG/GIF/WEBP, and rejects payloads larger
than 3 MB **before** calling Cloudinary (which would happily accept and
charge for garbage).

### 16.9 Cart queue & SERIALIZABLE transactions

Two patterns prevent overselling and race conditions:

-   `ShopProvider.cartQueue` chains cart mutations on the client so two rapid clicks become two ordered calls.
-   `routes/cart.js` wraps add/update/remove in `prisma.$transaction(... isolationLevel: Serializable)`.

### 16.10 Slot booking concurrency

`routes/services.js POST /book` re-checks the per-slot booking count
inside a SERIALIZABLE transaction so two simultaneous bookings cannot
both grab the last slot.

### 16.11 Referral idempotency

`Referral @@unique([orderId])` + the daily cron's `try/catch` on Prisma's
`P2002` make the cron safe to run repeatedly.

### 16.12 Token-getter pattern

`api.js` exposes `setTokenGetter(fn)` and stores the latest getter; the
`AuthProvider` is the only place that wires it up. This keeps `api.js`
free of React imports while still always sending the latest token.

### 16.13 Hardcoded values worth knowing

-   `DELIVERY_PINCODE = '207001'` (Etah, UP) — hardcoded in `frontend/src/constants.js` and re-checked server-side. Multi-zone delivery is on the deferred list.
-   The `CLOUDINARY_NAMESPACE = 'cmgroups/'` is hardcoded in the cloudinary util.
-   The default referral payout is 200 points (`Referral.rewardAmount` default; `ReferralSettings` overrides).
-   `MAX_IMAGE_BYTES = 3 * 1024 * 1024`.

### 16.14 Money is currently `Float`

Every monetary column (`Order.total`, `Product.price`, etc.) is Prisma
`Float` (Postgres `double precision`). Migrating to `Decimal` is on the
deferred-work list (`docs/FOLLOW_UPS.md`); be careful about cumulative
floating-point error in big bundles.

### 16.15 No real payment gateway

`paymentMethod` only supports `pay_at_store`. The OTP verification flow
is the closest thing the system has to "payment captured". Wiring up
Razorpay / Stripe is on the deferred list.

### 16.16 Search is ILIKE only

There is no `pg_trgm` or full-text-search index — search latency on a
big catalog will degrade. Listed in `FOLLOW_UPS.md`.

### 16.17 Two TWA package ids in `assetlinks.json`

The well-known file lists both `app.vercel.cmgroups.twa` (legacy) and
`com.cmgroups.shopnow` (current). Once the legacy build is deprecated
the first delegation can be removed. The fingerprint must be the Play
Console *App-signing-key* fingerprint (not the upload key) once the
build is on Play App Signing.

### 16.18 SMTP optional in dev

`utils/nodemailer.js` only initialises a transporter when SMTP env vars
are present; otherwise it logs the email content to the console. Don't
ship to production without configuring SMTP.

### 16.19 `console.log` is stripped from prod bundles

`vite.config.js` sets `esbuild.drop: ['console', 'debugger']`. Any logs
you want to keep in production must use `console.warn` / `console.error`
or be wired through a different logger.

### 16.20 `chunk_reload` retries

`lazyRetry` (in `App.jsx`) reloads the page up to twice on chunk-load
failure (`sessionStorage.chunk_reload`). After two fails it bubbles the
error up to `ErrorBoundary`. This handles the classic "stale chunk after
deploy" case but doesn't loop forever.

---

## 17. Full Data Flow Diagram (text-based)

```
                          ┌────────────────────────────────────────────┐
                          │             Customer's Device              │
                          │  (Browser  / Installed PWA  / Android TWA) │
                          └────────────────────────────────────────────┘
                                        │
                                        ▼
            ┌──────────────────────────────────────────────────────────────┐
            │                  React + Vite SPA  (Vercel)                   │
            │                                                                │
            │   index.html  ─►  main.jsx ─► App.jsx                          │
            │                              │                                 │
            │                              ▼                                 │
            │   ┌────────── AuthProvider ──────────────────────┐             │
            │   │ Firebase Web SDK (signInWithEmailAndPassword,│             │
            │   │ signInWithPopup) ──► onAuthStateChanged ─►   │             │
            │   │ getIdToken ─► setTokenGetter(api.js)         │             │
            │   └────────────┬─────────────────────────────────┘             │
            │                │                                                │
            │   ┌────── NotificationProvider ──────┐                          │
            │   │ poll every 60 s + SW push event │                          │
            │   └─────────────┬───────────────────┘                          │
            │                 │                                              │
            │   ┌──────── ShopProvider ───────────────┐                      │
            │   │ cart / wishlist / compare / coupon  │                      │
            │   │ cartQueue (serialised mutations)    │                      │
            │   └─────┬───────────────────────────────┘                      │
            │         │                                                       │
            │         ▼                                                       │
            │   pages/components ─ react-router-dom ─ ProtectedRoute          │
            │                                                                 │
            │   ┌─────────── lib/api.js (apiFetch) ─────────────┐             │
            │   │ getAuthHeaders() injects Bearer Firebase JWT  │             │
            │   └────────────────────┬───────────────────────────┘             │
            │                        │                                       │
            │   sw.js (Workbox)  ◄── │  intercepts fetch:                    │
            │      precache, navigation NetworkFirst, images CacheFirst,     │
            │      /api/(categories|banners) NetworkFirst 60 s,              │
            │      everything else NetworkOnly                                │
            │                                                                 │
            │   sw.js push event ─► showNotification ─► click ─► focus tab   │
            └──────────────────────────────────────────────────────────────┘
                                        │
                                        ▼   HTTPS + Bearer Firebase ID token
            ┌──────────────────────────────────────────────────────────────┐
            │           Express API   (Render → Node 20+, ESM)             │
            │                                                                │
            │   server.js  ─► validates env ─► imports app.js                │
            │   app.js: helmet+csp / cors / compression / rate limiters      │
            │                                                                │
            │   ┌──────── middleware/auth.js ─────┐                          │
            │   │ protect: verifyIdToken via      │                          │
            │   │ firebase-admin → load User      │                          │
            │   │ optionalProtect / adminOnly     │                          │
            │   └──────────┬──────────────────────┘                          │
            │              │                                                 │
            │              ▼                                                 │
            │   routes/* (auth, products, orders, cart, services, …)         │
            │                                                                │
            │   utils/notifications.js ──► writes Notification row           │
            │                          ──► utils/webPush.js (VAPID send)     │
            │                                                                │
            │   utils/auditLog.js ──► AuditLog row (admin actions)           │
            │   utils/cloudinary.js ──► Cloudinary uploads + namespace guard │
            │   utils/nodemailer.js ──► SMTP (order confirms, OTPs)          │
            │   utils/invoiceGenerator.js / certificateGenerator.js (PDFs)   │
            │                                                                │
            │   cron/referrals.js (daily 00:00) ─► reconciles delivered      │
            │      orders past returnWindow → Referral + walletBalance       │
            │                                                                │
            │   sheetsSync (00:00 nightly) ─► Google Sheets backup           │
            │                                                                │
            │   ┌──────── lib/prisma.js ─────────┐                           │
            │   │ PrismaClient (TCP 5432  OR    │                            │
            │   │ Neon WS adapter via WSS:443)  │                            │
            │   └─────────┬──────────────────────┘                           │
            └─────────────┼─────────────────────────────────────────────────┘
                          │
                          ▼  SQL  (DATABASE_URL pooled, DIRECT_URL for migrate)
            ┌──────────────────────────────────────────────────────────────┐
            │                     PostgreSQL (NeonDB)                      │
            │                                                                │
            │   Users · Products · Variants · Bundles · BundleTemplates     │
            │   Orders · OrderItems · CartItem · Wishlist · ServiceBooking  │
            │   ServiceInvoice · Coupon · Referral · WalletTransaction      │
            │   Notification · PushSubscription · Address · AuditLog        │
            │   Course · CourseDuration · CourseBatch · CourseApplication   │
            │   FeePayment · Enrollment · Attendance · CourseMaterial       │
            │   ProductAlert · QuantityTier · ServiceType · Banner          │
            │   Category · Technician · ServiceSettings · ReferralSettings  │
            │   TierConfig · TallyEnquiry · CCTVEnquiry · AdminNotificationLog
            │                                                                │
            │   indexes on every hot path: (userId), (status), (createdAt), │
            │   (date,timeSlot,status), (firebaseUid), (orderId @unique on  │
            │   Referral), …                                                 │
            └──────────────────────────────────────────────────────────────┘
                          ▲                       ▲                       ▲
                          │                       │                       │
                          ▼                       ▼                       ▼
            ┌──────────────────┐    ┌────────────────────┐    ┌────────────────────┐
            │   Firebase Auth   │    │     Cloudinary      │    │   Google Sheets    │
            │ (token issuer +   │    │  (image / PDF host) │    │  (DB ↔ Sheets sync) │
            │  password reset)  │    │                     │    │                     │
            └──────────────────┘    └────────────────────┘    └────────────────────┘
                          ▲                                              ▲
                          │ Admin SDK verifies                            │ admin /api/sheets
                          │ ID tokens                                     │
                          │                                              │
                ┌─────────┴──────────┐                                    │
                │  /api/auth/login,   │                                    │
                │  /api/auth/register │                                    │
                │  (sign up flow)     │                                    │
                └────────────────────┘                                    │
                                                                          │
                          ┌────────────────┐                              │
                          │ web-push (VAPID)│  push payload over HTTPS    │
                          └────────────────┘                              │
                                  │                                        │
                                  ▼                                        │
                    Browser PushService ──► sw.js push ──► UI bell + toast │
                                                                          │
                          ┌────────────────┐                              │
                          │      SMTP       │  emails: order confirm,     │
                          │  (Nodemailer)   │  reset password, OTPs       │
                          └────────────────┘                              │
```

End-to-end purchase flow trace:

```
1. User opens https://cmgroups.vercel.app  (Vercel CDN)
2. SW (Workbox) serves shell from precache; React renders
3. AuthProvider runs onAuthStateChanged → getIdToken → setTokenGetter
4. Home.jsx fetches /api/products?sort=rating, /api/banners (cached 60 s by SW)
5. User taps a product, lands on /products/:id
6. ProductDetail fetches /api/products/:id, /api/reviews/:id, /api/bundles/for-product/:id
7. User taps "Add to Cart"
   ├─ ShopProvider.cartQueue serialises the call
   ├─ POST /api/cart/items { productId, variantId, quantity, ... }
   │     └─ routes/cart.js: prisma.$transaction(SERIALIZABLE) re-validates stock,
   │        upserts CartItem
   └─ GET /api/cart for the freshest server cart, reconcileCartStock()
8. User taps "Checkout"
   ├─ ProtectedRoute redirects to /sign-in if not authed
   ├─ POST /api/coupons/validate to apply a coupon
   └─ ordersAPI.place({ items: [{ productId, variantId, quantity, bundleId, bundleInstanceId }], total, ... })
        └─ routes/orders.js POST /:
             ├─ recompute every price (variant > tier > base)
             ├─ recompute coupon discount + bundle savings
             ├─ verify total matches client total (else 400)
             └─ prisma.$transaction:
                  ├─ User.walletBalance -= walletUsed
                  ├─ Product.stock -= qty (per item)
                  ├─ Coupon.usedCount += 1
                  ├─ Order.create + OrderItem.createMany
                  ├─ WalletTransaction.create
                  └─ ServiceBooking.create per scheduled service-in-bundle
        ├─ outside the TX:
        │   ├─ utils/notifications.createUserNotification("Order placed")
        │   ├─ utils/webPush.sendPushNotification (best-effort)
        │   ├─ utils/nodemailer email (order confirmation)
        │   ├─ low-stock alerts triggered for affected products
        │   └─ instant referral payout if non-returnable + paid + delivered
        └─ returns { order: { id, ... } }
9. Frontend navigates to /dashboard/orders/:id (OrderDetail) → ordersAPI.getById(id)
10. Daily 00:00 cron: orders past their returnWindowDays receive their referral
    payout idempotently (Referral.@@unique([orderId])).
```

---

_End of `CODEBASE_GUIDE.md`._
