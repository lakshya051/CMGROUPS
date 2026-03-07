import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PushNotifications } from '@capacitor/push-notifications';
import { notificationsAPI } from '../../lib/api';
import {
    clearCurrentPushToken,
    dispatchNotificationsRefresh,
    getCurrentPushToken,
    isNativeAndroidPushAvailable,
    setCurrentPushToken,
} from '../../lib/pushNotifications';
import { useAuth } from '../../context/AuthContext';

const PushNotificationsBridge = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const userIdRef = useRef(user?.id || null);

    useEffect(() => {
        userIdRef.current = user?.id || null;
    }, [user?.id]);

    useEffect(() => {
        if (!isNativeAndroidPushAvailable()) {
            return undefined;
        }

        const listeners = [];

        const attachListeners = async () => {
            listeners.push(await PushNotifications.addListener('registration', async (token) => {
                const tokenValue = token.value;
                setCurrentPushToken(tokenValue);

                if (!userIdRef.current) {
                    return;
                }

                try {
                    await notificationsAPI.registerDevice(tokenValue, 'android');
                } catch (error) {
                    console.error('Push device registration failed:', error);
                }
            }));

            listeners.push(await PushNotifications.addListener('registrationError', (error) => {
                console.error('Push registration error:', error);
            }));

            listeners.push(await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                const title = notification.title || 'New notification';
                const body = notification.body ? `: ${notification.body}` : '';
                toast(`${title}${body}`);
                dispatchNotificationsRefresh();
            }));

            listeners.push(await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                const link = notification.notification.data?.link;
                dispatchNotificationsRefresh();
                if (link) {
                    navigate(link);
                }
            }));
        };

        void attachListeners();

        return () => {
            clearCurrentPushToken();
            listeners.forEach((listener) => {
                listener.remove();
            });
        };
    }, [navigate]);

    useEffect(() => {
        if (!isNativeAndroidPushAvailable() || !user?.id) {
            return undefined;
        }

        let cancelled = false;

        const ensurePushRegistration = async () => {
            try {
                let permissionStatus = await PushNotifications.checkPermissions();
                if (permissionStatus.receive === 'prompt') {
                    permissionStatus = await PushNotifications.requestPermissions();
                }

                if (permissionStatus.receive !== 'granted' || cancelled) {
                    return;
                }

                await PushNotifications.register();
            } catch (error) {
                console.error('Push permission / registration failed:', error);
            }
        };

        void ensurePushRegistration();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    useEffect(() => {
        const currentToken = getCurrentPushToken();
        if (!isNativeAndroidPushAvailable() || !user?.id || !currentToken) {
            return undefined;
        }

        let cancelled = false;

        const syncCurrentToken = async () => {
            try {
                await notificationsAPI.registerDevice(currentToken, 'android');
            } catch (error) {
                if (!cancelled) {
                    console.error('Push device sync failed:', error);
                }
            }
        };

        void syncCurrentToken();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    return null;
};

export default PushNotificationsBridge;
