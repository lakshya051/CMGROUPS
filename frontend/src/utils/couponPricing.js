import { computeBundleAwareSubtotal } from './bundleUtils';

/**
 * Payload shape expected by POST /api/coupons/validate
 */
export function buildCartItemsSummary(items) {
    return (items || []).map(item => ({
        productId: item.productId || null,
        serviceTypeId: item.serviceTypeId || null,
        courseId: item.courseId || null,
        bundleId: item.bundleId || item.bundleInfo?.bundleId || null,
    }));
}

function lineMatchesApplicable(item, applicableTo) {
    const isBundle = !!(item.bundleId || item.bundleInfo?.bundleId);
    const isService = !!item.serviceTypeId;
    const isCourse = !!item.courseId;
    const isProduct = !!item.productId && !isBundle;
    if (applicableTo === 'bundles') return isBundle;
    if (applicableTo === 'products') return isProduct;
    if (applicableTo === 'services') return isService;
    if (applicableTo === 'courses') return isCourse;
    return false;
}

/**
 * Sum of price × qty for lines that match the coupon scope (catalog-style lines, same as Cart).
 */
export function computeEligibleLineSubtotal(items, applicableTo) {
    if (!applicableTo || applicableTo === 'all') return null;
    return (items || []).reduce((sum, item) => {
        if (!lineMatchesApplicable(item, applicableTo)) return sum;
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
    }, 0);
}

export function isCouponApplicableToItems(items, applicableTo) {
    if (!applicableTo || applicableTo === 'all') return true;
    return (items || []).some(item => lineMatchesApplicable(item, applicableTo));
}

/**
 * @param {object} validationFields - { discountType, value, applicableTo } from validate API
 * @param {Array} items - cart or checkout line items
 * @param {number} bundleAwareSubtotal - computeBundleAwareSubtotal(items)
 */
export function computeCouponDiscountFromRules(validationFields, items, bundleAwareSubtotal) {
    const { discountType, value, applicableTo } = validationFields || {};
    const sub = Math.max(0, Number(bundleAwareSubtotal) || 0);
    let base = sub;
    if (applicableTo && applicableTo !== 'all') {
        base = computeEligibleLineSubtotal(items, applicableTo) ?? 0;
    }
    if (base <= 0) return 0;

    let disc =
        discountType === 'percent'
            ? Math.round(base * (Number(value) / 100) * 100) / 100
            : Math.min(Number(value) || 0, base);

    return Math.min(disc, sub);
}

export function buildCouponStateFromValidation(data, items) {
    const bundleAwareSubtotal = computeBundleAwareSubtotal(items);
    const discount = computeCouponDiscountFromRules(
        {
            discountType: data.discountType,
            value: data.value,
            applicableTo: data.applicableTo,
        },
        items,
        bundleAwareSubtotal
    );
    return {
        code: data.code,
        discount,
        discountType: data.discountType,
        value: data.value,
        applicableTo: data.applicableTo,
    };
}
