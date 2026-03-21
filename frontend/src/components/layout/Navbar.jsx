import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Menu, X, ShoppingCart, Heart, User, LayoutDashboard, LogOut, Bell,
    Search, MapPin, ChevronDown, ShoppingBag, Settings, Package
} from 'lucide-react';
import Button from '../ui/Button';
import PointsBadge from '../ui/PointsBadge';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useNotifications } from '../../context/NotificationContext';
import { categoriesAPI } from '../../lib/api';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

const SEARCH_CATEGORIES = [
    { value: 'all', label: 'All', path: '/products' },
    { value: 'products', label: 'Products', path: '/products' },
    { value: 'courses', label: 'Courses', path: '/courses' },
    { value: 'services', label: 'Services', path: '/services' },
];

const Navbar = () => {
    const [categories, setCategories] = useState([]);
    const [showCatMenu, setShowCatMenu] = useState(false);
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const [searchCategory, setSearchCategory] = useState('all');
    const [showMobileCatSelect, setShowMobileCatSelect] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const { user, logout, isSignedIn } = useAuth();
    const { cart } = useShop();
    const { unreadCount, toggleOpen } = useNotifications();
    const { canInstall, install, isInstalled } = useInstallPrompt();
    const accountRef = useRef(null);
    const accountTimeout = useRef(null);

    useEffect(() => {
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
        const cat = SEARCH_CATEGORIES.find(c => c.value === searchCategory);
        if (searchCategory === 'all') {
            if (location.pathname.startsWith('/courses')) return { path: '/courses', placeholder: 'Search courses...' };
            if (location.pathname.startsWith('/services')) return { path: '/services', placeholder: 'Search services...' };
            return { path: '/products', placeholder: 'Search CMGroups...' };
        }
        return { path: cat?.path || '/products', placeholder: `Search ${cat?.label.toLowerCase()}...` };
    }, [location.pathname, searchCategory]);

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

    const hasSearchQuery = searchQuery.trim().length > 0;

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setDebouncedSearchQuery('');
        const exactSearchPages = ['/products', '/courses', '/services'];
        if (exactSearchPages.includes(location.pathname)) {
            navigate(currentSearchContext.path, { replace: true });
        }
    }, [currentSearchContext.path, location.pathname, navigate]);

    const handleAccountEnter = () => {
        clearTimeout(accountTimeout.current);
        setShowAccountMenu(true);
    };
    const handleAccountLeave = () => {
        accountTimeout.current = setTimeout(() => setShowAccountMenu(false), 200);
    };

    const handleLogout = async () => {
        setShowAccountMenu(false);
        await logout();
        navigate('/');
    };

    return (
        <header className="fixed safe-top-offset top-0 left-0 right-0 z-50">
            {/* ═══════════ MOBILE ═══════════ */}
            <div className="md:hidden flex flex-col bg-background/80 backdrop-blur-lg border-b border-border-default">
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

                {/* Row 2: Search Bar with Category */}
                <div className="px-4 py-2 bg-surface">
                    <form onSubmit={handleSearch} className="relative flex w-full">
                        <button
                            type="button"
                            onClick={() => setShowMobileCatSelect(!showMobileCatSelect)}
                            className="flex items-center gap-0.5 px-2.5 bg-page-bg border border-r-0 border-border-default rounded-l-lg text-xs text-text-secondary hover:bg-surface-hover shrink-0"
                        >
                            {SEARCH_CATEGORIES.find(c => c.value === searchCategory)?.label}
                            <ChevronDown size={12} />
                        </button>
                        <input
                            type="text"
                            inputMode="search"
                            placeholder={currentSearchContext.placeholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 min-w-0 border border-border-default bg-background px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-trust focus:ring-2 focus:ring-trust/20"
                        />
                        <button
                            type="submit"
                            aria-label="Search"
                            className="flex items-center justify-center w-11 bg-trust hover:bg-trust/90 rounded-r-lg text-white transition-colors shrink-0"
                        >
                            <Search size={18} />
                        </button>
                    </form>
                    {showMobileCatSelect && (
                        <div className="absolute left-4 right-4 mt-1 bg-surface border border-border-default rounded-lg shadow-card z-50">
                            {SEARCH_CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => { setSearchCategory(cat.value); setShowMobileCatSelect(false); }}
                                    className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors ${searchCategory === cat.value ? 'text-trust font-medium' : 'text-text-primary'}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Row 3: Location Strip */}
                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-page-bg border-t border-border-default">
                    <MapPin size={14} className="text-text-secondary flex-shrink-0" />
                    <span className="text-xs text-text-secondary truncate">Deliver to Etah 207001</span>
                </div>
            </div>

            {/* ═══════════ DESKTOP ═══════════ */}
            <div className="hidden md:block">
                {/* Row 1: Logo + deliver (left), search centered, account cluster (right) */}
                <div className="bg-background/80 backdrop-blur-lg border-b border-border-default">
                    <div className="container mx-auto px-4 h-16 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 md:gap-4 min-w-0">
                        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0 min-w-0">
                            <Link to="/" className="text-2xl font-heading font-bold text-text-primary flex-shrink-0">
                                CM<span className="text-trust">GROUPS</span>
                            </Link>
                            <div className="hidden lg:flex items-center gap-1.5 text-text-secondary hover:text-text-primary cursor-pointer flex-shrink-0 px-2 py-1 rounded-md hover:bg-surface-hover transition-colors">
                                <MapPin size={16} className="text-text-secondary" />
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[10px] text-text-muted">Deliver to</span>
                                    <span className="text-xs font-semibold text-text-primary">Etah 207001</span>
                                </div>
                            </div>
                        </div>

                        <div className="min-w-0 px-1">
                            <form onSubmit={handleSearch} className="mx-auto w-full max-w-2xl">
                                <div className="relative flex w-full rounded-lg overflow-hidden border-2 border-trust focus-within:border-trust shadow-sm">
                                    <select
                                        value={searchCategory}
                                        onChange={(e) => setSearchCategory(e.target.value)}
                                        className="bg-page-bg border-r border-border-default px-2 py-2 text-xs text-text-secondary focus:outline-none cursor-pointer hover:bg-surface-hover"
                                    >
                                        {SEARCH_CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder={currentSearchContext.placeholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 min-w-0 px-3 py-2 bg-white text-sm text-text-primary focus:outline-none"
                                    />
                                    {hasSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="px-2 text-text-muted hover:text-text-primary transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="px-3 bg-trust hover:bg-trust/90 text-white transition-colors"
                                    >
                                        <Search size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0 min-w-0">
                            <div
                                ref={accountRef}
                                className="relative flex-shrink-0"
                                onMouseEnter={handleAccountEnter}
                                onMouseLeave={handleAccountLeave}
                            >
                            {user ? (
                                <button className="flex flex-col leading-tight text-left px-2 py-1 rounded-md hover:bg-surface-hover transition-colors">
                                    <span className="text-[10px] text-text-muted">Hello, {user.name?.split(' ')[0] || 'User'}</span>
                                    <span className="text-xs font-semibold text-text-primary flex items-center gap-0.5">
                                        Account & Lists <ChevronDown size={10} />
                                    </span>
                                </button>
                            ) : isSignedIn ? (
                                <button
                                    onClick={handleLogout}
                                    className="flex flex-col leading-tight text-left px-2 py-1 rounded-md hover:bg-surface-hover transition-colors"
                                >
                                    <span className="text-[10px] text-text-muted">Hello</span>
                                    <span className="text-xs font-semibold text-text-primary flex items-center gap-0.5">
                                        Sign Out <LogOut size={10} />
                                    </span>
                                </button>
                            ) : (
                                <Link to="/sign-in" className="flex flex-col leading-tight text-left px-2 py-1 rounded-md hover:bg-surface-hover transition-colors">
                                    <span className="text-[10px] text-text-muted">Hello, Sign in</span>
                                    <span className="text-xs font-semibold text-text-primary flex items-center gap-0.5">
                                        Account & Lists <ChevronDown size={10} />
                                    </span>
                                </Link>
                            )}

                            {/* Account Dropdown */}
                            {showAccountMenu && user && (
                                <div className="absolute right-0 top-full mt-0.5 w-56 bg-surface border border-border-default rounded-lg shadow-card py-2 z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-2 border-b border-border-default">
                                        <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                                        <p className="text-xs text-text-muted">{user.email}</p>
                                    </div>
                                    <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                                        <LayoutDashboard size={15} className="text-text-muted" /> Dashboard
                                    </Link>
                                    <Link to="/dashboard/orders" className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                                        <ShoppingBag size={15} className="text-text-muted" /> Orders
                                    </Link>
                                    <Link to="/wishlist" className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                                        <Heart size={15} className="text-text-muted" /> Wishlist
                                    </Link>
                                    <Link to="/dashboard/settings" className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                                        <Settings size={15} className="text-text-muted" /> Settings
                                    </Link>
                                    <div className="border-t border-border-default mt-1 pt-1">
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-error hover:bg-surface-hover transition-colors w-full text-left"
                                        >
                                            <LogOut size={15} /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Returns & Orders */}
                        <Link
                            to="/dashboard/orders"
                            className="flex flex-col leading-tight text-left px-2 py-1 rounded-md hover:bg-surface-hover transition-colors flex-shrink-0"
                        >
                            <span className="text-[10px] text-text-muted">Returns</span>
                            <span className="text-xs font-semibold text-text-primary">& Orders</span>
                        </Link>

                        {/* Cart */}
                        <Link to="/cart" className="relative flex items-center gap-1 px-2 py-1 rounded-md hover:bg-surface-hover transition-colors flex-shrink-0">
                            <div className="relative">
                                <ShoppingCart size={24} className="text-text-primary" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 h-[18px] min-w-[18px] px-1 bg-trust text-[10px] font-bold text-white flex items-center justify-center rounded-full">
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs font-semibold text-text-primary hidden xl:inline">Cart</span>
                        </Link>
                        </div>
                    </div>
                </div>

                {/* Row 2: Sub-Navigation (left-aligned links; overflow-x only on trailing items so flyout isn’t clipped) */}
                <div className="bg-surface border-b border-border-default">
                    <div className="container mx-auto px-4 h-10 flex items-center justify-between gap-3 min-w-0">
                        <nav className="flex items-center gap-1 min-w-0 flex-1">
                            <NavLink to="/" label="All" icon={<Menu size={14} />} active={isActive('/')} />

                            <div
                                className="relative shrink-0"
                                onMouseEnter={() => setShowCatMenu(true)}
                                onMouseLeave={() => setShowCatMenu(false)}
                            >
                                <NavLink to="/products" label="Products" active={isActive('/products')} hasArrow />
                                {showCatMenu && (
                                    <div className="absolute left-0 top-full z-[60] min-w-[13rem] pt-1 animate-in fade-in slide-in-from-top-2">
                                        <div className="w-52 bg-surface border border-border-default shadow-card rounded-lg py-1.5">
                                            <Link to="/products" className="block px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-hover transition-colors">
                                                All Products
                                            </Link>
                                            {categories.length > 0 && <div className="h-px bg-border-default mx-2" />}
                                            {categories.map(cat => (
                                                <Link
                                                    key={cat.id}
                                                    to={`/products?category=${encodeURIComponent(cat.name)}`}
                                                    className="block px-4 py-2 text-sm text-text-secondary hover:text-trust hover:bg-surface-hover transition-colors"
                                                >
                                                    {cat.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-1 min-w-0 items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:h-1.5">
                                <NavLink to="/services" label="Services" active={isActive('/services')} />
                                <NavLink to="/courses" label="Academy" active={isActive('/courses')} />
                                <NavLink to="/tally-erp" label="Tally ERP" active={isActive('/tally-erp')} />
                                <NavLink to="/cctv" label="CCTV" active={isActive('/cctv')} />
                            </div>
                        </nav>

                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                            {user && <PointsBadge points={user.walletBalance} />}

                            <Link to="/wishlist" className="text-text-secondary hover:text-trust transition-colors">
                                <Heart size={18} />
                            </Link>

                            {user && (
                                <div className="relative">
                                    <button
                                        className="text-text-secondary hover:text-trust transition-colors relative"
                                        onClick={toggleOpen}
                                        aria-label="Notifications"
                                    >
                                        <Bell size={18} />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-trust text-[9px] text-white flex items-center justify-center rounded-full">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    <NotificationDropdown />
                                </div>
                            )}

                            {canInstall && !isInstalled && (
                                <button
                                    onClick={install}
                                    className="text-[11px] text-trust font-medium hover:underline whitespace-nowrap"
                                >
                                    Install App
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

const NavLink = ({ to, label, active, hasArrow, icon }) => (
    <Link
        to={to}
        className={`flex items-center gap-0.5 px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
            active
                ? 'text-trust font-semibold bg-trust/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
        }`}
    >
        {icon}
        {label}
        {hasArrow && <ChevronDown size={12} />}
    </Link>
);

export default memo(Navbar);
