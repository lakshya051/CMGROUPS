# TECHNOVA_BUGS.md

## CRITICAL BUGS
- **Inventory Race Condition**: In `backend/routes/shop/checkout.js`, stock deduction for product variants happens sequentially. High concurrent orders could lead to overselling if multiple users checkout the last item simultaneously.
- **Referral Point Double-Counting**: In `backend/cron/referrals.js`, the logic for processing pending referrals lacks a transaction lock. If the cron runs twice or overlaps, it might credit the same referral multiple times.
- **OTP Verification Bypass**: In `backend/routes/user/auth.js` (or similar registration flows), if the `isVerified` flag is manually toggled or defaulted incorrectly in `Clerk` webhooks, users can access protected features without a valid phone number.
- **Certificate Generation Failure**: In `backend/utils/certificateGenerator.js`, if the fonts or template images are missing on the production server, the entire course completion flow crashes without a fallback.

## LOGICAL ERRORS
- **Stale Cache on Deletion**: `backend/utils/cache.js` invalidates cache on updates but doesn't consistently clear all related category/product lists when a single product is deleted, leading to 404s for users clicking cached items.
- **Hardcoded Referral Thresholds**: Several files (e.g., `UserReferrals.jsx`, `UserCourses.jsx`) have hardcoded point values that don't match the dynamic settings in `AdminReferralSettings.jsx`.
- **Discount Calculation Precision**: In `frontend/src/pages/shop/Cart.jsx`, percentage-based coupon discounts use `Math.round()` which can lead to 1-rupee discrepancies between the frontend display and the backend's strict decimal billing.
- **Broken Return Window Logic**: `backend/routes/shop/orders.js` uses a global default for return windows even though the schema supports per-product windows. Products marked as "Non-Returnable" still show "Return" options if the order is within the global 7-day limit.

## SECURITY VULNERABILITIES
- **JWT Secret Fallback**: `backend/middleware/auth.js` contains a hardcoded fallback string for `JWT_SECRET`. If the `.env` variable is missing in production, the system uses a guessable default.
- **IDOR in Review Deletion**: In `backend/routes/shop/reviews.js`, the delete endpoint checks if the user is logged in but doesn't strictly verify if the `reviewId` belongs to the `userId` requesting the deletion (allows deleting others' reviews).
- **Missing Rate Limiting**: The `/api/user/auth/send-otp` and `/api/user/auth/login` endpoints have no rate limiting, making them vulnerable to brute-force and SMS bombing attacks.
- **Clerk Webhook Validation**: While a secret is defined, the webhook handler in `backend/app.js` (or dedicated route) lacks robust signature verification, allowing potential spoofing of user creation events.

## UI/UX ISSUES
- **Onboarding Redirect Loop**: In `frontend/src/components/OnboardingGuard.jsx`, if a user skips onboarding, they are redirected to `/onboarding`. If they navigate back, they may get stuck in a loop if the `localStorage` or `Clerk` metadata hasn't synced.
- **Mobile Table Overflow**: Admin pages like `AdminOrders.jsx` and `AdminUsers.jsx` use wide tables that overflow horizontally on mobile devices without proper scroll indicators or card-view fallbacks.
- **Cart Consistency**: Adding a product to the cart from `ProductDetail.jsx` doesn't always reflect immediately in the `Navbar.jsx` badge unless a full page refresh occurs (State sync issue between Context and LocalStorage).
- **Missing Loading States**: Several "Submit" buttons (e.g., Tally Enquiry, Service Booking) don't disable or show a spinner during the API request, leading to double-submissions.

## DEBT & CLEANUP
- **Dead Code in Admin**: `AdminProducts.jsx` contains over 100 lines of commented-out legacy variant handling logic.
- **Hardcoded API URLs**: Some frontend components still reference `localhost:5000` instead of the `VITE_API_URL` environment variable.
- **Inconsistent Naming**: The database uses `walletPoints` in some places and `loyaltyPoints` in others, causing confusion in the referral rewarding logic.
- **Console Logs**: Production-level files are cluttered with `console.log` statements containing sensitive user data (emails, IDs).
