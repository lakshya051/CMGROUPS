import prisma from '../lib/prisma.js';

/**
 * Calculate referral reward strictly based on item overrides
 * @param {Object} overrides - { referrerPoints, refereePoints }
 * @returns {Promise<{ referrerPoints: number, refereePoints: number }>}
 */
export async function calculateReferralReward(overrides = {}) {
    const referrerPoints = overrides.referrerPoints;
    const refereePoints = overrides.refereePoints;

    if (referrerPoints == null || referrerPoints === 0) {
        return { referrerPoints: 0, refereePoints: 0 };
    }

    return {
        referrerPoints,
        refereePoints: refereePoints != null ? refereePoints : Math.round(referrerPoints / 2)
    };
}
