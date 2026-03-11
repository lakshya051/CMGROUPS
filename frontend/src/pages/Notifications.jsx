import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag, Wrench, Wallet, GraduationCap, Trash2, CheckCheck } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import Button from '../components/ui/Button';

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
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getNotifIcon(link) {
    if (!link) return Bell;
    if (link.includes('order')) return ShoppingBag;
    if (link.includes('service')) return Wrench;
    if (link.includes('wallet') || link.includes('referral')) return Wallet;
    if (link.includes('course')) return GraduationCap;
    return Bell;
}

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'orders', label: 'Orders' },
    { id: 'services', label: 'Services' },
    { id: 'wallet', label: 'Wallet' },
];

export default function Notifications() {
    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotifications();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');

    const filtered = useMemo(() => {
        switch (activeTab) {
            case 'unread':
                return notifications.filter(n => !n.isRead);
            case 'orders':
                return notifications.filter(n => n.link?.includes('order') || n.type === 'ORDER');
            case 'services':
                return notifications.filter(n => n.link?.includes('service'));
            case 'wallet':
                return notifications.filter(n => n.link?.includes('wallet') || n.link?.includes('referral'));
            default:
                return notifications;
        }
    }, [notifications, activeTab]);

    const handleClearRead = async () => {
        const readNotifs = notifications.filter(n => n.isRead);
        await Promise.allSettled(readNotifs.map(n => deleteNotification(n.id)));
    };

    const handleItemClick = async (notif) => {
        if (!notif.isRead) {
            await markAsRead(notif.id);
        }
        if (notif.link) {
            navigate(notif.link);
        }
    };

    return (
        <div className="min-h-screen bg-page-bg">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-text-primary">Notifications</h1>
                        <p className="text-sm text-text-muted mt-1">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={markAllAsRead}>
                                <CheckCheck size={14} className="mr-1" />
                                Mark all read
                            </Button>
                        )}
                        {notifications.some(n => n.isRead) && (
                            <Button variant="ghost" size="sm" onClick={handleClearRead} className="text-text-muted">
                                <Trash2 size={14} className="mr-1" />
                                Clear read
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                                activeTab === tab.id
                                    ? 'bg-trust text-white shadow-sm'
                                    : 'bg-surface border border-border-default text-text-muted hover:border-trust hover:text-trust'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="p-12 text-center text-text-muted">Loading notifications...</div>
                ) : filtered.length === 0 ? (
                    <div className="bg-surface rounded-lg border border-border-default p-12 text-center">
                        <Bell size={40} className="mx-auto text-text-muted mb-3 opacity-40" />
                        <p className="text-sm font-medium text-text-primary">
                            {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                            We'll notify you about orders, services, and more.
                        </p>
                    </div>
                ) : (
                    <div className="bg-surface rounded-lg border border-border-default overflow-hidden divide-y divide-border-default">
                        {filtered.map(notif => {
                            const Icon = getNotifIcon(notif.link);
                            return (
                                <div
                                    key={notif.id}
                                    className={`flex items-start gap-3 px-4 py-4 hover:bg-surface-hover transition-colors cursor-pointer ${
                                        !notif.isRead ? 'bg-trust/5' : ''
                                    }`}
                                    onClick={() => handleItemClick(notif)}
                                >
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 ${
                                        !notif.isRead ? 'bg-trust/15 text-trust' : 'bg-surface-hover text-text-muted'
                                    }`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm ${!notif.isRead ? 'font-semibold text-text-primary' : 'text-text-primary'}`}>
                                                {notif.title}
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notif.id);
                                                }}
                                                className="flex-shrink-0 text-text-muted hover:text-error transition-colors p-1"
                                                aria-label="Delete notification"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] text-text-muted">
                                                {getTimeAgo(notif.createdAt)}
                                            </span>
                                            {!notif.isRead && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-trust" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
