const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { protect, adminOnly, optionalProtect } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/emailNotifications');
// SMS imports removed
const { generateInvoice } = require('../utils/invoiceGenerator');
const { calculateReferralReward } = require('../utils/referralHelper');

const router = express.Router();

const checkoutTimingEnabled = process.env.CHECKOUT_TIMING_LOGS === 'true';

function logCheckoutTiming(requestId, stage, startMs) {
    if (!checkoutTimingEnabled) return;
    console.log(`[CHECKOUT][${requestId}] ${stage} +${Date.now() - startMs}ms`);
}

async function calculateOrderReferralPoints(items = []) {
    let totalReferrerPoints = 0;
    let totalRefereePoints = 0;

    for (const item of items) {
        const product = item.product || {};
        const quantity = item.quantity || 1;
        const { referrerPoints, refereePoints } = await calculateReferralReward({
            referrerPoints: product.referrerPoints,
            refereePoints: product.refereePoints
        });

        totalReferrerPoints += referrerPoints * quantity;
        totalRefereePoints += refereePoints * quantity;
    }

    return { referrerPoints: totalReferrerPoints, refereePoints: totalRefereePoints };
}

// POST /api/orders (Optional Auth - place order)
router.post('/', optionalProtect, async (req, res) => {
    const checkoutStart = Date.now();
    const checkoutRequestId = `ord-${checkoutStart}-${Math.floor(Math.random() * 10000)}`;
    try {
        const { items, total, paymentMethod, shippingAddress, referralCode, useWallet, walletUsed } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in order' });
        }

        const parsedTotal = parseFloat(total);
        const parsedWalletUsed = Number(walletUsed) > 0 ? Number(walletUsed) : 0;
        if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
            return res.status(400).json({ error: 'Invalid order total' });
        }
        if (parsedTotal === 0 && parsedWalletUsed === 0) {
            return res.status(400).json({ error: 'Order must have a non-zero payment amount' });
        }

        const normalizedPaymentMethod = paymentMethod || 'pay_at_store';

        // 2. Validate stock for all items BEFORE creating order (Optimized for "alot of products")
        const productIds = [...new Set(items.map(i => parseInt(i.productId, 10)))];
        const variantIds = [...new Set(items.filter(i => i.variantId).map(i => parseInt(i.variantId, 10)))];

        const [dbProducts, dbVariants] = await Promise.all([
            prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, title: true, stock: true }
            }),
            prisma.productVariant.findMany({
                where: { id: { in: variantIds } },
                select: { id: true, name: true, stock: true, productId: true }
            })
        ]);
        logCheckoutTiming(checkoutRequestId, 'stock_prefetch_complete', checkoutStart);

        const productMap = new Map(dbProducts.map(p => [p.id, p]));
        const variantMap = new Map(dbVariants.map(v => [v.id, v]));

        // Aggregate quantities to check total requested against stock
        const totalRequestedProducts = {}; // productId -> quantity
        const totalRequestedVariants = {}; // variantId -> quantity

        for (const item of items) {
            const qty = parseInt(item.quantity, 10);
            if (item.variantId) {
                const vid = parseInt(item.variantId, 10);
                totalRequestedVariants[vid] = (totalRequestedVariants[vid] || 0) + qty;
            } else {
                const pid = parseInt(item.productId, 10);
                totalRequestedProducts[pid] = (totalRequestedProducts[pid] || 0) + qty;
            }
        }

        // Perform validation
        for (const vid in totalRequestedVariants) {
            const variant = variantMap.get(parseInt(vid, 10));
            const requested = totalRequestedVariants[vid];
            if (!variant) {
                return res.status(400).json({ error: `Product variant not found (ID: ${vid})` });
            }
            if (variant.stock < requested) {
                return res.status(400).json({
                    error: `Insufficient stock for "${variant.name}". Available: ${variant.stock}, Requested: ${requested}`
                });
            }
        }

        for (const pid in totalRequestedProducts) {
            const product = productMap.get(parseInt(pid, 10));
            const requested = totalRequestedProducts[pid];
            if (!product) {
                return res.status(400).json({ error: `Product not found (ID: ${pid})` });
            }
            if (product.stock < requested) {
                return res.status(400).json({
                    error: `Insufficient stock for "${product.title}". Available: ${product.stock}, Requested: ${requested}`
                });
            }
        }

        // Validate referral code if provided
        let referrer = null;
        if (referralCode && referralCode.trim()) {
            referrer = await prisma.user.findFirst({
                where: { referralCode: referralCode.trim().toUpperCase() }
            });

            if (!referrer) {
                return res.status(400).json({ error: 'Invalid referral code' });
            }

            if (req.user && referrer.id === req.user.id) {
                return res.status(400).json({ error: 'You cannot use your own referral code' });
            }
        }

        // Validate wallet balance BEFORE transaction
        if (useWallet && parsedWalletUsed > 0) {
            if (!req.user) {
                return res.status(401).json({ error: 'You must be logged in to use wallet balance' });
            }
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
            if (dbUser.walletBalance < parsedWalletUsed) {
                return res.status(400).json({ error: 'Insufficient wallet balance' });
            }
        }

        logCheckoutTiming(checkoutRequestId, 'pre_validation_complete', checkoutStart);

        const isFullyPaidWithWallet = useWallet && req.user && parsedWalletUsed >= parsedTotal;
        const shouldGeneratePaymentOtp = !isFullyPaidWithWallet && ['pay_at_store', 'cod'].includes(normalizedPaymentMethod);
        const paymentOtp = shouldGeneratePaymentOtp ? crypto.randomInt(100000, 999999).toString() : null;

        // *** TRANSACTION: wallet deduction + order creation + stock decrement ***
        const order = await prisma.$transaction(async (tx) => {
            // 1. Deduct wallet balance (if applicable)
            if (useWallet && parsedWalletUsed > 0 && req.user) {
                await tx.user.update({
                    where: { id: req.user.id },
                    data: { walletBalance: { decrement: parsedWalletUsed } }
                });
            }

            // 2. Decrement stock once per unique product/variant (race-condition safe)
            for (const [variantId, quantityValue] of Object.entries(totalRequestedVariants)) {
                const quantity = parseInt(quantityValue, 10);
                const result = await tx.productVariant.updateMany({
                    where: {
                        id: parseInt(variantId, 10),
                        stock: { gte: quantity }
                    },
                    data: { stock: { decrement: quantity } }
                });

                if (result.count === 0) {
                    throw new Error(`Insufficient stock for product variant ID ${variantId}. Please try again.`);
                }
            }

            for (const [productId, quantityValue] of Object.entries(totalRequestedProducts)) {
                const quantity = parseInt(quantityValue, 10);
                const result = await tx.product.updateMany({
                    where: {
                        id: parseInt(productId, 10),
                        stock: { gte: quantity }
                    },
                    data: { stock: { decrement: quantity } }
                });

                if (result.count === 0) {
                    throw new Error(`Insufficient stock for product ID ${productId}. Please try again.`);
                }
            }

            // 3. Create the order
            const createdOrder = await tx.order.create({
                data: {
                    userId: req.user ? req.user.id : null,
                    total: parsedTotal,
                    walletUsed: parsedWalletUsed,
                    status: isFullyPaidWithWallet ? 'Confirmed' : 'Processing',
                    paymentMethod: normalizedPaymentMethod,
                    paymentOtp,
                    isPaid: isFullyPaidWithWallet,
                    shippingAddress: shippingAddress || null,
                    guestInfo: !req.user && shippingAddress ? { name: shippingAddress.fullName, phone: shippingAddress.phone, email: shippingAddress.email } : null,
                    referralCodeUsed: referrer ? referralCode.trim().toUpperCase() : null,
                    items: {
                        create: items.map(item => {
                            const pId = parseInt(item.productId, 10);
                            const vId = item.variantId ? parseInt(item.variantId, 10) : null;
                            const qty = parseInt(item.quantity, 10);
                            const prc = parseFloat(String(item.price).replace(/,/g, '')); // Robust parsing

                            if (isNaN(pId) || isNaN(qty) || isNaN(prc)) {
                                throw new Error('Invalid item data in cart');
                            }

                            return {
                                productId: pId,
                                variantId: vId,
                                quantity: qty,
                                price: prc
                            };
                        })
                    }
                },
                include: {
                    items: { include: { product: true } },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            role: true,
                            referralCode: true,
                            walletBalance: true,
                            isVerified: true,
                            createdAt: true
                        }
                    }
                }
            });

            // 4. Record wallet debit transaction (after order creation so orderId is available)
            if (useWallet && parsedWalletUsed > 0 && req.user) {
                await tx.walletTransaction.create({
                    data: {
                        userId: req.user.id,
                        amount: parsedWalletUsed,
                        type: 'DEBIT',
                        description: `Used for Order #${createdOrder.id}`,
                        orderId: createdOrder.id
                    }
                });
            }

            return createdOrder;
        }, {
            maxWait: 8000,
            timeout: 15000
        });
        logCheckoutTiming(checkoutRequestId, 'transaction_complete', checkoutStart);

        const userEmail = req.user?.email || shippingAddress?.email;
        const userId = req.user?.id;

        res.status(201).json(order);
        logCheckoutTiming(checkoutRequestId, 'response_sent', checkoutStart);

        // Post-response work: do not block checkout UX on SMTP/notification latency.
        setImmediate(() => {
            const asyncStart = Date.now();
            if (userEmail) {
                sendOrderConfirmationEmail(userEmail, order.id, order.total, {
                    paymentOtp: order.paymentOtp,
                    paymentMethod: order.paymentMethod,
                    isPaid: order.isPaid
                }).catch((err) => {
                    console.error('Failed to send Email Receipt:', err);
                });
            }

            if (userId && order.paymentOtp) {
                prisma.notification.create({
                    data: {
                        userId,
                        title: `Payment OTP for Order #${order.id}`,
                        message: `Your payment OTP is ${order.paymentOtp}. Share it while making payment.`,
                        type: 'order',
                        link: '/dashboard/orders'
                    }
                }).catch((notifErr) => {
                    console.error('Order OTP notification error (non-blocking):', notifErr);
                });
            }

            logCheckoutTiming(checkoutRequestId, 'async_notifications_complete', asyncStart);
        });

        // *** ORDER-BASED REFERRAL REWARD ***
        // Referral reward will be processed when payment is verified.
    } catch (error) {
        console.error('CRITICAL: Create order failure:', {
            error: error.message,
            stack: error.stack,
            body: req.body,
            user: req.user?.id
        });
        // If it's a known error from the transaction (like stock issue), return 400
        if (error.message && (error.message.includes('Insufficient stock') || error.message.includes('Invalid item data'))) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error. Our team has been notified.' });
    }
});

