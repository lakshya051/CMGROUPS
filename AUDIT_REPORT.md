# COMPREHENSIVE AUDIT REPORT
## Tech Store + Computer Education Institute Website

**Date:** February 22, 2026  
**Auditor:** Senior Full-Stack Developer & Product Architect

---

### 💳 PAYMENT APPROACH (CURRENT)

**Payments remain Pay at Store and Pay on Delivery (COD) only.**  
Cashfree / online gateway integration is **not** in scope for now. Referral points will be credited when **admin verifies payment** (existing OTP verification flow), not at order creation.

---

## WHAT IS ALREADY DONE ✅

The following features are **fully implemented and working correctly**. These should **NOT** be touched unless there is a critical security vulnerability:

1. **Custom JWT Authentication**
   - Email + password login ✅
   - Role-based middleware (`protect` + `adminOnly`) ✅
   - Token generation and verification ✅
   - User profile update endpoint ✅

2. **User Dashboard**
   - Order stats (total spent, total orders) ✅
   - Recent orders display ✅
   - Separate screens for orders (`/dashboard/orders`) ✅
   - Service bookings screen (`/dashboard/services`) ✅
   - Course applications screen (`/dashboard/courses`) ✅
   - Referrals screen (`/dashboard/referrals`) ✅
   - Profile/settings screen (`/dashboard/settings`) ✅

3. **Product Management**
   - Product listing with pagination ✅
   - Search functionality ✅
   - Category filters ✅
   - Price range filters ✅
   - Sorting (price asc/desc, rating) ✅
   - Product detail pages ✅
   - Product reviews system ✅

4. **Shopping Features**
   - Wishlist (localStorage-based) ✅
   - Shopping cart with add/remove/update ✅
   - Coupon code validation ✅
   - GST calculation (18%) at checkout ✅
   - Cart persistence ✅

5. **Service/Repair Booking**
   - Service booking form with OTP-based pickup ✅
   - Full status timeline (Pending → Confirmed → Picked Up → In Progress → Completed → Delivered / Cancelled) ✅
   - Admin management endpoints ✅
   - OTP verification for pickup ✅
   - Service type management ✅

6. **Course Management**
   - Course catalog listing ✅
   - Course detail pages with full information ✅
   - Course application form ✅
   - Application API with admin approval ✅
   - Enrollment record creation on approval ✅

7. **Referral System Core**
   - Unique referral code generation per user ✅
   - Referral code stored in database ✅
   - Referral stats screen ✅
   - Wallet balance stored in database ✅
   - Referral records tracking ✅

8. **Admin Panel**
   - User management endpoints ✅
   - Product CRUD operations ✅
   - Category management ✅
   - Service type management ✅
   - Order management ✅
   - Coupon management ✅
   - Referral listing ✅
   - Basic analytics dashboard ✅

9. **Notifications Backend**
   - Notification model in database ✅
   - `/api/notifications` routes for listing ✅
   - Mark as read functionality ✅
   - Mark all as read ✅

10. **UI/UX**
    - Responsive Tailwind-based design ✅
    - Modern glass-panel UI components ✅
    - Consistent design system ✅
    - Mobile-friendly layouts ✅

---

## AUDIT REPORT

