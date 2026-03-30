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
    try {
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
    } catch (err) {
        console.error('createUserNotification error:', err.message);
        return null;
    }
}

/**
 * Send a notification to all admin users (in-app + push).
 * Runs in background — caller should fire-and-forget.
 */
export async function createAdminNotification({ title, message, type = 'admin', link = '/admin' }) {
    try {
        const admins = await prisma.user.findMany({
            where: { role: 'admin' },
            select: { id: true },
        });

        if (admins.length === 0) return;

        await prisma.notification.createMany({
            data: admins.map(a => ({ userId: a.id, title, message, type, link })),
        });

        await Promise.allSettled(
            admins.map(a => sendPushToUserDevices({ userId: a.id, title, body: message, link }))
        );
    } catch (err) {
        console.error('Admin notification error (non-blocking):', err);
    }
}
