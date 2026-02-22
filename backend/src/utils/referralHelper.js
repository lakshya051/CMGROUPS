const prisma = require('../lib/prisma');

/**
 * Fetch referral reward amounts from admin settings
 * @param {'product' | 'service' | 'course'} type
 * @returns {Promise<{ referrerPoints: number, refereePoints: number }>}
 */
async function calculateReferralReward(type, overrides = {}) {
    const settings = await prisma.referralSettings.findFirst();

    let defaultReferrerPoints;

    switch (type) {
        case 'product':
            defaultReferrerPoints = settings?.pointsPerProductPurchase ?? 200;
            break;
        case 'service':
            defaultReferrerPoints = settings?.pointsPerServiceBooking ?? 100;
            break;
        case 'course':
            defaultReferrerPoints = settings?.pointsPerCourseEnrollment ?? 300;
            break;
        default:
            defaultReferrerPoints = 100;
    }

    // Use item-level override if set, otherwise fall back to global setting
    const referrerPoints = overrides.referrerPoints ?? defaultReferrerPoints;
    const refereePoints = overrides.refereePoints ?? Math.round(referrerPoints / 2);

    return { referrerPoints, refereePoints };
}

module.exports = { calculateReferralReward };
