import express from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { protect, adminOnly, optionalProtect } from '../middleware/auth.js';
import { sendOrderConfirmationEmail } from '../utils/emailNotifications.js';
import { generateInvoice } from '../utils/invoiceGenerator.js';
import { calculateOrderReferralPoints } from '../utils/referralHelper.js';
import { createUserNotification, createAdminNotification } from '../utils/notifications.js';
import { logAudit } from '../utils/auditLog.js';
import { syncRecord } from '../utils/sheetsSync.js';

const router = express.Router();

const checkoutTimingEnabled = process.env.CHECKOUT_TIMING_LOGS === 'true';

function logCheckoutTiming(requestId, stage, startMs) {
    if (!checkoutTimingEnabled) return;
    console.log(`[CHECKOUT][${requestId}] ${stage} +${Date.now() - startMs}ms`);
}

function aggregateItemQuantities(items = []) {
    const productIncrements = new Map();
    const variantIncrements = new Map();

    for (const item of items) {
        const quantity = Number(item.quantity) || 0;
        if (quantity <= 0) continue;

        if (item.variantId) {
            const variantId = Number(item.variantId);
            if (Number.isFinite(variantId)) {
                variantIncrements.set(variantId, (variantIncrements.get(variantId) || 0) + quantity);
            }
            continue;
        }

        if (item.productId == null || item.productId === '') continue;
        const productId = Number(item.productId);
        if (Number.isFinite(productId) && productId > 0) {
            productIncrements.set(productId, (productIncrements.get(productId) || 0) + quantity);
        }
    }

    return { productIncrements, variantIncrements };
}

async function restoreStockForOrderItems(dbClient, items = []) {
    const { productIncrements, variantIncrements } = aggregateItemQuantities(items);
    const stockUpdates = [];

    for (const [variantId, quantity] of variantIncrements.entries()) {
        stockUpdates.push(
            dbClient.productVariant.update({
                where: { id: variantId },
                data: { stock: { increment: quantity } }
            })
        );
    }

    for (const [productId, quantity] of productIncrements.entries()) {
        stockUpdates.push(
            dbClient.product.update({
                where: { id: productId },
                data: { stock: { increment: quantity } }
            })
        );
    }

    if (stockUpdates.length > 0) {
        await Promise.all(stockUpdates);
    }
}

