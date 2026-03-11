import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { notificationsAPI } from '../lib/api';

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const intervalRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        try {
            setIsLoading(true);
            const data = await notificationsAPI.getAll();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Fetch on mount when user is authenticated
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Poll every 60 seconds
    useEffect(() => {
        if (!user) return;
        intervalRef.current = setInterval(fetchNotifications, 60 * 1000);
        return () => clearInterval(intervalRef.current);
    }, [user, fetchNotifications]);

    // Refresh on window focus
    useEffect(() => {
        if (!user) return;
        const onFocus = () => fetchNotifications();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [user, fetchNotifications]);

    // Listen for custom refresh event (from push notifications etc)
    useEffect(() => {
        const handler = () => fetchNotifications();
        window.addEventListener('technova:notifications:refresh', handler);
        return () => window.removeEventListener('technova:notifications:refresh', handler);
    }, [fetchNotifications]);

    const markAsRead = useCallback(async (id) => {
        try {
            await notificationsAPI.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationsAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }, []);

    const deleteNotification = useCallback(async (id) => {
        try {
            await notificationsAPI.delete(id);
            setNotifications(prev => {
                const target = prev.find(n => n.id === id);
                if (target && !target.isRead) {
                    setUnreadCount(c => Math.max(0, c - 1));
                }
                return prev.filter(n => n.id !== id);
            });
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    }, []);

    const toggleOpen = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                isLoading,
                isOpen,
                fetchNotifications,
                markAsRead,
                markAllAsRead,
                deleteNotification,
                toggleOpen,
                setIsOpen,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
