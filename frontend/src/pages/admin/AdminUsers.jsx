import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, ShieldOff, ShoppingBag, Star, Wrench, Gift, Wallet, Copy, CheckCircle, Eye, X } from 'lucide-react';
import { adminAPI } from '../../lib/api';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState(null);
    const [copiedCode, setCopiedCode] = useState('');

    // Detailed Modal State
    const [selectedUserForModal, setSelectedUserForModal] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // overview, orders, referrals, wallet, services

    useEffect(() => {
        adminAPI.getUsers()
            .then(data => setUsers(data))
            .catch(err => console.error('Failed to fetch users:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleRoleToggle = async (user) => {
        const newRole = user.role === 'admin' ? 'customer' : 'admin';
        if (!window.confirm(`Change ${user.name}'s role to ${newRole}?`)) return;

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

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.referralCode && u.referralCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Summary stats
    const totalCustomers = users.filter(u => u.role === 'customer').length;
    const totalAdmins = users.filter(u => u.role === 'admin').length;
    const totalWalletBalance = users.reduce((sum, u) => sum + (u.walletBalance || 0), 0);
    const totalReferrals = users.reduce((sum, u) => sum + (u._count?.referralsMade || 0), 0);

    if (loading) return <div className="p-8 text-center text-text-muted">Loading users...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-heading font-bold mb-1">User Management</h1>
                <p className="text-text-muted">Complete customer data — orders, referrals, wallet, and more.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
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
            <div className="glass-panel p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or referral code..."
                        className="input-field pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-text-muted text-xs uppercase tracking-wider border-b border-gray-200">
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
                        <tbody className="text-sm divide-y divide-gray-100">
                            {filteredUsers.map(user => (
                                <React.Fragment key={user.id}>
                                    <tr
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{user.name}</p>
                                                    <p className="text-xs text-text-muted">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${user.role === 'admin'
                                                ? 'text-primary bg-primary/10 border-primary/20'
                                                : 'text-text-muted bg-gray-100 border-gray-200'
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
                                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200 text-primary">
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
                                            <td colSpan="10" className="px-4 pb-4">
                                                <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-text-muted">No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Slide-over Full Profile View */}
            {selectedUserForModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                    <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                                    {selectedUserForModal.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{selectedUserForModal.name}</h2>
                                    <p className="text-sm text-text-muted">{selectedUserForModal.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUserForModal(null)} className="p-2 hover:bg-gray-100 rounded-lg text-text-muted transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
                            {loadingDetails ? (
                                <div className="flex items-center justify-center h-40">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : userDetails ? (
                                <div className="space-y-6">
                                    {/* Tabs */}
                                    <div className="flex flex-wrap gap-2 border-b border-gray-200 sticky top-0 bg-gray-50/50 z-10 py-2">
                                        {['overview', 'orders', 'wallet', 'referrals', 'services'].map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === tab
                                                        ? 'border-primary text-primary bg-primary/5'
                                                        : 'border-transparent text-text-muted hover:text-text-main hover:bg-gray-100'
                                                    }`}
                                            >
                                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content */}
                                    {activeTab === 'overview' && (
                                        <div className="font-mono text-sm space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                                    <p className="text-xs text-text-muted uppercase mb-1">User ID</p>
                                                    <p className="font-bold">#{userDetails.id}</p>
                                                </div>
                                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                                    <p className="text-xs text-text-muted uppercase mb-1">Role</p>
                                                    <p className="font-bold">{userDetails.role}</p>
                                                </div>
                                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                                    <p className="text-xs text-text-muted uppercase mb-1">Phone</p>
                                                    <p className="font-bold">{userDetails.phone || 'N/A'}</p>
                                                </div>
                                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                                    <p className="text-xs text-text-muted uppercase mb-1">Joined Date</p>
                                                    <p className="font-bold">{new Date(userDetails.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                                    <p className="text-xs text-text-muted uppercase mb-1">Wallet Balance</p>
                                                    <p className="font-bold text-success">₹{(userDetails.walletBalance || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                                    <p className="text-xs text-text-muted uppercase mb-1">Referral Code</p>
                                                    <p className="font-bold text-primary">{userDetails.referralCode || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'orders' && (
                                        <div className="space-y-3">
                                            <h3 className="font-bold text-lg mb-2 text-text-main">Order History ({userDetails.orders?.length || 0})</h3>
                                            {userDetails.orders?.length > 0 ? userDetails.orders.map(order => (
                                                <div key={order.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center text-sm font-mono">
                                                    <div>
                                                        <p className="font-bold text-primary mb-1">Order #{order.id}</p>
                                                        <p className="text-text-muted">{new Date(order.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold">₹{order.total.toLocaleString()}</p>
                                                        <p className={`text-xs px-2 py-0.5 mt-1 inline-block rounded ${order.isPaid ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'}`}>
                                                            {order.status}
                                                        </p>
                                                    </div>
                                                </div>
                                            )) : <p className="text-text-muted">No orders found.</p>}
                                        </div>
                                    )}

                                    {activeTab === 'wallet' && (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end mb-4">
                                                <h3 className="font-bold text-lg text-text-main">Wallet Transactions</h3>
                                                <p className="font-bold text-success bg-success/10 px-3 py-1 rounded-full text-sm">Valid Balance: ₹{(userDetails.walletBalance || 0).toLocaleString()}</p>
                                            </div>
                                            {userDetails.walletTransactions?.length > 0 ? userDetails.walletTransactions.map(txn => (
                                                <div key={txn.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center text-sm">
                                                    <div>
                                                        <p className="font-bold uppercase text-xs text-text-muted mb-1">{txn.description}</p>
                                                        <p className="text-text-muted text-xs">{new Date(txn.createdAt).toLocaleString()}</p>
                                                    </div>
                                                    <p className={`font-bold ${txn.type === 'CREDIT' ? 'text-success' : 'text-error'}`}>
                                                        {txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                                                    </p>
                                                </div>
                                            )) : <p className="text-text-muted">No wallet history.</p>}
                                        </div>
                                    )}

                                    {activeTab === 'referrals' && (
                                        <div className="space-y-3">
                                            <h3 className="font-bold text-lg mb-2 text-text-main">Referrals Made ({userDetails.referralsMade?.length || 0})</h3>
                                            {userDetails.referralsMade?.length > 0 ? userDetails.referralsMade.map(ref => (
                                                <div key={ref.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center text-sm">
                                                    <div>
                                                        <p className="font-bold">{ref.referee?.name || 'Unknown User'}</p>
                                                        <p className="text-text-muted text-xs">{ref.referee?.email}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-primary mb-1">Earned: ₹{ref.refereeReward || 0}</p>
                                                        <p className="text-xs text-text-muted uppercase tracking-wider">{ref.status}</p>
                                                    </div>
                                                </div>
                                            )) : <p className="text-text-muted">This user has not referred anyone yet.</p>}
                                        </div>
                                    )}

                                    {activeTab === 'services' && (
                                        <div className="space-y-3">
                                            <h3 className="font-bold text-lg mb-2 text-text-main">Service Bookings ({userDetails.bookings?.length || 0})</h3>
                                            {userDetails.bookings?.length > 0 ? userDetails.bookings.map(book => (
                                                <div key={book.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center text-sm">
                                                    <div>
                                                        <p className="font-bold text-primary mb-1">{book.serviceType}</p>
                                                        <p className="text-text-muted text-xs">{new Date(book.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <p className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-bold text-text-muted">
                                                        {book.status}
                                                    </p>
                                                </div>
                                            )) : <p className="text-text-muted">No services booked.</p>}
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
