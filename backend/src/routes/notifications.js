import express from 'express';
import prisma from '../lib/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// PUT /api/notifications/device - Register or refresh device token
router.put('/device', protect, async (req, res) => {
    try {
        const { token, platform } = req.body;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'A valid device token is required.' });
        }

        if (platform !== 'android') {
            return res.status(400).json({ error: 'Only Android push registrations are supported right now.' });
        }

        await prisma.deviceRegistration.upsert({
            where: { token },
            update: {
                userId: req.user.id,
                platform,
                isActive: true,
                lastSeenAt: new Date(),
            },
            create: {
                userId: req.user.id,
                platform,
                token,
                isActive: true,
                lastSeenAt: new Date(),
            },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Register device token error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/notifications/device - Deactivate current device token
router.delete('/device', protect, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'A valid device token is required.' });
        }

        await prisma.deviceRegistration.updateMany({
            where: {
                userId: req.user.id,
                token,
            },
            data: {
                isActive: false,
            },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Deactivate device token error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/notifications - Get my notifications
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: req.user.id, isRead: false }
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', protect, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.notification.updateMany({
            where: { id, userId: req.user.id }, // Ensure ownership
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', protect, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
