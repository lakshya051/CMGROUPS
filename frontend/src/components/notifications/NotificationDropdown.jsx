import { useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag, Wrench, Wallet, GraduationCap, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getNotifIcon(link) {
    if (!link) return Bell;
    if (link.includes('order')) return ShoppingBag;
    if (link.includes('service')) return Wrench;
    if (link.includes('wallet') || link.includes('referral')) return Wallet;
    if (link.includes('course')) return GraduationCap;
    return Bell;
}

const NotificationDropdown = () => {
    const {
        notifications,
        unreadCount,
        isOpen,
        setIsOpen,
        markAsRead,
        markAllAsRead,
    } = useNotifications();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    const handleClickOutside = useCallback((e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
            setIsOpen(false);
        }
    }, [setIsOpen]);

    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape') setIsOpen(false);
    }, [setIsOpen]);

    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, handleClickOutside, handleEscape]);

    if (!isOpen) return null;

    const handleItemClick = async (notif) => {
        if (!notif.isRead) {
            await markAsRead(notif.id);
        }
        setIsOpen(false);
        if (notif.link) {
            navigate(notif.link);
        }
    };

    return (
        <div
            ref={dropdownRef}
            className="absolute top-full right-0 w-80 md:w-96 bg-surface border border-border-default shadow-card rounded-lg mt-2 z-50 flex flex-col max-h-[28rem] overflow-hidden animate-in fade-in slide-in-from-top-2"
        >
            {/* Header */}
            <div className="p-3 border-b border-border-default flex justify-between items-center bg-surface-hover rounded-t-lg flex-shrink-0">
                <span className="font-bold text-sm text-text-primary">Notifications</span>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs text-trust hover:underline font-medium"
                        >
                            Mark all read
                        </button>
                    )}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <Bell size={32} className="mx-auto text-text-muted mb-2 opacity-40" />
                        <p className="text-sm font-medium text-text-primary">No notifications yet</p>
                        <p className="text-xs text-text-muted mt-1">
                            We'll notify you about orders, services, and more.
                        </p>
                    </div>
                ) : (
                    notifications.slice(0, 20).map((notif) => {
                        const Icon = getNotifIcon(notif.link);
                        return (
                            <button
                                key={notif.id}
                                onClick={() => handleItemClick(notif)}
                                className={`w-full text-left px-3 py-3 border-b border-border-default hover:bg-surface-hover transition-colors flex gap-3 items-start ${
                                    !notif.isRead ? 'bg-trust/5' : ''
                                }`}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        !notif.isRead ? 'bg-trust/15 text-trust' : 'bg-surface-hover text-text-muted'
                                    }`}>
                                        <Icon size={16} />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${!notif.isRead ? 'font-semibold text-text-primary' : 'text-text-primary'}`}>
                                        {notif.title}
                                    </p>
                                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                                        {notif.message}
                                    </p>
                                    <p className="text-[10px] text-text-muted mt-1">
                                        {getTimeAgo(notif.createdAt)}
                                    </p>
                                </div>
                                {!notif.isRead && (
                                    <div className="flex-shrink-0 mt-2">
                                        <div className="w-2 h-2 rounded-full bg-trust" />
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="p-2 border-t border-border-default flex-shrink-0">
                    <Link
                        to="/notifications"
                        onClick={() => setIsOpen(false)}
                        className="block text-center text-xs font-medium text-trust hover:underline py-1"
                    >
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