// GET /api/orders/my-orders (Protected - user's orders with pagination)
router.get('/my-orders', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [orders, total] = await prisma.$transaction([
            prisma.order.findMany({
                where: { userId: req.user.id },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { items: { include: { product: true } } }
            }),
            prisma.order.count({ where: { userId: req.user.id } })
        ]);

        res.json({
            orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/orders/my-stats (Protected - user dashboard stats)
router.get('/my-stats', protect, async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { userId: req.user.id },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
        const totalOrders = orders.length;
        const recentOrders = orders.slice(0, 5).map(o => ({
            id: o.id,
            date: o.createdAt,
            status: o.status,
            isPaid: o.isPaid,
            total: o.total,
            itemCount: o.items.length
        }));

        res.json({
            totalSpent,
            totalOrders,
            recentOrders
        });
    } catch (error) {
        console.error('Get my stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/orders (Admin - all orders with optional pagination + status filter)
// ?page=1&limit=50&status=Processing
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const { page, limit, status, search } = req.query;

        const where = {};
        if (status) {
            if (status === 'Returns') {
                where.returnStatus = 'Requested';
            } else {
                where.status = status;
            }
        }
        if (search) {
            const searchId = parseInt(search);
            if (!isNaN(searchId)) {
                where.id = searchId;
            }
        }

        const usePagination = page !== undefined || limit !== undefined;
        const take = usePagination ? parseInt(limit) || 50 : undefined;
        const skip = usePagination ? ((parseInt(page) || 1) - 1) * take : undefined;

        const include = {
            user: { select: { name: true, email: true } },
            items: { include: { product: true } }
        };

        if (usePagination) {
            const [orders, total] = await Promise.all([
                prisma.order.findMany({ where, include, orderBy: { createdAt: 'desc' }, take, skip }),
                prisma.order.count({ where }),
            ]);
            return res.json({
                data: orders,
                total,
                page: parseInt(page) || 1,
                limit: take,
                totalPages: Math.ceil(total / take),
            });
        }

        const orders = await prisma.order.findMany({
            where,
            include,
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/orders/:id/status (Admin - update order status)
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = parseInt(req.params.id);

        // If cancelling, restore stock
        if (status === 'Cancelled') {
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: { items: true }
            });
            if (order && order.status !== 'Cancelled') {
                for (const item of order.items) {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                }
            }
        }

        const updateData = { status };
        let instantReferralInjection = false;

        const orderWithItems = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } } }
        });

        if (status === 'Delivered' && orderWithItems) {
            if (!orderWithItems.isPaid) {
                return res.status(400).json({ error: 'Order must be paid before it can be marked as Delivered.' });
            }
            updateData.deliveredAt = new Date();

            if (orderWithItems.referralCodeUsed && orderWithItems.isPaid) {
                let hasReturnable = false;
                let maxWindowDays = 0;

                for (const item of orderWithItems.items) {
                    if (item.product && item.product.isReturnable) {
                        hasReturnable = true;
                        if (item.product.returnWindowDays > maxWindowDays) {
                            maxWindowDays = item.product.returnWindowDays;
                        }
                    }
                }

                if (hasReturnable) {
                    const eligibleDate = new Date(updateData.deliveredAt);
                    eligibleDate.setDate(eligibleDate.getDate() + maxWindowDays);
                    updateData.referralEligibleAt = eligibleDate;
                } else {
                    instantReferralInjection = true;
                }
            }
        }

        const order = await prisma.order.update({
            where: { id: orderId },
            data: updateData
        });

        if (instantReferralInjection) {
            try {
                const existingReferral = await prisma.referral.findFirst({
                    where: { orderId: orderId }
                });

                if (!existingReferral && orderWithItems.items.length > 0) {
                    const { referrerPoints, refereePoints } = await calculateOrderReferralPoints(orderWithItems.items);

                    if (referrerPoints > 0) {
                        const referrer = await prisma.user.findFirst({
                            where: { referralCode: orderWithItems.referralCodeUsed }
                        });

                        if (referrer && referrer.id !== orderWithItems.userId) {
                            // Credit referrer
                            await prisma.user.update({
                                where: { id: referrer.id },
                                data: { walletBalance: { increment: referrerPoints } }
                            });

                            await prisma.referral.create({
                                data: {
                                    referrerId: referrer.id,
                                    refereeId: orderWithItems.userId,
                                    status: 'rewarded',
                                    rewardAmount: referrerPoints,
                                    refereeReward: refereePoints > 0 ? refereePoints : null,
                                    orderId: orderId,
                                    completedAt: new Date()
                                }
                            });

                            // Credit buyer
                            if (orderWithItems.userId) {
                                await prisma.user.update({
                                    where: { id: orderWithItems.userId },
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

                                if (orderWithItems.userId) {
                                    const upBuy = await prisma.user.update({
                                        where: { id: orderWithItems.userId },
                                        data: { tierPoints: { increment: referrerPoints } },
                                        select: { id: true, tierPoints: true, tier: true }
                                    });
                                    const nBT = tiers.find(t => upBuy.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                    if (nBT !== upBuy.tier) await prisma.user.update({ where: { id: orderWithItems.userId }, data: { tier: nBT } });
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Instant referral log error (non-blocking):', err);
            }
        }

        // Send In-App Notification
        try {
            await prisma.notification.create({
                data: {
                    userId: order.userId,
                    title: 'Order Status Updated',
                    message: `Your order #${order.id} is now ${status}.`,
                    type: 'order',
                    link: `/dashboard/orders`
                }
            });
        } catch (notifErr) {
            console.error('In-app notification error:', notifErr);
        }

        res.json(order);
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/orders/:id/verify-payment (Admin - verify OTP to mark as paid)
router.post('/:id/verify-payment', protect, adminOnly, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        referralCode: true,
                        walletBalance: true,
                        isVerified: true,
                        createdAt: true
                    }
                },
                items: { include: { product: true } }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.isPaid) {
            return res.status(400).json({ error: 'Order is already paid' });
        }

        const { otp } = req.body;
        if (!otp || order.paymentOtp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Please enter the correct customer OTP.' });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                isPaid: true,
                paymentOtp: null,
                status: (order.status === 'Processing') ? 'Confirmed' : order.status
            }
        });

        // Check for instant referral injection (if delivered or non-returnable)
        const isDelivered = updatedOrder.status === 'Delivered';
        const isReturnable = order.items.some(item => item.product?.isReturnable);

        if (order.referralCodeUsed && (isDelivered || !isReturnable)) {
            try {
                const existingReferral = await prisma.referral.findFirst({
                    where: { orderId: orderId }
                });

                if (!existingReferral && order.items.length > 0) {
                    const { referrerPoints, refereePoints } = await calculateOrderReferralPoints(order.items);

                    if (referrerPoints > 0) {
                        const referrer = await prisma.user.findFirst({
                            where: { referralCode: order.referralCodeUsed }
                        });

                        if (referrer && referrer.id !== order.userId) {
                            // Credit referrer
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
                                    orderId: orderId,
                                    completedAt: new Date()
                                }
                            });

                            // Credit buyer
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

                                // Referrer
                                const upRef = await prisma.user.update({
                                    where: { id: referrer.id },
                                    data: { tierPoints: { increment: referrerPoints } },
                                    select: { id: true, tierPoints: true, tier: true }
                                });
                                const nRT = tiers.find(t => upRef.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                if (nRT !== upRef.tier) await prisma.user.update({ where: { id: referrer.id }, data: { tier: nRT } });

                                // Buyer
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
                }
            } catch (err) {
                console.error('Instant referral log error (verify-payment):', err);
            }
        }

        // Send Order Confirmation Notifications
        if (order.user) {
            try {
                if (order.user.email) {
                    await sendOrderConfirmationEmail(order.user.email, order.id, order.total, {
                        paymentMethod: order.paymentMethod,
                        isPaid: true
                    });
                }
                // SMS disabled
            } catch (notifErr) {
                console.error('Order notification error (non-blocking):', notifErr);
            }
        }

        res.json({ success: true, message: 'Payment verified successfully!', order: updatedOrder });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Cancel Order (User)
router.post('/:id/cancel', protect, async (req, res) => {
    try {
        const { reason } = req.body;
        const order = await prisma.order.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        referralCode: true,
                        walletBalance: true,
                        isVerified: true,
                        createdAt: true
                    }
                },
                items: true
            }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (order.status !== 'Processing') {
            return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
        }

        // *** TRANSACTION: wallet refund + stock restore + status update ***
        const result = await prisma.$transaction(async (tx) => {
            let walletTx = null;

            // 1. Refund wallet portion regardless of isPaid
            // (wallet is deducted at placement even for partial wallet + COD orders)
            const walletRefundAmount = order.walletUsed || 0;
            if (walletRefundAmount > 0 && order.userId) {
                await tx.user.update({
                    where: { id: order.userId },
                    data: { walletBalance: { increment: walletRefundAmount } }
                });

                walletTx = await tx.walletTransaction.create({
                    data: {
                        userId: order.userId,
                        amount: walletRefundAmount,
                        type: 'CREDIT',
                        description: `Wallet refund for Cancelled Order #${order.id}`,
                        orderId: order.id
                    }
                });
            }

            // 2. Restore stock for all items (variant-aware)
            for (const item of order.items) {
                if (item.variantId) {
                    await tx.productVariant.update({
                        where: { id: item.variantId },
                        data: { stock: { increment: item.quantity } }
                    });
                } else {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                }
            }

            // 3. Update order status
            const updatedOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: 'Cancelled',
                    cancelReason: reason,
                    refundStatus: walletRefundAmount > 0 ? 'Processed' : 'None',
                    refundAmount: walletRefundAmount
                }
            });

            return { updatedOrder, walletTx };
        });

        res.json({ message: 'Order cancelled successfully', order: result.updatedOrder, refund: result.walletTx });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ error: 'Failed to cancel order: ' + error.message });
    }
});

