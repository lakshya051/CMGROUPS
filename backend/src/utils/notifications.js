import prisma from '../lib/prisma.js';
import { getFirebaseMessaging, getPushState } from '../lib/firebaseAdmin.js';

const INVALID_TOKEN_ERRORS = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
]);

async function deactivateTokens(tokens = []) {
    if (!tokens.length) {
        return;
    }

    try {
        await prisma.deviceRegistration.updateMany({
            where: { token: { in: tokens } },
            data: { isActive: false },
        });
    } catch (error) {
        console.error('[push] Failed to deactivate invalid tokens:', error.message);
    }
}

async function sendPushToUserDevices({ userId, notificationId, title, body, type, link }) {
    const pushState = getPushState();
    if (!pushState.enabled || !pushState.available) {
        return;
    }

    const devices = await prisma.deviceRegistration.findMany({
        where: {
            userId,
            isActive: true,
            platform: 'android',
        },
        select: { token: true },
    });

    const tokens = devices.map((device) => device.token).filter(Boolean);
    if (!tokens.length) {
        return;
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
        return;
    }

    try {
        const response = await messaging.sendEachForMulticast({
            tokens,
            notification: {
                title,
                body,
            },
            data: {
                link: link || '',
                type: type || '',
                notificationId: String(notificationId),
            },
            android: {
                priority: 'high',
                notification: {
                    clickAction: 'FCM_PLUGIN_ACTIVITY',
                    channelId: 'default',
                },
            },
        });

        const invalidTokens = [];
        response.responses.forEach((result, index) => {
            if (!result.success && INVALID_TOKEN_ERRORS.has(result.error?.code)) {
                invalidTokens.push(tokens[index]);
            }
        });

        await deactivateTokens(invalidTokens);
    } catch (error) {
        console.error('[push] Failed to send push notification:', error.message);
    }
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
            notificationId: notification.id,
            title: push.title || title,
            body: push.body || message,
            type: push.type || type,
            link,
        });
    }

    return notification;
}
