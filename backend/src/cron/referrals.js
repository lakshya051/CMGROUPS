const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { calculateReferralReward } = require('../utils/referralHelper');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily referral reward processor...');
    try {
        const now = new Date();

        const eligibleOrders = await prisma.order.findMany({
            where: {
                status: 'Delivered',
                isPaid: true,
                referralCodeUsed: { not: null },
                referralEligibleAt: { lte: now },
                referrals: { none: {} }
            },
            include: {
                items: { include: { product: true } }
            }
        });

        if (eligibleOrders.length === 0) {
            console.log('[CRON] No eligible orders for referral reward today.');
            return;
        }

        console.log(`[CRON] Found ${eligibleOrders.length} eligible orders for referral rewards.`);

        for (const order of eligibleOrders) {
            try {
                if (order.returnStatus !== 'None' && order.returnStatus !== 'Rejected') {
                    console.log(`[CRON] Skipping order ${order.id} due to return status: ${order.returnStatus}`);
                    continue;
                }

                if (!order.items || order.items.length === 0) continue;

                const firstItem = order.items[0];
                const product = firstItem.product || {};

                const { referrerPoints, refereePoints } = await calculateReferralReward({
                    referrerPoints: product.referrerPoints,
                    refereePoints: product.refereePoints
                });

                if (referrerPoints > 0) {
                    const referrer = await prisma.user.findFirst({
                        where: { referralCode: order.referralCodeUsed }
                    });

                    if (referrer && referrer.id !== order.userId) {
                        await prisma.user.update({
                            where: { id: referrer.id },
                            data: { walletBalance: { increment: referrerPoints } }
                        });

                        await prisma.referral.create({
                            data: {
                                referrerId: referrer.id,
                                refereeId: order.userId,
                                status: 'rewarded',
                                rewardAmount: referrerPoints,
                                refereeReward: refereePoints > 0 ? refereePoints : null,
                                orderId: order.id,
                                completedAt: new Date()
                            }
                        });

                        if (order.userId) {
                            await prisma.user.update({
                                where: { id: order.userId },
                                data: { walletBalance: { increment: refereePoints } }
                            });
                        }

                        // Tier system
                        const tierSettings = await prisma.referralSettings.findFirst();
                        if (tierSettings && tierSettings.tierSystemEnabled) {
                            const tiers = await prisma.tierConfig.findMany({ orderBy: { minPoints: 'desc' } });

                            const upRef = await prisma.user.update({
                                where: { id: referrer.id },
                                data: { tierPoints: { increment: referrerPoints } },
                                select: { id: true, tierPoints: true, tier: true }
                            });
                            const nRT = tiers.find(t => upRef.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                            if (nRT !== upRef.tier) await prisma.user.update({ where: { id: referrer.id }, data: { tier: nRT } });

                            if (order.userId) {
                                const upBuy = await prisma.user.update({
                                    where: { id: order.userId },
                                    data: { tierPoints: { increment: referrerPoints } },
                                    select: { id: true, tierPoints: true, tier: true }
                                });
                                const nBT = tiers.find(t => upBuy.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                if (nBT !== upBuy.tier) await prisma.user.update({ where: { id: order.userId }, data: { tier: nBT } });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`[CRON] Failed to process referral for order ${order.id}:`, err);
            }
        }

    } catch (e) {
        console.error('[CRON] Referral processing failed:', e);
    }
});

module.exports = cron;
