/**
 * Groups cart items by bundle instance and computes a subtotal that uses
 * the bundle's discounted price instead of summing individual catalog prices.
 */
export function computeBundleAwareSubtotal(items) {
    const bundleGroups = {};
    let total = 0;

    for (const item of items) {
        if (item.bundleInfo?.bundleInstanceId && item.bundleInfo?.bundlePrice != null) {
            const key = item.bundleInfo.bundleInstanceId;
            if (!bundleGroups[key]) {
                bundleGroups[key] = { bundlePrice: item.bundleInfo.bundlePrice, catalogTotal: 0 };
            }
            bundleGroups[key].catalogTotal += item.price * item.quantity;
        } else {
            total += item.price * item.quantity;
        }
    }

    for (const group of Object.values(bundleGroups)) {
        total += group.bundlePrice;
    }

    return total;
}

/**
 * Returns the total savings from bundle pricing (catalog sum minus bundle price).
 */
export function computeBundleSavings(items) {
    const bundleGroups = {};

    for (const item of items) {
        if (item.bundleInfo?.bundleInstanceId && item.bundleInfo?.bundlePrice != null) {
            const key = item.bundleInfo.bundleInstanceId;
            if (!bundleGroups[key]) {
                bundleGroups[key] = { bundlePrice: item.bundleInfo.bundlePrice, catalogTotal: 0 };
            }
            bundleGroups[key].catalogTotal += item.price * item.quantity;
        }
    }

    let savings = 0;
    for (const group of Object.values(bundleGroups)) {
        const diff = group.catalogTotal - group.bundlePrice;
        if (diff > 0) savings += diff;
    }

    return savings;
}
