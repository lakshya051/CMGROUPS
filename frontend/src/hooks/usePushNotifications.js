import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const LS_KEY = 'cmgroups_push_subscribed';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

export function usePushNotifications(getToken) {
    const isSupported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        Boolean(VAPID_PUBLIC_KEY);

    const [permission, setPermission] = useState(
        isSupported ? Notification.permission : 'denied'
    );
    const [isSubscribed, setIsSubscribed] = useState(
        () => localStorage.getItem(LS_KEY) === 'true'
    );

    useEffect(() => {
        if (!isSupported) return;
        setPermission(Notification.permission);
    }, [isSupported]);

    const authHeaders = useCallback(async () => {
        const token = getToken ? await getToken() : null;
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        };
    }, [getToken]);

    const subscribe = useCallback(async () => {
        if (!isSupported) return false;

        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== 'granted') return false;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const json = subscription.toJSON();
        const headers = await authHeaders();
        await fetch(`${API_BASE}/push/subscribe`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                endpoint: json.endpoint,
                keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            }),
        });

        localStorage.setItem(LS_KEY, 'true');
        setIsSubscribed(true);
        return true;
    }, [isSupported, authHeaders]);

    const unsubscribe = useCallback(async () => {
        if (!isSupported) return;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();

            const headers = await authHeaders();
            await fetch(`${API_BASE}/push/unsubscribe`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ endpoint }),
            });
        }

        localStorage.removeItem(LS_KEY);
        setIsSubscribed(false);
    }, [isSupported, authHeaders]);

    return { isSupported, isSubscribed, subscribe, unsubscribe, permission };
}
