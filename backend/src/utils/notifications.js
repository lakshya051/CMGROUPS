import prisma from '../lib/prisma.js';
import { sendPushNotification } from './webPush.js';

async function sendPushToUserDevices({ userId, title, body, link }) {
    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
    });

    if (!subscriptions.length) {
        return;
    }

    await Promise.allSettled(
        subscriptions.map((sub) =>
            sendPushNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                { title, body, icon: '/icons/icon-192x192.png', url: link || '/' }
            )
        )
    );
}

export async function createUserNotification({
    userId,
    title,
    message,
    type,
    link = null,
    push = null,
}) {
    const notification = await prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type,
            link,
        },
    });

    if (push?.enabled) {
        void sendPushToUserDevices({
            userId,
            title: push.title || title,
            body: push.body || message,
            link,
        });
    }

    return notification;
}
