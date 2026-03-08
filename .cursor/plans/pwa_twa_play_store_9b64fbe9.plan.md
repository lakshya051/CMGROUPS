---
name: PWA TWA Play Store
overview: Comprehensive plan to add PWA support, build a TWA for Android, and submit to Google Play Store for the CMGROUPS/TechNova e-commerce application, based on a full codebase audit.
todos:
  - id: audit
    content: Complete codebase audit and answer all 10 diagnostic questions
    status: completed
  - id: pwa-plan
    content: "Plan PWA implementation: plugin, manifest, service worker, offline, install prompts"
    status: completed
  - id: twa-plan
    content: "Plan TWA implementation: tool selection, asset links, signing, configuration"
    status: completed
  - id: playstore-plan
    content: "Plan Play Store submission: account, assets, listing copy, release tracks"
    status: completed
  - id: ios-plan
    content: "Plan iOS PWA: meta tags, install banner, limitations"
    status: completed
  - id: timeline
    content: Produce week-by-week implementation timeline
    status: completed
  - id: risks
    content: Identify and document all risks with mitigations
    status: completed
  - id: owner-questions
    content: List all questions that must be answered before building
    status: completed
isProject: false
---

# PWA + TWA + Play Store Implementation Plan

---

## SECTION 1 — CURRENT STATE AUDIT

### Codebase Audit Answers


| #   | Question               | Answer                                                                                                                                                                                                                                                                |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Service worker         | **None** — no `sw.js`, `service-worker.js`, `registerSW.js`, or `firebase-messaging-sw.js` found anywhere                                                                                                                                                             |
| 2   | Web manifest           | **None** — no `manifest.json` or `manifest.webmanifest`. Only `frontend/android/app/src/main/AndroidManifest.xml` (Capacitor native)                                                                                                                                  |
| 3   | vite-plugin-pwa        | **No** — not in dependencies                                                                                                                                                                                                                                          |
| 4   | Capacitor              | **Yes** — `@capacitor/core@^8.1.0`, `@capacitor/android@^8.1.0`, `@capacitor/ios@^8.1.0` installed. Android platform generated at `frontend/android/`. iOS platform not generated (no `frontend/ios/` folder). Push notifications via `@capacitor/push-notifications` |
| 5   | Icons in public/       | **Only 1 file:** `placeholder-product.svg` (646 bytes) — no app icons at all                                                                                                                                                                                          |
| 6   | Primary brand color    | `primary: "#e91e63"` (pink/magenta). Secondary: `#7c3aed`. Background: `#EAEDED` (page-bg)                                                                                                                                                                            |
| 7   | Deployed URL           | `https://cmgroups.vercel.app/` (from [capacitor.config.json](frontend/capacitor.config.json) `server.url`)                                                                                                                                                            |
| 8   | Build output directory | `dist` (Vite default, confirmed by `capacitor.config.json` `webDir: "dist"`)                                                                                                                                                                                          |
| 9   | Privacy policy page    | **No** — Footer has placeholder `href="#"` links for Privacy Policy, Terms of Service, and Refund Policy                                                                                                                                                              |
| 10  | App name               | **Inconsistent:** Web UI says "CMGROUPS", Capacitor config says "technova", package ID is `com.cmgroups.shopnow`                                                                                                                                                      |


### PWA Readiness Summary

```
PWA Readiness:
- Service worker:      MISSING
- Web manifest:        MISSING
- HTTPS:               CONFIRMED (Vercel provides automatic SSL for cmgroups.vercel.app)
- Installability:      FAILS (no manifest, no service worker, no icons)
- Existing PWA plugin: NONE
- Icons available:     NONE (only a placeholder-product.svg, no app icons)
- Viewport meta:       <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### Capacitor Status

```
Capacitor Status:
- Installed:           YES (@capacitor/core ^8.1.0)
- Platforms added:     Android (generated), iOS (dependency only, no platform folder)
- Config file:         frontend/capacitor.config.json
- App ID:              com.cmgroups.shopnow
- Server URL:          https://cmgroups.vercel.app/
- Conflict risk:       MEDIUM — Capacitor wraps the web app in a WebView similarly to TWA.
                       The existing Capacitor Android project and a new TWA would both target
                       the same package ID. They serve different purposes: Capacitor for native
                       features (push via Firebase), TWA for a lightweight Play Store listing.
                       Recommendation: use TWA as the Play Store distribution mechanism and
                       keep Capacitor for development/testing of native features only, OR
                       migrate push notifications to Web Push API and go TWA-only.
