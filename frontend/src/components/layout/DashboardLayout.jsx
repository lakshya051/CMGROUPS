import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    ShoppingBag,
    Settings,
    LogOut,
    User,
    BookOpen,
    Wrench,
    BarChart3,
    Package,
    Users,
    Store,
    Ticket,
    Gift,
    GraduationCap,
    ClipboardList,
    FileText,
    Menu,
    X,
    Image,
    ArrowRight
} from 'lucide-react';
import PointsBadge from '../ui/PointsBadge';

const DashboardLayout = ({ role = 'customer' }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const customerLinks = [
        { name: 'Overview', path: '/dashboard', icon: <LayoutDashboard size={20} />, end: true },
        { name: 'My Orders', path: '/dashboard/orders', icon: <ShoppingBag size={20} /> },
        { name: 'My Courses', path: '/dashboard/courses', icon: <BookOpen size={20} /> },
        { name: 'Service Requests', path: '/dashboard/services', icon: <Wrench size={20} /> },
        { name: 'Referrals', path: '/dashboard/referrals', icon: <Gift size={20} /> },
        { name: 'Settings', path: '/dashboard/settings', icon: <Settings size={20} /> },
    ];

    const shopLinks = [
        {
            name: 'Browse Shop',
            path: '/products',
            icon: <Store size={20} />,
            featured: true,
            description: 'See the latest products and offers',
        },
        {
            name: 'Book My Service',
            path: '/services',
            icon: <Wrench size={20} />,
            featured: true,
            description: 'Schedule support and repairs quickly',
        },
    ];

    const adminLinks = [
        { name: 'Dashboard', path: '/admin', icon: <BarChart3 size={20} />, end: true },
        { name: 'Banners', path: '/admin/banners', icon: <Image size={20} /> },
        { name: 'Products', path: '/admin/products', icon: <Package size={20} /> },
        { name: 'Categories', path: '/admin/categories', icon: <Store size={20} /> },
        { name: 'Orders', path: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { name: 'Services', path: '/admin/services', icon: <Wrench size={20} /> },
        { name: 'Service Types', path: '/admin/service-types', icon: <Settings size={20} /> },
        { name: 'Coupons', path: '/admin/coupons', icon: <Ticket size={20} /> },
        { name: 'Users', path: '/admin/users', icon: <Users size={20} /> },
        { name: 'Referrals', path: '/admin/referrals', icon: <Gift size={20} /> },
        { name: 'Referral Settings', path: '/admin/referral-settings', icon: <Settings size={20} /> },
        { name: 'Courses', path: '/admin/courses', icon: <GraduationCap size={20} /> },
        { name: 'Enrollments', path: '/admin/enrollments', icon: <ClipboardList size={20} /> },
        { name: 'Tally Enquiries', path: '/admin/tally-enquiries', icon: <FileText size={20} /> },
    ];

    const links = role === 'admin' ? adminLinks : customerLinks;

    const SidebarContent = () => (
        <>
            {/* Header */}
            <div className="p-6 border-b border-border-default flex items-center justify-between">
                <h2 className="text-xl font-heading font-bold">
                    CM<span className="text-primary">GROUPS</span>
                    <span className="text-xs ml-2 bg-page-bg border border-border-default px-2 py-0.5 rounded text-text-muted capitalize">{role}</span>
                </h2>
                {/* Close button — mobile only */}
                <button
                    className="md:hidden p-1 rounded-lg hover:bg-surface-hover transition-colors text-text-muted"
                    onClick={() => setSidebarOpen(false)}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {/* Shop quick links for customers */}
                {role === 'customer' && (
                    <div className="mb-4 space-y-2">
                        <p className="px-4 text-xs text-text-muted uppercase tracking-wider mb-2">Quick Links</p>
                        {shopLinks.map(link => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-4 transition-all ${isActive
                                        ? 'border-trust/40 bg-trust/10 text-trust shadow-sm'
                                        : 'border-trust/20 bg-surface text-text-primary hover:border-trust/40 hover:bg-surface-hover'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${isActive
                                            ? 'border-trust/30 bg-trust/15 text-trust'
                                            : 'border-trust/20 bg-trust/10 text-trust group-hover:bg-trust/15'
                                        }`}>
                                            {link.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold tracking-wide ${isActive ? 'text-trust' : 'text-text-primary'}`}>{link.name}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] ${isActive
                                                    ? 'bg-trust/15 text-trust'
                                                    : 'bg-page-bg text-text-muted border border-border-default'
                                                }`}>
                                                    Quick
                                                </span>
                                            </div>
                                            <p className={`mt-1 text-xs ${isActive ? 'text-trust/80' : 'text-text-muted'}`}>
                                                {link.description}
                                            </p>
                                        </div>
                                        <ArrowRight size={18} className={`shrink-0 transition-transform duration-200 group-hover:translate-x-1 ${isActive ? 'text-trust' : 'text-text-muted'}`} />
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                )}

                {links.map(link => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        end={link.end}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
                            }`
                        }
                    >
                        {link.icon}
                        <span>{link.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User footer */}
            <div className="p-4 border-t border-border-default">
                <div className="flex items-center gap-3 px-4 py-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        <User size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-text-muted truncate">{user?.email}</p>
                    </div>
                </div>
                <div className="px-4 pb-3">
                    <PointsBadge points={user?.walletBalance} className="w-full justify-center" />
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-muted hover:text-error hover:bg-error/5 rounded-lg transition-colors"
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="safe-screen min-h-screen bg-background flex">

            {/* ── Mobile overlay ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar (desktop: fixed, mobile: slide-over) ── */}
            <aside
                className={`
                    fixed top-0 left-0 h-full w-64 bg-surface border-r border-border-default
                    flex flex-col z-40 transition-transform duration-300
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0
                `}
            >
                <SidebarContent />
            </aside>

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col md:ml-64 min-w-0">

                {/* Mobile top bar */}
                <div className="md:hidden sticky safe-top-offset top-0 z-20 bg-surface border-b border-border-default flex items-center gap-3 px-4 h-14">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-muted"
                    >
                        <Menu size={22} />
                    </button>
                    <span className="font-heading font-bold text-base">
                        CM<span className="text-primary">GROUPS</span>
                        <span className="text-xs ml-2 bg-page-bg border border-border-default px-2 py-0.5 rounded text-text-muted capitalize">{role}</span>
                    </span>
                    {user && <PointsBadge points={user.walletBalance} compact className="ml-auto" />}
                </div>

                <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
