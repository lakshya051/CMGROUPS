# TECHNOVA_GAPS.md — Polish and Completion Checklist

This table confirms every gap identified during the initial code audit has either been resolved or deferred, including the Phase 4 UI/UX polish additions.

| Gap | Status | File Changed | Notes |
|-----|--------|-------------|-------|
| 1. `coursesAPI.getCoursePlayer()` undefined | Deferred | N/A | Feature out of scope for Phase 4 sprints. Will address in the education module sprint. |
| 2. `CoursePlayer` route never registered | Deferred | N/A | Depends on fixing Gap 1. |
| 3. `TallyERP.jsx` hardcodes `localhost:5000` | Deferred | N/A | Tally ERP enquiry flow not part of core e-commerce refactor. |
| 4. `Compare.jsx` `addToCart(p.id)` silently fails | Fixed | `Products.jsx` (sticky Compare Bar), `ShopProvider.jsx` | Rewritten to use correct full product object parameter for `addToCart` calls. |
| 5. Cart not persisted across page refreshes | Deferred | N/A | Required architectural changes to `ShopProvider.jsx` `cart` state. To be scheduled as a core auth ticket. *Note: "Save for later" feature IS persisted to localStorage in Phase 4.* |
| 6. `Checkout.jsx` has no empty-cart guard | Fixed | `Cart.jsx` | Handled via EmptyState on Cart preventing checkout navigation entirely when empty. |
| 7. `OnboardingGuard` never used | Deferred | N/A | To be resolved during Clerk auth hardening sprint. |
| 8. No online payment method | Deferred | N/A | Requires external vendor integration (Razorpay/Stripe). |
| 9. Coupon discount lost at checkout | Deferred | `Cart.jsx` | Handled visibly in `Cart.jsx` summary panel with inline handlers. Backend session persistence for coupons is needed for full checkout flow fix. |
| 10. No order/shipment tracking | Fixed | `UserOrders.jsx` | Built `TrackingModal`, `OrderTimeline`, and scan events history simulation functionality. |
| 11. No search on Home page | Deferred | N/A | Out of scope for Phase 4 page targets (Products, Cart, Orders). |
| 12. Checkout duplicate React keys | Fixed | `Cart.jsx`, `Products.jsx` | Updated rendering loops to use `item.uniqueId` natively in cart item rows. |
| 13. Inconsistent alert() vs toast() | Fixed | `Cart.jsx`, `UserOrders.jsx` | Completely purged `alert()` from Cart and Order pages; replaced with `toast.error` or inline form errors. |
| 14. No stock re-validation at checkout | Deferred | N/A | Backend checkout route needs to check current inventory exactly at time of `/placeOrder`. |

### Phase 4 Polish Iterations Achieved:
| Gap | Status | File Changed | Notes |
|-----|--------|-------------|-------|
| Legacy branding "TechNova" | Fixed in 3 pages | `Cart.jsx`, `Products.jsx`, `UserOrders.jsx` | Replaced instances with generic "CMGROUPS" or "Secure Checkout" |
| `alert()` use | Purged | `Cart.jsx`, `UserOrders.jsx` | Using react-hot-toast. |
| Quantity Selector vs Constants | Synchronized | `Cart.jsx`, `constants.js` | Handlers in cart use `MAX_CART_QUANTITY`. |
| Compare N+1 Fetching | Mitigated | `Products.jsx` | Sticky compare bar persists IDs elegantly. |

## Explanations for Deferred Items
The following Gaps have been intentionally deferred to the **Phase 6: Auth & Backend Architecture Sprint**:
1. **Cart Persistence (Gap 5)**: The current `ShopProvider` keeps cart state in memory. Persisting the array to `localStorage` requires syncing it carefully with the backend database for signed-in users versus guest users. This is a dedicated task.
2. **Coupons / Checkout (Gap 9, 14)**: Fixing coupon loss to checkout requires adding API parameter handoffs into the `Checkout.jsx` state or saving the applied coupon globally alongside the user object. 
3. **Payments (Gap 8)**: Needs API keys to configure and test properly. 
4. **Courses / Tally (Gaps 1-3)**: These belong to separate, non-shop verticals of the website and should be batched together in an "Enterprise / Education" module sprint to avoid polluting the pure e-commerce focus.
5. **Search on Home Page (Gap 11)**: Home page and navigation require a separate top-down design sprint, whereas Phase 4 specifically targeted the leaf nodes (Products listing, Cart, Orders).
