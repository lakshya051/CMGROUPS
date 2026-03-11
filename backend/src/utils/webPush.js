import webpush from 'web-push';
import prisma from '../lib/prisma.js';

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@cmgroups.in',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export async function sendPushNotification(subscription, payload) {
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
