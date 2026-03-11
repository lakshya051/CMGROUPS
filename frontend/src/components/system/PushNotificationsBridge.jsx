import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const PushNotificationsBridge = () => {
    const { user } = useAuth();
    const { isSupported, isSubscribed, subscribe, refreshSubscription } = usePushNotifications();

    useEffect(() => {
        if (!isSupported || !user?.id) return;

        if (!isSubscribed) {
            subscribe().catch((err) => {
                console.error('Auto push subscribe failed:', err);
            });
        } else {
            refreshSubscription();
        }
    }, [isSupported, user?.id, isSubscribed, subscribe, refreshSubscription]);

    return null;
};

export default PushNotificationsBridge;
