import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Package, ArrowUpRight, Clock, ShoppingBag, TrendingUp } from 'lucide-react';
import { ordersAPI } from '../../lib/api';
import { Link } from 'react-router-dom';

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

const UserDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-1">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                    <p className="text-sm text-text-secondary">Here's what's happening with your account.</p>
                </div>
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
