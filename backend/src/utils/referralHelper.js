import prisma from '../lib/prisma.js';

/**
 * Calculate referral reward based on item overrides, with optional global fallback.
 * @param {Object} overrides - { referrerPoints, refereePoints, fallback, fallbackReferee }
 *   - referrerPoints / refereePoints: per-item custom points (null if not set)
 *   - fallback: global default referrerPoints from ReferralSettings (used when item has no custom points)
 *   - fallbackReferee: global default refereePoints from ReferralSettings
 * @returns {{ referrerPoints: number, refereePoints: number }}
 */
export function calculateReferralReward(overrides = {}) {
    // Use item-level override first, then fall back to global settings, then 0
    const referrerPoints = overrides.referrerPoints ?? overrides.fallback ?? 0;
    const refereePoints = overrides.refereePoints ?? overrides.fallbackReferee ?? Math.round(referrerPoints / 2);

    if (!referrerPoints) return { referrerPoints: 0, refereePoints: 0 };

    return { referrerPoints, refereePoints };
}

export async function calculateOrderReferralPoints(items = []) {
    const settings = await prisma.referralSettings.findFirst();
    const globalReferrer = settings?.pointsPerProductPurchase ?? 0;
    const globalReferee = settings ? Math.round(settings.pointsPerProductPurchase / 2) : 0;

    let totalReferrerPoints = 0;
    let totalRefereePoints = 0;

    for (const item of items) {
        const product = item.product || {};
        const quantity = item.quantity || 1;
        const { referrerPoints, refereePoints } = calculateReferralReward({
            referrerPoints: product.referrerPoints,
            refereePoints: product.refereePoints,
            fallback: globalReferrer,
            fallbackReferee: globalReferee
        });

        totalReferrerPoints += referrerPoints * quantity;
        totalRefereePoints += refereePoints * quantity;
    }

    return { referrerPoints: totalReferrerPoints, refereePoints: totalRefereePoints };
}
