import { Capacitor } from '@capacitor/core';

const NOTIFICATION_REFRESH_EVENT = 'technova:notifications:refresh';

let currentPushToken = null;

export function isNativeAndroidPushAvailable() {
    return (
        import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS !== 'false' &&
        Capacitor.isNativePlatform() &&
        Capacitor.getPlatform() === 'android'
    );
}

export function setCurrentPushToken(token) {
    currentPushToken = token || null;
}

export function getCurrentPushToken() {
    return currentPushToken;
}

export function clearCurrentPushToken() {
    currentPushToken = null;
}

export function dispatchNotificationsRefresh() {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_REFRESH_EVENT));
}

export function getNotificationsRefreshEventName() {
    return NOTIFICATION_REFRESH_EVENT;
}
