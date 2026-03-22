import webpush from 'web-push';
import prisma from '../lib/prisma.js';

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:support@cmgroups.in',
        vapidPublic,
        vapidPrivate
    );
}

export async function sendPushNotification(subscription, payload) {
    if (!vapidPublic || !vapidPrivate) {
        console.warn('[web-push] VAPID keys not configured; skipping push send.');
        return;
    }
    try {
        await webpush.sendNotification(
            subscription,
            JSON.stringify(payload)
        );
    } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
            await prisma.pushSubscription.deleteMany({
                where: { endpoint: subscription.endpoint },
            });
            return;
        }
        console.error('[web-push] Failed to send:', error.message);
        throw error;
    }
}