| Feature Area | Status | Notes |
|-------------|--------|-------|
| **Phone OTP verification at registration via Fast2SMS** | ❌ | **NOT IMPLEMENTED** - Registration creates user immediately without OTP verification. This violates the business rule that phone verification is compulsory. |
| **Email verification via Nodemailer** | ❌ | **NOT IMPLEMENTED** - No email verification system exists. Should be optional and non-blocking. |
| **Email + password login** | ✅ | **WORKING** - Implemented correctly in `/api/auth/login` |
| **Phone + OTP login** | ❌ | **NOT IMPLEMENTED** - Only email/phone + password login exists. Phone + OTP login flow is missing. |
| **User roles (admin vs normal user)** | ✅ | **WORKING** - Role field in User model, `adminOnly` middleware working |
| **User dashboard (orders, services, courses, points, profile)** | ✅ | **WORKING** - All screens implemented and functional |
| **Product listing, search, filters, categories** | ✅ | **WORKING** - All filtering and search features functional |
| **Second-hand product listing with condition tags** | ❌ | **NOT IMPLEMENTED** - No distinction between new and second-hand products. No condition field in Product model. |
| **Custom PC Builder tool** | ❌ | **NOT IMPLEMENTED** - No PC builder interface or backend logic exists |
| **Wishlist and Cart** | ✅ | **WORKING** - Wishlist (localStorage) and Cart fully functional |
| **Service/repair booking with ticket system** | ✅ | **WORKING** - Full booking system with status tracking implemented |
| **Course listing with full details** | ✅ | **WORKING** - Course catalog with syllabus, fees, batches, certificates (stored in JSON fields) |
| **Course enrollment with fee payment** | ⚠️ | **PARTIAL** - Application exists, but no payment integration for course fees |
| **Student dashboard (attendance, materials, certificate download)** | ❌ | **NOT IMPLEMENTED** - No student-specific dashboard features. Only course applications view exists. |
| **Payment (Pay at Store / COD)** | ✅ | **KEPT AS-IS** - Pay at store and Pay on Delivery only. Cashfree not added. |
| **Cashfree payment integration** | ⏸️ | **DEFERRED** - Not implementing now. Keep current payment methods. |
| **Referral system (unique code, points on purchase)** | ⚠️ | **PARTIAL** - Unique code ✅, but points logic is **WRONG** - credits at order creation instead of when payment is verified. |
| **Referral points on payment verification** | ❌ | **WRONG** - Points credited at order creation. Should credit only when admin verifies payment (OTP). |
| **Both referrer and buyer receive points** | ❌ | **NOT IMPLEMENTED** - Only referrer gets points. Buyer should also receive points (when payment verified). |
| **Admin panel (products, orders, services, courses, users)** | ✅ | **WORKING** - All admin endpoints functional |
| **Admin referral settings (points per category, point-to-rupee rate, point expiry, tier toggle)** | ❌ | **NOT IMPLEMENTED** - No admin settings page. Reward amounts are hardcoded (₹200). |
| **Tier system infrastructure** | ❌ | **NOT IMPLEMENTED** - No tier system in database or admin panel |
| **GST invoice generation as downloadable PDF** | ❌ | **NOT IMPLEMENTED** - No PDF generation library or invoice endpoint |
| **Fast2SMS transactional SMS notifications** | ❌ | **NOT IMPLEMENTED** - No Fast2SMS integration anywhere |
| **In-app notifications in user dashboard** | ✅ | **WORKING** - Backend exists, frontend display needs verification |
| **SEO setup (meta tags, local SEO, sitemap)** | ❌ | **NOT IMPLEMENTED** - No meta tags, no sitemap, no SEO optimization |
| **Analytics dashboard in admin** | ⚠️ | **PARTIAL** - Basic stats exist (`/api/admin/stats`) but not comprehensive analytics |
| **Responsive design** | ✅ | **WORKING** - Tailwind responsive classes used throughout |

---

## ISSUES AND FIXES

### 🔴 CRITICAL ISSUE #1: Phone OTP Verification Missing at Registration

**What is wrong:**
- Registration endpoint (`/api/auth/register`) creates user immediately without phone OTP verification
- User account is activated without verifying phone number
- This violates the core business rule: "Phone number verification via Fast2SMS OTP is compulsory at registration"

**Correct Implementation:**
1. User submits registration form with name, email, phone, password
2. Backend generates 6-digit OTP and sends via Fast2SMS
3. Store OTP and expiry in User model (`otp` and `otpExpires` fields exist but unused)
4. User account is created with `isVerified: false`
5. User must verify OTP before account is activated
6. Only after OTP verification, set `isVerified: true` and allow login

**Files to Change:**
- `backend/src/routes/auth.js` - Modify `/register` endpoint
- Create `backend/src/utils/fast2sms.js` - Fast2SMS integration
- `backend/src/routes/auth.js` - Add `/verify-phone-otp` endpoint
- `frontend/src/pages/Signup.jsx` - Add OTP verification step in UI
- `backend/src/middleware/auth.js` - Optionally block unverified users from certain actions

**Dependencies:**
- Install `fast2sms` npm package or use HTTP API
- Add `FAST2SMS_API_KEY` to `.env`

---

### 🔴 CRITICAL ISSUE #2: Referral Points Credited at Wrong Time

**What is wrong:**
- In `backend/src/routes/orders.js` lines 85-114, referral rewards are credited immediately when order is created
- Points should be credited only **after payment is confirmed** (admin verifies via OTP for pay-at-store/COD)

**Current Code (WRONG):**
```javascript
// *** ORDER-BASED REFERRAL REWARD ***
if (referrer) {
    // Credits wallet immediately - WRONG!
    await prisma.user.update({
        where: { id: referrer.id },
        data: { walletBalance: { increment: rewardAmount } }
    });
}
```

