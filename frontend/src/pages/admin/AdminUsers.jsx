import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, ShieldOff, ShoppingBag, Star, Wrench, Gift, Wallet, Copy, CheckCircle } from 'lucide-react';
import { adminAPI } from '../../lib/api';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState(null);
    const [copiedCode, setCopiedCode] = useState('');

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
        </div>
    );
};

export default AdminUsers;
