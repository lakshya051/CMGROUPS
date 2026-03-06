import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, X, ShoppingCart, Heart, User, LayoutDashboard, LogOut, Bell, Search } from 'lucide-react';
import Button from '../ui/Button';
import PointsBadge from '../ui/PointsBadge';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { categoriesAPI, notificationsAPI } from '../../lib/api';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showCatMenu, setShowCatMenu] = useState(false);
    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const { user, logout, isSignedIn: clerkSignedIn, refreshUser } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const { cart } = useShop();

    React.useEffect(() => {
        categoriesAPI.getAll().then(setCategories).catch(console.error);
        if (user) {
            notificationsAPI.getAll().then(res => {
                setNotifications(res.notifications);
                setUnreadCount(res.unreadCount);
            }).catch(console.error);
        }
    }, [user]);

    useEffect(() => {
        const queryFromUrl = searchParams.get('q') || '';
        setSearchQuery(queryFromUrl);
        setDebouncedSearchQuery(queryFromUrl);
    }, [searchParams]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const currentSearchContext = useMemo(() => {
        if (location.pathname.startsWith('/courses')) {
            return { path: '/courses', placeholder: 'Search courses...' };
        }

        if (location.pathname.startsWith('/services')) {
            return { path: '/services', placeholder: 'Search services...' };
        }

        return { path: '/products', placeholder: 'Search products...' };
    }, [location.pathname]);

    useEffect(() => {
        const isSearchablePage = ['/products', '/courses', '/services']
            .some((path) => location.pathname.startsWith(path));
        if (!isSearchablePage) return;

        const nextQuery = debouncedSearchQuery.trim();
        const currentQuery = searchParams.get('q') || '';
        if (nextQuery === currentQuery) return;

        const nextPath = nextQuery
            ? `${currentSearchContext.path}?q=${encodeURIComponent(nextQuery)}`
            : currentSearchContext.path;
        navigate(nextPath, { replace: true });
    }, [currentSearchContext.path, debouncedSearchQuery, location.pathname, navigate, searchParams]);

    const handleSearch = useCallback((e) => {
        e.preventDefault();
        const nextQuery = searchQuery.trim();
        const nextPath = nextQuery
            ? `${currentSearchContext.path}?q=${encodeURIComponent(nextQuery)}`
            : currentSearchContext.path;
        setIsOpen(false);
        navigate(nextPath);
    }, [currentSearchContext.path, navigate, searchQuery]);

    const handleMarkAllRead = useCallback(async () => {
        try {
            await notificationsAPI.markAllRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error(err);
        }
    }, []);

    const cartCount = useMemo(
        () => cart.reduce((sum, item) => sum + item.quantity, 0),
        [cart]
    );

    const isActive = useCallback((path) => location.pathname === path, [location.pathname]);
    const mobileProfilePath = user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/sign-in';
    const hasSearchQuery = searchQuery.trim().length > 0;
    const showSearchBar = !location.pathname.startsWith('/tally-erp');

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setDebouncedSearchQuery('');
        setIsOpen(false);

        const isSearchablePage = ['/products', '/courses', '/services']
            .some((path) => location.pathname.startsWith(path));

        if (isSearchablePage) {
            navigate(currentSearchContext.path, { replace: true });
        }
    }, [currentSearchContext.path, location.pathname, navigate]);

    const renderSearchForm = ({ mobile = false } = {}) => (
        <form onSubmit={handleSearch} className="relative w-full">
            {mobile ? (
                <>
                    <button
                        type="submit"
                        aria-label="Search"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-trust"
                    >
                        <Search size={18} />
                    </button>
                    <input
                        type="text"
                        inputMode="search"
                        placeholder={currentSearchContext.placeholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-border-default bg-background pl-10 pr-10 py-3 text-sm text-text-primary shadow-sm transition-all focus:outline-none focus:border-trust focus:ring-2 focus:ring-trust/20"
                    />
                    {hasSearchQuery && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
                        >
                            <X size={16} />
                        </button>
                    )}
                </>
            ) : (
                <>
                    <input
                        type="text"
                        placeholder={currentSearchContext.placeholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:border-trust focus:ring-2 focus:ring-trust/20 transition-all"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-trust transition-colors"
                    >
                        <Search size={18} />
                    </button>
                </>
            )}
        </form>
    );

    return (
        <header className="fixed safe-top-offset top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border-default">
            <div className="md:hidden flex flex-col">
                <div className="container mx-auto flex h-16 items-center gap-3 px-4">
                    <button
                        className="text-text-primary p-2 -ml-2"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <Link to="/" className="min-w-0 flex-1 text-2xl font-heading font-bold text-text-primary">
                        CM<span className="text-trust">GROUPS</span>
                    </Link>

                    <div className="flex items-center gap-1">
                        {user && <PointsBadge points={user.walletBalance} compact className="mr-1" />}
                        <Link
                            to={mobileProfilePath}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-trust"
                            aria-label={user ? 'Open account' : 'Login'}
                            onClick={() => setIsOpen(false)}
                        >
                            <User size={20} />
                        </Link>
                        <Link
                            to="/cart"
                            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-trust"
                            aria-label="Open cart"
                            onClick={() => setIsOpen(false)}
                        >
                            <ShoppingCart size={20} />
                            {cartCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-trust text-[10px] text-white flex items-center justify-center rounded-full">
                                    {cartCount > 9 ? '9+' : cartCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {showSearchBar && (
                    <div className="border-t border-border-default bg-surface-hover px-4 py-3">
                        {renderSearchForm({ mobile: true })}
                    </div>
                )}
            </div>

            <div className="hidden md:flex container mx-auto px-4 h-16 items-center justify-between">
                {/* Logo */}
                <Link to="/" className="text-2xl font-heading font-bold text-text-primary flex-shrink-0">
                    CM<span className="text-trust">GROUPS</span>
                </Link>

                {/* Desktop Search Bar */}
                {showSearchBar && (
                    <div className="hidden md:flex flex-1 max-w-md mx-8">
                        {renderSearchForm()}
                    </div>
                )}

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6 flex-shrink-0">
                    <Link to="/" className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-trust' : 'text-text-secondary hover:text-text-primary'}`}>
                        Home
                    </Link>

                    {/* Products Dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => setShowCatMenu(true)}
                        onMouseLeave={() => setShowCatMenu(false)}
                    >
                        <Link
                            to="/products"
                            className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/products') ? 'text-trust' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            Products
                        </Link>

                        {/* Mega Menu */}
                        {showCatMenu && (
                            <div className="absolute top-full left-0 w-48 bg-surface border border-border-default shadow-sm rounded-lg p-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2">
                                <Link to="/products" className="px-3 py-2 text-sm font-bold text-text-primary hover:bg-surface-hover rounded-lg">All Products</Link>
                                <div className="h-px bg-border-default my-1"></div>
                                {categories.map(cat => (
                                    <Link
                                        key={cat.id}
                                        to={`/products?category=${cat.name}`}
                                        className="px-3 py-2 text-sm text-text-secondary hover:text-trust hover:bg-surface-hover rounded-lg"
                                    >
                                        {cat.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link to="/services" className={`text-sm font-medium transition-colors ${isActive('/services') ? 'text-trust' : 'text-text-secondary hover:text-text-primary'}`}>
                        Services
                    </Link>
                    <Link to="/courses" className={`text-sm font-medium transition-colors ${isActive('/courses') ? 'text-trust' : 'text-text-secondary hover:text-text-primary'}`}>
                        Academy
                    </Link>
                    <Link to="/tally-erp" className={`text-sm font-medium transition-colors ${isActive('/tally-erp') ? 'text-trust' : 'text-text-secondary hover:text-text-primary'}`}>
                        Tally ERP
                    </Link>
                </nav>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-4">
                    {user && <PointsBadge points={user.walletBalance} />}
                    <Link to="/wishlist" className="text-text-secondary hover:text-trust transition-colors">
                        <Heart size={20} />
                    </Link>
                    <Link to="/cart" className="relative text-text-secondary hover:text-trust transition-colors">
                        <ShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-trust text-[10px] text-white flex items-center justify-center rounded-full">
                                {cartCount > 9 ? '9+' : cartCount}
                            </span>
                        )}
                    </Link>

                    {/* Notifications */}
                    {user && (
                        <div className="relative">
                            <button
                                className="text-text-secondary hover:text-trust transition-colors relative"
                                onClick={() => setShowNotifMenu(!showNotifMenu)}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-error text-[10px] text-white flex items-center justify-center rounded-full">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            {/* Dropdown */}
                            {showNotifMenu && (
                                <div className="absolute top-full right-0 w-80 bg-surface border border-border-default shadow-sm rounded-lg p-0 flex flex-col gap-0 animate-in fade-in slide-in-from-top-2 z-50 max-h-96 overflow-y-auto mt-2">
                                    <div className="p-3 border-b border-border-default flex justify-between items-center bg-surface-hover rounded-t-lg">
                                        <span className="font-bold text-sm text-text-primary">Notifications</span>
                                        <button onClick={handleMarkAllRead} className="text-xs text-trust hover:underline">Mark all read</button>
                                    </div>
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-text-secondary">No notifications</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n.id} className={`p-3 border-b border-border-default hover:bg-surface-hover ${!n.isRead ? 'bg-trust/10' : ''}`}>
                                                <div className="font-medium text-sm text-text-primary">{n.title}</div>
                                                <div className="text-xs text-text-secondary mt-1">{n.message}</div>
                                                {n.link && (
                                                    <Link
                                                        to={n.link}
                                                        className="text-xs text-trust mt-2 block hover:underline font-medium"
                                                        onClick={() => {
                                                            setShowNotifMenu(false);
                                                            // Optional: mark as read logic here
                                                        }}
                                                    >
                                                        View Product
                                                    </Link>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {user ? (
                        <div className="flex items-center gap-3">
                            <Link
                                to={user.role === 'admin' ? '/admin' : '/dashboard'}
                                className="flex items-center gap-2 text-sm text-text-secondary hover:text-trust transition-colors"
                            >
                                <div className="w-7 h-7 rounded-full bg-trust/20 flex items-center justify-center text-trust text-xs font-bold">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="hidden lg:inline text-text-primary font-medium">{user.name}</span>
                            </Link>
                        </div>
                    ) : clerkSignedIn ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={async () => {
                                    setSyncing(true);
                                    const ok = await refreshUser();
                                    setSyncing(false);
                                    if (!ok) logout();
                                }}
                                disabled={syncing}
                                className="text-xs text-trust hover:underline disabled:opacity-50"
                            >
                                {syncing ? 'Syncing...' : 'Retry Login'}
                            </button>
                            <button
                                onClick={logout}
                                className="text-xs text-text-muted hover:text-error transition-colors"
                                title="Sign out and try again"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <Link to="/sign-in">
                            <Button variant="outline" size="sm">Login</Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Mobile Drawer */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-surface border-b border-border-default p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
                    <Link to="/" className="px-4 py-3 rounded-lg hover:bg-surface-hover text-text-primary font-medium hover:text-trust transition-colors" onClick={() => setIsOpen(false)}>Home</Link>
                    <Link to="/products" className="px-4 py-3 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-trust transition-colors" onClick={() => setIsOpen(false)}>Products</Link>
                    <Link to="/services" className="px-4 py-3 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-trust transition-colors" onClick={() => setIsOpen(false)}>Services</Link>
                    <Link to="/courses" className="px-4 py-3 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-trust transition-colors" onClick={() => setIsOpen(false)}>Academy</Link>
                    <Link to="/tally-erp" className="px-4 py-3 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-trust transition-colors" onClick={() => setIsOpen(false)}>Tally ERP</Link>
                    <div className="h-px bg-border-default my-2"></div>
                    <div className="flex items-center justify-between px-4">
                        <Link to="/wishlist" className="flex items-center gap-2 text-text-secondary hover:text-trust transition-colors" onClick={() => setIsOpen(false)}>
                            <Heart size={18} /> Wishlist
                        </Link>
                        <Link to="/cart" className="flex items-center gap-2 text-text-secondary hover:text-trust transition-colors" onClick={() => setIsOpen(false)}>
                            <ShoppingCart size={18} /> Cart ({cartCount})
                        </Link>
                    </div>

                    {user ? (
                        <>
                            <div className="px-4">
                                <PointsBadge points={user.walletBalance} className="w-full justify-center" />
                            </div>
                            <Link
                                to={user.role === 'admin' ? '/admin' : '/dashboard'}
                                onClick={() => setIsOpen(false)}
                            >
                                <Button variant="outline" className="w-full gap-2">
                                    <LayoutDashboard size={16} /> Dashboard
                                </Button>
                            </Link>
                            <button
                                onClick={() => { logout(); setIsOpen(false); }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-error rounded-lg transition-colors"
                            >
                                <LogOut size={16} /> Logout
                            </button>
                        </>
                    ) : clerkSignedIn ? (
                        <div className="px-4 py-3 space-y-2">
                            <button
                                onClick={async () => {
                                    setSyncing(true);
                                    const ok = await refreshUser();
                                    setSyncing(false);
                                    if (ok) setIsOpen(false);
                                }}
                                disabled={syncing}
                                className="w-full text-sm text-trust hover:underline disabled:opacity-50"
                            >
                                {syncing ? 'Syncing...' : 'Retry Login'}
                            </button>
                            <button
                                onClick={() => { logout(); setIsOpen(false); }}
                                className="w-full text-sm text-text-muted hover:text-error transition-colors flex items-center justify-center gap-1"
                            >
                                <LogOut size={14} /> Sign Out & Try Again
                            </button>
                        </div>
                    ) : (
                        <Link to="/sign-in" onClick={() => setIsOpen(false)}>
                            <Button className="w-full">Login</Button>
                        </Link>
                    )}
                </div>
            )}
        </header>
    );
};

export default memo(Navbar);
