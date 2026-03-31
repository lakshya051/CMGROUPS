import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, ShoppingBag, MapPin, Calendar, Award, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ordersAPI, addressesAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function UserProfile() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);

    useEffect(() => {
        ordersAPI.getMyStats().then(setStats).catch(err => console.error('Failed to load stats:', err));
        addressesAPI.getAll()
            .then(setAddresses)
            .catch(err => console.error('Failed to load addresses:', err))
            .finally(() => setLoadingAddresses(false));
    }, []);

    const handleDeleteAddress = async (id) => {
        if (!window.confirm('Delete this address?')) return;
        try {
            await addressesAPI.delete(id);
            setAddresses(prev => prev.filter(a => a.id !== id));
            toast.success('Address removed');
        } catch {
            toast.error('Failed to delete address');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Profile Header */}
            <div className="bg-surface rounded-xl border border-border-default p-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User size={36} />
                </div>
                <div className="text-center sm:text-left flex-1">
                    <h1 className="text-2xl font-heading font-bold text-text-primary">{user?.name}</h1>
                    <p className="text-text-muted text-sm">{user?.email}</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                            <Award size={12} /> {user?.tier || 'Bronze'}
                        </span>
                        <span className="text-xs text-text-muted flex items-center gap-1">
                            <Calendar size={12} />
                            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                        </span>
                    </div>
                </div>
                <Link
                    to="/dashboard/settings"
                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-border-default hover:bg-surface-hover transition-colors"
                >
                    Edit Profile
                </Link>
            </div>

            {/* Order Summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-surface rounded-xl border border-border-default p-3 sm:p-5 text-center">
                    <ShoppingBag size={20} className="mx-auto text-primary mb-1 sm:mb-2 hidden sm:block" />
                    <p className="text-lg sm:text-2xl font-bold text-text-primary">{stats?.totalOrders ?? '—'}</p>
                    <p className="text-[10px] sm:text-xs text-text-muted">Orders</p>
                </div>
                <div className="bg-surface rounded-xl border border-border-default p-3 sm:p-5 text-center">
                    <p className="text-lg sm:text-2xl font-bold text-text-primary truncate">₹{(stats?.totalSpent ?? 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] sm:text-xs text-text-muted mt-0.5 sm:mt-1">Spent</p>
                </div>
                <div className="bg-surface rounded-xl border border-border-default p-3 sm:p-5 text-center">
                    <p className="text-lg sm:text-2xl font-bold text-primary truncate">₹{(user?.walletBalance ?? 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] sm:text-xs text-text-muted mt-0.5 sm:mt-1">Wallet</p>
                </div>
            </div>

            {/* Recent Orders */}
            {stats?.recentOrders?.length > 0 && (
                <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
                    <div className="p-4 border-b border-border-default flex items-center justify-between">
                        <h2 className="font-bold text-text-primary">Recent Orders</h2>
                        <Link to="/dashboard/orders" className="text-sm text-trust font-semibold hover:underline">View All</Link>
                    </div>
                    <div className="divide-y divide-border-default">
                        {stats.recentOrders.slice(0, 3).map(o => (
                            <Link key={o.id} to={`/dashboard/orders/${o.id}`} className="flex items-center justify-between p-4 hover:bg-surface-hover transition-colors">
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">Order #{o.id}</p>
                                    <p className="text-xs text-text-muted">{new Date(o.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold">₹{o.total.toLocaleString('en-IN')}</p>
                                    <span className={`text-xs font-medium ${o.status === 'Delivered' ? 'text-success' : o.status === 'Cancelled' ? 'text-error' : 'text-warning'}`}>
                                        {o.status}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Saved Addresses */}
            <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
                <div className="p-4 border-b border-border-default flex items-center justify-between">
                    <h2 className="font-bold text-text-primary flex items-center gap-2"><MapPin size={18} /> Saved Addresses</h2>
                </div>
                {loadingAddresses ? (
                    <div className="p-6 text-center text-text-muted text-sm">Loading...</div>
                ) : addresses.length === 0 ? (
                    <div className="p-6 text-center text-text-muted text-sm">
                        No saved addresses yet. Addresses are saved during checkout.
                    </div>
                ) : (
                    <div className="divide-y divide-border-default">
                        {addresses.map(addr => (
                            <div key={addr.id} className="p-4 flex items-start justify-between gap-4">
                                <div className="text-sm text-text-secondary">
                                    {addr.label && <p className="text-xs text-trust font-medium mb-0.5">{addr.label}</p>}
                                    <p className="font-semibold text-text-primary">{addr.address}</p>
                                    <p>{addr.city} - {addr.pincode}</p>
                                    {addr.phone && <p className="text-text-muted">{addr.phone}</p>}
                                </div>
                                <button
                                    onClick={() => handleDeleteAddress(addr.id)}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/5 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
