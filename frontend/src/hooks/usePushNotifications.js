import { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '../lib/api';
import { API_BASE } from '../lib/config';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const LS_KEY = 'cmgroups_push_subscribed';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

export function usePushNotifications() {
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

    // Align localStorage with the real PushSubscription (common after PWA updates / iOS reinstall).
    useEffect(() => {
        if (!isSupported) return;
        let cancelled = false;
        (async () => {
            try {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                if (cancelled) return;
                const lsSays = localStorage.getItem(LS_KEY) === 'true';
                if (lsSays && !sub) {
                    localStorage.removeItem(LS_KEY);
                    setIsSubscribed(false);
                } else if (!lsSays && sub) {
                    localStorage.setItem(LS_KEY, 'true');
                    setIsSubscribed(true);
                }
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isSupported]);

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
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/push/subscribe`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                endpoint: json.endpoint,
                keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            }),
        });
        if (!res.ok) throw new Error('Push subscription failed');

        localStorage.setItem(LS_KEY, 'true');
        setIsSubscribed(true);
        return true;
    }, [isSupported]);

    const unsubscribe = useCallback(async () => {
        if (!isSupported) return;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();

            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE}/push/unsubscribe`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ endpoint }),
            });
            if (!res.ok) throw new Error('Push unsubscribe failed');
        }

        localStorage.removeItem(LS_KEY);
        setIsSubscribed(false);
    }, [isSupported]);

    // Layer 2: re-subscribe silently on every app open (also recovers expired subscriptions)
    const refreshSubscription = useCallback(async () => {
        if (!isSupported) return;
        if (Notification.permission !== 'granted') return;

        try {
            const reg = await navigator.serviceWorker.ready;
            let existing = await reg.pushManager.getSubscription();

            if (!existing) {
                existing = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                });
            }

            const json = existing.toJSON();
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE}/push/subscribe`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    endpoint: json.endpoint,
                    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
                }),
            });
            if (!res.ok) throw new Error('Push subscription refresh failed');

            localStorage.setItem(LS_KEY, 'true');
            setIsSubscribed(true);
        } catch (err) {
            console.warn('Push refresh failed silently:', err);
        }
    }, [isSupported]);

    return { isSupported, isSubscribed, subscribe, unsubscribe, refreshSubscription, permission };
}