```

---

## SECTION 2 — PWA IMPLEMENTATION PLAN

### 2.1 Recommended PWA Plugin

**Recommendation: `vite-plugin-pwa`**

Rationale:

- The project uses Vite (`^7.3.1`) as its build tool — `vite-plugin-pwa` is the standard, well-maintained plugin for this exact stack
- It auto-generates the web manifest from config, auto-generates a service worker via Workbox, and handles registration
- The project currently has zero PWA infrastructure — this plugin provides everything in one integration
- Manual service worker authoring would be excessive given the project's needs (standard e-commerce caching patterns)

Integration point: add to the `plugins` array in [frontend/vite.config.js](frontend/vite.config.js) alongside the existing `react()` plugin.

### 2.2 Web App Manifest Plan

All values derived from codebase inspection:

```
name:             "CMGROUPS - Technology, Services & Education"
short_name:       "CMGROUPS"        (8 chars, under 12 limit)
start_url:        "/"
scope:            "/"
display:          "standalone"      (not fullscreen — standalone preserves status bar
                                     which is expected for e-commerce apps; fullscreen
                                     is for games/media)
theme_color:      "#e91e63"         (primary brand color from tailwind.config.js)
background_color: "#EAEDED"         (page-bg from tailwind.config.js — matches splash)
orientation:      "portrait"
lang:             "en"
dir:              "ltr"
```

**Icons Required:**


| Size             | Purpose                                  | Exists? | Action                          |
| ---------------- | ---------------------------------------- | ------- | ------------------------------- |
| 72x72            | Legacy Android                           | No      | Generate from source icon       |
| 96x96            | Legacy Android                           | No      | Generate from source icon       |
| 128x128          | Chrome Web Store                         | No      | Generate from source icon       |
| 144x144          | Windows tile / MS                        | No      | Generate from source icon       |
| 152x152          | iPad                                     | No      | Generate from source icon       |
| 180x180          | iOS touch icon (apple-touch-icon)        | No      | Generate from source icon       |
| 192x192          | Android Chrome installability (REQUIRED) | No      | Generate from source icon       |
| 384x384          | Android splash                           | No      | Generate from source icon       |
| 512x512          | Play Store + splash (REQUIRED)           | No      | Generate from source icon       |
| 512x512 maskable | Android adaptive icon                    | No      | Generate with safe zone padding |


**Action:** Owner must provide a source icon (at least 1024x1024 PNG with transparency). All sizes will be generated from it. The maskable variant needs the logo centered within the safe zone (inner 80% circle).

**Shortcuts** (based on actual routes in [App.jsx](frontend/src/App.jsx)):

```json
"shortcuts": [
  {
    "name": "Browse Products",
    "short_name": "Products",
    "url": "/products",
    "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
  },
  {
    "name": "My Cart",
    "short_name": "Cart",
    "url": "/cart",
    "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
  },
  {
    "name": "My Orders",
    "short_name": "Orders",
    "url": "/dashboard/orders",
    "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
  },
  {
    "name": "Courses",
    "short_name": "Courses",
    "url": "/courses",
    "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
  }
]
```

**Screenshots** (for richer install UI and Play Store):

- `/` — Homepage with hero banner
- `/products` — Product listing grid
- `/products/:id` — Product detail page
- `/cart` — Cart with items
- `/courses` — Course catalog

**Categories:** `["shopping", "education", "business"]`

### 2.3 Service Worker Caching Strategy

Based on the routes and API calls found in [frontend/src/lib/api.js](frontend/src/lib/api.js):


| Resource Type                  | Examples from Codebase           | Strategy                                       | Reason                                            |
| ------------------------------ | -------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| Static assets (JS, CSS, fonts) | Vite-hashed chunks, Google Fonts | **CacheFirst** with long expiry                | Content-hashed filenames; immutable once deployed |
| Page shell (index.html)        | SPA shell                        | **NetworkFirst** with 3s timeout               | Must get latest deployment but work offline       |
| Product images                 | CDN/external product photos      | **CacheFirst**, max 200 entries, 30-day expiry | Large, rarely change, saves bandwidth             |
| API: product listing           | `GET /products`                  | **StaleWhileRevalidate**, 5-min max age        | Users need fast browsing but data should refresh  |
| API: product detail            | `GET /products/:id`              | **StaleWhileRevalidate**, 5-min max age        | Same as listing                                   |
| API: categories                | `GET /categories`                | **StaleWhileRevalidate**, 1-hour max age       | Rarely changes                                    |
| API: banners                   | `GET /banners`                   | **StaleWhileRevalidate**, 15-min max age       | Marketing content, moderate freshness             |
| API: courses                   | `GET /courses`                   | **StaleWhileRevalidate**, 10-min max age       | Catalog data                                      |
| API: cart                      | `GET /cart`                      | **NetworkFirst**, 2s timeout                   | Must be fresh for checkout accuracy               |
| API: orders                    | `GET /orders/my-orders`          | **NetworkFirst**, 2s timeout                   | Must reflect latest status                        |
| API: auth/me                   | `GET /auth/me`                   | **NetworkOnly**                                | Session-critical, never serve stale auth          |


**NEVER cache (NetworkOnly enforced):**

- `POST /orders` (order creation)
- `POST /orders/:id/verify-payment` (payment verification)
- `POST /checkout` — any checkout/payment route
- `POST /auth/onboarding`
- `PUT /auth/profile`
- All `POST/PUT/PATCH/DELETE` mutations
- Clerk authentication endpoints
- Webhook routes

### 2.4 Offline Experience


| Route                  | Offline Behavior                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/` (homepage)         | Show cached homepage shell + cached banners/products. If nothing cached, show offline fallback page                               |
| `/products`            | Show cached product grid if available. Show "You're offline — showing cached products" banner. If no cache, show offline fallback |
| `/products/:id`        | Show cached product detail if previously viewed. If not cached, show offline fallback                                             |
| `/cart`                | Show cart from localStorage/cached state. Disable "Proceed to Checkout" button with message "Checkout requires internet"          |
| `/checkout`            | Redirect to offline fallback. Checkout MUST NOT work offline (payment integrity)                                                  |
| `/services`            | Show offline fallback — service booking requires server                                                                           |
| `/courses`             | Show cached course list if available. Show offline badge                                                                          |
| `/courses/:id`         | Show cached detail if visited before. "Enroll" button disabled offline                                                            |
| `/dashboard/`*         | Show offline fallback — dashboard data requires auth + server                                                                     |
| `/sign-in`, `/sign-up` | Show offline fallback — Clerk auth requires internet                                                                              |