**Correct Implementation (Pay at Store / COD only, no Cashfree):**
1. When order is created, store referral code in order (e.g. add `referralCodeUsed` or use existing referral link) but **DO NOT credit points**
2. Create referral record with status "pending" (optional, or track via order)
3. When **admin verifies payment** via existing `POST /api/orders/:id/verify-payment` (OTP), then:
   - Credit points to **both** referrer and buyer
   - Update referral record status to "rewarded"

**Files to Change:**
- `backend/src/routes/orders.js` - Remove immediate credit logic (lines 85-114)
- `backend/src/routes/orders.js` - Store referral code on order (add `referralCodeUsed` field if not present)
- `backend/src/routes/orders.js` - In **verify-payment** handler: add referral credit logic (both referrer and buyer) when marking order as paid

---

### 🔴 CRITICAL ISSUE #3: Only Referrer Gets Points, Buyer Should Also Get Points

**What is wrong:**
- Current implementation only credits the referrer (person whose code was used)
- Business rule: "Referral points are credited to BOTH the referrer and the buyer"

**Correct Implementation:**
- When **admin verifies payment** (OTP) for an order that had a referral code:
  1. Credit points to referrer (person whose code was used)
  2. Credit points to buyer (person who made the purchase)
  3. Create/update referral record(s) and mark as "rewarded"

**Files to Change:**
- `backend/src/routes/orders.js` - In verify-payment handler: credit both referrer and buyer (use configurable reward amount; see admin referral settings)

---

### ⏸️ DEFERRED: Cashfree Payment Integration (Not in scope)

**Decision:** Keep **Pay at Store** and **Pay on Delivery (COD)** only. Do not add Cashfree or any online gateway for now. If you add Cashfree later, referral points would then be triggered by the payment webhook instead of admin OTP verification.

---

### 🔴 CRITICAL ISSUE #4: Firebase Integration Exists (Should Be Removed)

**What is wrong:**
- Firebase Admin SDK is initialized in `backend/src/lib/firebaseAdmin.js`
- Firebase client is initialized in `frontend/src/lib/firebase.js`
- `/api/auth/firebase-login` endpoint exists
- Business rules explicitly state: "No Firebase anywhere"

**Correct Implementation:**
- Remove all Firebase code
- Remove Firebase login endpoint
- Remove Firebase dependencies from package.json

**Files to Delete/Change:**
- Delete `backend/src/lib/firebaseAdmin.js`
- Delete `frontend/src/lib/firebase.js`
- `backend/src/routes/auth.js` - Remove `/firebase-login` endpoint (lines 79-162)
- `backend/package.json` - Remove `firebase-admin` dependency
- `frontend/package.json` - Remove Firebase client dependencies

---

### ⚠️ ISSUE #6: Phone + OTP Login Missing

**What is wrong:**
- Login page has UI toggle for email/phone but both require password
- No phone + OTP login flow exists

**Correct Implementation:**
1. User enters phone number
2. Backend sends OTP via Fast2SMS
3. User enters OTP
4. Backend verifies OTP and logs user in

**Files to Change:**
- `backend/src/routes/auth.js` - Add `/login-phone-otp` endpoint (send OTP)
- `backend/src/routes/auth.js` - Add `/verify-login-otp` endpoint (verify and login)
- `frontend/src/pages/Login.jsx` - Add OTP input step when phone method selected

---

### ⚠️ ISSUE #7: Email Verification Missing

**What is wrong:**
- No email verification system exists
- Business rule states email verification should be optional and non-blocking

**Correct Implementation:**
1. After registration, optionally send verification email via Nodemailer
2. User can verify email from dashboard anytime
3. Email verification does not block login or registration

**Files to Create/Change:**
- Create `backend/src/utils/nodemailer.js` - Email service
- `backend/src/routes/auth.js` - Add `/send-verification-email` endpoint
- `backend/src/routes/auth.js` - Add `/verify-email` endpoint
- `frontend/src/pages/dashboard/UserSettings.jsx` - Add email verification button

**Dependencies:**
- Install `nodemailer`
- Add Gmail SMTP credentials to `.env`

---

### ⚠️ ISSUE #8: Referral Reward Amounts Hardcoded

**What is wrong:**
- Reward amount is hardcoded as ₹200 in multiple places:
  - `backend/src/routes/orders.js` line 89: `const rewardAmount = 200;`
  - `backend/src/routes/referrals.js` line 7: `const REFERRAL_REWARD = 200;`