// POST /api/orders (Optional Auth - place order)
router.post('/', optionalProtect, async (req, res) => {
    const checkoutStart = Date.now();
    const checkoutRequestId = `ord-${checkoutStart}-${Math.floor(Math.random() * 10000)}`;
    try {
        const { items: rawItems, total, paymentMethod, shippingAddress, referralCode, useWallet, walletUsed, latitude, longitude, googleMapLink, couponCode, discountAmount, giftWrap, giftMessage, bundleServiceSchedules, serviceOnlyBundles } = req.body;
        const items = Array.isArray(rawItems) ? rawItems : [];

        const hasServiceOnlyBundles = Array.isArray(serviceOnlyBundles) && serviceOnlyBundles.length > 0;
        if (items.length === 0 && !hasServiceOnlyBundles) {
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

        const DELIVERY_PINCODE = '207001';
        if (shippingAddress && String(shippingAddress.postalCode || '').trim() !== DELIVERY_PINCODE) {
            return res.status(400).json({
                error: `We currently deliver only to PIN ${DELIVERY_PINCODE} (Etah, Uttar Pradesh).`,
            });
        }

        const normalizedPaymentMethod = paymentMethod || 'pay_at_store';

        // 2. Validate stock for all items BEFORE creating order (Optimized for "alot of products")
        const productIds = [...new Set(items.map(i => parseInt(i.productId, 10)).filter(Number.isFinite))];
        const variantIds = [...new Set(items.filter(i => i.variantId).map(i => parseInt(i.variantId, 10)).filter(Number.isFinite))];

        const [dbProducts, dbVariants] = await Promise.all([
            prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, title: true, stock: true, price: true }
            }),
            prisma.productVariant.findMany({
                where: { id: { in: variantIds } },
                select: { id: true, name: true, stock: true, productId: true, price: true }
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
                    error: `Insufficient stock for "${variant.name || 'Variant'}". Available: ${variant.stock}, Requested: ${requested}`
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

        // Fetch quantity tiers for products in the order
        const allProductIds = [...new Set(items.filter(i => !i.variantId).map(i => parseInt(i.productId, 10)))];
        const quantityTiers = allProductIds.length > 0
            ? await prisma.quantityTier.findMany({ where: { productId: { in: allProductIds } }, orderBy: { minQty: 'desc' } })
            : [];
        const tiersByProduct = {};
        for (const tier of quantityTiers) {
            if (!tiersByProduct[tier.productId]) tiersByProduct[tier.productId] = [];
            tiersByProduct[tier.productId].push(tier);
        }

        // Compute server-side total from DB prices (with quantity tier pricing)
        let computedSubtotal = 0;
        for (const item of items) {
            const qty = parseInt(item.quantity, 10);
            if (item.variantId) {
                const variant = variantMap.get(parseInt(item.variantId, 10));
                if (variant) computedSubtotal += variant.price * qty;
            } else {
                const pid = parseInt(item.productId, 10);
                const product = productMap.get(pid);
                if (product) {
                    const tiers = tiersByProduct[pid];
                    let unitPrice = product.price;
                    if (tiers && tiers.length > 0) {
                        const totalQtyForProduct = totalRequestedProducts[pid] || qty;
                        const applicableTier = tiers.find(t => totalQtyForProduct >= t.minQty);
                        if (applicableTier) unitPrice = applicableTier.price;
                    }
                    computedSubtotal += unitPrice * qty;
                }
            }
        }

        // Apply bundle pricing adjustments: replace catalog-price sum with actual bundle price
        const bundleGroups = {};
        for (const item of items) {
            if (item.bundleInstanceId && item.bundleId) {
                if (!bundleGroups[item.bundleInstanceId]) {
                    bundleGroups[item.bundleInstanceId] = { bundleId: String(item.bundleId), items: [] };
                }
                bundleGroups[item.bundleInstanceId].items.push(item);
            }
        }

        for (const [, group] of Object.entries(bundleGroups)) {
            let groupCatalogTotal = 0;
            for (const item of group.items) {
                const qty = parseInt(item.quantity, 10);
                if (item.variantId) {
                    const variant = variantMap.get(parseInt(item.variantId, 10));
                    if (variant) groupCatalogTotal += variant.price * qty;
                } else {
                    const pid = parseInt(item.productId, 10);
                    const product = productMap.get(pid);
                    if (product) {
                        const tiers = tiersByProduct[pid];
                        let unitPrice = product.price;
                        if (tiers && tiers.length > 0) {
                            const totalQtyForProduct = totalRequestedProducts[pid] || qty;
                            const applicableTier = tiers.find(t => totalQtyForProduct >= t.minQty);
                            if (applicableTier) unitPrice = applicableTier.price;
                        }
                        groupCatalogTotal += unitPrice * qty;
                    }
                }
            }

            let bundlePrice = groupCatalogTotal;
            const bundleIdStr = group.bundleId;

            if (bundleIdStr.startsWith('byob-')) {
                const templateId = parseInt(bundleIdStr.split('-')[1]);
                if (Number.isFinite(templateId)) {
                    const template = await prisma.bundleTemplate.findUnique({
                        where: { id: templateId },
                        select: { discount: true, isActive: true },
                    });
                    if (template && template.isActive) {
                        bundlePrice = Math.round(groupCatalogTotal * (1 - template.discount / 100));
                    }
                }
            } else {
                const numBundleId = parseInt(bundleIdStr);
                if (Number.isFinite(numBundleId)) {
                    const bundle = await prisma.bundle.findUnique({
                        where: { id: numBundleId },
                        select: { bundlePrice: true, isActive: true },
                    });
                    if (bundle && bundle.isActive) {
                        bundlePrice = bundle.bundlePrice;
                    }
                }
            }

            computedSubtotal = computedSubtotal - groupCatalogTotal + bundlePrice;
        }

        // Add service-only bundle prices (bundles with no products, only services)
        if (hasServiceOnlyBundles) {
            for (const sob of serviceOnlyBundles) {
                const bundleId = parseInt(sob.bundleId, 10);
                if (!Number.isFinite(bundleId)) continue;
                const bundle = await prisma.bundle.findUnique({
                    where: { id: bundleId },
                    select: { bundlePrice: true, isActive: true },
                });
                if (bundle && bundle.isActive) {
                    computedSubtotal += bundle.bundlePrice;
                }
            }
        }

        // Server-side coupon validation
        let serverDiscount = 0;
        let validatedCoupon = null;
        if (couponCode && String(couponCode).trim()) {
            validatedCoupon = await prisma.coupon.findUnique({
                where: { code: String(couponCode).trim().toUpperCase() },
            });
            if (!validatedCoupon || !validatedCoupon.active) {
                return res.status(400).json({ error: 'Invalid or inactive coupon code' });
            }
            if (validatedCoupon.expiresAt && validatedCoupon.expiresAt < new Date()) {
                return res.status(400).json({ error: 'Coupon has expired' });
            }
            if (validatedCoupon.maxUses != null && validatedCoupon.usedCount >= validatedCoupon.maxUses) {
                return res.status(400).json({ error: 'Coupon usage limit reached' });
            }
            if (validatedCoupon.minOrderAmount != null && computedSubtotal < validatedCoupon.minOrderAmount) {
                return res.status(400).json({ error: `Minimum order amount of ₹${validatedCoupon.minOrderAmount} required for this coupon` });
            }
            if (validatedCoupon.discountType === 'percent') {
                serverDiscount = Math.round(computedSubtotal * (validatedCoupon.value / 100) * 100) / 100;
            } else {
                serverDiscount = validatedCoupon.value;
            }
            serverDiscount = Math.min(serverDiscount, computedSubtotal);
        }

        const serverTotal = Math.round((computedSubtotal - serverDiscount) * 1.18);
        const tolerance = Math.max(2, serverTotal * 0.01);
        if (Math.abs(serverTotal - parsedTotal - (parsedWalletUsed || 0)) > tolerance && Math.abs(serverTotal - parsedTotal) > tolerance) {
            const totalPlusWallet = parsedTotal + parsedWalletUsed;
            if (Math.abs(serverTotal - totalPlusWallet) > tolerance && Math.abs(serverTotal - parsedTotal) > tolerance) {
                return res.status(400).json({ error: 'Order total mismatch. Please refresh and try again.' });
            }
        }

        logCheckoutTiming(checkoutRequestId, 'pre_validation_complete', checkoutStart);

        const isFullyPaidWithWallet = useWallet && req.user && parsedWalletUsed >= parsedTotal;
        const shouldGeneratePaymentOtp = !isFullyPaidWithWallet && ['pay_at_store', 'cod'].includes(normalizedPaymentMethod);
        const paymentOtp = shouldGeneratePaymentOtp ? crypto.randomInt(100000, 999999).toString() : null;

        // *** TRANSACTION: wallet deduction + order creation + stock decrement ***
        const newOrderId = await prisma.$transaction(async (tx) => {
            // 1. Deduct wallet balance (if applicable)
            if (useWallet && parsedWalletUsed > 0 && req.user) {
                const updatedWallet = await tx.user.updateMany({
                    where: {
                        id: req.user.id,
                        walletBalance: { gte: parsedWalletUsed } // SECURE: DB-level constraint prevents race condition
                    },
                    data: { walletBalance: { decrement: parsedWalletUsed } }
                });

                if (updatedWallet.count === 0) {
                    throw new Error('Insufficient wallet balance during transaction processing');
                }
            }

            // 1.5 Real-time Stock Validation
            for (const [variantId, quantityValue] of Object.entries(totalRequestedVariants)) {
                const quantity = parseInt(quantityValue, 10);
                const currentVariant = await tx.productVariant.findUnique({
                    where: { id: parseInt(variantId, 10) },
                    select: { stock: true, name: true }
                });
                if (!currentVariant || currentVariant.stock < quantity) {
                    throw new Error(`Insufficient stock for "${currentVariant?.name || 'Variant ' + variantId}". Available: ${currentVariant?.stock || 0}, Requested: ${quantity}`);
                }
            }

            for (const [productId, quantityValue] of Object.entries(totalRequestedProducts)) {
                const quantity = parseInt(quantityValue, 10);
                const currentProduct = await tx.product.findUnique({
                    where: { id: parseInt(productId, 10) },
                    select: { stock: true, title: true }
                });
                if (!currentProduct || currentProduct.stock < quantity) {
                    throw new Error(`Insufficient stock for "${currentProduct?.title || 'Product ' + productId}". Available: ${currentProduct?.stock || 0}, Requested: ${quantity}`);
                }
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

            // 3. Create the order, then bulk-insert items separately to avoid
            //    Prisma XOR ambiguity between OrderCreateInput / OrderUncheckedCreateInput.
            const orderData = {
                total: parsedTotal,
                walletUsed: parsedWalletUsed,
                status: isFullyPaidWithWallet ? 'Confirmed' : 'Processing',
                paymentMethod: normalizedPaymentMethod,
                paymentOtp,
                isPaid: isFullyPaidWithWallet,
                shippingAddress: shippingAddress || null,
                guestInfo: !req.user && shippingAddress ? { name: shippingAddress.fullName, phone: shippingAddress.phone, email: shippingAddress.email } : null,
                referralCodeUsed: referrer ? referralCode.trim().toUpperCase() : null,
                couponCode: validatedCoupon ? validatedCoupon.code : null,
                discountAmount: serverDiscount,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                googleMapLink: googleMapLink || null,
                giftWrap: giftWrap || false,
                giftMessage: giftWrap && giftMessage ? String(giftMessage).slice(0, 300) : null,
            };
            if (req.user) {
                orderData.user = { connect: { id: req.user.id } };
            }

            const createdOrder = await tx.order.create({ data: orderData });

            const orderItemsData = items.length > 0
                ? items.map(item => {
                    const pId = parseInt(item.productId, 10);
                    const vId = item.variantId ? parseInt(item.variantId, 10) : null;
                    const qty = parseInt(item.quantity, 10);

                    let actualPrice;
                    if (vId !== null) {
                        actualPrice = variantMap.get(vId)?.price;
                    } else {
                        const product = productMap.get(pId);
                        actualPrice = product?.price;
                        const tiers = tiersByProduct[pId];
                        if (tiers && tiers.length > 0) {
                            const totalQtyForProduct = totalRequestedProducts[pId] || qty;
                            const applicableTier = tiers.find(t => totalQtyForProduct >= t.minQty);
                            if (applicableTier) actualPrice = applicableTier.price;
                        }
                    }

                    if (isNaN(pId) || isNaN(qty) || actualPrice === undefined || actualPrice === null) {
                        throw new Error('Invalid item data in cart');
                    }

                    const bundleIdStr = item.bundleId ? String(item.bundleId) : '';
                    let numericBundleId = null;
                    let bundleTemplateId = null;

                    if (bundleIdStr.startsWith('byob-')) {
                        const tplId = parseInt(bundleIdStr.split('-')[1], 10);
                        if (Number.isFinite(tplId)) bundleTemplateId = tplId;
                    } else if (bundleIdStr) {
                        const parsed = parseInt(bundleIdStr, 10);
                        if (Number.isFinite(parsed)) numericBundleId = parsed;
                    }

                    return {
                        orderId: createdOrder.id,
                        productId: pId,
                        variantId: vId,
                        quantity: qty,
                        price: actualPrice,
                        bundleId: numericBundleId,
                        bundleTemplateId,
                        bundleInstanceId: item.bundleInstanceId || null,
                    };
                })
                : [];

            if (hasServiceOnlyBundles) {
                for (const sob of serviceOnlyBundles) {
                    const bid = parseInt(sob.bundleId, 10);
                    if (!Number.isFinite(bid)) continue;
                    const b = await tx.bundle.findUnique({
                        where: { id: bid },
                        select: { id: true, bundlePrice: true, isActive: true },
                    });
                    if (!b || !b.isActive) continue;
                    orderItemsData.push({
                        orderId: createdOrder.id,
                        productId: null,
                        variantId: null,
                        quantity: 1,
                        price: b.bundlePrice,
                        bundleId: bid,
                        bundleTemplateId: null,
                        bundleInstanceId: sob.bundleInstanceId || null,
                    });
                }
            }

            if (orderItemsData.length > 0) {
                await tx.orderItem.createMany({ data: orderItemsData });
            }

            // 3.5 Increment coupon usedCount (race-safe: conditional update)
            if (validatedCoupon) {
                const couponWhere = { id: validatedCoupon.id };
                if (validatedCoupon.maxUses != null) {
                    couponWhere.usedCount = { lt: validatedCoupon.maxUses };
                }
                const couponUpdate = await tx.coupon.updateMany({
                    where: couponWhere,
                    data: { usedCount: { increment: 1 } },
                });
                if (couponUpdate.count === 0) {
                    throw new Error('Coupon usage limit reached during checkout');
                }
            }

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

            return createdOrder.id; // return id only; full fetch happens outside tx
        }, {
            maxWait: 10000,
            timeout: 20000  // bumped from 15 s; real fix is the removed include above
        });

        // Fetch full order AFTER the transaction has committed — no tx lock held here
        const order = await prisma.order.findUnique({
            where: { id: newOrderId },
            include: {
                items: {
                    include: {
                        product: true,
                        bundle: { select: { id: true, name: true, image: true, bundlePrice: true } },
                        bundleTemplate: { select: { id: true, name: true, discount: true } },
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        referralCode: true,
                        walletBalance: true,
                        createdAt: true
                    }
                }
            }
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
                createUserNotification({
                    userId,
                    title: `Payment OTP for Order #${order.id}`,
                    message: `Your payment OTP is ${order.paymentOtp}. Share it while making payment.`,
                    type: 'order',
                    link: '/dashboard/orders',
                    push: {
                        enabled: true,
                        title: 'Payment OTP Ready',
                        body: 'Your payment OTP is available in Shoptify.',
                    },
                }).catch((notifErr) => {
                    console.error('Order OTP notification error (non-blocking):', notifErr);
                });
            }

            // Admin notification: new order placed
            createAdminNotification({
                title: 'New Order Placed',
                message: `Order #${order.id} — ₹${order.total.toLocaleString('en-IN')} (${order.items.length} item${order.items.length > 1 ? 's' : ''})`,
                type: 'admin',
                link: '/admin/orders',
            }).catch(() => {});

            // Low-stock alerts for admins (uses fresh DB data post-transaction)
            const LOW_STOCK_THRESHOLD = 5;
            (async () => {
                try {
                    for (const item of order.items) {
                        const prod = item.product;
                        if (!prod) continue;

                        let stockToCheck = prod.stock;
                        let stockLabel = prod.title;

                        if (item.variantId) {
                            const variant = await prisma.productVariant.findUnique({
                                where: { id: item.variantId },
                                select: { stock: true, name: true },
                            });
                            if (variant) {
                                stockToCheck = variant.stock;
                                stockLabel = `${prod.title} — ${variant.name || 'variant'}`;
                            }
                        }

                        if (stockToCheck <= LOW_STOCK_THRESHOLD && stockToCheck > 0) {
                            createAdminNotification({
                                title: 'Low Stock Alert',
                                message: `"${stockLabel}" has only ${stockToCheck} units left.`,
                                type: 'admin',
                                link: '/admin/products',
                            }).catch(() => {});
                        }
                    }
                } catch (err) {
                    console.error('Low-stock alert check error (non-blocking):', err);
                }
            })();

            // Auto-create service bookings for bundle orders that include services.
            if (userId) {
                (async () => {
                    const schedules = bundleServiceSchedules || {};

                    // Collect all bundle IDs from product items + service-only bundles
                    const productBundleIds = [...new Set(items.filter(i => i.bundleId).map(i => parseInt(i.bundleId)))].filter(Number.isFinite);
                    const serviceOnlyBundleIds = hasServiceOnlyBundles
                        ? serviceOnlyBundles.map(s => parseInt(s.bundleId, 10)).filter(Number.isFinite)
                        : [];
                    const allBundleIds = [...new Set([...productBundleIds, ...serviceOnlyBundleIds])];
                    if (allBundleIds.length === 0) return;

                    const bundlesWithItems = await prisma.bundle.findMany({
                        where: { id: { in: allBundleIds }, isActive: true },
                        include: {
                            items: {
                                include: { serviceType: true }
                            }
                        }
                    });

                    const orderedProductIds = new Set(items.map(i => parseInt(i.productId, 10)).filter(Number.isFinite));
                    const serviceOnlyBundleIdSet = new Set(serviceOnlyBundleIds);

                    const bundleIdToInstanceId = {};
                    for (const item of items) {
                        if (item.bundleId && item.bundleInstanceId) {
                            bundleIdToInstanceId[String(item.bundleId)] = item.bundleInstanceId;
                        }
                    }
                    if (hasServiceOnlyBundles) {
                        for (const sob of serviceOnlyBundles) {
                            if (sob.bundleId && sob.bundleInstanceId) {
                                bundleIdToInstanceId[String(sob.bundleId)] = sob.bundleInstanceId;
                            }
                        }
                    }

                    for (const bundle of bundlesWithItems) {
                        const isServiceOnlyBundle = serviceOnlyBundleIdSet.has(bundle.id);
                        if (!isServiceOnlyBundle) {
                            const bundleProductIds = bundle.items
                                .filter(bi => bi.itemType === 'product' && bi.productId)
                                .map(bi => bi.productId);
                            const hasMatchingProducts = bundleProductIds.some(pid => orderedProductIds.has(pid));
                            if (!hasMatchingProducts) continue;
                        }

                        const instanceId = bundleIdToInstanceId[String(bundle.id)];
                        const schedule = instanceId ? schedules[instanceId] : null;

                        for (const bi of bundle.items) {
                            if (bi.itemType === 'service' && bi.serviceType) {
                                const addr = order.shippingAddress || {};
                                const serviceDate = schedule?.date ? new Date(schedule.date) : new Date();
                                const timeSlot = schedule?.timeSlot || null;

                                await prisma.serviceBooking.create({
                                    data: {
                                        userId,
                                        orderId: order.id,
                                        serviceType: bi.serviceType.title,
                                        description: `Bundle service: ${bundle.name} (Order #${order.id})`,
                                        status: 'Pending',
                                        date: serviceDate,
                                        timeSlot,
                                        customerName: addr.fullName || null,
                                        customerPhone: addr.phone || null,
                                        address: addr.address || null,
                                        city: addr.city || null,
                                        pincode: addr.postalCode || null,
                                    }
                                });
                            }
                        }
                    }
                })().catch(err => console.error('Bundle service auto-booking error (non-blocking):', err));
            }

            syncRecord('Orders', order).catch(console.error);

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
        if (error.message && (error.message.includes('Insufficient stock') || error.message.includes('Invalid item data') || error.message.includes('Insufficient wallet balance') || error.message.includes('Coupon usage limit'))) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error. Our team has been notified.' });
    }
});

// GET /api/orders/detail/:id (Protected - single order detail for user or admin)
router.get('/detail/:id', protect, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, title: true, images: true, price: true, stock: true, isReturnable: true, returnWindowDays: true, category: true }
                        },
                        variant: { select: { id: true, name: true, combination: true, price: true, sku: true, image: true } },
                        bundle: { select: { id: true, name: true, image: true, bundlePrice: true, description: true } },
                        bundleTemplate: { select: { id: true, name: true, discount: true } },
                    }
                },
                user: {
                    select: { id: true, name: true, email: true, phone: true }
                }
            }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (order.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get order detail error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/orders/my-orders (Protected - user's orders with pagination)
router.get('/my-orders', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const [orders, total] = await prisma.$transaction([
            prisma.order.findMany({
                where: { userId: req.user.id },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    total: true,
                    walletUsed: true,
                    status: true,
                    paymentMethod: true,
                    paymentOtp: true,
                    isPaid: true,
                    shippingAddress: true,
                    latitude: true,
                    longitude: true,
                    googleMapLink: true,
                    guestInfo: true,
                    referralCodeUsed: true,
                    cancelReason: true,
                    returnReason: true,
                    returnStatus: true,
                    refundStatus: true,
                    refundAmount: true,
                    deliveredAt: true,
                    createdAt: true,
                    items: {
                        select: {
                            id: true,
                            productId: true,
                            variantId: true,
                            quantity: true,
                            price: true,
                            bundleId: true,
                            bundleInstanceId: true,
                            bundleTemplateId: true,
                            product: {
                                select: {
                                    id: true,
                                    title: true,
                                    images: true,
                                    price: true,
                                    stock: true,
                                    isReturnable: true,
                                    returnWindowDays: true
                                }
                            },
                            bundle: { select: { id: true, name: true, image: true, bundlePrice: true } },
                            bundleTemplate: { select: { id: true, name: true } },
                        }
                    }
                }
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
            select: {
                id: true,
                total: true,
                status: true,
                isPaid: true,
                createdAt: true,
                items: { select: { id: true } }
            },
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

// GET /api/orders (Admin - paginated with status/search filters)
// ?page=1&limit=20&status=Processing
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const parsedPage = Number.parseInt(page, 10);
        const parsedLimit = Number.parseInt(limit, 10);
        const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        const take = Math.min(20, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 20));
        const skip = (currentPage - 1) * take;

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

        const select = {
            id: true,
            userId: true,
            total: true,
            walletUsed: true,
            status: true,
            paymentMethod: true,
            paymentOtp: true,
            isPaid: true,
            shippingAddress: true,
            latitude: true,
            longitude: true,
            googleMapLink: true,
            guestInfo: true,
            referralCodeUsed: true,
            cancelReason: true,
            returnReason: true,
            returnStatus: true,
            refundStatus: true,
            refundAmount: true,
            deliveredAt: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: {
                select: {
                    id: true,
                    productId: true,
                    variantId: true,
                    quantity: true,
                    price: true,
                    bundleId: true,
                    bundleInstanceId: true,
                    bundleTemplateId: true,
                    product: { select: { id: true, title: true, images: true } },
                    bundle: { select: { id: true, name: true, image: true, bundlePrice: true } },
                    bundleTemplate: { select: { id: true, name: true } },
                }
            }
        };

        const [orders, total] = await Promise.all([
            prisma.order.findMany({ where, select, orderBy: { createdAt: 'desc' }, take, skip }),
            prisma.order.count({ where }),
        ]);

        res.json({
            data: orders,
            total,
            page: currentPage,
            limit: take,
            totalPages: Math.ceil(total / take),
        });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/orders/:id/status (Admin - update order status)
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const VALID_STATUSES = ['Processing', 'Confirmed', 'Shipped', 'OutForDelivery', 'Delivered', 'Cancelled'];
        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
        }
        const orderId = parseInt(req.params.id);
        if (Number.isNaN(orderId)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        const orderWithItems = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } } }
        });

        if (!orderWithItems) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // If cancelling, restore stock inside a transaction
        if (status === 'Cancelled') {
            if (orderWithItems.status !== 'Cancelled') {
                await prisma.$transaction(async (tx) => {
                    await restoreStockForOrderItems(tx, orderWithItems.items);
                    await tx.order.update({ where: { id: orderId }, data: { status: 'Cancelled' } });
                });
            }
        }

        const updateData = { status };
        let instantReferralInjection = false;

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

        const previousStatus = orderWithItems?.status;
        const order = await prisma.order.update({
            where: { id: orderId },
            data: updateData
        });

        logAudit({
            userId: req.user.id, action: 'STATUS_CHANGE', entity: 'Order', entityId: orderId,
            details: { before: { status: previousStatus }, after: { status } },
            req,
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
                            await prisma.$transaction(async (tx) => {
                                await tx.user.update({
                                    where: { id: referrer.id },
                                    data: { walletBalance: { increment: referrerPoints } }
                                });

                                await tx.referral.create({
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

                                if (orderWithItems.userId) {
                                    await tx.user.update({
                                        where: { id: orderWithItems.userId },
                                        data: { walletBalance: { increment: refereePoints } }
                                    });
                                }

                                const tierSettings = await tx.referralSettings.findFirst();
                                if (tierSettings && tierSettings.tierSystemEnabled) {
                                    const tiers = await tx.tierConfig.findMany({ orderBy: { minPoints: 'desc' } });

                                    const upRef = await tx.user.update({
                                        where: { id: referrer.id },
                                        data: { tierPoints: { increment: referrerPoints } },
                                        select: { id: true, tierPoints: true, tier: true }
                                    });
                                    const nRT = tiers.find(t => upRef.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                    if (nRT !== upRef.tier) await tx.user.update({ where: { id: referrer.id }, data: { tier: nRT } });

                                    if (orderWithItems.userId) {
                                        const upBuy = await tx.user.update({
                                            where: { id: orderWithItems.userId },
                                            data: { tierPoints: { increment: refereePoints } },
                                            select: { id: true, tierPoints: true, tier: true }
                                        });
                                        const nBT = tiers.find(t => upBuy.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                        if (nBT !== upBuy.tier) await tx.user.update({ where: { id: orderWithItems.userId }, data: { tier: nBT } });
                                    }
                                }
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('Instant referral log error (non-blocking):', err);
            }
        }

        // Send In-App Notification (skip for guest orders)
        if (order.userId) {
            try {
                await createUserNotification({
                    userId: order.userId,
                    title: 'Order Status Updated',
                    message: `Your order #${order.id} is now ${status}.`,
                    type: 'order',
                    link: '/dashboard/orders',
                    push: {
                        enabled: true,
                        body: `Your order #${order.id} is now ${status}.`,
                    },
                });
            } catch (notifErr) {
                console.error('In-app notification error:', notifErr);
            }
        }

        syncRecord('Orders', order).catch(console.error);

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

        logAudit({
            userId: req.user.id, action: 'PAYMENT_VERIFY', entity: 'Order', entityId: orderId,
            details: { before: { isPaid: false, status: order.status }, after: { isPaid: true, status: updatedOrder.status } },
            req,
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
                            await prisma.$transaction(async (tx) => {
                                await tx.user.update({
                                    where: { id: referrer.id },
                                    data: { walletBalance: { increment: referrerPoints } }
                                });

                                await tx.referral.create({
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

                                if (order.userId) {
                                    await tx.user.update({
                                        where: { id: order.userId },
                                        data: { walletBalance: { increment: refereePoints } }
                                    });
                                }

                                const tierSettings = await tx.referralSettings.findFirst();
                                if (tierSettings && tierSettings.tierSystemEnabled) {
                                    const tiers = await tx.tierConfig.findMany({ orderBy: { minPoints: 'desc' } });

                                    const upRef = await tx.user.update({
                                        where: { id: referrer.id },
                                        data: { tierPoints: { increment: referrerPoints } },
                                        select: { id: true, tierPoints: true, tier: true }
                                    });
                                    const nRT = tiers.find(t => upRef.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                    if (nRT !== upRef.tier) await tx.user.update({ where: { id: referrer.id }, data: { tier: nRT } });

                                    if (order.userId) {
                                        const upBuy = await tx.user.update({
                                            where: { id: order.userId },
                                            data: { tierPoints: { increment: refereePoints } },
                                            select: { id: true, tierPoints: true, tier: true }
                                        });
                                        const nBT = tiers.find(t => upBuy.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                        if (nBT !== upBuy.tier) await tx.user.update({ where: { id: order.userId }, data: { tier: nBT } });
                                    }
                                }
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('Instant referral log error (verify-payment):', err);
            }
        }

        res.json({ success: true, message: 'Payment verified successfully!', order: updatedOrder });

        // Post-response: don't block admin UX on SMTP/notification latency
        setImmediate(() => {
            if (order.user?.email) {
                sendOrderConfirmationEmail(order.user.email, order.id, order.total, {
                    paymentMethod: order.paymentMethod,
                    isPaid: true
                }).catch(err => console.error('Order confirmation email error:', err));
            }

            if (order.userId) {
                createUserNotification({
                    userId: order.userId,
                    title: 'Payment Verified',
                    message: `Payment received for order #${order.id}. Your order is now ${updatedOrder.status}.`,
                    type: 'order',
                    link: '/dashboard/orders',
                    push: {
                        enabled: true,
                        title: 'Order Confirmed',
                        body: `Payment received for order #${order.id}.`,
                    },
                }).catch(err => console.error('Payment verification notification error:', err));
            }
        });
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
            await restoreStockForOrderItems(tx, order.items);

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
        res.status(500).json({ error: 'Failed to cancel order' });
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
        console.error('Request return error:', error);
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

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'action must be "approve" or "reject"' });
        }

        if (order.returnStatus !== 'Requested') {
            return res.status(400).json({ error: 'Return must be in "Requested" status to process' });
        }

        if (action === 'reject') {
            const updatedOrder = await prisma.order.update({
                where: { id: order.id },
                data: { returnStatus: 'Rejected' }
            });
            logAudit({
                userId: req.user.id, action: 'REFUND_REJECT', entity: 'Order', entityId: order.id,
                details: { before: { returnStatus: order.returnStatus }, after: { returnStatus: 'Rejected' } },
                req,
            });
            return res.json(updatedOrder);
        }

        // Approve Return -> Refund full amount (cash portion + wallet portion) to Wallet
        if (!order.userId) {
            return res.status(400).json({ error: 'Cannot process wallet refund for guest orders' });
        }
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
                await restoreStockForOrderItems(tx, order.items);
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

        logAudit({
            userId: req.user.id, action: 'REFUND_APPROVE', entity: 'Order', entityId: order.id,
            details: { refundAmount: fullRefundAmount, restoreStock, after: { returnStatus: 'Completed', refundStatus: 'Processed' } },
            req,
        });

        res.json({ message: 'Return approved and refunded', order: updatedOrder });
    } catch (error) {
        console.error('Process refund error:', error);
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
                items: {
                    include: {
                        product: true,
                        bundle: { select: { id: true, name: true, bundlePrice: true } },
                        bundleTemplate: { select: { id: true, name: true, discount: true } }
                    }
                }
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

export default router;
