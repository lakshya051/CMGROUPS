import express from 'express';
import prisma from '../lib/prisma.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sendServiceBookingEmail } from '../utils/emailNotifications.js';
import { calculateReferralReward } from '../utils/referralHelper.js';

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

// GET /api/services/available-slots (Public)
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

// POST /api/services/book (Protected)
router.post('/book', protect, async (req, res) => {
    try {
        const {
            serviceType, description, date, timeSlot,
            deviceType, deviceBrand,
            customerName, customerPhone,
            address, city, pincode, landmark,
            referralCode
        } = req.body;

        if (!serviceType || !date || !timeSlot || !customerName || !customerPhone || !address || !city || !pincode) {
            return res.status(400).json({ error: 'Service type, date, timeSlot, name, phone, address, city, and pincode are required' });
        }

        // Check slot availability
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const settings = await getServiceSettings();

        if (!settings.timeSlots.includes(timeSlot)) {
            return res.status(400).json({ error: 'Invalid time slot selected.' });
        }

        const existingBookings = await withDbRetry(() => prisma.serviceBooking.count({
            where: {
                date: { gte: targetDate, lt: nextDate },
                timeSlot,
                status: { notIn: ['Cancelled', 'Rejected'] }
            }
        }));

        if (existingBookings >= settings.maxBookingsPerSlot) {
            return res.status(400).json({ error: 'Selected time slot is no longer available.' });
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
            if (referrer.id === req.user.id) {
                return res.status(400).json({ error: 'You cannot use your own referral code' });
            }
        }

        // Generated OTP logic removed

        const booking = await withDbRetry(() => prisma.serviceBooking.create({
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
                referralCodeUsed: referrer ? referralCode.trim().toUpperCase() : null
            }
        }));

        // Respond immediately — email and notification fire in background
        res.status(201).json({ ...booking });

        // Background: send confirmation email + in-app notification (non-blocking)
        const userEmail = req.user?.email;
        Promise.resolve().then(async () => {
            try {
                if (userEmail) {
                    await sendServiceBookingEmail(userEmail, booking.id, null);
                }
                await prisma.notification.create({
                    data: {
                        userId: req.user.id,
                        title: 'Service Booked Successfully',
                        message: `Your ${serviceType} request (SRV-${booking.id}) has been received.`,
                        type: 'service',
                        link: `/dashboard/services`
                    }
                });
            } catch (notifErr) {
                console.error('Service notification error (non-blocking):', notifErr);
            }
        });
    } catch (error) {
        console.error('Book service error:', error);
        if (isDbUnavailableError(error)) {
            return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/services/my-bookings (Protected)
router.get('/my-bookings', protect, async (req, res) => {
    try {
        const bookings = await prisma.serviceBooking.findMany({
            where: { userId: req.user.id },
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

// GET /api/services (Admin - all bookings)
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const bookings = await prisma.serviceBooking.findMany({
            include: { user: { select: { name: true, email: true, phone: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bookings);
    } catch (error) {
        console.error('Get all bookings error:', error);
        if (isDbUnavailableError(error)) {
            return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/services/:id/status (Admin - update status + pricing + notes)
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status, estimatedPrice, finalPrice, adminNotes, assignedTo } = req.body;

        const updateData = {};

        if (status) {
            updateData.status = status;

            // Auto-set timestamps based on status
            const now = new Date();
            if (status === 'Confirmed') updateData.confirmedAt = now;
            if (status === 'Picked Up') updateData.pickedUpAt = now;
            if (status === 'Completed') updateData.completedAt = now;
            if (status === 'Delivered') updateData.deliveredAt = now;
        }

        if (estimatedPrice !== undefined) updateData.estimatedPrice = parseFloat(estimatedPrice);
        if (finalPrice !== undefined) updateData.finalPrice = parseFloat(finalPrice);
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
        if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

        const booking = await prisma.serviceBooking.update({
            where: { id: parseInt(req.params.id) },
            data: updateData,
            include: { user: { select: { id: true, name: true, email: true, phone: true } } }
        });

        // Send In-App Notification
        if (status) {
            try {
                await prisma.notification.create({
                    data: {
                        userId: booking.user.id,
                        title: 'Service Status Updated',
                        message: `Your service request SRV-${booking.id} is now ${status}.`,
                        type: 'service',
                        link: `/dashboard/services`
                    }
                });
            } catch (notifErr) {
                console.error('In-app notification error:', notifErr);
            }
        }

        // *** REFERRAL AND TIER UPDATE ON SERVICE COMPLETION ***
        if (status === 'Completed' && req.body.isPaid === true) {
            const fullBooking = await prisma.serviceBooking.findUnique({
                where: { id: booking.id },
                include: { user: { select: { id: true, name: true, email: true, phone: true, referredById: true } } }
            });

            if (fullBooking && fullBooking.user) {
                try {
                    // Prefer referralCodeUsed on the booking, fall back to referredById at signup
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
                    // Prevent duplicate rewards
                    const existingReferral = await prisma.referral.findFirst({
                        where: {
                            refereeId: fullBooking.userId,
                            referrerId,
                            source: 'shopping'
                        }
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

                                // Credit referrer
                                await tx.user.update({
                                    where: { id: referrerId },
                                    data: { walletBalance: { increment: rewardAmount } }
                                });

                                await tx.referral.create({
                                    data: {
                                        referrerId,
                                        refereeId: fullBooking.userId,
                                        status: 'rewarded',
                                        rewardAmount,
                                        refereeReward: refereePoints > 0 ? refereePoints : null,
                                        completedAt: new Date()
                                    }
                                });

                                // Credit buyer
                                await tx.user.update({
                                    where: { id: fullBooking.userId },
                                    data: { walletBalance: { increment: refereePoints } }
                                });

                                // TIER SYSTEM
                                const tierSettings = await prisma.referralSettings.findFirst();
                                if (tierSettings && tierSettings.tierSystemEnabled) {
                                    const tiers = await tx.tierConfig.findMany({ orderBy: { minPoints: 'desc' } });

                                    // Update Referrer
                                    const upRef = await tx.user.update({
                                        where: { id: referrerId },
                                        data: { tierPoints: { increment: rewardAmount } },
                                        select: { id: true, tierPoints: true, tier: true }
                                    });
                                    const nRT = tiers.find(t => upRef.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                    if (nRT !== upRef.tier) await tx.user.update({ where: { id: referrerId }, data: { tier: nRT } });

                                    // Update Buyer
                                    const upBuy = await tx.user.update({
                                        where: { id: fullBooking.userId },
                                        data: { tierPoints: { increment: rewardAmount } },
                                        select: { id: true, tierPoints: true, tier: true }
                                    });
                                    const nBT = tiers.find(t => upBuy.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                                    if (nBT !== upBuy.tier) await tx.user.update({ where: { id: fullBooking.userId }, data: { tier: nBT } });
                                }
                            }
                        });
                    }
                    } // end if (referrerId)
                } catch (err) {
                    console.error('Service referral/tier error:', err);
                }
            }
        }

        res.json(booking);
    } catch (error) {
        console.error('Update booking error:', error);
        if (isDbUnavailableError(error)) {
            return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// verify-otp removed

export default router;
