# Follow-up work (deferred from the audit remediation)

This file tracks work that was identified during the audit but deferred to
dedicated PRs because the change is too invasive to land alongside
unrelated fixes.

## M1 — Migrate money columns from `Float` to `Decimal(12,2)`

**Why deferred:** touches 150+ arithmetic sites across routes, cron jobs,
utilities and invoice generation. A safe migration needs its own PR with:

1. `schema.prisma` edit: change all monetary fields (see list below) from
   `Float` to `Decimal @db.Decimal(12,2)`.
2. A Prisma migration (`prisma migrate dev --name money_decimal_migration`)
   that issues `ALTER TABLE ... ALTER COLUMN ... TYPE numeric(12,2) USING
   (...)::numeric(12,2)` for each column. Back up production first.
3. A Prisma client extension in `backend/src/lib/prisma.js` that
   auto-converts Decimal fields to JS `number` on read using `$extends`
   with `result` mappings (so the rest of the codebase keeps working with
   plain numbers).
4. A focused test pass on checkout (total computation, coupon discount,
   wallet usage), referral cron rewards, wallet transactions, course
   payments, and service invoice totals.

**Fields to convert (money, not coordinates/ratings/counters):**

- `User.walletBalance`, `User.tierPoints`
- `Course.referrerPoints`, `Course.refereePoints`
- `CourseDuration.totalFee`, `CourseDuration.fullPayDiscount`
- `FeePayment.amount`
- `Enrollment.feePaid`
- `WalletTransaction.amount`
- `Product.price`, `Product.originalPrice`, `Product.referrerPoints`, `Product.refereePoints`
- `Order.total`, `Order.walletUsed`, `Order.discountAmount`, `Order.refundAmount`
- `OrderItem.price`
- `ServiceBooking.estimatedPrice`, `ServiceBooking.finalPrice`
- `ServiceInvoice.laborCost`, `ServiceInvoice.partsCost`, `ServiceInvoice.gst`, `ServiceInvoice.totalAmount`
- `Coupon.value`, `Coupon.minOrderAmount`
- `Referral.rewardAmount`, `Referral.refereeReward`
- `ServiceType.referrerPoints`, `ServiceType.refereePoints`
- `ProductVariant.price`, `ProductVariant.originalPrice`
- `ProductAlert.priceThreshold`
- `ReferralSettings.pointsPerProductPurchase`, `ReferralSettings.pointsPerServiceBooking`, `ReferralSettings.pointsPerCourseEnrollment`, `ReferralSettings.pointToRupeeRate`
- `TierConfig.minPoints`
- `Bundle.bundlePrice`
- `BundleTemplate.discount`, `BundleTemplate.mixMatchPrice`
- `QuantityTier.price`

Keep as `Float`: `Product.rating`, `latitude`, `longitude`, any scoring metric.

## M8 — Multi-zone delivery support

**Why deferred:** this is a new feature, not a bug fix. Today the shop is
hardcoded to a single pincode (`207001`) enforced at four layers
(`frontend/src/constants.js`, `utils/validationSchemas.js`,
`backend/src/routes/addresses.js`, `backend/src/routes/orders.js`).

A proper multi-zone implementation needs:

1. A new `DeliveryZone` table: `{ id, name, pincodes String[], feeBelowFreeThreshold, freeDeliveryThreshold, estimatedDays, isActive }`.
2. An admin UI (`AdminDeliveryZones`) to create/edit zones and bulk-paste
   pincodes.
3. A shared lookup helper `resolveDeliveryZoneForPincode(pincode)` used on
   both server (address validation, order placement) and client
   (checkout fee display, eligibility messaging).
4. Removing the hardcoded `DELIVERY_PINCODE` constant and replacing the
   `Yup.oneOf([DELIVERY_PINCODE])` check with an async
   `test('serviceable', ...)` that hits a public
   `GET /api/delivery/check?pincode=...` endpoint.
5. Storing `deliveryZoneId` on the order so admin reporting can slice by
   zone.

## Features — missing or incomplete

- **Real payment gateway.** Only `cod`, `pay_at_store`, and wallet are
  supported today. Integrating Razorpay or Stripe requires:
  - client SDK integration on checkout
  - server-side `POST /orders/:id/razorpay` to create a gateway order
  - webhook route with HMAC signature verification to mark `isPaid`
  - updating order status on webhook, not on client confirmation

- **Review edit / delete UI.** Backend has no delete route either, so this
  is a full end-to-end flow (with moderation controls for admins).

- **Admin-table card view for narrow viewports.** `AdminOrders`,
  `AdminUsers`, `AdminProducts` etc. use `overflow-x-auto`. For mobile a
  stacked card layout would be much easier to scan. Scope: roughly one
  shared component + swap-in per admin table page.