**Offline Fallback Page Design:**

- Use existing design system (Tailwind classes, Inter/Outfit fonts)
- Show the CMGROUPS logo
- Large "You're offline" heading
- Subtext: "Check your internet connection and try again"
- "Try Again" button that calls `window.location.reload()`
- Subtle animated wifi-off icon (from lucide-react, already in the project)
- Background color: `#EAEDED` (page-bg)

### 2.5 Install Prompt Plan

**Android (`beforeinstallprompt`):**

- Intercept the `beforeinstallprompt` event in a React context/hook
- Store the event reference
- Show a custom install banner after the user has:
  - Visited at least 2 pages, OR
  - Been on the site for 30+ seconds
- Banner design: bottom sheet with app icon, "Install CMGROUPS App" text, "Install" primary button, "Not now" dismiss
- On dismiss: don't show again for 7 days (localStorage timestamp)
- On install: track with analytics, hide banner permanently

**iOS (Safari detection):**

- Detect `navigator.userAgent` for Safari on iOS (not Chrome/Firefox on iOS)
- Detect `window.navigator.standalone === false` (not already installed)
- Show a custom instruction banner:
  - "Install CMGROUPS on your iPhone"
  - Animated arrow pointing to Share button
  - Step 1: "Tap the Share button" (with share icon)
  - Step 2: "Scroll down and tap 'Add to Home Screen'"
  - Dismissible, won't show again for 14 days

**Desktop (Chrome/Edge):**

- Same `beforeinstallprompt` mechanism as Android
- Show as a subtle top bar or modal after 60 seconds on site
- "Get the CMGROUPS app for quick access" with Install button
- Dismiss stores preference for 30 days

---

## SECTION 3 — TWA IMPLEMENTATION PLAN

