import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Menu, ShoppingCart, Heart, Bell, MapPin, ChevronDown,
} from 'lucide-react';
import PointsBadge from '../ui/PointsBadge';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useNotifications } from '../../context/NotificationContext';
import { categoriesAPI } from '../../lib/api';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import SearchBar, { SEARCH_CATEGORIES } from './SearchBar';
import AccountDropdown from './AccountDropdown';
import { DEFAULT_DELIVERY_CITY, DEFAULT_DELIVERY_STATE } from '../../constants';

/** Service area (User model has no city field; show storefront delivery zone). */
const DELIVERY_AREA_LABEL = `${DEFAULT_DELIVERY_CITY}, ${DEFAULT_DELIVERY_STATE}`;

const Navbar = () => {
    const [categories, setCategories] = useState([]);
    const [showCatMenu, setShowCatMenu] = useState(false);
    const [searchCategory, setSearchCategory] = useState('all');
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

    useEffect(() => {
        categoriesAPI.getAll().then(setCategories).catch(err => console.error('Failed to load categories:', err));
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
            return { path: '/products', placeholder: 'Search Shoptify...' };
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

    

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const searchBarProps = {
        searchQuery,
        setSearchQuery,
        searchCategory,
        setSearchCategory,
        handleSearch,
        currentSearchContext,
        hasSearchQuery,
        handleClearSearch,
    };

    return (
        <header className="fixed safe-top-offset top-0 left-0 right-0 z-50">
            {/* ═══════════ MOBILE ═══════════ */}
            <div className="md:hidden flex flex-col bg-background/80 backdrop-blur-lg border-b border-border-default">
                {/* Row 1: Logo + Bell */}
                <div className="flex items-center justify-between h-14 px-4">
                    <Link to="/" className="text-xl font-heading font-bold text-text-primary">
                        Shopt<span className="text-trust">ify</span>
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
                <SearchBar {...searchBarProps} isMobile />

                {/* Row 3: Location Strip */}
                <Link
                    to={user ? '/dashboard/settings' : '/sign-in'}
                    title={user ? 'Manage address in settings' : 'Sign in to save your address'}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-page-bg border-t border-border-default hover:bg-surface-hover transition-colors"
                >
                    <MapPin size={14} className="text-text-secondary flex-shrink-0" />
                    <span className="text-xs text-text-secondary truncate">
                        Deliver to {DELIVERY_AREA_LABEL}
                    </span>
                </Link>
            </div>

            {/* ═══════════ DESKTOP ═══════════ */}
            <div className="hidden md:block">
                {/* Row 1: Logo + deliver (left), search centered, account cluster (right) */}
                {/* z-40 so account dropdown (below this row) paints above row 2 sub-nav */}
                <div className="relative z-40 bg-background/80 backdrop-blur-lg border-b border-border-default">
                    <div className="container mx-auto px-4 h-16 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 md:gap-4 min-w-0">
                        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0 min-w-0">
                            <Link to="/" className="text-2xl font-heading font-bold text-text-primary flex-shrink-0">
                                Shopt<span className="text-trust">ify</span>
                            </Link>
                            <Link
                                to={user ? '/dashboard/settings' : '/sign-in'}
                                title={user ? 'Manage address in settings' : 'Sign in to save your address'}
                                className="hidden lg:flex items-center gap-1.5 text-text-secondary hover:text-text-primary cursor-pointer flex-shrink-0 px-2 py-1 rounded-md hover:bg-surface-hover transition-colors max-w-[11rem]"
                            >
                                <MapPin size={16} className="text-text-secondary shrink-0" />
                                <div className="flex flex-col leading-tight min-w-0">
                                    <span className="text-[10px] text-text-muted">Deliver to</span>
                                    <span className="text-xs font-semibold text-text-primary truncate" title={DELIVERY_AREA_LABEL}>
                                        {DELIVERY_AREA_LABEL}
                                    </span>
                                </div>
                            </Link>
                        </div>

                        <SearchBar {...searchBarProps} isMobile={false} />

                        <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0 min-w-0">
                            <AccountDropdown
                                user={user}
                                isSignedIn={isSignedIn}
                                handleLogout={handleLogout}
                                accountRef={accountRef}
                            />

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
                <div className="relative z-30 bg-surface border-b border-border-default">
                    <div className="container mx-auto px-4 h-10 flex items-center justify-between gap-3 min-w-0">
                        <nav className="flex items-center gap-1 min-w-0 flex-1">
                            <NavLink to="/" label="All" icon={<Menu size={14} />} active={isActive('/')} />

                            <div
                                className="relative shrink-0"
                                onMouseEnter={() => setShowCatMenu(true)}
                                onMouseLeave={() => setShowCatMenu(false)}
                            >
                                <button
                                    onClick={() => setShowCatMenu(prev => !prev)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowCatMenu(prev => !prev); } if (e.key === 'Escape') setShowCatMenu(false); }}
                                    aria-expanded={showCatMenu}
                                    aria-haspopup="true"
                                    className={`flex items-center gap-0.5 px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                                        isActive('/products')
                                            ? 'text-trust font-semibold bg-trust/5'
                                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                                    }`}
                                >
                                    Products
                                    <ChevronDown size={12} className={`transition-transform ${showCatMenu ? 'rotate-180' : ''}`} />
                                </button>
                                {showCatMenu && (
                                    <div className="absolute left-0 top-full z-[60] min-w-[13rem] pt-1 animate-in fade-in slide-in-from-top-2" role="menu">
                                        <div className="w-52 bg-surface border border-border-default shadow-card rounded-lg py-1.5">
                                            <Link to="/products" role="menuitem" onClick={() => setShowCatMenu(false)} className="block px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-hover transition-colors">
                                                All Products
                                            </Link>
                                            {categories.length > 0 && <div className="h-px bg-border-default mx-2" />}
                                            {categories.map(cat => (
                                                <Link
                                                    key={cat.id}
                                                    to={`/products?category=${encodeURIComponent(cat.name)}`}
                                                    role="menuitem"
                                                    onClick={() => setShowCatMenu(false)}
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
                                <NavLink to="/bundles" label="Bundles" active={isActive('/bundles')} />
                                <NavLink to="/services" label="Services" active={isActive('/services')} />
                                <NavLink to="/courses" label="Academy" active={isActive('/courses')} />
                                <NavLink to="/tally-erp" label="Tally Prime" active={isActive('/tally-erp')} />
                                <NavLink to="/cctv" label="CCTV" active={isActive('/cctv')} />
                                <NavLink to="/our-companies" label="Our Companies" active={isActive('/our-companies')} />
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
