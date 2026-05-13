/**
 * Enforces first-order-only and per-user redemption limits for coupons.
 * Call with prisma or transaction client. Throws Error with isCouponUserRule for predictable HTTP 400 handling.
 *
 * First order: `order.count({ userId }) === 0` before the current order (all statuses).
 * Refine later to exclude cancelled orders if the business requires "first successful order" only.
 */
export async function assertCouponUserEligibility(db, coupon, userId) {
    const needsIdentity = coupon.firstOrderOnly || coupon.maxUsesPerUser != null;
    if (!needsIdentity) return;

    if (!userId) {
        const e = new Error('You must be signed in to use this coupon.');
        e.isCouponUserRule = true;
        throw e;
    }

    if (coupon.firstOrderOnly) {
        // M4: a cancelled or returned order is not a "fulfilled" purchase, so
        // it shouldn't disqualify a customer from using a first-order coupon.
        const priorOrderCount = await db.order.count({
            where: {
                userId,
                status: { notIn: ['Cancelled'] },
                returnStatus: { notIn: ['Approved', 'Refunded'] },
            },
        });
        if (priorOrderCount > 0) {
            const e = new Error('This coupon is only valid on your first order.');
            e.isCouponUserRule = true;
            throw e;
        }
    }

    if (coupon.maxUsesPerUser != null) {
        const userUses = await db.order.count({
            where: {
                userId,
                couponCode: coupon.code,
            },
        });
        if (userUses >= coupon.maxUsesPerUser) {
            const msg =
                coupon.maxUsesPerUser === 1
                    ? 'You have already used this coupon.'
                    : `This coupon is limited to ${coupon.maxUsesPerUser} uses per account.`;
            const e = new Error(msg);
            e.isCouponUserRule = true;
            throw e;
        }
    }
}
