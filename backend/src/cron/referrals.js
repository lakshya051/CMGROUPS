import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { calculateOrderReferralPoints } from '../utils/referralHelper.js';

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

                const { referrerPoints: totalReferrerPoints, refereePoints: totalRefereePoints } =
                    await calculateOrderReferralPoints(order.items);

                if (totalReferrerPoints <= 0) continue;

                const referrer = await prisma.user.findFirst({
                    where: { referralCode: order.referralCodeUsed }
                });

                if (!referrer || referrer.id === order.userId) continue;

                const tierSettings = await prisma.referralSettings.findFirst();
                const tierSystemEnabled = Boolean(tierSettings && tierSettings.tierSystemEnabled);
                const tiers = tierSystemEnabled
                    ? await prisma.tierConfig.findMany({ orderBy: { minPoints: 'desc' } })
                    : [];

                // All payouts for this order happen atomically. The unique
                // constraint on Referral.orderId guarantees idempotency — if a
                // previous run partially succeeded and created the Referral
                // row, the create below will throw P2002 and we skip the order.
                try {
                    await prisma.$transaction(async (tx) => {
                        await tx.referral.create({
                            data: {
                                referrerId: referrer.id,
                                refereeId: order.userId,
                                status: 'rewarded',
                                rewardAmount: totalReferrerPoints,
                                refereeReward: totalRefereePoints > 0 ? totalRefereePoints : null,
                                orderId: order.id,
                                completedAt: new Date()
                            }
                        });

                        await tx.user.update({
                            where: { id: referrer.id },
                            data: { walletBalance: { increment: totalReferrerPoints } }
                        });

                        if (order.userId && totalRefereePoints > 0) {
                            await tx.user.update({
                                where: { id: order.userId },
                                data: { walletBalance: { increment: totalRefereePoints } }
                            });
                        }

                        if (tierSystemEnabled) {
                            const upRef = await tx.user.update({
                                where: { id: referrer.id },
                                data: { tierPoints: { increment: totalReferrerPoints } },
                                select: { id: true, tierPoints: true, tier: true }
                            });
                            const nRT = tiers.find(t => upRef.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                            if (nRT !== upRef.tier) {
                                await tx.user.update({ where: { id: referrer.id }, data: { tier: nRT } });
                            }

                            // BUG FIX (H1): the buyer's tier points must increment by the
                            // REFEREE reward amount, not the referrer's amount.
                            if (order.userId && totalRefereePoints > 0) {
                                const upBuy = await tx.user.update({
                                    where: { id: order.userId },
                                    data: { tierPoints: { increment: totalRefereePoints } },
                                    select: { id: true, tierPoints: true, tier: true }
                                });
                                const nBT = tiers.find(t => upBuy.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                if (nBT !== upBuy.tier) {
                                    await tx.user.update({ where: { id: order.userId }, data: { tier: nBT } });
                                }
                            }
                        }
                    });
                } catch (err) {
                    // P2002 = unique-constraint violation on Referral.orderId → already processed.
                    if (err && err.code === 'P2002') {
                        console.log(`[CRON] Referral for order ${order.id} already recorded; skipping.`);
                        continue;
                    }
                    throw err;
                }
            } catch (err) {
                console.error(`[CRON] Failed to process referral for order ${order.id}:`, err);
            }
        }

    } catch (e) {
        console.error('[CRON] Referral processing failed:', e);
    }
});

// ─── Neon keep-alive ──────────────────────────────────────────────────────────
// Neon's free tier auto-suspends a database after 5 minutes of inactivity. The
// next request then pays a ~3 s cold-start tax. A trivial `SELECT 1` every
// 4 minutes keeps the compute warm at zero meaningful cost (Postgres planner
// special-cases SELECT 1 → essentially free).
//
// On Render's free Web Service tier the whole Node process is suspended after
// 15 min idle, so the keep-alive only fires while there is at least some
// traffic. UptimeRobot or BetterStack hitting `/api/health/db` every 5 min
// from outside the VPC is the more reliable belt-AND-braces option (Phase 5).
//
// Disabled in tests and when explicitly opted-out.
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;
const keepAliveDisabled =
    process.env.NODE_ENV === 'test' ||
    process.env.DISABLE_NEON_KEEPALIVE === '1';

if (!keepAliveDisabled) {
    setInterval(async () => {
        try {
            await prisma.$queryRaw`SELECT 1 AS keepalive`;
        } catch (err) {
            // Don't spam logs — the circuit breaker / health check already
            // surfaces real outages. We just don't want this to crash the
            // process on a transient network blip.
            if (process.env.LOG_KEEPALIVE === '1') {
                console.warn('[keepalive] failed:', err.message);
            }
        }
    }, KEEPALIVE_INTERVAL_MS).unref?.(); // unref so this never holds the loop alive on shutdown.
}

export default cron;
