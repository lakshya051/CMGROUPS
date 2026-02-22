import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, Heart, User, LayoutDashboard, LogOut, Bell } from 'lucide-react';
import Button from '../ui/Button';
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
    const { user, logout } = useAuth();
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

    const handleMarkAllRead = async () => {
        try {
            await notificationsAPI.markAllRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error(err);
        }
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const isActive = (path) => location.pathname === path;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-gray-100">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="text-2xl font-heading font-bold text-text-main">
                    CM<span className="text-primary">GROUPS</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link to="/" className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-primary' : 'text-text-muted hover:text-text-main'}`}>
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
                            className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/products') ? 'text-primary' : 'text-text-muted hover:text-text-main'}`}
                        >
                            Products
                        </Link>

                        {/* Mega Menu */}
                        {showCatMenu && (
                            <div className="absolute top-full left-0 w-48 bg-white border border-gray-100 shadow-lg rounded-xl p-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2">
                                <Link to="/products" className="px-3 py-2 text-sm font-bold hover:bg-gray-50 rounded-lg">All Products</Link>
                                <div className="h-px bg-gray-50 my-1"></div>
                                {categories.map(cat => (
                                    <Link
                                        key={cat.id}
                                        to={`/products?category=${cat.name}`}
                                        className="px-3 py-2 text-sm text-text-muted hover:text-primary hover:bg-gray-50 rounded-lg"
                                    >
                                        {cat.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link to="/services" className={`text-sm font-medium transition-colors ${isActive('/services') ? 'text-primary' : 'text-text-muted hover:text-text-main'}`}>
                        Services
                    </Link>
                    <Link to="/courses" className={`text-sm font-medium transition-colors ${isActive('/courses') ? 'text-primary' : 'text-text-muted hover:text-text-main'}`}>
                        Academy
                    </Link>
                    <Link to="/tally-erp" className={`text-sm font-medium transition-colors ${isActive('/tally-erp') ? 'text-primary' : 'text-text-muted hover:text-text-main'}`}>
                        Tally ERP
                    </Link>
                </nav>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <Link to="/wishlist" className="text-text-muted hover:text-primary transition-colors">
                        <Heart size={20} />
                    </Link>
                    <Link to="/cart" className="relative text-text-muted hover:text-primary transition-colors">
                        <ShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-[10px] text-white flex items-center justify-center rounded-full">
                                {cartCount > 9 ? '9+' : cartCount}
                            </span>
                        )}
                    </Link>

                    {/* Notifications */}
                    {user && (
                        <div className="relative">
                            <button
                                className="text-text-muted hover:text-primary transition-colors relative"
                                onClick={() => setShowNotifMenu(!showNotifMenu)}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-[10px] text-white flex items-center justify-center rounded-full">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            {/* Dropdown */}
                            {showNotifMenu && (
                                <div className="absolute top-full right-0 w-80 bg-white border border-gray-100 shadow-lg rounded-xl p-0 flex flex-col gap-0 animate-in fade-in slide-in-from-top-2 z-50 max-h-96 overflow-y-auto mt-2">
                                    <div className="p-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                                        <span className="font-bold text-sm">Notifications</span>
                                        <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                                    </div>
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-text-muted">No notifications</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n.id} className={`p-3 border-b border-gray-50 hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                                                <div className="font-medium text-sm text-text-main">{n.title}</div>
                                                <div className="text-xs text-text-muted mt-1">{n.message}</div>
                                                {n.link && (
                                                    <Link
                                                        to={n.link}
                                                        className="text-xs text-primary mt-2 block hover:underline font-medium"
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
                                className="flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors"
                            >
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="hidden lg:inline">{user.name}</span>
                            </Link>
                        </div>
                    ) : (
                        <Link to="/login">
                            <Button variant="outline" size="sm">Login</Button>
                        </Link>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-text-main p-2"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Drawer */}
            {isOpen && (
                <div className="md:hidden absolute top-16 left-0 right-0 bg-surface border-b border-gray-100 p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
                    <Link to="/" className="px-4 py-3 rounded-xl hover:bg-gray-100 text-text-main font-medium hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>Home</Link>
                    <Link to="/products" className="px-4 py-3 rounded-xl hover:bg-gray-100 text-text-muted hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>Products</Link>
                    <Link to="/services" className="px-4 py-3 rounded-xl hover:bg-gray-100 text-text-muted hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>Services</Link>
                    <Link to="/courses" className="px-4 py-3 rounded-xl hover:bg-gray-100 text-text-muted hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>Academy</Link>
                    <Link to="/tally-erp" className="px-4 py-3 rounded-xl hover:bg-gray-100 text-text-muted hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>Tally ERP</Link>
                    <div className="h-px bg-gray-50 my-2"></div>
                    <div className="flex items-center justify-between px-4">
                        <Link to="/wishlist" className="flex items-center gap-2 text-text-muted" onClick={() => setIsOpen(false)}>
                            <Heart size={18} /> Wishlist
                        </Link>
                        <Link to="/cart" className="flex items-center gap-2 text-text-muted" onClick={() => setIsOpen(false)}>
                            <ShoppingCart size={18} /> Cart ({cartCount})
                        </Link>
                    </div>

                    {user ? (
                        <>
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
                    ) : (
                        <Link to="/login" onClick={() => setIsOpen(false)}>
                            <Button className="w-full">Login</Button>
                        </Link>
                    )}
                </div>
            )}
        </header>
    );
};

export default Navbar;
