// Referral System Logic

import { addPoints } from './loyalty.js';

const REFERRAL_BONUS_REFERRER = 500; // Points
const REFERRAL_BONUS_REFEREE = 250; // Points

// Helper to find user by code
function findUserByReferralCode(code) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    return users.find(u => u.referralCode === code);
}

export async function processReferral(newUserId, referralCode) {
    if (!referralCode) return;

    const referrer = findUserByReferralCode(referralCode);
    if (referrer) {
        // 1. Award Points to Referrer
        addPoints(referrer.id, REFERRAL_BONUS_REFERRER, `Referral Bonus: User ${newUserId}`);

        // 2. Award Points to Referee (New User)
        addPoints(newUserId, REFERRAL_BONUS_REFEREE, `Signup Bonus: Referred by ${referrer.name}`);

        // 3. Track Referral
        trackReferral(referrer.id, newUserId);

        console.log(`Referral processed: ${referrer.name} referred ${newUserId}`);
    } else {
        console.warn('Invalid referral code');
    }
}

function trackReferral(referrerId, refereeId) {
    let referrals = JSON.parse(localStorage.getItem('referrals')) || [];
    referrals.push({
        referrerId,
        refereeId,
        date: new Date().toLocaleDateString(),
        status: 'Converted'
    });
    localStorage.setItem('referrals', JSON.stringify(referrals));
}

export function getReferralStats(userId) {
    const referrals = JSON.parse(localStorage.getItem('referrals')) || [];
    const myReferrals = referrals.filter(r => r.referrerId === userId);

    return {
        count: myReferrals.length,
        earned: myReferrals.length * REFERRAL_BONUS_REFERRER,
        history: myReferrals
    };
}
