import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, ShieldOff, ShoppingBag, Star, Wrench, Gift, Wallet, Copy, CheckCircle, Eye, X } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import SectionLoader from '../../components/ui/SectionLoader';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState(null);
    const [copiedCode, setCopiedCode] = useState('');

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [userStats, setUserStats] = useState({
        totalCustomers: 0,
        totalAdmins: 0,
        totalWalletBalance: 0,
        totalUsers: 0
    });

    // Detailed Modal State
    const [selectedUserForModal, setSelectedUserForModal] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // overview, orders, referrals, wallet, services

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const res = await adminAPI.getUsers({
                    page,
                    limit: 20,
                    search: debouncedSearch || undefined
                });
                if (res.data) {
                    setUsers(res.data);
                    setTotalPages(res.pagination.totalPages);
                    setUserStats(res.stats);
                } else {
                    setUsers(res);
                }
            } catch (err) {
                console.error('Failed to fetch users:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [page, debouncedSearch]);

    const handleRoleToggle = async (user) => {
        const newRole = user.role === 'admin' ? 'customer' : 'admin';
        if (!window.confirm(`Change ${user.name || user.email || 'this user'}'s role to ${newRole}?`)) return;

        try {
            await adminAPI.updateUserRole(user.id, newRole);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
        } catch (err) {
            alert(err.message);
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(''), 2000);
    };

    const handleOpenProfile = async (user) => {
        setSelectedUserForModal(user);
        setUserDetails(null);
        setLoadingDetails(true);
        setActiveTab('overview');
        try {
            const details = await adminAPI.getUserDetails(user.id);
            setUserDetails(details);
        } catch (err) {
            console.error('Failed to load details', err);
            alert('Failed to load user details: ' + err.message);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Server-side filtering implemented above.
    const displayUsers = users;

    // Summary stats from backend
    const { totalCustomers, totalAdmins, totalWalletBalance, totalUsers } = userStats;
    // Note: totalReferrals calculation is omitted for now as it would require another backend aggregate 
    // or adding it to the stats object. Let's use a placeholder or omit if not critical.
    const totalReferrals = users.reduce((sum, u) => sum + (u._count?.referralsMade || 0), 0);

    if (loading) return <SectionLoader message="Loading users..." />;

    return (
        <div className="space-y-lg animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-text-primary mb-1">User Management</h1>
                <p className="text-sm text-text-secondary">Complete customer data — orders, referrals, wallet, and more.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Users</p>
                    <p className="text-2xl font-bold">{totalUsers}</p>
                    <p className="text-xs text-text-muted mt-1">{totalCustomers} customers · {totalAdmins} admins</p>
                </div>
                <div className="glass-panel p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Orders</p>
                    <p className="text-2xl font-bold">{users.reduce((s, u) => s + (u._count?.orders || 0), 0)}</p>
                </div>
                <div className="glass-panel p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Referrals</p>
                    <p className="text-2xl font-bold text-primary">{totalReferrals}</p>
                </div>
                <div className="glass-panel p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Wallet Payouts</p>
                    <p className="text-2xl font-bold text-success">₹{totalWalletBalance.toLocaleString()}</p>
                </div>
            </div>

            {/* Search */}
            <div className="glass-panel p-sm border border-border-default shadow-sm rounded-lg mb-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or referral code..."
                        className="input-field pl-9 bg-surface"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-panel overflow-hidden border border-border-default shadow-sm rounded-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-page-bg text-text-secondary text-xs uppercase font-bold tracking-wider border-b border-border-default">
                                <th className="p-4">User</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Joined</th>
                                <th className="p-4">Orders</th>
                                <th className="p-4">Referral Code</th>
                                <th className="p-4">Referrals</th>
                                <th className="p-4">Wallet</th>
                                <th className="p-4">Reviews</th>
                                <th className="p-4">Services</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-border-default">
                            {displayUsers.map(user => (
                                <React.Fragment key={user.id}>
                                    <tr
                                        className="hover:bg-surface-hover transition-colors cursor-pointer"
                                        onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                                    {(user.name || user.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{user.name || user.email || '—'}</p>
                                                    <p className="text-xs text-text-muted">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${user.role === 'admin'
                                                ? 'text-primary bg-primary/10 border-primary/20'
                                                : 'text-text-muted bg-page-bg border-border-default'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-text-muted text-xs">
                                            {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <ShoppingBag size={14} className="text-text-muted" />
                                                <span>{user._count?.orders || 0}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {user.referralCode ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-xs bg-page-bg px-2 py-1 rounded border border-border-default text-primary">
                                                        {user.referralCode}
                                                    </span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); copyCode(user.referralCode); }}
                                                        className="text-text-muted hover:text-text-main transition-colors"
                                                        title="Copy code"
                                                    >
                                                        {copiedCode === user.referralCode ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-text-muted text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Gift size={14} className="text-primary" />
                                                <span className={user._count?.referralsMade > 0 ? 'text-primary font-medium' : ''}>
                                                    {user._count?.referralsMade || 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-medium ${(user.walletBalance || 0) > 0 ? 'text-success' : 'text-text-muted'}`}>
                                                ₹{(user.walletBalance || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Star size={14} className="text-text-muted" />
                                                <span>{user._count?.reviews || 0}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Wrench size={14} className="text-text-muted" />
                                                <span>{user._count?.bookings || 0}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenProfile(user); }}
                                                    className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                    title="View Profile"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRoleToggle(user); }}
                                                    className={`p-2 rounded-lg transition-colors ${user.role === 'admin'
                                                        ? 'hover:bg-error/10 hover:text-error text-text-muted'
                                                        : 'hover:bg-primary/10 hover:text-primary text-text-muted'
                                                        }`}
                                                    title={user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                                >
                                                    {user.role === 'admin' ? <ShieldOff size={18} /> : <Shield size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Detail Row */}
                                    {expandedUser === user.id && (
                                        <tr>
                                            <td colSpan="10" className="px-sm pb-sm bg-page-bg border-b border-border-default">
                                                <div className="bg-surface rounded-lg p-md border border-border-default grid grid-cols-2 md:grid-cols-4 gap-sm text-sm">
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase mb-1">Phone</p>
                                                        <p className="font-medium">{user.phone || 'Not provided'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase mb-1">User ID</p>
                                                        <p className="font-mono font-medium">#{user.id}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase mb-1">Referral Code</p>
                                                        <p className="font-mono font-medium text-primary">{user.referralCode || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase mb-1">Wallet Balance</p>
                                                        <p className="font-medium text-success">₹{(user.walletBalance || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase mb-1">Total Orders</p>
                                                        <p className="font-medium">{user._count?.orders || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase mb-1">Referrals Made</p>
                                                        <p className="font-medium">{user._count?.referralsMade || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase mb-1">Reviews</p>
                                                        <p className="font-medium">{user._count?.reviews || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase mb-1">Service Bookings</p>
                                                        <p className="font-medium">{user._count?.bookings || 0}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {displayUsers.length === 0 && (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-text-muted">No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-sm bg-surface p-sm rounded-lg border border-border-default mt-4">
                    <button
                        className={`px-md py-xs rounded text-sm font-semibold transition-colors ${page === 1 ? 'bg-page-bg text-text-muted cursor-not-allowed border border-border-default' : 'bg-surface border border-border-default hover:bg-surface-hover text-text-primary'}`}
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span className="text-sm font-bold text-text-primary">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className={`px-md py-xs rounded text-sm font-semibold transition-colors ${page === totalPages ? 'bg-page-bg text-text-muted cursor-not-allowed border border-border-default' : 'bg-buy-primary text-text-primary hover:bg-buy-primary-hover border border-border-default'}`}
                        disabled={page === totalPages || loading}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Slide-over Full Profile View */}
            {selectedUserForModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                    <div className="w-full max-w-2xl bg-surface h-full shadow-2xl border-l border-border-default overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-md border-b border-border-default flex items-center justify-between sticky top-0 bg-surface z-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                                    {(selectedUserForModal.name || selectedUserForModal.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary">{selectedUserForModal.name || selectedUserForModal.email || '—'}</h2>
                                    <p className="text-sm text-text-secondary">{selectedUserForModal.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUserForModal(null)} className="p-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto bg-page-bg p-md">
                            {loadingDetails ? (
                                <SectionLoader message="Loading details..." />
                            ) : userDetails ? (
                                <div className="space-y-lg">
                                    {/* Tabs */}
                                    <div className="flex flex-wrap gap-xs border-b border-border-default sticky top-0 bg-page-bg z-10 py-xs">
                                        {['overview', 'orders', 'wallet', 'referrals', 'services'].map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`px-sm py-xs text-sm font-semibold rounded-t transition-colors border-b-2 ${activeTab === tab
                                                    ? 'border-trust text-trust bg-trust/5'
                                                    : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                                                    }`}
                                            >
                                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content */}
                                    {activeTab === 'overview' && (
                                        <div className="font-mono text-sm space-y-md">
                                            <div className="grid grid-cols-2 gap-sm">
                                                <div className="bg-surface p-sm rounded-lg border border-border-default shadow-sm">
                                                    <p className="text-xs text-text-secondary uppercase mb-1 font-sans font-semibold">User ID</p>
                                                    <p className="font-bold text-text-primary">#{userDetails.id}</p>
                                                </div>
                                                <div className="bg-surface p-sm rounded-lg border border-border-default shadow-sm">
                                                    <p className="text-xs text-text-secondary uppercase mb-1 font-sans font-semibold">Role</p>
                                                    <p className="font-bold text-text-primary">{userDetails.role}</p>
                                                </div>
                                                <div className="bg-surface p-sm rounded-lg border border-border-default shadow-sm">
                                                    <p className="text-xs text-text-secondary uppercase mb-1 font-sans font-semibold">Phone</p>
                                                    <p className="font-bold text-text-primary">{userDetails.phone || 'N/A'}</p>
                                                </div>
                                                <div className="bg-surface p-sm rounded-lg border border-border-default shadow-sm">
                                                    <p className="text-xs text-text-secondary uppercase mb-1 font-sans font-semibold">Joined Date</p>
                                                    <p className="font-bold text-text-primary">{new Date(userDetails.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <div className="bg-surface p-sm rounded-lg border border-border-default shadow-sm">
                                                    <p className="text-xs text-text-secondary uppercase mb-1 font-sans font-semibold">Wallet Balance</p>
                                                    <p className="font-bold text-success">₹{(userDetails.walletBalance || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="bg-surface p-sm rounded-lg border border-border-default shadow-sm">
                                                    <p className="text-xs text-text-secondary uppercase mb-1 font-sans font-semibold">Referral Code</p>
                                                    <p className="font-bold text-trust">{userDetails.referralCode || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'orders' && (
                                        <div className="space-y-sm">
                                            <h3 className="font-bold text-lg mb-2 text-text-primary">Order History ({userDetails.orders?.length || 0})</h3>
                                            {userDetails.orders?.length > 0 ? userDetails.orders.map(order => (
                                                <div key={order.id} className="bg-surface p-sm rounded-lg border border-border-default shadow-sm flex justify-between items-center text-sm font-mono">
                                                    <div>
                                                        <p className="font-bold text-trust mb-1">Order #{order.id}</p>
                                                        <p className="text-text-secondary">{new Date(order.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold">₹{order.total.toLocaleString()}</p>
                                                        <p className={`text-xs px-2 py-0.5 mt-1 inline-block rounded ${order.isPaid ? 'bg-success/10 text-success' : 'bg-page-bg text-text-secondary border border-border-default'}`}>
                                                            {order.status}
                                                        </p>
                                                    </div>
                                                </div>
                                            )) : <p className="text-text-muted">No orders found.</p>}
                                        </div>
                                    )}

                                    {activeTab === 'wallet' && (
                                        <div className="space-y-sm">
                                            <div className="flex justify-between items-end mb-sm">
                                                <h3 className="font-bold text-lg text-text-primary">Wallet Transactions</h3>
                                                <p className="font-bold text-success bg-success/10 px-3 py-1 rounded text-sm">Valid Balance: ₹{(userDetails.walletBalance || 0).toLocaleString()}</p>
                                            </div>
                                            {userDetails.walletTransactions?.length > 0 ? userDetails.walletTransactions.map(txn => (
                                                <div key={txn.id} className="bg-surface p-sm rounded-lg border border-border-default shadow-sm flex justify-between items-center text-sm">
                                                    <div>
                                                        <p className="font-bold uppercase tracking-wider text-xs text-text-secondary mb-1">{txn.description}</p>
                                                        <p className="text-text-secondary text-xs">{new Date(txn.createdAt).toLocaleString()}</p>
                                                    </div>
                                                    <p className={`font-bold ${txn.type === 'CREDIT' ? 'text-success' : 'text-error'}`}>
                                                        {txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                                                    </p>
                                                </div>
                                            )) : <p className="text-text-secondary">No wallet history.</p>}
                                        </div>
                                    )}

                                    {activeTab === 'referrals' && (
                                        <div className="space-y-sm">
                                            <h3 className="font-bold text-lg mb-2 text-text-primary">Referrals Made ({userDetails.referralsMade?.length || 0})</h3>
                                            {userDetails.referralsMade?.length > 0 ? userDetails.referralsMade.map(ref => (
                                                <div key={ref.id} className="bg-surface p-sm rounded-lg border border-border-default shadow-sm flex justify-between items-center text-sm">
                                                    <div>
                                                        <p className="font-bold text-text-primary">{ref.referee?.name || 'Unknown User'}</p>
                                                        <p className="text-text-secondary text-xs">{ref.referee?.email}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-trust mb-1">Earned: ₹{ref.refereeReward || 0}</p>
                                                        <p className="text-xs text-text-secondary uppercase tracking-wider">{ref.status}</p>
                                                    </div>
                                                </div>
                                            )) : <p className="text-text-secondary">This user has not referred anyone yet.</p>}
                                        </div>
                                    )}

                                    {activeTab === 'services' && (
                                        <div className="space-y-sm">
                                            <h3 className="font-bold text-lg mb-2 text-text-primary">Service Bookings ({userDetails.bookings?.length || 0})</h3>
                                            {userDetails.bookings?.length > 0 ? userDetails.bookings.map(book => (
                                                <div key={book.id} className="bg-surface p-sm rounded-lg border border-border-default shadow-sm flex justify-between items-center text-sm">
                                                    <div>
                                                        <p className="font-bold text-trust mb-1">{book.serviceType}</p>
                                                        <p className="text-text-secondary text-xs">{new Date(book.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <p className="px-2 py-1 bg-page-bg border border-border-default rounded text-xs font-bold text-text-secondary">
                                                        {book.status}
                                                    </p>
                                                </div>
                                            )) : <p className="text-text-secondary">No services booked.</p>}
                                        </div>
                                    )}

                                </div>
                            ) : (
                                <div className="text-center py-10 text-error">Failed to load user details.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
