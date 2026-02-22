const express = require('express');
const prisma = require('../lib/prisma');
const { protect, adminOnly } = require('../middleware/auth');
const { sendServiceBookingSMS, sendServiceBookingEmail } = require('../utils/emailNotifications');
const smsNotifications = require('../utils/smsNotifications');

const router = express.Router();

// GET /api/services/available-slots (Public)
router.get('/available-slots', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'Date is required' });

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const bookings = await prisma.serviceBooking.findMany({
            where: {
                date: { gte: targetDate, lt: nextDate },
                status: { notIn: ['Cancelled', 'Rejected'] }
            }
        });

        const allSlots = [
            "10:00 AM - 12:00 PM",
            "12:00 PM - 02:00 PM",
            "02:00 PM - 04:00 PM",
            "04:00 PM - 06:00 PM"
        ];

        const MAX_PER_SLOT = 2; // Prevent double booking

        const slotCounts = {};
        bookings.forEach(b => {
            if (b.timeSlot) {
                slotCounts[b.timeSlot] = (slotCounts[b.timeSlot] || 0) + 1;
            }
        });

        const availableSlots = allSlots.map(slot => ({
            time: slot,
            available: (slotCounts[slot] || 0) < MAX_PER_SLOT
        }));

        res.json(availableSlots);
    } catch (error) {
        console.error('Get slots error:', error);
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
            address, city, pincode, landmark
        } = req.body;

        if (!serviceType || !date || !timeSlot || !customerName || !customerPhone || !address || !city || !pincode) {
            return res.status(400).json({ error: 'Service type, date, timeSlot, name, phone, address, city, and pincode are required' });
        }

        // Check slot availability
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const existingBookings = await prisma.serviceBooking.count({
            where: {
                date: { gte: targetDate, lt: nextDate },
                timeSlot,
                status: { notIn: ['Cancelled', 'Rejected'] }
            }
        });

        if (existingBookings >= 2) {
            return res.status(400).json({ error: 'Selected time slot is no longer available.' });
        }

        // Generate 6-digit pickup OTP
        const pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();

        const booking = await prisma.serviceBooking.create({
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
                pickupOtp
            }
        });

        console.log(`🔑 Pickup OTP for booking SRV-${booking.id}: ${pickupOtp}`);

        // Send booking confirmation with OTP
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user) {
            try {
                if (user.email) {
                    await sendServiceBookingEmail(user.email, booking.id, pickupOtp);
                }
                if (user.phone) {
                    await smsNotifications.sendServiceBookingSMS(user.phone, booking.id, pickupOtp);
                }

                // Send In-App Notification
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
        }

        res.status(201).json({
            ...booking,
            pickupOtp // Send OTP to user so they can share it during pickup
        });
    } catch (error) {
        console.error('Book service error:', error);
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
                include: { user: true }
            });

            if (fullBooking && fullBooking.user && fullBooking.user.referredById) {
                try {
                    const settings = await prisma.referralSettings.findFirst();
                    const rewardAmount = settings ? settings.pointsPerServiceBooking : 150;
                    const referrerId = fullBooking.user.referredById;

                    // Credit referrer
                    await prisma.user.update({
                        where: { id: referrerId },
                        data: { walletBalance: { increment: rewardAmount } }
                    });

                    await prisma.referral.create({
                        data: {
                            referrerId,
                            refereeId: fullBooking.userId,
                            status: 'rewarded',
                            rewardAmount,
                            completedAt: new Date()
                        }
                    });

                    // Credit buyer
                    await prisma.user.update({
                        where: { id: fullBooking.userId },
                        data: { walletBalance: { increment: rewardAmount } }
                    });

                    // TIER SYSTEM
                    if (settings && settings.tierSystemEnabled) {
                        const tiers = await prisma.tierConfig.findMany({ orderBy: { minPoints: 'desc' } });

                        // Update Referrer
                        const upRef = await prisma.user.update({
                            where: { id: referrerId },
                            data: { tierPoints: { increment: rewardAmount } },
                            select: { id: true, tierPoints: true, tier: true }
                        });
                        const nRT = tiers.find(t => upRef.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                        if (nRT !== upRef.tier) await prisma.user.update({ where: { id: referrerId }, data: { tier: nRT } });

                        // Update Buyer
                        const upBuy = await prisma.user.update({
                            where: { id: fullBooking.userId },
                            data: { tierPoints: { increment: rewardAmount } },
                            select: { id: true, tierPoints: true, tier: true }
                        });
                        const nBT = tiers.find(t => upBuy.tierPoints >= t.minPoints)?.tierName || 'Bronze';
                        if (nBT !== upBuy.tier) await prisma.user.update({ where: { id: fullBooking.userId }, data: { tier: nBT } });
                    }

                } catch (err) {
                    console.error('Service referral/tier error:', err);
                }
            }
        }

        res.json(booking);
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/services/:id/verify-otp (Admin - verify pickup OTP)
router.post('/:id/verify-otp', protect, adminOnly, async (req, res) => {
    try {
        const { otp } = req.body;
        const booking = await prisma.serviceBooking.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.pickupOtp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // OTP matches — mark as Picked Up
        const updated = await prisma.serviceBooking.update({
            where: { id: booking.id },
            data: {
                status: 'Picked Up',
                pickedUpAt: new Date(),
                pickupOtp: null // Clear OTP after use
            },
            include: { user: { select: { name: true, email: true, phone: true } } }
        });

        res.json({ success: true, booking: updated });
    } catch (error) {
        console.error('Verify pickup OTP error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