### 3.1 TWA Tool Recommendation


| Criteria      | Bubblewrap (Google CLI)                 | PWABuilder (Microsoft)           |
| ------------- | --------------------------------------- | -------------------------------- |
| Requires      | Node.js + JDK + Android SDK             | Browser + deployed URL           |
| Output        | Android Studio project (full control)   | Ready AAB download               |
| Customization | Full (splash, shortcuts, notifications) | Limited (basic config)           |
| Asset Links   | Auto-generated                          | Auto-generated                   |
| Best for      | Teams with Android dev experience       | Teams without Android experience |


**Recommendation: Bubblewrap**

Rationale:

- The project already has an Android folder from Capacitor, indicating some Android tooling familiarity
- Bubblewrap generates a dedicated TWA project (separate from the Capacitor Android project)
- It provides full control over signing, splash screens, and the `assetlinks.json` configuration
- It outputs the exact SHA-256 fingerprint needed for Digital Asset Links
- PWABuilder is faster but offers less control over the notification and deep-linking setup that this app needs

**Important:** The TWA project should be created in a NEW directory (e.g., `twa-android/`), separate from the existing `frontend/android/` Capacitor project. They are different wrappers serving different purposes.

### 3.2 Technical Requirements Checklist


| Requirement          | Required Value                                              | Current Status                                            | Action Needed                             |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| HTTPS                | Valid SSL certificate                                       | PASS — Vercel provides auto-SSL for `cmgroups.vercel.app` | None                                      |
| Service worker       | Must exist and control the page                             | FAIL — no service worker exists                           | Implement via vite-plugin-pwa (Section 2) |
| Web manifest         | Must have `name`, `icons` (192+512), `start_url`, `display` | FAIL — no manifest exists                                 | Create via vite-plugin-pwa (Section 2)    |
| 192x192 icon         | In manifest, any purpose                                    | FAIL — no icons                                           | Generate from source                      |
| 512x512 icon         | In manifest, any purpose                                    | FAIL — no icons                                           | Generate from source                      |
| start_url            | Must be `/`                                                 | Will be `/` after manifest creation                       | Set in manifest config                    |
| Lighthouse PWA score | Should be >= 80                                             | UNKNOWN — must run after PWA implementation               | Run Lighthouse audit post-implementation  |
| `assetlinks.json`    | Served at `/.well-known/assetlinks.json`                    | FAIL — does not exist                                     | Create and deploy (see 3.3)               |
| Status bar color     | Should match theme_color                                    | Partially set in Capacitor config (`#EAEDED`)             | TWA will use manifest `theme_color`       |


### 3.3 Digital Asset Links (`assetlinks.json`) Plan

**What it does:** Proves to Android that the app at `com.cmgroups.shopnow` is authorized to open content from `cmgroups.vercel.app` in a trusted full-screen WebView (no browser URL bar).

**Where to serve it:**

- Place the file at `frontend/public/.well-known/assetlinks.json`
- Vite copies `public/` contents to `dist/` at build time
- Vercel serves static files from `dist/`, so it will be available at `https://cmgroups.vercel.app/.well-known/assetlinks.json`
- Verify: the existing [frontend/vercel.json](frontend/vercel.json) has a catch-all rewrite (`/(.*) -> /index.html`). This could intercept `.well-known/`. Need to add a rewrite exception or ensure Vercel serves static files before rewrites (Vercel does this by default — static files take priority over rewrites).

**Information needed to generate it:**

1. **Package name:** `com.cmgroups.shopnow` (from [capacitor.config.json](frontend/capacitor.config.json))
2. **SHA-256 certificate fingerprint:** Generated from the signing keystore (see 3.5). Unknown until keystore is created.
3. **Google Play App Signing fingerprint:** If using Play App Signing (recommended), Google provides an additional fingerprint that must also be included.

**File format:**

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.cmgroups.shopnow",
    "sha256_cert_fingerprints": [
      "<UPLOAD_KEY_FINGERPRINT>",
      "<PLAY_APP_SIGNING_FINGERPRINT>"
    ]
  }
}]
```

**When it can be generated:**

1. After the signing keystore is created (provides upload key fingerprint)
2. After first upload to Play Console (provides Play App Signing fingerprint)
3. Must be deployed to production BEFORE the TWA app is published on Play Store

**Verification after deployment:**

- Visit `https://cmgroups.vercel.app/.well-known/assetlinks.json` — must return valid JSON with `Content-Type: application/json`
- Use Google's [Digital Asset Links API](https://developers.google.com/digital-asset-links/tools/generator) to validate
- Test on a real Android device — the TWA should launch without the browser URL bar