- Business rule states: "Referral reward amounts per category must be configurable from admin panel"

**Correct Implementation:**
1. Create `ReferralSettings` model in database:
   - `pointsPerProductPurchase` (Float)
   - `pointsPerServiceBooking` (Float)
   - `pointsPerCourseEnrollment` (Float)
   - `pointToRupeeRate` (Float, e.g., 100 points = ₹10)
   - `pointExpiryDays` (Int, nullable)
   - `tierSystemEnabled` (Boolean, default: false)
2. Create admin settings page to configure these values
3. Use these values when crediting points

**Files to Create/Change:**
- `backend/prisma/schema.prisma` - Add `ReferralSettings` model
- Create `backend/src/routes/admin.js` - Add referral settings endpoints
- Create `frontend/src/pages/admin/AdminReferralSettings.jsx` - Admin UI
- `backend/src/routes/payments.js` - Use configurable values instead of hardcoded

---

### ⚠️ ISSUE #9: Tier System Infrastructure Missing

**What is wrong:**
- No tier system exists in database
- Business rule states tier system must exist but be OFF by default

**Correct Implementation:**
1. Add tier fields to User model:
   - `tier` (String: "Bronze", "Silver", "Gold", "Platinum")
   - `tierPoints` (Float - points accumulated for tier)
2. Add `TierConfig` model:
   - `tierName` (String)
   - `minPoints` (Float)
   - `benefits` (Json)
3. Add admin toggle to enable/disable tier system
4. When enabled, calculate tier based on points and apply benefits

**Files to Create/Change:**
- `backend/prisma/schema.prisma` - Add tier fields and TierConfig model
- `backend/src/routes/admin.js` - Add tier system toggle endpoint
- Create migration for tier fields

---

### ⚠️ ISSUE #10: GST Invoice PDF Generation Missing

**What is wrong:**
- No invoice generation system exists
- Business rule requires downloadable GST invoice PDF

**Correct Implementation:**
1. Install PDF generation library (`pdfkit` or `puppeteer` or `jspdf`)
2. Create invoice template with:
   - Company details
   - Customer details
   - Order items with GST breakdown
   - Total amount
   - GST number
   - Invoice number
3. Create endpoint `/api/orders/:id/invoice` to generate and download PDF

**Files to Create/Change:**
- Create `backend/src/utils/invoiceGenerator.js` - PDF generation
- `backend/src/routes/orders.js` - Add `/api/orders/:id/invoice` endpoint
- `frontend/src/pages/dashboard/UserOrders.jsx` - Add "Download Invoice" button

**Dependencies:**
- Install `pdfkit` or similar PDF library

---

### ⚠️ ISSUE #11: Fast2SMS Integration Missing

**What is wrong:**
- No Fast2SMS integration exists
- Business rule requires SMS OTP and transactional SMS via Fast2SMS

**Correct Implementation:**
1. Create Fast2SMS utility
2. Send OTP during registration
3. Send OTP for phone login
4. Send transactional SMS for:
   - Order confirmation
   - Service booking confirmation
   - Payment confirmation
   - Order status updates

**Files to Create:**
- Create `backend/src/utils/fast2sms.js` - Fast2SMS API wrapper
- Use in auth routes, order routes, service routes

**Dependencies:**
- Use Fast2SMS HTTP API or npm package
- Add `FAST2SMS_API_KEY` to `.env`

---

### ⚠️ ISSUE #12: Student Dashboard Features Missing

**What is wrong:**
- No attendance tracking
- No course materials access
- No certificate download functionality

**Correct Implementation:**
1. Add `Attendance` model:
   - `enrollmentId`, `date`, `status` (Present/Absent)
2. Add course materials to Course model or separate `CourseMaterial` model
3. Add certificate generation/download endpoint
4. Create student dashboard with:
   - Attendance calendar
   - Materials download section
   - Certificate download button

**Files to Create/Change:**
- `backend/prisma/schema.prisma` - Add Attendance and CourseMaterial models
- Create `backend/src/routes/attendance.js` - Attendance endpoints
- Create `backend/src/routes/materials.js` - Materials endpoints
- Create `backend/src/routes/certificates.js` - Certificate generation
- Create `frontend/src/pages/dashboard/StudentDashboard.jsx` - Student view

---

### ⚠️ ISSUE #13: Custom PC Builder Tool Missing

**What is wrong:**
- No PC builder interface exists
- Business requirement: "custom PC builds"

