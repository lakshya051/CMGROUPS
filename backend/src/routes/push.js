import express from 'express';
import prisma from '../lib/prisma.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sendPushNotification } from '../utils/webPush.js';

const router = express.Router();

// POST /api/push/subscribe
router.post('/subscribe', protect, async (req, res) => {
    try {
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ error: 'Invalid push subscription payload.' });
        }

        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                userId: req.user.id,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
            create: {
                userId: req.user.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', protect, async (req, res) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint is required.' });
        }

        await prisma.pushSubscription.deleteMany({
            where: { endpoint, userId: req.user.id },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/push/test — admin sends a test push to themselves
router.post('/test', protect, adminOnly, async (req, res) => {
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId: req.user.id },
        });

        if (!subscriptions.length) {
            return res.status(404).json({ error: 'No push subscriptions found for your account.' });
        }

        const results = await Promise.allSettled(
            subscriptions.map((sub) =>
                sendPushNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    { title: 'CMGROUPS Test', body: 'Push notifications are working!', icon: '/icons/icon-192x192.png', url: '/' }
                )
            )
        );

        const sent = results.filter((r) => r.status === 'fulfilled').length;
        res.json({ success: true, sent, total: subscriptions.length });
    } catch (error) {
        console.error('Push test error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