### 3.4 TWA Configuration Values

```
packageId:            com.cmgroups.shopnow
appName:              CMGROUPS - Technology, Services & Education
launcherName:         CMGROUPS         (8 chars, fits launcher)
startUrl:             /
themeColor:           #e91e63          (primary from tailwind.config.js)
backgroundColor:      #EAEDED          (page-bg from tailwind.config.js)
iconUrl:              https://cmgroups.vercel.app/icons/icon-512x512.png
maskableIconUrl:      https://cmgroups.vercel.app/icons/icon-512x512-maskable.png
display:              standalone
orientation:          portrait
enableNotifications:  true
splashScreenFadeOutDuration: 300
fallbackType:         customtabs       (falls back to Chrome Custom Tab if TWA
                                        validation fails, rather than a WebView)
```

### 3.5 Signing Keystore Plan

**Generate the keystore:**

```bash
keytool -genkeypair -v \
  -keystore cmgroups-upload-key.jks \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -alias cmgroups-upload \
  -dname "CN=CMGROUPS, O=CMGROUPS, L=City, ST=State, C=IN"
```

**Values:**

- Alias: `cmgroups-upload`
- Organization: `CMGROUPS` (or the registered company name)
- Validity: 10,000 days (~27 years)
- Algorithm: RSA 2048-bit

**Storage:**

- MUST NOT be committed to git — add `*.jks` and `*.keystore` to `.gitignore`
- Store the keystore file and passwords in a secure location (e.g., 1Password, Google Cloud KMS, or a secure company drive)
- Keep a backup in a second secure location

**If the keystore is lost:**

- If using Google Play App Signing (recommended): you lose the ability to upload new versions BUT Google still has the signing key. You can request an upload key reset through Play Console support.
- If NOT using Play App Signing: the app is permanently unupdatable. A new listing with a new package name would be required.

**Google Play App Signing (RECOMMENDED):**

- Enabled during first AAB upload to Play Console
- Google manages the actual signing key; you only manage the upload key
- Provides key rotation, key recovery, and optimized APK delivery
- The SHA-256 fingerprint from Google's signing key must also go into `assetlinks.json`

**Get the SHA-256 fingerprint for assetlinks.json:**

```bash
keytool -list -v -keystore cmgroups-upload-key.jks -alias cmgroups-upload | grep SHA256
```

---

## SECTION 4 — PLAY STORE SUBMISSION PLAN

### 4.1 Account Requirements

- **Google Play Developer Account:** $25 one-time registration fee
- **Developer name:** The name shown publicly on Play Store (e.g., "CMGROUPS" or registered business name)
- **Privacy policy URL:** REQUIRED by Play Store — currently MISSING. The Footer in [Footer.jsx](frontend/src/components/layout/Footer.jsx) has a placeholder `href="#"` link. A real privacy policy page must be created at a route like `/privacy-policy` and deployed before submission.
- **Content rating:** Must complete the IARC questionnaire in Play Console (covers age ratings). For an e-commerce app with no user-generated content or violent content, it will likely receive an "Everyone" rating.
- **Target audience:** Must declare the app is NOT directed at children (to avoid COPPA compliance requirements)

### 4.2 Store Listing Assets Required


| Asset                             | Size/Spec                     | Exists? | Action                                                                |
| --------------------------------- | ----------------------------- | ------- | --------------------------------------------------------------------- |
| App icon (Play Store)             | 512x512 PNG, 32-bit, no alpha | No      | Generate from source icon (remove transparency, add solid background) |
| Feature graphic                   | 1024x500 PNG or JPG           | No      | Design — hero image with CMGROUPS branding, product imagery           |
| Phone screenshots (min 2, max 8)  | 320-3840px, 16:9 or 9:16      | No      | Capture from deployed site on mobile viewport                         |
| 7" tablet screenshots (optional)  | 320-3840px                    | No      | Capture if tablet layout exists                                       |
| 10" tablet screenshots (optional) | 320-3840px                    | No      | Capture if tablet layout exists                                       |
| Short description                 | Max 80 chars                  | No      | Draft below                                                           |
| Full description                  | Max 4000 chars                | No      | Draft below                                                           |


