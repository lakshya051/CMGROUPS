import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const PushNotificationsBridge = () => {
    const { user } = useAuth();
    const { isSupported, isSubscribed, subscribe, refreshSubscription, permission } = usePushNotifications();

    const safeSubscribe = useCallback(async () => {
        try {
            const ok = await subscribe();
            if (ok === false && Notification.permission === 'denied') {
                toast('Notifications blocked. Enable them in your browser/app settings.', { icon: '🔕', duration: 5000 });
            }
        } catch {
            toast.error('Could not enable notifications. Please try again later.', { duration: 4000 });
        }
    }, [subscribe]);

    // When a push arrives, refresh in-app notification list.
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const onSwMessage = (e) => {
            if (e.data?.type === 'cmgroups:push-received') {
                window.dispatchEvent(new CustomEvent('cmgroups:notifications:refresh'));
            }
            if (e.data?.type === 'cmgroups:subscription-changed') {
                refreshSubscription();
            }
        };
        navigator.serviceWorker.addEventListener('message', onSwMessage);
        return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
    }, [refreshSubscription]);

    useEffect(() => {
        if (!isSupported || !user?.id) return;

        if (isSubscribed && permission === 'granted') {
            refreshSubscription();
            return;
        }

        if (permission === 'granted' && !isSubscribed) {
            safeSubscribe();
            return;
        }

        if (permission === 'default' && !isSubscribed) {
            const timer = setTimeout(safeSubscribe, 3000);
            return () => clearTimeout(timer);
        }
    }, [isSupported, user?.id, isSubscribed, permission, refreshSubscription, safeSubscribe]);

    return null;
};

export default PushNotificationsBridge;