**Correct Implementation:**
1. Create component selector interface
2. Compatibility checking logic
3. Price calculation
4. Save configuration
5. Convert to service booking or product order

**Files to Create:**
- Create `frontend/src/pages/PCBuilder.jsx` - Builder interface
- Create `backend/src/routes/pc-builder.js` - Save/load configurations
- Create compatibility checking utility

**Complexity:** High - Requires component database, compatibility rules, UI builder

---

### ⚠️ ISSUE #14: Second-Hand Products Missing

**What is wrong:**
- No distinction between new and second-hand products
- No condition tags (Excellent, Good, Fair, etc.)

**Correct Implementation:**
1. Add `isSecondHand` (Boolean) to Product model
2. Add `condition` (String: "Excellent", "Good", "Fair", "Poor") to Product model
3. Filter products by condition in listing
4. Display condition badge on product cards

**Files to Change:**
- `backend/prisma/schema.prisma` - Add fields to Product model
- `backend/src/routes/products.js` - Add condition filter
- `frontend/src/components/shop/ProductCard.jsx` - Display condition badge
- `frontend/src/pages/shop/Products.jsx` - Add condition filter UI

---

### ⚠️ ISSUE #15: Course Enrollment Payment Missing

**What is wrong:**
- Course application creates enrollment on admin approval
- No payment tracking for course fees (pay at institute / collect on approval)

**Correct Implementation (no online gateway for now):**
1. When admin approves application, create enrollment as now.
2. Optionally add a "fee received" or "payment status" field so admin can mark when fee is collected at institute.
3. Send enrollment confirmation (email/SMS when implemented).

**Files to Change:**
- `backend/src/routes/applications.js` - Optional: add payment-received flag when admin marks fee collected

---

### ⚠️ ISSUE #16: SEO Setup Missing

**What is wrong:**
- No meta tags in HTML
- No sitemap.xml
- No local SEO optimization
- No structured data

**Correct Implementation:**
1. Add meta tags to all pages (title, description, og tags)
2. Generate sitemap.xml dynamically
3. Add local business schema markup
4. Add product schema markup
5. Add course schema markup

**Files to Create/Change:**
- `frontend/index.html` - Add default meta tags
- Create `frontend/src/components/SEO.jsx` - Dynamic meta tag component
- Create `backend/src/routes/sitemap.js` - Generate sitemap
- Add React Helmet or similar for dynamic meta tags

---

### ⚠️ ISSUE #17: Analytics Dashboard Incomplete

**What is wrong:**
- Basic stats exist but not comprehensive
- No revenue trends, conversion rates, user behavior analytics

**Correct Implementation:**
1. Add more detailed analytics:
   - Revenue trends (daily, weekly, monthly)
   - Product performance
   - Course enrollment trends
   - Referral performance
   - User acquisition sources
   - Conversion funnel

**Files to Change:**
- `backend/src/routes/admin.js` - Enhance `/api/admin/stats` endpoint
- `frontend/src/pages/admin/AdminDashboard.jsx` - Add charts and detailed analytics

---

## IMPLEMENTATION PLAN

### PHASE 1 — CRITICAL (App cannot function without these)

#### 1.1 Phone OTP Verification at Registration
- **What:** Implement Fast2SMS OTP verification before account activation
- **Files:** `backend/src/routes/auth.js`, `backend/src/utils/fast2sms.js`, `frontend/src/pages/Signup.jsx`
- **Dependencies:** Fast2SMS API key
- **Complexity:** Medium
- **Priority:** CRITICAL - Violates core business rule

#### 1.2 Remove Firebase Integration
- **What:** Remove all Firebase code and dependencies
- **Files:** `backend/src/lib/firebaseAdmin.js`, `frontend/src/lib/firebase.js`, `backend/src/routes/auth.js`
- **Dependencies:** None
- **Complexity:** Low
- **Priority:** CRITICAL - Violates business rule

#### 1.3 Fix Referral Points Logic (Pay at Store / COD)
- **What:** Move referral credit from order creation to **admin payment verification** (OTP). When admin marks order as paid via verify-payment, credit points to **both** referrer and buyer.
- **Files:** `backend/src/routes/orders.js` (remove credit at order create; add credit in verify-payment handler)
- **Dependencies:** None (no Cashfree)
- **Complexity:** Medium
- **Priority:** CRITICAL - Ensures points only after payment confirmed

---

### PHASE 2 — CORE FEATURES (Main functionality of both divisions)