### 4.3 Store Listing Copy

**Short description (80 chars max):**

> Shop computers, book tech services, and learn with expert courses — all in one app.

**Full description outline:**

1. Opening hook — "CMGROUPS brings technology, services, and education together in one powerful app."
2. Shop section — Browse computers, components, accessories. Compare products, wishlists, cart.
3. Services section — Book computer repair, AMC, installation services with real-time slot booking and OTP verification.
4. Courses section — Enroll in Tally ERP, computer courses with certificates.
5. Features list — Order tracking, referral rewards, push notifications, offline browsing.
6. Trust signals — Secure checkout, verified technicians, quality guarantee.

**Screenshots to capture (in order of listing impact):**

1. Homepage with hero banner and product grid
2. Product listing page with filters
3. Product detail page with reviews
4. Cart page with items
5. Course catalog
6. Service booking page
7. Order tracking / dashboard
8. Tally ERP page

### 4.4 Release Track Sequence

```
1. Internal Testing  (1-5 testers, immediate publishing)
   - Verify TWA opens without URL bar
   - Verify assetlinks.json validation
   - Test all critical flows: browse, add to cart, checkout
   - Test offline behavior
   - Test push notifications
   - Test deep links / shortcuts

2. Closed Testing   (up to 100 testers via email list)
   - Broader device testing (various Android versions 7.0+)
   - Test on slow networks
   - Verify Lighthouse PWA score
   - Collect crash reports from Play Console
   - Fix any issues found
   - Duration: 3-5 days minimum

3. Open Testing     (anyone can join via link)
   - Public beta for real-world usage patterns
   - Monitor ANR rates, crash rates in Play Console
   - Google requires 20+ testers for 14+ days to qualify for production
   - Duration: 14 days minimum

4. Production       (public on Play Store)
   - Staged rollout: 10% → 25% → 50% → 100%
   - Monitor reviews and crash dashboard
   - Keep update cadence aligned with web deployments
```

---

## SECTION 5 — iOS PWA PLAN

### 5.1 iOS-Specific Meta Tags

Currently missing from [frontend/index.html](frontend/index.html). The following must be added to `<head>`:

```html
<!-- iOS PWA meta tags -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="CMGROUPS" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />

<!-- iOS splash screens (generated for common device sizes) -->
<link rel="apple-touch-startup-image"
      href="/icons/apple-splash-1170x2532.png"
      media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
<link rel="apple-touch-startup-image"
      href="/icons/apple-splash-1284x2778.png"
      media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
<!-- Additional splash sizes for iPad and older iPhones -->

<!-- General PWA meta tags also needed -->
<meta name="theme-color" content="#e91e63" />
<meta name="description" content="CMGROUPS - Shop computers, book tech services, and learn with expert courses." />
<link rel="manifest" href="/manifest.webmanifest" />
```

Note: `vite-plugin-pwa` can auto-inject several of these tags, but Apple-specific tags often need manual addition.

### 5.2 iOS Install Banner Component

Create a component `IOSInstallPrompt` that:

- **Detection logic:**
  - Check `navigator.userAgent` for `iPhone` or `iPad` AND not `CriOS` (Chrome) or `FxiOS` (Firefox)
  - Check `window.navigator.standalone !== true` (not already installed)
  - Check `!window.matchMedia('(display-mode: standalone)').matches`
- **Display trigger:**
  - Show on the user's second visit (track visit count in localStorage)
  - OR after 45 seconds on first visit
- **UI:**
  - Bottom sheet overlay matching existing design system
  - CMGROUPS logo at top
  - "Add CMGROUPS to your Home Screen" heading
  - Step 1: "Tap" + [Share icon SVG] + "at the bottom of Safari"
  - Step 2: "Scroll down and tap 'Add to Home Screen'"
  - "Got it" dismiss button (primary color `#e91e63`)
- **Dismiss behavior:**
  - On dismiss, save timestamp to localStorage
  - Don't show again for 14 days
  - After 3 total dismissals, stop showing permanently

### 5.3 iOS Limitations for CMGROUPS


