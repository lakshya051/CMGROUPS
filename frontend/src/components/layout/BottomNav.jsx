import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, User, ShoppingCart, Menu } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';

const BottomNav = ({ onMenuClick }) => {
    const location = useLocation();
    const { cart } = useShop();
    const { user } = useAuth();

    const cartCount = useMemo(
        () => cart.reduce((sum, item) => sum + item.quantity, 0),
        [cart]
    );

    const profilePath = user
        ? (user.role === 'admin' ? '/admin' : '/dashboard')
        : '/sign-in';

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const navItems = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: User, label: 'You', path: profilePath },
        { icon: ShoppingCart, label: 'Cart', path: '/cart' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border-default md:hidden safe-bottom">
            <div className="flex items-center justify-around h-14">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
                                active ? 'text-trust' : 'text-text-secondary'
                            }`}
                        >
                            <div className="relative">
                                <Icon size={22} />
                                {item.label === 'Cart' && cartCount > 0 && (
                                    <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[1rem] px-0.5 bg-trust text-[10px] text-white flex items-center justify-center rounded-full">
                                        {cartCount > 9 ? '9+' : cartCount}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] leading-tight ${active ? 'font-bold' : 'font-normal'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}

                <button
                    onClick={onMenuClick}
                    className="flex-1 flex flex-col items-center justify-center h-full gap-0.5 text-text-secondary transition-colors"
                    aria-label="Open menu"
                >
                    <Menu size={22} />
                    <span className="text-[10px] leading-tight font-normal">Menu</span>
                </button>
            </div>
        </nav>
    );
};

export default BottomNav;