#### 2.1 Phone + OTP Login
- **What:** Implement phone number + OTP login flow
- **Files:** `backend/src/routes/auth.js`, `frontend/src/pages/Login.jsx`
- **Dependencies:** Fast2SMS (Phase 1.1)
- **Complexity:** Medium
- **Priority:** High

#### 2.2 Email Verification (Optional)
- **What:** Implement optional email verification via Nodemailer
- **Files:** `backend/src/utils/nodemailer.js`, `backend/src/routes/auth.js`, `frontend/src/pages/dashboard/UserSettings.jsx`
- **Dependencies:** Nodemailer, Gmail SMTP credentials
- **Complexity:** Low
- **Priority:** Medium

#### 2.3 Fast2SMS Transactional SMS
- **What:** Send SMS notifications for orders, services, payments
- **Files:** `backend/src/utils/fast2sms.js`, Use in order/service routes
- **Dependencies:** Fast2SMS API key
- **Complexity:** Low
- **Priority:** High

#### 2.4 Nodemailer Email Notifications
- **What:** Send email notifications for key events
- **Files:** `backend/src/utils/nodemailer.js`, Use in order/service routes
- **Dependencies:** Nodemailer, Gmail SMTP
- **Complexity:** Low
- **Priority:** Medium

#### 2.5 Course Enrollment Payment
- **What:** Course fee payment flow (e.g. pay at institute / collect on approval). No online gateway for now.
- **Files:** `backend/src/routes/applications.js` (optional: record payment status when admin marks fee received)
- **Dependencies:** None (Cashfree deferred)
- **Complexity:** Low–Medium
- **Priority:** Medium

---

### PHASE 3 — BUSINESS LOGIC (Referral, points, admin settings)

#### 3.1 Admin Referral Settings
- **What:** Create admin panel to configure referral reward amounts per category
- **Files:** `backend/prisma/schema.prisma` (ReferralSettings model), `backend/src/routes/admin.js`, `frontend/src/pages/admin/AdminReferralSettings.jsx`
- **Dependencies:** None
- **Complexity:** Medium
- **Priority:** High

#### 3.2 Tier System Infrastructure
- **What:** Add tier system to database and admin panel (OFF by default)
- **Files:** `backend/prisma/schema.prisma` (tier fields, TierConfig model), `backend/src/routes/admin.js`
- **Dependencies:** None
- **Complexity:** Medium
- **Priority:** Medium

#### 3.3 Referral Points Redemption
- **What:** Allow users to redeem points at checkout (already partially exists, needs enhancement)
- **Files:** `backend/src/routes/referrals.js`, `frontend/src/pages/shop/Checkout.jsx`
- **Dependencies:** Referral settings (3.1)
- **Complexity:** Low
- **Priority:** Medium

---

### PHASE 4 — ADMIN PANEL (Full control and management)

#### 4.1 Enhanced Analytics Dashboard
- **What:** Add comprehensive analytics with charts and trends
- **Files:** `backend/src/routes/admin.js`, `frontend/src/pages/admin/AdminDashboard.jsx`
- **Dependencies:** None
- **Complexity:** Medium
- **Priority:** Medium

#### 4.2 Admin Referral Management UI
- **What:** Create UI for managing referral settings
- **Files:** `frontend/src/pages/admin/AdminReferralSettings.jsx`
- **Dependencies:** Phase 3.1
- **Complexity:** Low
- **Priority:** Medium

---

### PHASE 5 — COMMUNICATION (SMS, email, in-app notifications)

#### 5.1 In-App Notification Frontend
- **What:** Display notifications in user dashboard (backend exists)
- **Files:** `frontend/src/pages/dashboard/UserDashboard.jsx`, Create notification component
- **Dependencies:** None (backend ready)
- **Complexity:** Low
- **Priority:** Medium

#### 5.2 Notification Triggers
- **What:** Fire in-app notifications for all key events
- **Files:** Add notification creation in order/service/course routes
- **Dependencies:** None
- **Complexity:** Low
- **Priority:** Medium

---

### PHASE 6 — POLISH AND GROWTH (SEO, analytics, performance, trust)

#### 6.1 GST Invoice PDF Generation
- **What:** Generate downloadable GST invoices for orders
- **Files:** `backend/src/utils/invoiceGenerator.js`, `backend/src/routes/orders.js`, `frontend/src/pages/dashboard/UserOrders.jsx`
- **Dependencies:** PDF library (pdfkit or puppeteer)
- **Complexity:** Medium
- **Priority:** Medium

