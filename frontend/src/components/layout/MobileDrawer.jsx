import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    X, UserCircle, Store, Heart, ShoppingBag, Wrench,
    GraduationCap, FileText, Shield, LayoutDashboard,
    Settings, Gift, LogOut, LogIn, ChevronRight, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

const MobileDrawer = ({ isOpen, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { canInstall, install, isInstalled } = useInstallPrompt();

    useEffect(() => {
        if (isOpen) onClose();
    }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleLogout = async () => {
        onClose();
        await logout();
        navigate('/');
    };

    const isActiveRoute = (path) => location.pathname === path;

    const groups = [
        {
            label: 'SHOPPING',
            links: [
                { name: 'Products', path: '/products', icon: Store },
                { name: 'Wishlist', path: '/wishlist', icon: Heart },
                { name: 'My Orders', path: '/dashboard/orders', icon: ShoppingBag },
            ]
        },
        {
            label: 'SERVICES',
            links: [
                { name: 'Book a Service', path: '/services', icon: Wrench },
            ]
        },
        {
            label: 'LEARNING',
            links: [
                { name: 'Academy', path: '/courses', icon: GraduationCap },
            ]
        },
        {
            label: 'BUSINESS',
            links: [
                { name: 'Tally Prime', path: '/tally-erp', icon: FileText },
                { name: 'CCTV Security', path: '/cctv', icon: Shield },
            ]
        },
        {
            label: 'ACCOUNT',
            links: user ? [
                { name: 'Dashboard', path: user.role === 'admin' ? '/admin' : '/dashboard', icon: LayoutDashboard },
                { name: 'Settings', path: '/dashboard/settings', icon: Settings },
                { name: 'Referrals', path: '/dashboard/referrals', icon: Gift },
            ] : []
        },
    ];

    return (
        <div className="md:hidden">
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer Panel */}
            <aside
                className={`fixed inset-y-0 left-0 w-4/5 max-w-sm z-[70] bg-surface overflow-y-auto transform transition-transform duration-300 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="bg-trust p-4 flex items-center justify-between safe-top">
                    <div className="flex items-center gap-3">
                        <UserCircle size={36} className="text-white/90" />
                        {user ? (
                            <span className="text-white font-semibold text-base">
                                Hello, {user.name?.split(' ')[0] || 'User'}
                            </span>
                        ) : (
                            <Link
                                to="/sign-in"
                                className="text-white font-semibold text-base hover:underline"
                            >
                                Hello, Sign In
                            </Link>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors p-1"
                        aria-label="Close menu"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Links */}
                <div className="py-2">
                    {groups.map((group, idx) => {
                        if (group.links.length === 0) return null;
                        return (
                            <div key={group.label}>
                                {idx > 0 && <div className="h-2 bg-page-bg" />}
                                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                    {group.label}
                                </p>
                                {group.links.map((link) => {
                                    const Icon = link.icon;
                                    const active = isActiveRoute(link.path);
                                    const isAmber = link.amber && !active;
                                    return (
                                        <Link
                                            key={link.path}
                                            to={link.path}
                                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                                active
                                                    ? 'text-trust bg-trust/5 font-medium'
                                                    : isAmber
                                                        ? 'text-amber-600 hover:bg-surface-hover'
                                                        : 'text-text-primary hover:bg-surface-hover'
                                            }`}
                                        >
                                            <Icon size={20} className={active ? 'text-trust' : isAmber ? 'text-amber-500' : 'text-text-secondary'} />
                                            <span className="flex-1 text-sm">{link.name}</span>
                                            <ChevronRight size={16} className="text-text-muted" />
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* Install App */}
                    {canInstall && !isInstalled && (
                        <>
                            <div className="h-2 bg-page-bg" />
                            <button
                                onClick={() => { install(); onClose(); }}
                                className="flex items-center gap-3 px-4 py-3 w-full text-trust font-medium hover:bg-surface-hover transition-colors"
                            >
                                <Download size={20} />
                                <span className="flex-1 text-left text-sm">Install App</span>
                                <ChevronRight size={16} className="text-text-muted" />
                            </button>
                        </>
                    )}

                    {/* Sign Out / Sign In */}
                    <div className="h-2 bg-page-bg" />
                    {user ? (
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 w-full text-text-primary hover:bg-surface-hover transition-colors"
                        >
                            <LogOut size={20} className="text-text-secondary" />
                            <span className="flex-1 text-left text-sm">Sign Out</span>
                        </button>
                    ) : (
                        <Link
                            to="/sign-in"
                            className="flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-surface-hover transition-colors"
                        >
                            <LogIn size={20} className="text-text-secondary" />
                            <span className="flex-1 text-sm">Sign In</span>
                            <ChevronRight size={16} className="text-text-muted" />
                        </Link>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default MobileDrawer;
