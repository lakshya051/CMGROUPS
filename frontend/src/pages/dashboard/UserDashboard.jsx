import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Package, ArrowUpRight, Clock, ShoppingBag, TrendingUp } from 'lucide-react';
import { ordersAPI } from '../../lib/api';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon, trend }) => (
    <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
            <span className="text-text-muted font-medium">{title}</span>
            <div className="p-2 bg-gray-100 rounded-lg text-primary">{icon}</div>
        </div>
        <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{value}</span>
            {trend && <span className="text-sm text-success mb-1 flex items-center">{trend} <ArrowUpRight size={14} /></span>}
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
            default: return 'bg-gray-100 text-text-muted border-gray-200';
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold mb-1">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                    <p className="text-text-muted">Here's what's happening with your account.</p>
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
                    <div className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Recent Orders</h2>
                            <Link to="/dashboard/orders" className="text-sm text-primary hover:underline">View All →</Link>
                        </div>

                        {stats?.recentOrders?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-text-muted text-sm border-b border-gray-200">
                                            <th className="pb-3 pl-2">Order ID</th>
                                            <th className="pb-3">Date</th>
                                            <th className="pb-3">Status</th>
                                            <th className="pb-3">Payment</th>
                                            <th className="pb-3 text-right pr-2">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {stats.recentOrders.map(order => (
                                            <tr key={order.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                                <td className="py-4 pl-2 font-mono text-primary font-medium">#{order.id}</td>
                                                <td className="py-4 text-text-muted">
                                                    {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </td>
                                                <td className="py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`text-xs font-bold ${order.isPaid ? 'text-success' : 'text-warning'}`}>
                                                        {order.isPaid ? '✓ Paid' : '⏳ Unpaid'}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right pr-2 font-medium">₹{order.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-text-muted">
                                <ShoppingBag size={40} className="mx-auto mb-3 opacity-50" />
                                <p>No orders yet. Start shopping!</p>
                                <Link to="/products" className="text-primary text-sm hover:underline mt-2 inline-block">Browse Products →</Link>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default UserDashboard;