#### 6.2 SEO Setup
- **What:** Add meta tags, sitemap, structured data
- **Files:** `frontend/index.html`, Create `frontend/src/components/SEO.jsx`, `backend/src/routes/sitemap.js`
- **Dependencies:** React Helmet or similar
- **Complexity:** Low
- **Priority:** Low

#### 6.3 Student Dashboard Features
- **What:** Attendance tracking, course materials, certificate download
- **Files:** `backend/prisma/schema.prisma` (Attendance, CourseMaterial models), Create student routes, `frontend/src/pages/dashboard/StudentDashboard.jsx`
- **Dependencies:** None
- **Complexity:** High
- **Priority:** Medium

#### 6.4 Custom PC Builder Tool
- **What:** Build PC configuration tool with compatibility checking
- **Files:** Create `frontend/src/pages/PCBuilder.jsx`, `backend/src/routes/pc-builder.js`
- **Dependencies:** Component database, compatibility rules
- **Complexity:** High
- **Priority:** Low

#### 6.5 Second-Hand Product Listing
- **What:** Add condition tags and filter for second-hand products
- **Files:** `backend/prisma/schema.prisma`, `backend/src/routes/products.js`, `frontend/src/components/shop/ProductCard.jsx`
- **Dependencies:** None
- **Complexity:** Low
- **Priority:** Low

---

## IMPROVISATION SUGGESTIONS

### UX/UI Improvements

1. **Order Tracking Page**
   - Add real-time order tracking with map integration
   - Show estimated delivery time
   - SMS/Email updates at each status change

2. **Product Comparison Tool**
   - Allow users to compare up to 4 products side-by-side
   - Highlight differences in specs and pricing

3. **Wishlist Backend Sync**
   - Currently wishlist is localStorage only
   - Sync with backend so it persists across devices

4. **Quick Reorder**
   - Add "Reorder" button on past orders
   - Pre-fill cart with previous order items

5. **Guest Checkout**
   - Allow checkout without account (optional)
   - Create account after order placement

6. **Product Reviews Enhancement**
   - Add photo reviews
   - Add verified purchase badge
   - Add helpful votes on reviews

7. **Service Booking Calendar**
   - Show available time slots
   - Prevent double booking
   - Send reminder SMS day before

8. **Course Progress Tracking**
   - Visual progress bar for enrolled courses
   - Mark lessons as complete
   - Time spent tracking

### Security Issues

1. **Rate Limiting**
   - Add rate limiting to auth endpoints (prevent brute force)
   - Add rate limiting to OTP endpoints (prevent abuse)

2. **Input Validation**
   - Add comprehensive input validation middleware
   - Sanitize user inputs to prevent XSS

3. **SQL Injection Prevention**
   - Ensure Prisma queries are parameterized (already done, but verify)

4. **CORS Configuration**
   - Review CORS settings for production
   - Whitelist specific domains

5. **Environment Variables**
   - Ensure sensitive data is in `.env` (already done)
   - Never commit `.env` to git

6. **JWT Token Expiry**
   - Verify JWT tokens have reasonable expiry
   - Implement refresh token mechanism

### Performance Optimizations

1. **Image Optimization**
   - Compress product images
   - Use WebP format
   - Implement lazy loading

2. **Database Indexing**
   - Add indexes on frequently queried fields:
     - `User.email` (already unique)
     - `User.phone`
     - `Order.userId`
     - `Product.category`
     - `Order.createdAt`

3. **API Response Caching**
   - Cache product listings
   - Cache course catalog
   - Use Redis for session storage

4. **Pagination**
   - Ensure all list endpoints support pagination
   - Add infinite scroll or "Load More" buttons

5. **Code Splitting**
   - Implement React code splitting for routes
   - Lazy load admin panel components

6. **CDN for Static Assets**
   - Serve images from CDN
   - Use CDN for frontend build assets

### India-Specific Features

1. **Pincode-Based Delivery**
   - Check serviceability by pincode
   - Show delivery time estimates by pincode
   - Different shipping charges by pincode

2. **GST Invoice with HSN Codes**
   - Add HSN codes to products
   - Generate proper GST invoices with HSN
   - Support multiple GST rates (5%, 12%, 18%, 28%)

3. **Multiple Payment Methods**
   - UPI / online payments (when payment gateway is added later)
   - Wallet integration (Paytm, PhonePe)
   - Net banking

4. **Regional Language Support**
   - Add Hindi language option
   - Translate key pages

