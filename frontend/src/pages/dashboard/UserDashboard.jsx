import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Package, ArrowRight, ArrowUpRight, ShoppingBag, TrendingUp, Store, Wrench } from 'lucide-react';
import { ordersAPI } from '../../lib/api';
import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';

const StatCard = ({ title, value, icon, trend }) => (
    <div className="bg-surface border border-border-default rounded-lg shadow-sm p-md hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-sm">
            <span className="text-text-secondary text-xs font-semibold uppercase tracking-wider">{title}</span>
            <div className="p-xs bg-page-bg border border-border-default rounded text-text-muted">{icon}</div>
        </div>
        <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-text-primary">{value}</span>
            {trend && <span className="text-sm text-success mb-1 flex items-center font-bold">{trend} <ArrowUpRight size={14} /></span>}
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
    useSEO({ title: 'My Dashboard — CMGROUPS', description: 'Manage your orders, services and account.', noIndex: true });

    useEffect(() => {
        ordersAPI.getMyStats()
            .then(data => setStats(data))
            .catch(err => console.error('Failed to fetch stats:', err))
            .finally(() => setLoading(false));
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Processing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Confirmed': return 'bg-success/10 text-success border-success/20';
            case 'Shipped': return 'bg-orange-400/10 text-orange-400 border-orange-400/20';
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

            {/* Stats Grid */}
            {loading ? (
                <div className="text-center py-8 text-text-muted">Loading your stats...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            <div className="overflow-x-auto">
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
                                                        {order.status}
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
