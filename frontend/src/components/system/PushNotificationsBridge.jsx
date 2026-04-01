import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const PushNotificationsBridge = () => {
    const { user } = useAuth();
    const { isSupported, isSubscribed, subscribe, refreshSubscription, permission } = usePushNotifications();

    useEffect(() => {
        if (!isSupported || !user?.id) return;

        if (isSubscribed && permission === 'granted') {
            refreshSubscription();
            return;
        }

        if (permission === 'default' && !isSubscribed) {
            const timer = setTimeout(() => {
                subscribe().catch(err => console.warn('Auto push subscribe failed:', err));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isSupported, user?.id, isSubscribed, permission, refreshSubscription, subscribe]);

    return null;
};

export default PushNotificationsBridge;