| Feature             | Works on iOS PWA? | Notes                                                                                                          |
| ------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Push notifications  | Yes (iOS 16.4+)   | Requires Web Push API; user must grant permission within the installed PWA                                     |
| Offline mode        | Yes               | Via service worker (same as all platforms)                                                                     |
| Add to Home Screen  | Yes (manual)      | No automatic install prompt — requires the iOS banner component above                                          |
| Camera access       | Yes               | WebRTC / `<input type="file" capture>` both work                                                               |
| Background sync     | No                | iOS kills service workers aggressively; background sync unreliable                                             |
| Badging API         | Yes (iOS 16.4+)   | Can show notification badge on home screen icon                                                                |
| Full-screen display | Yes               | `standalone` display mode hides Safari chrome                                                                  |
| Payment APIs        | Partial           | Apple Pay via Payment Request API works; other payment providers depend on implementation                      |
| Persistent storage  | Limited           | iOS may evict service worker cache after 7 days without use; `navigator.storage.persist()` not fully supported |
| Splash screen       | Yes               | Via `apple-touch-startup-image` meta tags                                                                      |


---

## SECTION 6 — IMPLEMENTATION ORDER

### Week 1 — PWA Foundation

- Owner provides source icon (1024x1024+ PNG)
- Owner confirms canonical app name (CMGROUPS vs TechNova)
- Install `vite-plugin-pwa` and configure in [vite.config.js](frontend/vite.config.js)
- Configure web app manifest with all fields from Section 2.2
- Generate all icon sizes (192, 512, 512 maskable, 180 apple-touch, etc.) and place in `frontend/public/icons/`
- Implement service worker caching strategies from Section 2.3
- Create offline fallback page
- Add all iOS meta tags to [index.html](frontend/index.html)
- Add `<meta name="theme-color">` and `<meta name="description">`
- Add `<link rel="manifest">` (auto-handled by vite-plugin-pwa)
- Deploy to Vercel and run Lighthouse PWA audit
- Fix any Lighthouse failures until score >= 90

### Week 2 — Install Prompts + Privacy Policy + TWA Build

- Build `useInstallPrompt` hook for `beforeinstallprompt` (Android + Desktop)
- Build `IOSInstallPrompt` component
- Create Privacy Policy page at `/privacy-policy` route (required for Play Store)
- Create Terms of Service page (recommended)
- Install Bubblewrap CLI globally
- Generate TWA project from deployed PWA URL
- Generate signing keystore, store securely
- Create `assetlinks.json` with upload key fingerprint
- Deploy `assetlinks.json` to `frontend/public/.well-known/`
- Verify asset links with Google's validation tool
- Build AAB (Android App Bundle) with Bubblewrap

### Week 3 — Play Store Submission

- Create / access Google Play Developer account ($25)
- Create app listing in Play Console
- Design and upload feature graphic (1024x500)
- Capture and upload phone screenshots (min 4 recommended)
- Write store listing copy (short + full description)
- Complete content rating questionnaire
- Set up pricing (Free)
- Enable Google Play App Signing
- Upload AAB to Internal Testing track
- Add `assetlinks.json` with Google's Play App Signing fingerprint
- Re-deploy frontend with updated `assetlinks.json`
- Test TWA on 2-3 real devices

### Week 4 — Testing and Launch

- Promote to Closed Testing, invite 10+ testers
- Test on multiple Android versions (7.0, 10, 12, 13, 14)
- Test offline scenarios on real devices
- Test push notifications flow
- Fix any issues from tester feedback
- Promote to Open Testing (if time allows, otherwise straight to Production with staged rollout)
- Monitor Play Console dashboard for ANRs/crashes
- Production release with 10% staged rollout
- Expand to 100% after 2-3 days of clean metrics

---

## SECTION 7 — RISK REGISTER


