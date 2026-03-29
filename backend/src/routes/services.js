import express from 'express';
import prisma from '../lib/prisma.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sendServiceBookingEmail } from '../utils/emailNotifications.js';
import { sendServiceNotification } from '../utils/serviceNotifications.js';
import { calculateReferralReward } from '../utils/referralHelper.js';
import { generateServiceInvoicePdf } from '../utils/serviceInvoiceGenerator.js';
import { createUserNotification } from '../utils/notifications.js';

const router = express.Router();

const DEFAULT_SERVICE_SETTINGS = {
    timeSlots: ["10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM", "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM"],
    maxBookingsPerSlot: 2
};
const DB_UNAVAILABLE_MESSAGE = 'Unable to connect to database right now. Please try again in a minute.';

const getDefaultServiceSettings = () => ({
    timeSlots: [...DEFAULT_SERVICE_SETTINGS.timeSlots],
    maxBookingsPerSlot: DEFAULT_SERVICE_SETTINGS.maxBookingsPerSlot
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isDbUnavailableError = (error) =>
    error && (error.code === 'P1001' || (typeof error.message === 'string' && error.message.includes("Can't reach database server")));

const withDbRetry = async (operation, retries = 1, retryDelayMs = 1200) => {
    let attempt = 0;
    while (true) {
        try {
            return await operation();
        } catch (error) {
            if (!isDbUnavailableError(error) || attempt >= retries) {
                throw error;
            }
            attempt += 1;
            await wait(retryDelayMs * attempt);
        }
    }
};

const getServiceSettings = async () => {
    if (!prisma.serviceSettings || typeof prisma.serviceSettings.findFirst !== 'function') {
        return getDefaultServiceSettings();
    }
    const settings = await withDbRetry(() => prisma.serviceSettings.findFirst());
    return settings || getDefaultServiceSettings();
};

import crypto from 'crypto';

/** Generate a 6-digit numeric OTP string (cryptographically secure) */
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

/**
 * Safe booking select — always excludes pickupOtp from responses.
 * OTP is only surfaced via notification emails.
 */
const BOOKING_SAFE_SELECT = {
    id: true,
    userId: true,
    serviceType: true,
    description: true,
    deviceType: true,
    deviceBrand: true,
    customFields: true,
    date: true,
    timeSlot: true,
    status: true,
    referralCodeUsed: true,
    customerName: true,
    customerPhone: true,
    address: true,
    city: true,
    pincode: true,
    landmark: true,
    latitude: true,
    longitude: true,
    googleMapLink: true,
    estimatedPrice: true,
    finalPrice: true,
    adminNotes: true,
    assignedTo: true,
    // pickupOtp and deliveryOtp intentionally excluded
    otpVerified: true,
    otpGeneratedAt: true,
    deliveryOtpVerified: true,
    deliveryOtpGeneratedAt: true,
    technicianId: true,
    estimatedCompletionDate: true,
    invoiceUrl: true,
    cancelledAt: true,
    cancellationReason: true,
    customerRating: true,
    customerReview: true,
    confirmedAt: true,
    pickedUpAt: true,
    completedAt: true,
    deliveredAt: true,
    createdAt: true,
    user: { select: { id: true, name: true, email: true, phone: true } },
    technician: { select: { id: true, name: true, phone: true, skills: true } },
    invoice: true
};

/** Admin list/detail — includes pickupOtp and deliveryOtp */
const BOOKING_ADMIN_SELECT = { ...BOOKING_SAFE_SELECT, pickupOtp: true, deliveryOtp: true };

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/available-slots (Public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/available-slots', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'Date is required' });

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const bookings = await withDbRetry(() => prisma.serviceBooking.findMany({
            where: {
                date: { gte: targetDate, lt: nextDate },
                status: { notIn: ['Cancelled', 'Rejected'] }
            }
        }));

        const settings = await getServiceSettings();

        const slotCounts = {};
        bookings.forEach(b => {
            if (b.timeSlot) {
                slotCounts[b.timeSlot] = (slotCounts[b.timeSlot] || 0) + 1;
            }
        });

        const availableSlots = settings.timeSlots.map(slot => ({
            time: slot,
            available: (slotCounts[slot] || 0) < settings.maxBookingsPerSlot
        }));

        res.json(availableSlots);
    } catch (error) {
        console.error('Get slots error:', error);
        if (isDbUnavailableError(error)) {
            const defaults = getDefaultServiceSettings();
            return res.json(defaults.timeSlots.map((time) => ({ time, available: true })));
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/book (Protected)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/book', protect, async (req, res) => {
    try {
        const {
            serviceType, description, date, timeSlot,
            deviceType, deviceBrand,
            customerName, customerPhone,
            address, city, pincode, landmark,
            latitude, longitude, googleMapLink,
            referralCode, customFields
        } = req.body;

        if (!serviceType || !date || !timeSlot || !customerName || !customerPhone || !address || !city || !pincode) {
            return res.status(400).json({ error: 'Service type, date, timeSlot, name, phone, address, city, and pincode are required' });
        }

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const settings = await getServiceSettings();

        if (!settings.timeSlots.includes(timeSlot)) {
            return res.status(400).json({ error: 'Invalid time slot selected.' });
        }

        // Validate referral code if provided (before transaction)
        let referrer = null;
        if (referralCode && referralCode.trim()) {
            referrer = await prisma.user.findFirst({
                where: { referralCode: referralCode.trim().toUpperCase() }
            });
            if (!referrer) {
                return res.status(400).json({ error: 'Invalid referral code' });
            }
            if (referrer.id === req.user.id) {
                return res.status(400).json({ error: 'You cannot use your own referral code' });
            }
        }

        // Atomic slot check + create inside a serializable transaction to prevent double-booking
        const booking = await withDbRetry(() => prisma.$transaction(async (tx) => {
            const existingBookings = await tx.serviceBooking.count({
                where: {
                    date: { gte: targetDate, lt: nextDate },
                    timeSlot,
                    status: { notIn: ['Cancelled', 'Rejected'] }
                }
            });

            if (existingBookings >= settings.maxBookingsPerSlot) {
                throw new Error('SLOT_FULL');
            }

            return tx.serviceBooking.create({
                data: {
                    userId: req.user.id,
                    serviceType,
                    description: description || null,
                    deviceType: deviceType || null,
                    deviceBrand: deviceBrand || null,
                    date: new Date(date),
                    timeSlot,
                    status: 'Pending',
                    customerName,
                    customerPhone,
                    address,
                    city,
                    pincode,
                    landmark: landmark || null,
                    latitude: latitude != null ? parseFloat(latitude) : null,
                    longitude: longitude != null ? parseFloat(longitude) : null,
                    googleMapLink: googleMapLink || null,
                    referralCodeUsed: referrer ? referralCode.trim().toUpperCase() : null,
                    customFields: customFields && typeof customFields === 'object' ? customFields : null
                }
            });
        })).catch(err => {
            if (err.message === 'SLOT_FULL') return null;
            throw err;
        });

        if (!booking) {
            return res.status(400).json({ error: 'Selected time slot is no longer available.' });
        }

        // Respond immediately — notifications fire in background
        res.status(201).json({ ...booking, pickupOtp: undefined });

        // Background: send confirmation email + notification
        const userEmail = req.user?.email;
        Promise.resolve().then(async () => {
            try {
                if (userEmail) {
                    await sendServiceBookingEmail(userEmail, booking.id, null);
                }
                await createUserNotification({
                    userId: req.user.id,
                    title: 'Service Booked Successfully',
                    message: `Your ${serviceType} request (SRV-${booking.id}) has been received.`,
                    type: 'service',
                    link: '/dashboard/services',
                    push: {
                        enabled: true,
                        body: `Your ${serviceType} request SRV-${booking.id} has been received.`,
                    },
                });
            } catch (notifErr) {
                console.error('Service notification error (non-blocking):', notifErr);
            }
        }).catch(err => console.error('Unhandled service notification error:', err));
    } catch (error) {
        console.error('Book service error:', error);
        if (isDbUnavailableError(error)) {
            return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/my-bookings (Protected)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-bookings', protect, async (req, res) => {
    try {
        // Use explicit select to exclude pickupOtp
        const bookings = await prisma.serviceBooking.findMany({
            where: { userId: req.user.id },
            select: BOOKING_SAFE_SELECT,
            orderBy: { createdAt: 'desc' }
        });
        res.json(bookings);
    } catch (error) {
        console.error('Get my bookings error:', error);
        if (isDbUnavailableError(error)) {
            return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services (Admin — paginated bookings, NO OTP)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const parsedPage = Number.parseInt(page, 10);
        const parsedLimit = Number.parseInt(limit, 10);
        const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        const take = Math.min(20, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 20));
        const skip = (currentPage - 1) * take;

        const where = {};
        if (status && status !== 'All') {
            where.status = status;
        }

        const [bookings, total, groupedStatuses] = await Promise.all([
            withDbRetry(() => prisma.serviceBooking.findMany({
                where,
                select: BOOKING_ADMIN_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take
            })),
            withDbRetry(() => prisma.serviceBooking.count({ where })),
            withDbRetry(() => prisma.serviceBooking.groupBy({
                by: ['status'],
                _count: { _all: true }
            })),
        ]);

        const statusCounts = groupedStatuses.reduce((acc, row) => {
            acc[row.status] = row._count._all;
            return acc;
        }, {});

        res.json({
            data: bookings,
            pagination: {
                total,
                page: currentPage,
                limit: take,
                totalPages: Math.ceil(total / take)
            },
            statusCounts
        });
    } catch (error) {
        console.error('Get all bookings error:', error);
        if (isDbUnavailableError(error)) {
            return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/:id (Admin — single booking detail)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', protect, adminOnly, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const booking = await prisma.serviceBooking.findUnique({
            where: { id: bookingId },
            select: BOOKING_ADMIN_SELECT
        });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        res.json(booking);
    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/services/:id/assign (Admin — assign technician)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/assign', protect, adminOnly, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { technicianId } = req.body;

        if (!technicianId) {
            return res.status(400).json({ error: 'technicianId is required' });
        }

        const technician = await prisma.technician.findUnique({ where: { id: parseInt(technicianId) } });
        if (!technician) {
            return res.status(404).json({ error: 'Technician not found' });
        }

        const booking = await prisma.serviceBooking.update({
            where: { id: bookingId },
            data: { technicianId: parseInt(technicianId), assignedTo: technician.name },
            select: BOOKING_ADMIN_SELECT
        });

        res.json(booking);
    } catch (error) {
        console.error('Assign technician error:', error);
        if (error.code === 'P2025') return res.status(404).json({ error: 'Booking not found' });
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/services/:id/status (Admin — update status + pricing + OTP generation)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { status, estimatedPrice, finalPrice, adminNotes, assignedTo, estimatedCompletionDate, cancellationReason, laborCost: reqLaborCost, partsCost: reqPartsCost, partsNotes: reqPartsNotes } = req.body;

        // Enforce OTP-only pickup: only the customer (via verify-otp) can confirm pickup
        if (status === 'Picked Up') {
            return res.status(400).json({
                error: 'Pickup must be verified by the customer. The technician shares the OTP at pickup; the customer enters it in the app to confirm.'
            });
        }
        if (status === 'In Progress') {
            const current = await prisma.serviceBooking.findUnique({
                where: { id: bookingId },
                select: { status: true, otpVerified: true }
            });
            if (current?.status === 'Confirmed' && !current.otpVerified) {
                return res.status(400).json({
                    error: 'Customer must verify the pickup OTP in the app first. Only after they enter the OTP does the booking move to In Progress.'
                });
            }
        }
        // Enforce delivery OTP verification before marking as Delivered
        if (status === 'Delivered') {
            const current = await prisma.serviceBooking.findUnique({
                where: { id: bookingId },
                select: { status: true, deliveryOtpVerified: true }
            });
            if (current?.status === 'Completed' && !current.deliveryOtpVerified) {
                return res.status(400).json({
                    error: 'Customer must provide the delivery OTP first. Verify the delivery OTP before marking as Delivered.'
                });
            }
        }

        const updateData = {};

        if (status) {
            updateData.status = status;

            // Auto-set timestamps based on status
            const now = new Date();
            if (status === 'Confirmed') updateData.confirmedAt = now;
            if (status === 'Picked Up') updateData.pickedUpAt = now;
            if (status === 'Completed') updateData.completedAt = now;
            if (status === 'Delivered') updateData.deliveredAt = now;
            if (status === 'Cancelled') {
                updateData.cancelledAt = now;
                if (cancellationReason) updateData.cancellationReason = cancellationReason;
            }

            // ── OTP GENERATION on "Confirmed" ──────────────────────────────
            if (status === 'Confirmed') {
                if (estimatedPrice === undefined || estimatedPrice === null) {
                    return res.status(400).json({ error: 'estimatedPrice is required when confirming a booking' });
                }
                const otp = generateOtp();
                updateData.pickupOtp = otp;
                updateData.otpGeneratedAt = now;
                updateData.otpVerified = false;
            }

            // ── DELIVERY OTP GENERATION on "Completed" ──────────────────────
            if (status === 'Completed') {
                const deliveryOtp = generateOtp();
                updateData.deliveryOtp = deliveryOtp;
                updateData.deliveryOtpGeneratedAt = now;
                updateData.deliveryOtpVerified = false;
            }

        }

        if (estimatedPrice !== undefined) updateData.estimatedPrice = parseFloat(estimatedPrice);
        if (finalPrice !== undefined) updateData.finalPrice = parseFloat(finalPrice);
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
        if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
        if (estimatedCompletionDate !== undefined) updateData.estimatedCompletionDate = new Date(estimatedCompletionDate);

        const booking = await prisma.serviceBooking.update({
            where: { id: bookingId },
            data: updateData,
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                technician: { select: { id: true, name: true, phone: true, skills: true } },
                invoice: true
            }
        });

        // ── INVOICE GENERATION on "Completed" ────────────────────────────
        if (status === 'Completed') {
            try {
                const laborCost = reqLaborCost != null ? parseFloat(reqLaborCost) : (booking.finalPrice != null ? booking.finalPrice : 0);
                const partsCost = reqPartsCost != null ? parseFloat(reqPartsCost) : 0;
                const partsNotes = reqPartsNotes || null;
                const totalAmount = parseFloat((laborCost + partsCost).toFixed(2));

                await prisma.serviceBooking.update({
                    where: { id: booking.id },
                    data: { finalPrice: totalAmount }
                });
                booking.finalPrice = totalAmount;

                const invoiceNumber = `SINV-${Date.now()}-${booking.id}`;
                const technicianName = booking.technician?.name || booking.assignedTo || 'Shoptify Technician';

                const serviceInvoice = await prisma.serviceInvoice.create({
                    data: {
                        bookingId: booking.id,
                        invoiceNumber,
                        serviceType: booking.serviceType,
                        technicianName,
                        laborCost: parseFloat(laborCost.toFixed(2)),
                        partsCost: parseFloat(partsCost.toFixed(2)),
                        partsNotes,
                        gst: 0,
                        totalAmount,
                    }
                });

                // Look up the seller name from the service type
                const serviceTypeRecord = await prisma.serviceType.findFirst({ where: { title: booking.serviceType } });
                const invoiceSellerName = serviceTypeRecord?.sellerName || null;

                // Generate PDF buffer and convert to base64 data URL
                const pdfBuffer = await generateServiceInvoicePdf(booking, serviceInvoice, invoiceSellerName);
                const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

                // Store PDF URL in both ServiceInvoice and ServiceBooking
                await prisma.serviceInvoice.update({
                    where: { id: serviceInvoice.id },
                    data: { pdfUrl: pdfDataUrl }
                });

                await prisma.serviceBooking.update({
                    where: { id: booking.id },
                    data: { invoiceUrl: pdfDataUrl }
                });

                // Refresh booking with invoice
                booking.invoiceUrl = pdfDataUrl;
                booking.invoice = { ...serviceInvoice, pdfUrl: pdfDataUrl };

                console.log(`[Invoice] Generated service invoice ${invoiceNumber} for SRV-${booking.id}`);
            } catch (invoiceErr) {
                console.error('[Invoice] Service invoice generation failed (non-blocking):', invoiceErr.message);
            }
        }

        // ── REFERRAL & TIER UPDATE ON DELIVERY ──────────────────────────
        if (status === 'Delivered') {
            const fullBooking = await prisma.serviceBooking.findUnique({
                where: { id: booking.id },
                include: { user: { select: { id: true, name: true, email: true, phone: true, referredById: true } } }
            });

            if (fullBooking && fullBooking.user) {
                try {
                    let referrerId = null;
                    if (fullBooking.referralCodeUsed) {
                        const codeOwner = await prisma.user.findFirst({
                            where: { referralCode: fullBooking.referralCodeUsed }
                        });
                        referrerId = codeOwner?.id || null;
                    } else if (fullBooking.user.referredById) {
                        referrerId = fullBooking.user.referredById;
                    }

                    if (referrerId && referrerId !== fullBooking.userId) {
                        // Check with correct source: 'service' to avoid duplicates
                        const existingReferral = await prisma.referral.findFirst({
                            where: { refereeId: fullBooking.userId, referrerId, source: 'service' }
                        });

                        if (!existingReferral) {
                            await prisma.$transaction(async (tx) => {
                                const serviceTypeObj = await tx.serviceType.findUnique({
                                    where: { title: fullBooking.serviceType }
                                });

                                const { referrerPoints: rewardAmount, refereePoints } = await calculateReferralReward({
                                    referrerPoints: serviceTypeObj?.referrerPoints,
                                    refereePoints: serviceTypeObj?.refereePoints
                                });

                                if (rewardAmount > 0) {
                                    // Credit referrer wallet
                                    await tx.user.update({ where: { id: referrerId }, data: { walletBalance: { increment: rewardAmount } } });
                                    await tx.walletTransaction.create({
                                        data: {
                                            userId: referrerId,
                                            amount: rewardAmount,
                                            type: 'CREDIT',
                                            description: `Service referral reward — ${fullBooking.user.name} used your code for ${fullBooking.serviceType}`
                                        }
                                    });

                                    // Create referral record with correct source
                                    await tx.referral.create({
                                        data: {
                                            referrerId,
                                            refereeId: fullBooking.userId,
                                            status: 'rewarded',
                                            rewardAmount,
                                            refereeReward: refereePoints > 0 ? refereePoints : null,
                                            source: 'service',
                                            completedAt: new Date()
                                        }
                                    });

                                    // Credit referee wallet
                                    await tx.user.update({ where: { id: fullBooking.userId }, data: { walletBalance: { increment: refereePoints } } });
                                    await tx.walletTransaction.create({
                                        data: {
                                            userId: fullBooking.userId,
                                            amount: refereePoints,
                                            type: 'CREDIT',
                                            description: `Service referral bonus for ${fullBooking.serviceType}`
                                        }
                                    });

                                    const tierSettings = await prisma.referralSettings.findFirst();
                                    if (tierSettings && tierSettings.tierSystemEnabled) {
                                        const tiers = await tx.tierConfig.findMany({ orderBy: { minPoints: 'desc' } });

                                        const upRef = await tx.user.update({ where: { id: referrerId }, data: { tierPoints: { increment: rewardAmount } }, select: { id: true, tierPoints: true, tier: true } });
                                        const nRT = tiers.find(t => upRef.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                        if (nRT !== upRef.tier) await tx.user.update({ where: { id: referrerId }, data: { tier: nRT } });

                                        const upBuy = await tx.user.update({ where: { id: fullBooking.userId }, data: { tierPoints: { increment: refereePoints } }, select: { id: true, tierPoints: true, tier: true } });
                                        const nBT = tiers.find(t => upBuy.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                        if (nBT !== upBuy.tier) await tx.user.update({ where: { id: fullBooking.userId }, data: { tier: nBT } });
                                    }
                                }
                            });
                        }
                    }
                } catch (err) {
                    console.error('Service referral/tier error:', err);
                }
            }
        }

        // Admin gets full booking including OTP for pickup verification
        res.json(booking);

        // Email + in-app notify after response — do not block admin UI on SMTP latency
        if (status) {
            setImmediate(() => {
                void sendServiceNotification(booking, status);
                if (booking.user?.id) {
                    const isCompleted = status === 'Completed';
                    createUserNotification({
                        userId: booking.user.id,
                        title: isCompleted ? `Delivery OTP for SRV-${booking.id}` : 'Service Status Updated',
                        message: isCompleted
                            ? `Your device is ready! A delivery OTP has been sent. Share it with the technician when receiving your device.`
                            : `Your service request SRV-${booking.id} is now ${status}.`,
                        type: 'service',
                        link: '/dashboard/services',
                        push: {
                            enabled: true,
                            title: isCompleted ? 'Delivery OTP Ready' : undefined,
                            body: isCompleted
                                ? `Your delivery OTP for SRV-${booking.id} is available in Shoptify.`
                                : `Your service request SRV-${booking.id} is now ${status}.`,
                        },
                    }).catch((notifErr) => {
                        console.error('In-app notification error (deferred):', notifErr);
                    });
                }
            });
        }
    } catch (error) {
        console.error('Update booking error:', error);
        if (isDbUnavailableError(error)) {
            return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/:id/verify-otp (Protected — customer or admin)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/verify-otp', protect, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ error: 'OTP is required' });
        }

        // Fetch with OTP for validation
        const booking = await prisma.serviceBooking.findUnique({
            where: { id: bookingId },
            include: { user: { select: { id: true, name: true, email: true } }, technician: true }
        });

        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        // Customers can only verify their own bookings; admins can verify any
        if (req.user.role !== 'admin' && booking.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorised' });
        }

        if (!booking.pickupOtp) {
            return res.status(400).json({ error: 'No OTP has been generated for this booking' });
        }

        if (booking.otpVerified) {
            return res.status(400).json({ error: 'OTP has already been verified' });
        }

        if (String(otp).trim() !== String(booking.pickupOtp).trim()) {
            return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
        }

        // OTP valid — progress booking to "In Progress"
        const updated = await prisma.serviceBooking.update({
            where: { id: bookingId },
            data: {
                otpVerified: true,
                status: 'In Progress',
                pickedUpAt: new Date()
            },
            select: BOOKING_SAFE_SELECT
        });

        res.json({ success: true, message: 'OTP verified. Booking is now In Progress.', booking: updated });

        const notifyBooking = { ...updated, user: booking.user };
        setImmediate(() => {
            void sendServiceNotification(notifyBooking, 'In Progress');
            createUserNotification({
                userId: booking.userId,
                title: 'Device Picked Up',
                message: `Your device for SRV-${bookingId} has been picked up. Repair has started.`,
                type: 'service',
                link: '/dashboard/services',
                push: {
                    enabled: true,
                    body: `Repair work has started for SRV-${bookingId}.`,
                },
            }).catch(() => { /* non-blocking */ });
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/:id/regenerate-otp (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/regenerate-otp', protect, adminOnly, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);

        const existing = await prisma.serviceBooking.findUnique({
            where: { id: bookingId },
            include: { user: { select: { id: true, name: true, email: true } }, technician: true }
        });

        if (!existing) return res.status(404).json({ error: 'Booking not found' });

        if (!['Confirmed', 'Pending'].includes(existing.status)) {
            return res.status(400).json({ error: 'OTP can only be regenerated for Pending or Confirmed bookings' });
        }

        const newOtp = generateOtp();
        const updated = await prisma.serviceBooking.update({
            where: { id: bookingId },
            data: {
                pickupOtp: newOtp,
                otpGeneratedAt: new Date(),
                otpVerified: false
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                technician: true
            }
        });

        // Return safe response (no OTP)
        const { pickupOtp: _otp, ...safeBooking } = updated;
        res.json({ success: true, message: 'New OTP generated and sent to customer.', booking: safeBooking });

        setImmediate(() => {
            void sendServiceNotification(updated, 'Confirmed');
            createUserNotification({
                userId: updated.userId,
                title: 'Pickup OTP Updated',
                message: `A new pickup OTP has been generated for SRV-${bookingId}. Check Shoptify before technician pickup.`,
                type: 'service',
                link: '/dashboard/services',
                push: {
                    enabled: true,
                    body: `A new pickup OTP is available in Shoptify for SRV-${bookingId}.`,
                },
            }).catch((notifErr) => {
                console.error('Pickup OTP notification error (deferred):', notifErr);
            });
        });
    } catch (error) {
        console.error('Regenerate OTP error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/:id/verify-delivery-otp (Admin — verify customer's delivery OTP)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/verify-delivery-otp', protect, adminOnly, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { otp } = req.body;

        if (!otp) return res.status(400).json({ error: 'OTP is required' });

        const booking = await prisma.serviceBooking.findUnique({
            where: { id: bookingId },
            select: { id: true, status: true, deliveryOtp: true, deliveryOtpVerified: true }
        });

        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        if (booking.status !== 'Completed') {
            return res.status(400).json({ error: 'Delivery OTP can only be verified for Completed bookings' });
        }
        if (booking.deliveryOtpVerified) {
            return res.status(400).json({ error: 'Delivery OTP has already been verified' });
        }
        if (String(otp).trim() !== String(booking.deliveryOtp).trim()) {
            return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
        }

        const updated = await prisma.serviceBooking.update({
            where: { id: bookingId },
            data: { deliveryOtpVerified: true },
            select: BOOKING_ADMIN_SELECT
        });

        res.json({ success: true, message: 'Delivery OTP verified. You can now mark this booking as Delivered.', booking: updated });
    } catch (error) {
        console.error('Verify delivery OTP error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/:id/regenerate-delivery-otp (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/regenerate-delivery-otp', protect, adminOnly, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);

        const existing = await prisma.serviceBooking.findUnique({
            where: { id: bookingId },
            include: { user: { select: { id: true, name: true, email: true } }, technician: true }
        });

        if (!existing) return res.status(404).json({ error: 'Booking not found' });
        if (existing.status !== 'Completed') {
            return res.status(400).json({ error: 'Delivery OTP can only be regenerated for Completed bookings' });
        }

        const newOtp = generateOtp();
        const updated = await prisma.serviceBooking.update({
            where: { id: bookingId },
            data: {
                deliveryOtp: newOtp,
                deliveryOtpGeneratedAt: new Date(),
                deliveryOtpVerified: false
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                technician: true
            }
        });

        const { deliveryOtp: _otp, pickupOtp: _pOtp, ...safeBooking } = updated;
        res.json({ success: true, message: 'New delivery OTP generated and sent to customer.', booking: safeBooking });

        setImmediate(() => {
            createUserNotification({
                userId: updated.userId,
                title: 'Delivery OTP Updated',
                message: `A new delivery OTP has been generated for SRV-${bookingId}. Share it with the technician when receiving your device.`,
                type: 'service',
                link: '/dashboard/services',
                push: {
                    enabled: true,
                    body: `Your new delivery OTP for SRV-${bookingId} is available in Shoptify.`,
                },
            }).catch((notifErr) => {
                console.error('Delivery OTP notification error (deferred):', notifErr);
            });
        });
    } catch (error) {
        console.error('Regenerate delivery OTP error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
