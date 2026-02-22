const prisma = require('../lib/prisma');

/**
 * Fetch referral reward amounts from admin settings
 * @param {'product' | 'service' | 'course'} type
 * @returns {Promise<{ referrerPoints: number, refereePoints: number }>}
 */
async function calculateReferralReward(type) {
    const settings = await prisma.referralSettings.findFirst();

    let referrerPoints;

    switch (type) {
        case 'product':
            referrerPoints = settings?.pointsPerProductPurchase ?? 200;
            break;
        case 'service':
            referrerPoints = settings?.pointsPerServiceBooking ?? 100;
            break;
        case 'course':
            referrerPoints = settings?.pointsPerCourseEnrollment ?? 300;
            break;
        default:
            referrerPoints = 100;
    }

    // Referee always gets half of referrer reward, rounded
    const refereePoints = Math.round(referrerPoints / 2);

    return { referrerPoints, refereePoints };
}

module.exports = { calculateReferralReward };