// Request Return (User)
router.post('/:id/return', protect, async (req, res) => {
    try {
        const { reason } = req.body;
        const order = await prisma.order.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { items: { include: { product: true } } }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

        if (order.status !== 'Delivered') {
            return res.status(400).json({ error: 'Only delivered orders can be returned' });
        }

        let maxWindowDays = 0;
        let hasReturnableItems = false;

        for (const item of order.items) {
            if (item.product && item.product.isReturnable) {
                hasReturnableItems = true;
                if (item.product.returnWindowDays > maxWindowDays) {
                    maxWindowDays = item.product.returnWindowDays;
                }
            }
        }

        if (!hasReturnableItems) {
            return res.status(400).json({ error: 'This order contains non-returnable items only.' });
        }

        if (order.deliveredAt) {
            const expiryDate = new Date(order.deliveredAt);
            expiryDate.setDate(expiryDate.getDate() + maxWindowDays);
            if (new Date() > expiryDate) {
                return res.status(400).json({ error: 'The return window for this order has expired.' });
            }
        }

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
                returnStatus: 'Requested',
                returnReason: reason
            }
        });

        res.json({ message: 'Return request submitted', order: updatedOrder });
    } catch (error) {
        res.status(500).json({ error: 'Failed to request return' });
    }
});

