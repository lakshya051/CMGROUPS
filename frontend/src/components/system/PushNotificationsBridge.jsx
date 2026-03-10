import { useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const PushNotificationsBridge = () => {
    const { user } = useAuth();
    const { getToken } = useClerkAuth();
    const { isSupported, isSubscribed, subscribe } = usePushNotifications(getToken);

    useEffect(() => {
        if (!isSupported || !user?.id || isSubscribed) return;
        subscribe().catch((err) => {
            console.error('Auto push subscribe failed:', err);
        });
    }, [isSupported, user?.id, isSubscribed, subscribe]);

    return null;
};

export default PushNotificationsBridge;
