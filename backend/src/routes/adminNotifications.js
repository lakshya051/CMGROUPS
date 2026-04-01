import express from 'express';
import prisma from '../lib/prisma.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { createUserNotification } from '../utils/notifications.js';

const router = express.Router();

// POST /api/admin/notifications/send
router.post('/send', protect, adminOnly, async (req, res) => {
    try {
        const { title, message, type = 'SYSTEM', link, target, userIds } = req.body;

        if (!title?.trim() || !message?.trim()) {
            return res.status(400).json({ error: 'Title and message are required.' });
        }
        if (!['all', 'selected'].includes(target)) {
            return res.status(400).json({ error: 'Target must be "all" or "selected".' });
        }
        if (target === 'selected' && (!Array.isArray(userIds) || userIds.length === 0)) {
            return res.status(400).json({ error: 'userIds array is required when target is "selected".' });
        }

        let recipients;
        if (target === 'all') {
            recipients = await prisma.user.findMany({ select: { id: true } });
        } else {
            const ids = userIds.map(Number).filter(Number.isFinite);
            recipients = await prisma.user.findMany({
                where: { id: { in: ids } },
                select: { id: true },
            });
        }

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'No valid recipients found.' });
        }

        const BATCH = 50;
        for (let i = 0; i < recipients.length; i += BATCH) {
            const batch = recipients.slice(i, i + BATCH);
            await Promise.allSettled(
                batch.map((u) =>
                    createUserNotification({
                        userId: u.id,
                        title: title.trim(),
                        message: message.trim(),
                        type,
                        link: link?.trim() || null,
                        push: { enabled: true },
                    })
                )
            );
        }

        await prisma.adminNotificationLog.create({
            data: {
                adminId: req.user.id,
                title: title.trim(),
                message: message.trim(),
                type,
                target,
                recipientCount: recipients.length,
                link: link?.trim() || null,
            },
        });

        res.json({ success: true, sentCount: recipients.length });
    } catch (error) {
        console.error('Admin send notification error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/notifications/history
router.get('/history', protect, adminOnly, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            prisma.adminNotificationLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    admin: { select: { id: true, name: true, email: true } },
                },
            }),
            prisma.adminNotificationLog.count(),
        ]);

        res.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Admin notification history error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/notifications/stats
router.get('/stats', protect, adminOnly, async (req, res) => {
    try {
        const [totalUsers, usersWithPush, recentNotifications] = await Promise.all([
            prisma.user.count(),
            prisma.pushSubscription.groupBy({
                by: ['userId'],
            }).then((rows) => rows.length),
            prisma.adminNotificationLog.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
            }),
        ]);

        res.json({ totalUsers, usersWithPush, recentNotifications });
    } catch (error) {
        console.error('Admin notification stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