// Process Refund / Approve Return (Admin)
router.put('/:id/refund', protect, adminOnly, async (req, res) => {
    try {
        const { action, restoreStock = false } = req.body; // "approve" or "reject" + optional restoreStock
        const order = await prisma.order.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { items: true }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (action === 'reject') {
            const updatedOrder = await prisma.order.update({
                where: { id: order.id },
                data: { returnStatus: 'Rejected' }
            });
            return res.json(updatedOrder);
        }

        // Approve Return -> Refund full amount (cash portion + wallet portion) to Wallet
        const fullRefundAmount = (order.total || 0) + (order.walletUsed || 0);
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: order.userId },
                data: { walletBalance: { increment: fullRefundAmount } }
            });

            await tx.walletTransaction.create({
                data: {
                    userId: order.userId,
                    amount: fullRefundAmount,
                    type: 'CREDIT',
                    description: `Refund for Returned Order #${order.id}`,
                    orderId: order.id
                }
            });

            // Restore stock if admin says the items are not defective (variant-aware)
            if (restoreStock) {
                for (const item of order.items) {
                    if (item.variantId) {
                        await tx.productVariant.update({
                            where: { id: item.variantId },
                            data: { stock: { increment: item.quantity } }
                        });
                    } else {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { increment: item.quantity } }
                        });
                    }
                }
            }
        });

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
                returnStatus: 'Completed',
                refundStatus: 'Processed',
                refundAmount: fullRefundAmount
            }
        });

        res.json({ message: 'Return approved and refunded', order: updatedOrder });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process refund' });
    }
});

// GET /api/orders/:id/invoice - Download PDF Invoice
router.get('/:id/invoice', protect, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                items: { include: { product: true } }
            }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Must be owner or admin
        if (order.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (!order.isPaid) {
            return res.status(400).json({ error: 'Invoice only available for paid orders' });
        }

        generateInvoice(order, order.user, res);
    } catch (error) {
        console.error('Invoice error:', error);
        res.status(500).json({ error: 'Failed to generate invoice' });
    }
});

module.exports = router;