| Risk                                              | Likelihood               | Impact                                              | Mitigation                                                                                                                                                                                            |
| ------------------------------------------------- | ------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lighthouse PWA score below 80**                 | Medium                   | High — blocks TWA acceptance                        | Run Lighthouse iteratively during Week 1; fix each failing audit. Common issues: no manifest, no SW, no offline, missing icons. All addressed in this plan.                                           |
| **Keystore loss**                                 | Low                      | Critical — cannot update app on Play Store          | Use Google Play App Signing (key recovery possible). Store keystore + passwords in 2 secure locations. Document credentials in team vault.                                                            |
| **assetlinks.json mismatch**                      | Medium                   | High — TWA shows browser URL bar (not trusted)      | Test with asset links validator tool BEFORE publishing. Include BOTH upload key and Play App Signing fingerprints. Redeploy immediately if fingerprint changes.                                       |
| **Capacitor conflict with TWA**                   | Medium                   | Medium — two Android projects with same package ID  | Keep TWA project in separate directory (`twa-android/`). Use TWA for Play Store distribution only. Do NOT publish the Capacitor APK to Play Store. Consider migrating push to Web Push API long-term. |
| **Vercel rewrite intercepts .well-known**         | Low                      | High — assetlinks.json returns HTML instead of JSON | Vercel serves static files before rewrites by default. Verify `Content-Type: application/json` after deployment. If needed, add explicit rewrite exclusion in [vercel.json](frontend/vercel.json).    |
| **Icon not provided / wrong format**              | Medium                   | Medium — blocks entire plan                         | Request 1024x1024 PNG from owner in Week 1 kickoff. Provide exact specs. Offer to generate a temporary icon from CMGROUPS text if needed.                                                             |
| **App name inconsistency (CMGROUPS vs technova)** | High                     | Low-Medium — confusing branding on Play Store       | Resolve in Section 8 questions. Must be consistent across manifest, Play Store listing, and Capacitor config.                                                                                         |
| **No privacy policy**                             | High (currently missing) | Critical — Play Store rejects without one           | Create privacy policy page before submission. Can use a generator initially, but should be reviewed by legal.                                                                                         |
| **iOS cache eviction**                            | Medium                   | Low — minor UX degradation                          | Service worker re-registers on next visit. Inform users via offline fallback that cached data may need to reload.                                                                                     |
| **Web Push not working on older iOS**             | Medium                   | Low — affects iOS < 16.4                            | Fall back to in-app notification center (already exists via `notificationsAPI`). Show banner only on supported iOS versions.                                                                          |


---

## SECTION 8 — QUESTIONS FOR THE OWNER

1. **What is the canonical app name — "CMGROUPS" or "TechNova"?** — Needed for manifest `name`, `short_name`, Play Store listing, and all branding. Currently inconsistent: web UI says "CMGROUPS", Capacitor config says "technova".
2. **Can you provide a source icon/logo as a 1024x1024 (or larger) PNG with transparency?** — Needed to generate ALL required icon sizes (192, 512, maskable, apple-touch, Play Store). Currently NO app icons exist in the project.
3. **Is the deployed URL `https://cmgroups.vercel.app/` the final production domain, or will there be a custom domain (e.g., `cmgroups.com`)?** — Needed for `assetlinks.json`, manifest `start_url`/`scope`, and Play Store listing. TWA is domain-locked — changing the domain later requires updating assetlinks and re-signing.
4. **Do you have a Google Play Developer account, or should one be created?** — Needed for Play Store submission ($25 one-time fee). Blocks Week 3 entirely.
5. **What company/developer name should appear on the Play Store listing?** — Needed for store listing and keystore generation. Should match legal business name if applicable.
6. **Do you have a privacy policy document/text?** — Needed for the privacy policy page (Play Store REQUIRES a privacy policy URL). If not, we'll need to draft one covering: data collected (via Clerk auth), payment handling, cookies, and push notification consent.
7. **Should the existing Capacitor Android project be kept alongside the TWA, or should we migrate entirely to TWA?** — Needed to decide the relationship between `frontend/android/` (Capacitor) and the new TWA project. If push notifications are the only reason for Capacitor, we could migrate to Web Push API and go TWA-only, simplifying the Android story.
8. **What is the backend deployment URL?** — Needed to confirm the `VITE_API_URL` value for production. The service worker caching strategies need to know the API origin to apply correct routing rules.
9. **Are there any specific pages/features that must work fully offline (e.g., viewing previously browsed products)?** — Needed to calibrate the caching aggressiveness. More offline capability means more storage usage on user devices.
10. **Do you want push notifications to work via the web (Web Push API) or continue using Capacitor/Firebase native push only?** — Needed for service worker configuration. Web Push enables notifications for PWA users on all platforms (including iOS 16.4+); Capacitor push only works inside the native wrapper.

