import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Package, ArrowRight, ArrowUpRight, ShoppingBag, TrendingUp, Store, Wrench, Star } from 'lucide-react';
import { ordersAPI, reviewsAPI } from '../../lib/api';
import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { handleImageError } from '../../utils/image';

const StatCard = ({ title, value, icon, trend }) => (
    <div className="bg-surface border border-border-default rounded-lg shadow-sm p-3 sm:p-md hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-sm">
            <span className="text-text-secondary text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{title}</span>
            <div className="p-xs bg-page-bg border border-border-default rounded text-text-muted [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-6 sm:[&>svg]:h-6">{icon}</div>
        </div>
        <div className="flex items-end gap-1 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold text-text-primary truncate">{value}</span>
            {trend && <span className="text-xs sm:text-sm text-success mb-1 flex items-center font-bold">{trend} <ArrowUpRight size={14} /></span>}
        </div>
    </div>
);

const QuickActionCard = ({ to, icon, eyebrow, title, description, cta }) => (
    <div className="bg-surface border border-border-default rounded-xl p-5 shadow-sm h-full">
        <div className="flex h-full flex-col gap-4">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-trust/10 text-trust border border-trust/20">
                    {icon}
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-trust mb-1">{eyebrow}</p>
                    <h2 className="text-lg font-bold text-text-primary">{title}</h2>
                    <p className="text-sm text-text-secondary mt-1">{description}</p>
                </div>
            </div>
            <Link
                to={to}
                className="mt-auto inline-flex items-center justify-center gap-2 self-start rounded-lg border border-trust/30 bg-trust/10 px-4 py-2.5 text-sm font-semibold text-trust transition-colors hover:bg-trust/15"
            >
                <span>{cta}</span>
                <ArrowRight size={16} />
            </Link>
        </div>
    </div>
);

const UserDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statsError, setStatsError] = useState(false);
    const [pendingBundleReviews, setPendingBundleReviews] = useState([]);
    useSEO({ title: 'My Dashboard — Shoptify', description: 'Manage your orders, services and account.', noIndex: true });

    useEffect(() => {
        ordersAPI.getMyStats()
            .then(data => setStats(data))
            .catch(() => setStatsError(true))
            .finally(() => setLoading(false));
        reviewsAPI.getPendingBundles()
            .then(data => setPendingBundleReviews(Array.isArray(data) ? data : []))
            .catch(err => console.error('Failed to load pending reviews:', err));
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Processing': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
            case 'Confirmed': return 'bg-success/10 text-success border-success/20';
            case 'Shipped': return 'bg-orange-400/10 text-orange-400 border-orange-400/20';
            case 'OutForDelivery': return 'bg-indigo-400/10 text-indigo-600 border-indigo-400/20';
            case 'Delivered': return 'bg-success/10 text-success border-success/20';
            case 'Cancelled': return 'bg-error/10 text-error border-error/20';
            default: return 'bg-page-bg text-text-muted border-border-default';
        }
    };

    return (
        <div className="space-y-lg">
            <div>
                <h1 className="text-2xl font-bold text-text-primary mb-1">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                <p className="text-sm text-text-secondary">Here's what's happening with your account.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <QuickActionCard
                    to="/products"
                    icon={<Store size={22} />}
                    eyebrow="Shop Access"
                    title="Browse products from your dashboard"
                    description="Quick access to the store without leaving your customer area."
                    cta="Browse Shop"
                />
                <QuickActionCard
                    to="/services"
                    icon={<Wrench size={22} />}
                    eyebrow="Service Access"
                    title="Book support and repair services"
                    description="Create a service request quickly for installation, repair, or onsite help."
                    cta="Book My Service"
                />
            </div>

            {/* Pending Bundle Reviews */}
            {pendingBundleReviews.length > 0 && (
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                    <h2 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                        <Star size={16} className="text-warning" />
                        Rate your recent bundle purchases
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                        {pendingBundleReviews.map(b => (
                            <Link
                                key={b.id}
                                to={`/bundles/${b.slug || b.id}`}
                                className="flex items-center gap-3 bg-surface border border-border-default rounded-lg px-3 py-2.5 shrink-0 hover:border-warning/40 transition-colors"
                            >
                                <div className="w-10 h-10 rounded bg-page-bg border border-border-default overflow-hidden flex items-center justify-center shrink-0">
                                    {b.image ? <img src={b.image} alt={b.name} onError={handleImageError} className="w-full h-full object-cover" /> : <Package size={18} className="text-text-muted" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-text-primary truncate max-w-[160px]">{b.name}</p>
                                    <p className="text-[11px] text-warning font-semibold">Leave a review</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            {loading ? (
                <div className="text-center py-8 text-text-muted">Loading your stats...</div>
            ) : statsError ? (
                <div className="text-center py-8 bg-error/5 border border-error/20 rounded-lg">
                    <p className="text-error text-sm font-medium">Failed to load dashboard stats.</p>
                    <button onClick={() => window.location.reload()} className="text-primary text-sm underline mt-2">Retry</button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                        <StatCard
                            title="Total Spent"
                            value={`₹${(stats?.totalSpent || 0).toLocaleString()}`}
                            icon={<TrendingUp size={24} />}
                        />
                        <StatCard
                            title="Total Orders"
                            value={stats?.totalOrders || 0}
                            icon={<Package size={24} />}
                        />
                        <StatCard
                            title="Loyalty Points"
                            value={Math.floor((stats?.totalSpent || 0) / 10).toLocaleString()}
                            icon={<ShoppingBag size={24} />}
                        />
                    </div>

                    {/* Recent Orders */}
                    <div className="bg-surface border border-border-default rounded-lg shadow-sm p-md">
                        <div className="flex items-center justify-between mb-md border-b border-border-default pb-sm">
                            <h2 className="text-lg font-bold text-text-primary">Recent Orders</h2>
                            <Link to="/dashboard/orders" className="text-sm text-trust hover:underline font-semibold">View All →</Link>
                        </div>

                        {stats?.recentOrders?.length > 0 ? (
                            <>
                            {/* Mobile card layout */}
                            <div className="sm:hidden divide-y divide-border-default">
                                {stats.recentOrders.map(order => (
                                    <div key={order.id} className="py-3 px-1">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-mono text-trust font-bold text-sm">#{order.id}</span>
                                            <span className="font-bold text-text-primary text-sm">₹{order.total.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-text-muted">
                                                {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold ${order.isPaid ? 'text-success' : 'text-text-muted'}`}>
                                                    {order.isPaid ? '✓ Paid' : '⏳ Unpaid'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                                                    {order.status === 'OutForDelivery' ? 'Out for Delivery' : order.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Desktop table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-page-bg text-text-secondary text-xs uppercase font-bold tracking-wider border-b border-border-default">
                                            <th className="p-sm">Order ID</th>
                                            <th className="p-sm">Date</th>
                                            <th className="p-sm">Status</th>
                                            <th className="p-sm">Payment</th>
                                            <th className="p-sm text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {stats.recentOrders.map(order => (
                                            <tr key={order.id} className="border-b border-border-default last:border-0 hover:bg-surface-hover transition-colors">
                                                <td className="p-sm font-mono text-trust font-bold">#{order.id}</td>
                                                <td className="p-sm text-text-secondary font-medium">
                                                    {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="p-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(order.status)}`}>
                                                        {order.status === 'OutForDelivery' ? 'Out for Delivery' : order.status}
                                                    </span>
                                                </td>
                                                <td className="p-sm">
                                                    <span className={`text-xs font-bold ${order.isPaid ? 'text-success' : 'text-text-muted'}`}>
                                                        {order.isPaid ? '✓ Paid' : '⏳ Unpaid'}
                                                    </span>
                                                </td>
                                                <td className="p-sm text-right font-bold text-text-primary">₹{order.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            </>
                        ) : (
                            <div className="text-center py-xl text-text-secondary">
                                <ShoppingBag size={40} className="mx-auto mb-3 opacity-20" />
                                <p className="font-medium">No orders yet. Start shopping!</p>
                                <Link to="/products" className="text-trust text-sm font-semibold hover:underline mt-2 inline-block">Browse Products →</Link>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default UserDashboard;
