const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { protect, adminOnly, optionalProtect } = require('../middleware/auth');
const { sendOrderConfirmationSMS, sendOrderConfirmationEmail } = require('../utils/emailNotifications');
const smsNotifications = require('../utils/smsNotifications');
const { generateInvoice } = require('../utils/invoiceGenerator');

const router = express.Router();

// Generate a 6-digit OTP
const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// POST /api/orders (Optional Auth - place order)
router.post('/', optionalProtect, async (req, res) => {
    try {
        const { items, total, paymentMethod, shippingAddress, referralCode, useWallet, walletUsed } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in order' });
        }

        // Validate stock for all items BEFORE creating order
        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: { id: true, title: true, stock: true }
            });

            if (!product) {
                return res.status(400).json({ error: `Product not found (ID: ${item.productId})` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for "${product.title}". Available: ${product.stock}, Requested: ${item.quantity}`
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
        if (useWallet && walletUsed > 0) {
            if (!req.user) {
                return res.status(401).json({ error: 'You must be logged in to use wallet balance' });
            }
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
            if (dbUser.walletBalance < walletUsed) {
                return res.status(400).json({ error: 'Insufficient wallet balance' });
            }
        }

        const otp = generateOtp();
        const isFullyPaidWithWallet = paymentMethod === 'wallet' && total === 0;

        // *** TRANSACTION: wallet deduction + order creation + stock decrement ***
        const order = await prisma.$transaction(async (tx) => {
            // 1. Deduct wallet balance (if applicable)
            if (useWallet && walletUsed > 0 && req.user) {
                await tx.user.update({
                    where: { id: req.user.id },
                    data: { walletBalance: { decrement: walletUsed } }
                });

                await tx.walletTransaction.create({
                    data: {
                        userId: req.user.id,
                        amount: walletUsed,
                        type: 'DEBIT',
                        description: 'Used for order placement'
                    }
                });
            }

            // 2. Create the order
            const createdOrder = await tx.order.create({
                data: {
                    userId: req.user ? req.user.id : null,
                    total,
                    status: isFullyPaidWithWallet ? 'Confirmed' : 'Processing',
                    paymentMethod: paymentMethod || 'pay_at_store',
                    paymentOtp: isFullyPaidWithWallet ? null : otp,
                    isPaid: isFullyPaidWithWallet,
                    shippingAddress: shippingAddress || null,
                    guestInfo: !req.user && shippingAddress ? { name: shippingAddress.fullName, phone: shippingAddress.phone, email: shippingAddress.email } : null,
                    referralCodeUsed: referrer ? referralCode.trim().toUpperCase() : null,
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                },
                include: {
                    items: { include: { product: true } },
                    user: true
                }
            });

            // 3. Decrement stock for each product (race-condition safe)
            for (const item of items) {
                const result = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        stock: { gte: item.quantity }
                    },
                    data: { stock: { decrement: item.quantity } }
                });

                if (result.count === 0) {
                    throw new Error(`Insufficient stock for product ID ${item.productId}. Please try again.`);
                }
            }

            return createdOrder;
        });

        // Send Confirmations
        const userPhone = req.user?.phone || shippingAddress?.phone;
        const userName = req.user?.name || shippingAddress?.fullName || 'Customer';
        const userEmail = req.user?.email || shippingAddress?.email;

        // 1. WhatsApp/SMS (via Fast2SMS) for OTP and basic confirmation
        if (userPhone && !isFullyPaidWithWallet) {
            try {
                await smsNotifications.sendOTP(userPhone, otp);
            } catch (err) {
                console.error('Failed to send WhatsApp/SMS:', err);
            }
        }

        // 2. Email Receipt (via Nodemailer)
        if (userEmail) {
            try {
                await sendOrderConfirmationEmail(userEmail, userName, order, isFullyPaidWithWallet ? null : otp);
            } catch (err) {
                console.error('Failed to send Email Receipt:', err);
            }
        }

        // *** ORDER-BASED REFERRAL REWARD ***
        // Referral reward will be processed when payment is verified

        res.status(201).json({
            ...order,
            paymentOtp: otp
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Server error' });
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
        const { page, limit, status } = req.query;

        const where = {};
        if (status) where.status = status;

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

        const order = await prisma.order.update({
            where: { id: orderId },
            data: { status }
        });

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
        const { otp } = req.body;
        const orderId = parseInt(req.params.id);

        const order = await prisma.order.findUnique({ where: { id: orderId } });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.isPaid) {
            return res.status(400).json({ error: 'Order is already paid' });
        }

        if (order.paymentOtp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Payment not verified.' });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                isPaid: true,
                paymentOtp: null,
                status: 'Confirmed'
            }
        });

        // *** REFERRAL REWARD - Credit points ONLY after payment verified ***
        if (order.referralCodeUsed) {
            try {
                // Prevent duplicate rewards if admin verifies twice
                const existingReferral = await prisma.referral.findFirst({
                    where: { orderId: order.id }
                });

                if (!existingReferral) {
                    // Get reward amount from settings or fallback to 200
                    const settings = await prisma.referralSettings.findFirst();
                    const rewardAmount = settings ? settings.pointsPerProductPurchase : 200;

                    // Find referrer by code
                    const referrer = await prisma.user.findFirst({
                        where: { referralCode: order.referralCodeUsed }
                    });

                    if (referrer && referrer.id !== order.userId) {
                        // Credit referrer
                        await prisma.user.update({
                            where: { id: referrer.id },
                            data: { walletBalance: { increment: rewardAmount } }
                        });

                        // Create referral record for referrer
                        await prisma.referral.create({
                            data: {
                                referrerId: referrer.id,
                                refereeId: order.userId,
                                status: 'rewarded',
                                rewardAmount,
                                orderId: order.id,
                                completedAt: new Date()
                            }
                        });

                        // Credit buyer (person who made purchase)
                        await prisma.user.update({
                            where: { id: order.userId },
                            data: { walletBalance: { increment: rewardAmount } }
                        });

                        console.log(`Referral reward: ₹${rewardAmount} credited to referrer ${referrer.id} and buyer ${order.userId} from order ${order.id}`);

                        // *** TIER SYSTEM UPDATE (If Enabled) ***
                        if (settings && settings.tierSystemEnabled) {
                            try {
                                const tiers = await prisma.tierConfig.findMany({ orderBy: { minPoints: 'desc' } });

                                // Update Referrer
                                const updatedReferrer = await prisma.user.update({
                                    where: { id: referrer.id },
                                    data: { tierPoints: { increment: rewardAmount } },
                                    select: { id: true, tierPoints: true, tier: true }
                                });
                                const newReferrerTier = tiers.find(t => updatedReferrer.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                if (newReferrerTier !== updatedReferrer.tier) {
                                    await prisma.user.update({ where: { id: referrer.id }, data: { tier: newReferrerTier } });
                                }

                                // Update Buyer
                                const updatedBuyer = await prisma.user.update({
                                    where: { id: order.userId },
                                    data: { tierPoints: { increment: rewardAmount } },
                                    select: { id: true, tierPoints: true, tier: true }
                                });
                                const newBuyerTier = tiers.find(t => updatedBuyer.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                if (newBuyerTier !== updatedBuyer.tier) {
                                    await prisma.user.update({ where: { id: order.userId }, data: { tier: newBuyerTier } });
                                }
                            } catch (tierErr) {
                                console.error('Tier system update error:', tierErr);
                            }
                        }
                    }
                } // end if (!existingReferral)
            } catch (refErr) {
                // Don't fail payment verification if referral reward fails
                console.error('Referral reward error (non-blocking):', refErr);
            }
        }

        // Send Order Confirmation Notifications
        if (order.user) {
            try {
                if (order.user.email) {
                    await sendOrderConfirmationEmail(order.user.email, order.id, order.total);
                }
                if (order.user.phone) {
                    await smsNotifications.sendOrderConfirmationSMS(order.user.phone, order.id, order.total);
                }
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
            include: { user: true, items: true }
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

            // 1. Refund wallet if paid
            if (order.isPaid) {
                await tx.user.update({
                    where: { id: order.userId },
                    data: { walletBalance: { increment: order.total } }
                });

                walletTx = await tx.walletTransaction.create({
                    data: {
                        userId: order.userId,
                        amount: order.total,
                        type: 'CREDIT',
                        description: `Refund for Cancelled Order #${order.id}`,
                        orderId: order.id
                    }
                });
            }

            // 2. Restore stock for all items
            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } }
                });
            }

            // 3. Update order status
            const updatedOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: 'Cancelled',
                    cancelReason: reason,
                    refundStatus: order.isPaid ? 'Processed' : 'None',
                    refundAmount: order.isPaid ? order.total : 0
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
            where: { id: parseInt(req.params.id) }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

        if (order.status !== 'Delivered') {
            return res.status(400).json({ error: 'Only delivered orders can be returned' });
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

        // Approve Return -> Refund to Wallet + optional stock restore
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: order.userId },
                data: { walletBalance: { increment: order.total } }
            });

            await tx.walletTransaction.create({
                data: {
                    userId: order.userId,
                    amount: order.total,
                    type: 'CREDIT',
                    description: `Refund for Returned Order #${order.id}`,
                    orderId: order.id
                }
            });

            // Restore stock if admin says the items are not defective
            if (restoreStock) {
                for (const item of order.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                }
            }
        });

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
                returnStatus: 'Completed',
                refundStatus: 'Processed',
                refundAmount: order.total
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
                user: true,
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
