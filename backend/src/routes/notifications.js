const express = require('express');
const prisma = require('../lib/prisma');
const { protect } = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;
