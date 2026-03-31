import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const PushNotificationsBridge = () => {
    const { user } = useAuth();
    const { isSupported, isSubscribed, refreshSubscription, permission } = usePushNotifications();

    useEffect(() => {
        if (!isSupported || !user?.id) return;

        if (isSubscribed && permission === 'granted') {
            refreshSubscription();
        }
    }, [isSupported, user?.id, isSubscribed, permission, refreshSubscription]);

    return null;
};

export default PushNotificationsBridge;
