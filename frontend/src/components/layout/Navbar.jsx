import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, X, ShoppingCart, Heart, User, LayoutDashboard, LogOut, Bell, Search, Download, MapPin, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import PointsBadge from '../ui/PointsBadge';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useNotifications } from '../../context/NotificationContext';
import { categoriesAPI } from '../../lib/api';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [showCatMenu, setShowCatMenu] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const { user, logout, isSignedIn } = useAuth();
    const { cart } = useShop();
    const { unreadCount, toggleOpen, isOpen: notifOpen } = useNotifications();
    const { canInstall, install, isInstalled } = useInstallPrompt();

    React.useEffect(() => {
        categoriesAPI.getAll().then(setCategories).catch(console.error);
    }, []);

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
        const exactSearchPages = ['/products', '/courses', '/services'];
        if (!exactSearchPages.includes(location.pathname)) return;

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

    const cartCount = useMemo(
        () => cart.reduce((sum, item) => sum + item.quantity, 0),
        [cart]
    );

    const isActive = useCallback((path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname === path || location.pathname.startsWith(path + '/');
    }, [location.pathname]);
    const mobileProfilePath = user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/sign-in';
    const hasSearchQuery = searchQuery.trim().length > 0;
    const showSearchBar = !location.pathname.startsWith('/tally-erp') && !location.pathname.startsWith('/cctv');

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setDebouncedSearchQuery('');
        setIsOpen(false);

        const exactSearchPages = ['/products', '/courses', '/services'];
        if (exactSearchPages.includes(location.pathname)) {
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
                {/* Row 1: Logo + Bell */}
                <div className="flex items-center justify-between h-14 px-4">
                    <Link to="/" className="text-xl font-heading font-bold text-text-primary">
                        CM<span className="text-trust">GROUPS</span>
                    </Link>

                    <div className="flex items-center gap-1">
                        {user && <PointsBadge points={user.walletBalance} compact className="mr-1" />}
                        {user && (
                            <div className="relative">
                                <button
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-trust"
                                    onClick={toggleOpen}
                                    aria-label="Notifications"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-trust text-[10px] text-white flex items-center justify-center rounded-full">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                                <NotificationDropdown />
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 2: Search Bar */}
                {showSearchBar && (
                    <div className="px-4 py-2 bg-surface">
                        {renderSearchForm({ mobile: true })}
                    </div>
                )}

                {/* Row 3: Location Strip */}
                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-page-bg border-t border-border-default">
                    <MapPin size={14} className="text-text-secondary flex-shrink-0" />
                    <span className="text-xs text-text-secondary truncate">Deliver to Etah 207001</span>
                </div>
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
                <nav className="hidden md:flex items-center gap-5 flex-shrink-0">
                    <NavLink to="/" label="Home" active={isActive('/')} />

                    {/* Products Dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => setShowCatMenu(true)}
                        onMouseLeave={() => setShowCatMenu(false)}
                    >
                        <NavLink to="/products" label="Products" active={isActive('/products')} />

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

                    {/* Refurbished */}
                    <Link
                        to="/refurbished"
                        className={`relative text-sm font-medium transition-colors flex items-center gap-1 pb-0.5 ${
                            isActive('/refurbished')
                                ? 'text-amber-600 font-semibold after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-0.5 after:bg-amber-500 after:rounded-full'
                                : 'text-amber-600/80 hover:text-amber-600'
                        }`}
                    >
                        <RefreshCw size={14} />
                        Refurbished
                    </Link>

                    <NavLink to="/services" label="Services" active={isActive('/services')} />
                    <NavLink to="/courses" label="Academy" active={isActive('/courses')} />
                    <NavLink to="/tally-erp" label="Tally ERP" active={isActive('/tally-erp')} />
                    <NavLink to="/cctv" label="CCTV" active={isActive('/cctv')} />
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
                                onClick={toggleOpen}
                                aria-label="Notifications"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-trust text-[10px] text-white flex items-center justify-center rounded-full">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            <NotificationDropdown />
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
                    ) : isSignedIn ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { void logout(); }}
                                className="text-xs text-text-muted hover:text-error transition-colors"
                                title="Sign out"
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

        </header>
    );
};

const NavLink = ({ to, label, active }) => (
    <Link
        to={to}
        className={`relative text-sm font-medium transition-colors pb-0.5 ${
            active
                ? 'text-trust font-semibold after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-0.5 after:bg-trust after:rounded-full'
                : 'text-text-secondary hover:text-text-primary'
        }`}
    >
        {label}
    </Link>
);

export default memo(Navbar);
