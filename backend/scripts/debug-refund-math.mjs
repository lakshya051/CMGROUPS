// #region agent log
// Standalone read-only debug script — proves/disproves hypotheses A, B, C, D, E
// about the wallet refund double-credit regression.
//
// Usage:
//   cd backend && node --env-file=.env scripts/debug-refund-math.mjs
//
// This script does NOT mutate any data. It inspects recent orders in the DB,
// simulates the arithmetic used by:
//   - POST  /orders   (order placement: what total gets persisted)
//   - PUT   /orders/:id/refund (admin refund approval: what fullRefundAmount is)
//   - PDF invoiceGenerator.js (what total appears on the invoice)
// and emits NDJSON logs for the debug runner to read back.
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';

const prisma = new PrismaClient();

const LOG_PATH = '/Users/ar-lakshya.varshney/Downloads/CMGROUPS-main 3/.cursor/debug-23ca64.log';
const SESSION_ID = '23ca64';

function log(hypothesisId, location, message, data) {
    const payload = {
        sessionId: SESSION_ID,
        runId: 'pre-fix',
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
    };
    fs.appendFileSync(LOG_PATH, JSON.stringify(payload) + '\n');
    console.log(`[${hypothesisId}] ${message}`, data);
}

async function main() {
    // --- Hypothesis A + D + E: refund math vs order.total semantics -----------
    // Pick up to 5 recent orders that used wallet, so we can see the actual
    // numbers the refund route would compute.
    const walletOrders = await prisma.order.findMany({
        where: { walletUsed: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            total: true,
            walletUsed: true,
            discountAmount: true,
            paymentMethod: true,
            isPaid: true,
            status: true,
            returnStatus: true,
            refundAmount: true,
            createdAt: true,
            items: {
                select: {
                    quantity: true,
                    price: true,
                    productId: true,
                    variantId: true,
                },
            },
        },
    });

    log('A', 'scripts/debug-refund-math.mjs:main',
        `Found ${walletOrders.length} recent orders with walletUsed>0`,
        { count: walletOrders.length });

    for (const o of walletOrders) {
        // Re-derive the pre-wallet subtotal from line prices so we can see
        // whether order.total matches pre-wallet (H-A) or post-wallet (H-D).
        const lineSum = o.items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0);
        // Refund route arithmetic (verbatim from orders.js):
        const fullRefundAmount = (o.total || 0) + (o.walletUsed || 0);
        // What refund would be correct if total already represents the FULL
        // order value (H-A): just order.total.
        const expectedIfTotalIsPreWallet = o.total;
        // What refund would be correct if total represents post-wallet cash
        // (H-D): order.total + order.walletUsed.
        const expectedIfTotalIsPostWallet = (o.total || 0) + (o.walletUsed || 0);

        log('A', 'orders.js:1581 refund math',
            `order #${o.id}: refund-route would credit fullRefundAmount`,
            {
                orderId: o.id,
                dbFields: {
                    total: o.total,
                    walletUsed: o.walletUsed,
                    discountAmount: o.discountAmount,
                    status: o.status,
                    returnStatus: o.returnStatus,
                    paymentMethod: o.paymentMethod,
                    refundAmount: o.refundAmount,
                },
                derived: {
                    lineItemsPriceSum: lineSum,
                    orderTotalEqualsLineSumApprox: Math.abs(lineSum - o.total) <= Math.max(2, o.total * 0.25),
                    orderTotalLessThanLineSum: o.total < lineSum,
                },
                refundArithmetic: {
                    fullRefundAmount,
                    expectedIfTotalIsPreWallet,
                    expectedIfTotalIsPostWallet,
                    overchargeIfPreWallet: fullRefundAmount - expectedIfTotalIsPreWallet,
                },
            });
    }

    // --- Hypothesis B: invoice totals ----------------------------------------
    // The invoice prints subtotal, coupon discount, taxable, IGST, wallet
    // deduction, then "Total Amount: order.total". If order.total is the
    // pre-wallet full amount (as H-A claims), the visible "Wallet Used: -X"
    // line is then inconsistent with the Total.
    if (walletOrders.length > 0) {
        const sample = walletOrders[0];
        const subtotal = sample.items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0);
        const discountAmount = sample.discountAmount || 0;
        const walletUsed = sample.walletUsed || 0;
        const afterDiscount = subtotal - discountAmount;
        const taxable = afterDiscount / 1.18;
        const gst = afterDiscount - taxable;
        log('B', 'utils/invoiceGenerator.js:235 invoice math',
            `invoice would render order #${sample.id}`,
            {
                orderId: sample.id,
                linesRendered: {
                    'Subtotal': subtotal,
                    'Coupon Discount': -discountAmount,
                    'Taxable Amount': taxable.toFixed(2),
                    'IGST (18%)': gst.toFixed(2),
                    'Wallet Used': -walletUsed,
                    'Total Amount': sample.total,
                },
                arithmeticCheck: {
                    taxablePlusGstPlusDelivery_minusWallet: (taxable + gst - walletUsed).toFixed(2),
                    displayedTotal: sample.total,
                    discrepancy: (sample.total - (taxable + gst - walletUsed)).toFixed(2),
                },
            });
    }

    // --- Hypothesis C: returnStatus enum values actually used in DB ----------
    const returnStatusGrouped = await prisma.order.groupBy({
        by: ['returnStatus'],
        _count: { _all: true },
        where: { returnStatus: { not: null } },
    });
    log('C', 'utils/couponUserRules.js:25 returnStatus filter',
        'distinct returnStatus values present in Order table',
        {
            distinctValues: returnStatusGrouped.map((r) => ({
                returnStatus: r.returnStatus,
                count: r._count._all,
            })),
            filterUsedByCouponUserRules: ['Approved', 'Refunded'],
            wouldFilterMatchAnyRow: returnStatusGrouped.some((r) =>
                ['Approved', 'Refunded'].includes(r.returnStatus)
            ),
        });

    // --- Also capture the new-orders semantics (H-A): grab the most recent
    // order regardless of wallet usage and confirm whether order.total equals
    // lineSum * 1.18 (pre-wallet) or less (post-wallet).
    const recent = await prisma.order.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            total: true,
            walletUsed: true,
            discountAmount: true,
            items: { select: { quantity: true, price: true } },
        },
    });
    if (recent) {
        const lineSum = recent.items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0);
        const preWalletExpected = Math.round((lineSum - (recent.discountAmount || 0)) * 1.18);
        const postWalletExpected = preWalletExpected - (recent.walletUsed || 0);
        log('A', 'orders.js:482 order.total semantics on most recent order',
            `most recent order #${recent.id}`,
            {
                orderId: recent.id,
                db: { total: recent.total, walletUsed: recent.walletUsed, discountAmount: recent.discountAmount },
                derived: {
                    lineSum,
                    preWalletExpected_approx: preWalletExpected,
                    postWalletExpected_approx: postWalletExpected,
                    totalMatchesPreWallet: Math.abs(recent.total - preWalletExpected) <= 5,
                    totalMatchesPostWallet: Math.abs(recent.total - postWalletExpected) <= 5,
                },
            });
    }

    await prisma.$disconnect();
}

main().catch(async (err) => {
    log('ERROR', 'scripts/debug-refund-math.mjs:main', 'script threw', {
        message: err.message,
        stack: err.stack,
    });
    await prisma.$disconnect();
    process.exit(1);
});
// #endregion