5. **WhatsApp Integration** (Future)
   - Order updates via WhatsApp
   - Customer support via WhatsApp

6. **Aadhaar Verification** (Optional)
   - For high-value orders or services
   - Verify customer identity

### Architecture Improvements

1. **Microservices Consideration** (Future)
   - Separate payment service
   - Separate notification service
   - Separate analytics service

2. **Event-Driven Architecture**
   - Use event queue for notifications
   - Decouple services using events

3. **API Versioning**
   - Add API versioning (`/api/v1/...`)
   - Prepare for future breaking changes

4. **Error Tracking**
   - Integrate Sentry or similar
   - Track errors in production

5. **Logging**
   - Structured logging (Winston or Pino)
   - Log all important events
   - Separate log files for different services

6. **Testing**
   - Add unit tests for critical functions
   - Add integration tests for payment flow
   - Add E2E tests for checkout flow

---

## QUICK WINS

1. **Remove Firebase Code** (30 min)
   - Delete Firebase files
   - Remove Firebase login endpoint
   - Remove dependencies

2. **Add Input Validation Middleware** (1 hour)
   - Create validation middleware
   - Add to all routes

3. **Add Rate Limiting** (1 hour)
   - Install `express-rate-limit`
   - Add to auth and OTP endpoints

4. **Add Database Indexes** (30 min)
   - Create migration for indexes
   - Improve query performance

5. **Add Error Tracking** (1 hour)
   - Integrate Sentry
   - Add error boundary in React

6. **Add Loading States** (1 hour)
   - Add loading spinners to all async operations
   - Improve UX

7. **Add Toast Notifications** (30 min)
   - Already using react-hot-toast
   - Add toasts for all user actions

8. **Add Form Validation** (1 hour)
   - Client-side validation for all forms
   - Show helpful error messages

9. **Add Image Lazy Loading** (30 min)
   - Implement lazy loading for product images
   - Improve page load time

10. **Add Meta Tags to Key Pages** (1 hour)
    - Add meta tags to home, product, course pages
    - Improve SEO

---

## OPTIONAL FUTURE IMPROVEMENTS

These are improvements that could enhance the website but are not critical for launch:

1. **Advanced Search**
   - Full-text search with Elasticsearch
   - Search by product specs
   - Search by course content

2. **Recommendation Engine**
   - "Customers who bought this also bought"
   - Personalized product recommendations
   - Course recommendations based on enrollment history

3. **Live Chat Support**
   - Integrate live chat widget
   - Customer support during business hours

4. **Mobile App**
   - React Native app
   - Push notifications
   - Mobile-specific features

5. **Loyalty Program**
   - Points for purchases
   - Tier-based rewards
   - Birthday discounts

6. **Social Media Integration**
   - Share products on social media
   - Social login (if needed, but business rules say no third-party auth)

7. **Advanced Analytics**
   - User behavior tracking
   - Conversion funnel analysis
   - A/B testing framework

8. **Multi-Vendor Support** (If expanding)
   - Allow multiple sellers
   - Commission management
   - Vendor dashboard

---

## SUMMARY

### Critical Issues (Must Fix Immediately)
1. ❌ Phone OTP verification missing at registration
2. ❌ Firebase integration exists (should be removed)
3. ❌ Referral points credited at wrong time (should credit when admin verifies payment, not at order creation)
4. ❌ Only referrer gets points (buyer should also get points when payment verified)

### High Priority Issues
1. ⚠️ Phone + OTP login missing
2. ⚠️ Fast2SMS transactional SMS missing
3. ⚠️ Referral reward amounts hardcoded
4. ⚠️ Course enrollment payment missing

### Medium Priority Issues
1. ⚠️ Email verification missing
2. ⚠️ GST invoice PDF generation missing
3. ⚠️ Student dashboard features missing
4. ⚠️ Tier system infrastructure missing

### Low Priority Issues
1. ⚠️ SEO setup missing
2. ⚠️ Custom PC builder missing
3. ⚠️ Second-hand products missing
4. ⚠️ Analytics dashboard incomplete

---

**Total Critical Issues:** 4 (Cashfree deferred; payment stays Pay at Store / COD)  
**Total High Priority Issues:** 4  
**Total Medium Priority Issues:** 4  
**Total Low Priority Issues:** 4

**Estimated Time to Fix Critical Issues:** 25–35 hours  
**Estimated Time to Fix All Issues:** 120–160 hours

---

**END OF AUDIT REPORT**
