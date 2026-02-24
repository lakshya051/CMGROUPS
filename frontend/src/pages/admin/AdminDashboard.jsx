import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { DollarSign, ShoppingBag, Users, Activity, Package, Wrench, ArrowUpRight } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import SectionLoader from '../../components/ui/SectionLoader';

const AdminStatCard = ({ title, value, icon, subtext, color = "text-primary" }) => (
    <div className="glass-panel p-6 hover:border-primary/20 transition-colors">
        <div className="flex items-center justify-between mb-4">
            <span className="text-text-muted text-sm font-medium uppercase tracking-wider">{title}</span>
            <div className={`p-2 bg-gray-50 rounded-lg ${color}`}>{icon}</div>
        </div>
        <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-heading">{value}</span>
        </div>
        <p className="text-xs text-text-muted mt-2">
            {subtext}
        </p>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        revenue: 0,
        orders: 0,
        users: 0,
        services: 0,
        referrals: 0,
        rewardedReferrals: 0,
        revenueChart: [],
        activityFeed: [],
        topProducts: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminAPI.getStats()
            .then(data => {
                setStats({
                    revenue: data.revenue || 0,
                    orders: data.orders || 0,
                    users: data.users || 0,
                    services: data.pendingServices || 0,
                    referrals: data.totalReferrals || 0,
                    rewardedReferrals: data.rewardedReferrals || 0,
                    revenueChart: data.revenueChart || [],
                    activityFeed: data.activityFeed || [],
                    topProducts: data.topProducts || []
                });
            })
            .catch(err => console.error('Failed to fetch admin stats:', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <SectionLoader message="Loading dashboard analytics..." />;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-heading font-bold mb-1">Admin Dashboard</h1>
                <p className="text-text-muted">Real-time overview of store performance.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AdminStatCard
                    title="Total Revenue"
                    value={`₹${stats.revenue.toLocaleString()}`}
                    icon={<DollarSign size={20} />}
                    subtext="Lifetime earnings"
                    color="text-emerald-600 bg-emerald-50"
                />
                <AdminStatCard
                    title="Total Orders"
                    value={stats.orders}
                    icon={<ShoppingBag size={20} />}
                    subtext="Completed purchases"
                    color="text-blue-600 bg-blue-50"
                />
                <AdminStatCard
                    title="Total Users"
                    value={stats.users}
                    icon={<Users size={20} />}
                    subtext="Registered customers"
                    color="text-violet-600 bg-violet-50"
                />
                <AdminStatCard
                    title="Pending Services"
                    value={stats.services}
                    icon={<Wrench size={20} />}
                    subtext="Requires attention"
                    color="text-orange-600 bg-orange-50"
                />
                <AdminStatCard
                    title="Total Referrals"
                    value={stats.referrals}
                    icon={<Users size={20} />}
                    subtext={`${stats.rewardedReferrals} rewarded`}
                    color="text-pink-600 bg-pink-50"
                />
            </div>

            {/* Top Products Row */}
            {stats.topProducts.length > 0 && (
                <div className="glass-panel p-6">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Package size={18} className="text-primary" />
                        Top Selling Products
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {stats.topProducts.map((prod) => (
                            <div key={prod.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-primary/10 text-primary flex justify-center items-center rounded-full font-bold mb-3">
                                    {prod.sales}
                                </div>
                                <h3 className="text-sm font-medium mb-1 line-clamp-1" title={prod.title}>{prod.title}</h3>
                                <p className="text-xs text-text-muted">₹{prod.price.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="glass-panel p-6">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Activity size={18} className="text-primary" />
                        Revenue (Last 7 Days)
                    </h2>
                    <div className="h-80">
                        {stats.revenueChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.revenueChart}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                    <Tooltip
                                        cursor={{ fill: '#f1f5f9' }}
                                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="revenue" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-text-muted text-sm">
                                No revenue data for this week.
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="glass-panel p-6">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <ArrowUpRight size={18} className="text-primary" />
                        Recent Activity
                    </h2>
                    <ul className="space-y-0">
                        {stats.activityFeed.length > 0 ? (
                            stats.activityFeed.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0 last:pb-0 relative">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${item.type === 'order' ? 'bg-blue-100 text-blue-600' :
                                        item.type === 'user' ? 'bg-violet-100 text-violet-600' :
                                            'bg-orange-100 text-orange-600'
                                        }`}>
                                        {item.type === 'order' ? <ShoppingBag size={14} /> :
                                            item.type === 'user' ? <Users size={14} /> :
                                                <Wrench size={14} />}
                                    </div>
                                    {idx !== stats.activityFeed.length - 1 && (
                                        <div className="absolute left-4 top-8 bottom-[-16px] w-[2px] bg-gray-100" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-text-main">{item.text}</p>
                                        <p className="text-xs text-text-muted mt-1">{new Date(item.time).toLocaleString()}</p>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <div className="py-12 text-center text-text-muted">
                                No recent activity found.
                            </div>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
