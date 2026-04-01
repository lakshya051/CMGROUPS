import { useState, useEffect, useCallback } from 'react';
import {
    Bell, Send, History, Users, Wifi, Search,
    ChevronLeft, ChevronRight, Check, X, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { adminNotificationsAPI, adminAPI } from '../../lib/api';

const TABS = [
    { id: 'send', label: 'Send Notification', icon: Send },
    { id: 'history', label: 'History', icon: History },
];

const NOTIFICATION_TYPES = [
    { value: 'SYSTEM', label: 'System' },
    { value: 'ALERT', label: 'Alert' },
    { value: 'PROMO', label: 'Promo' },
    { value: 'ORDER', label: 'Order' },
];

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

export default function AdminNotifications() {
    const [activeTab, setActiveTab] = useState('send');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        adminNotificationsAPI.getStats().then(setStats).catch(() => {});
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-primary flex items-center gap-2">
                    <Bell size={24} /> Push Notifications
                </h1>
                <p className="text-sm text-text-muted mt-1">
                    Send in-app and push notifications to your users.
                </p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
                    <StatCard icon={Wifi} label="Push-enabled Users" value={stats.usersWithPush} />
                    <StatCard icon={Send} label="Sent (Last 30d)" value={stats.recentNotifications} />
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-border-default">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                activeTab === tab.id
                                    ? 'border-trust text-trust'
                                    : 'border-transparent text-text-muted hover:text-text-primary hover:border-border-default'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'send' ? (
                <SendTab onSent={() => {
                    adminNotificationsAPI.getStats().then(setStats).catch(() => {});
                }} />
            ) : (
                <HistoryTab />
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value }) {
    return (
        <div className="bg-surface border border-border-default rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-trust/10 text-trust flex items-center justify-center shrink-0">
                <Icon size={20} />
            </div>
            <div>
                <p className="text-xs text-text-muted">{label}</p>
                <p className="text-lg font-bold text-text-primary">{value}</p>
            </div>
        </div>
    );
}

function SendTab({ onSent }) {
    const [form, setForm] = useState({
        title: '', message: '', type: 'SYSTEM', link: '', target: 'all',
    });
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [sending, setSending] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) {
            toast.error('Title and message are required.');
            return;
        }
        if (form.target === 'selected' && selectedUsers.length === 0) {
            toast.error('Please select at least one user.');
            return;
        }
        setConfirmOpen(true);
    };

    const confirmSend = async () => {
        setConfirmOpen(false);
        setSending(true);
        try {
            const payload = {
                title: form.title.trim(),
                message: form.message.trim(),
                type: form.type,
                link: form.link.trim() || undefined,
                target: form.target,
                ...(form.target === 'selected' && { userIds: selectedUsers.map(u => u.id) }),
            };
            const data = await adminNotificationsAPI.send(payload);
            toast.success(`Notification sent to ${data.sentCount} user(s).`);
            setForm({ title: '', message: '', type: 'SYSTEM', link: '', target: 'all' });
            setSelectedUsers([]);
            onSent?.();
        } catch (err) {
            toast.error(err?.message || 'Failed to send notification.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-4">
                <div className="bg-surface border border-border-default rounded-lg p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Title *</label>
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            maxLength={120}
                            className="w-full px-3 py-2 rounded-lg border border-border-default bg-page-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
                            placeholder="e.g. Flash Sale is Live!"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Message *</label>
                        <textarea
                            name="message"
                            value={form.message}
                            onChange={handleChange}
                            rows={4}
                            maxLength={500}
                            className="w-full px-3 py-2 rounded-lg border border-border-default bg-page-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-trust/40 resize-none"
                            placeholder="Write your notification message..."
                        />
                        <p className="text-xs text-text-muted text-right mt-1">{form.message.length}/500</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">Type</label>
                            <select
                                name="type"
                                value={form.type}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-lg border border-border-default bg-page-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
                            >
                                {NOTIFICATION_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">Link (optional)</label>
                            <input
                                name="link"
                                value={form.link}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-lg border border-border-default bg-page-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
                                placeholder="/products or /dashboard/orders"
                            />
                        </div>
                    </div>

                    {/* Target */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Target Audience</label>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="target"
                                    value="all"
                                    checked={form.target === 'all'}
                                    onChange={handleChange}
                                    className="accent-trust"
                                />
                                <span className="text-sm text-text-primary">All Users</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="target"
                                    value="selected"
                                    checked={form.target === 'selected'}
                                    onChange={handleChange}
                                    className="accent-trust"
                                />
                                <span className="text-sm text-text-primary">Select Users</span>
                            </label>
                        </div>
                    </div>

                    {form.target === 'selected' && (
                        <UserSelector selected={selectedUsers} onChange={setSelectedUsers} />
                    )}

                    <Button type="submit" disabled={sending} className="w-full gap-2">
                        <Send size={16} />
                        {sending ? 'Sending...' : 'Send Notification'}
                    </Button>
                </div>
            </form>

            {/* Preview */}
            <div className="lg:col-span-2">
                <div className="bg-surface border border-border-default rounded-lg p-5 sticky top-4">
                    <h3 className="text-sm font-bold text-text-primary mb-3">Preview</h3>
                    <div className="bg-page-bg border border-border-default rounded-lg p-4 space-y-2">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-trust/15 text-trust flex items-center justify-center shrink-0 mt-0.5">
                                <Bell size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-primary">
                                    {form.title || 'Notification Title'}
                                </p>
                                <p className="text-xs text-text-muted mt-0.5 whitespace-pre-wrap">
                                    {form.message || 'Your notification message will appear here.'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-trust/10 text-trust font-medium">
                                        {form.type}
                                    </span>
                                    {form.link && (
                                        <span className="text-[10px] text-text-muted truncate">
                                            {form.link}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-text-muted">
                        <p>Target: <span className="font-medium text-text-primary">
                            {form.target === 'all' ? 'All users' : `${selectedUsers.length} selected user(s)`}
                        </span></p>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={confirmSend}
                title="Send Notification?"
                message={`This will send a notification to ${
                    form.target === 'all' ? 'all users' : `${selectedUsers.length} selected user(s)`
                }. They will receive both an in-app notification and a push notification (if enabled).`}
                confirmLabel="Send"
                variant="primary"
                loading={sending}
            />
        </div>
    );
}

function UserSelector({ selected, onChange }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const searchUsers = useCallback(async (q) => {
        if (!q.trim()) {
            setResults([]);
            setSearched(false);
            return;
        }
        setLoading(true);
        try {
            const data = await adminAPI.getUsers({ search: q, limit: 20 });
            setResults(data.users || []);
            setSearched(true);
        } catch {
            toast.error('Failed to search users.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchUsers(query), 400);
        return () => clearTimeout(timer);
    }, [query, searchUsers]);

    const toggleUser = (user) => {
        const exists = selected.find(u => u.id === user.id);
        if (exists) {
            onChange(selected.filter(u => u.id !== user.id));
        } else {
            onChange([...selected, { id: user.id, name: user.name, email: user.email }]);
        }
    };

    const isSelected = (id) => selected.some(u => u.id === id);

    return (
        <div className="space-y-3">
            {/* Selected chips */}
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selected.map(u => (
                        <span
                            key={u.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-trust/10 text-trust text-xs font-medium rounded-full"
                        >
                            {u.name || u.email}
                            <button
                                type="button"
                                onClick={() => onChange(selected.filter(s => s.id !== u.id))}
                                className="hover:text-error transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="text-xs text-text-muted hover:text-error transition-colors"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Search input */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-default bg-page-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
                />
            </div>

            {/* Results */}
            {loading && <p className="text-xs text-text-muted py-2">Searching...</p>}
            {!loading && searched && results.length === 0 && (
                <p className="text-xs text-text-muted py-2">No users found.</p>
            )}
            {results.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-border-default rounded-lg divide-y divide-border-default bg-page-bg">
                    {results.map(user => (
                        <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleUser(user)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-hover transition-colors ${
                                isSelected(user.id) ? 'bg-trust/5' : ''
                            }`}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                                isSelected(user.id) ? 'bg-trust border-trust text-white' : 'border-border-default'
                            }`}>
                                {isSelected(user.id) && <Check size={12} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-text-primary truncate">{user.name || 'Unnamed'}</p>
                                <p className="text-xs text-text-muted truncate">{user.email}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function HistoryTab() {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await adminNotificationsAPI.getHistory(page);
            setLogs(data.logs || []);
            setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch {
            toast.error('Failed to load notification history.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    if (loading) {
        return (
            <div className="bg-surface border border-border-default rounded-lg p-12 text-center text-text-muted">
                Loading history...
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="bg-surface border border-border-default rounded-lg p-12 text-center">
                <History size={40} className="mx-auto text-text-muted mb-3 opacity-40" />
                <p className="text-sm font-medium text-text-primary">No notifications sent yet</p>
                <p className="text-xs text-text-muted mt-1">
                    Switch to the &quot;Send Notification&quot; tab to send your first notification.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Desktop table */}
            <div className="hidden md:block bg-surface border border-border-default rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-page-bg text-text-muted text-xs uppercase tracking-wider">
                            <th className="text-left px-4 py-3 font-medium">Notification</th>
                            <th className="text-left px-4 py-3 font-medium">Type</th>
                            <th className="text-left px-4 py-3 font-medium">Target</th>
                            <th className="text-right px-4 py-3 font-medium">Recipients</th>
                            <th className="text-left px-4 py-3 font-medium">Sent By</th>
                            <th className="text-left px-4 py-3 font-medium">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                                <td className="px-4 py-3">
                                    <p className="font-medium text-text-primary truncate max-w-[200px]">{log.title}</p>
                                    <p className="text-xs text-text-muted truncate max-w-[200px]">{log.message}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-trust/10 text-trust font-medium">
                                        {log.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-text-muted capitalize">{log.target}</td>
                                <td className="px-4 py-3 text-right font-medium text-text-primary">{log.recipientCount}</td>
                                <td className="px-4 py-3 text-text-muted text-xs">{log.admin?.name || log.admin?.email || 'Admin'}</td>
                                <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">{formatDate(log.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {logs.map(log => (
                    <div key={log.id} className="bg-surface border border-border-default rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-text-primary">{log.title}</p>
                                <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{log.message}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-trust/10 text-trust font-medium shrink-0">
                                {log.type}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                            <span className="capitalize">{log.target}</span>
                            <span>{log.recipientCount} recipients</span>
                            <span className="ml-auto">{formatDate(log.createdAt)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-surface border border-border-default rounded-lg px-4 py-3">
                    <p className="text-xs text-text-muted">
                        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => fetchHistory(pagination.page - 1)}
                        >
                            <ChevronLeft size={14} />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => fetchHistory(pagination.page + 1)}
                        >
                            <ChevronRight size={14} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
