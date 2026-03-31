import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronDown, LogOut, LayoutDashboard, ShoppingBag, Heart, Settings,
} from 'lucide-react';

const AccountDropdown = ({
    user,
    isSignedIn,
    handleLogout,
    accountRef,
}) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const timeoutRef = useRef(null);

    const toggle = useCallback(() => setOpen(prev => !prev), []);
    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') { close(); accountRef?.current?.querySelector('button')?.focus(); }
        };
        const handleClickOutside = (e) => {
            if (accountRef?.current && !accountRef.current.contains(e.target)) close();
        };
        document.addEventListener('keydown', handleKey);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, close, accountRef]);

    const handleMouseEnter = () => { clearTimeout(timeoutRef.current); setOpen(true); };
    const handleMouseLeave = () => { timeoutRef.current = setTimeout(close, 200); };

    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    return (
        <div
            ref={accountRef}
            className="relative flex-shrink-0"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {user ? (
                <button
                    onClick={toggle}
                    aria-expanded={open}
                    aria-haspopup="true"
                    className="flex flex-col leading-tight text-left px-2 py-1 rounded-md hover:bg-surface-hover transition-colors focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-1"
                >
                    <span className="text-[10px] text-text-muted">Hello, {user.name?.split(' ')[0] || 'User'}</span>
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-0.5">
                        Account & Lists <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </span>
                </button>
            ) : isSignedIn ? (
                <button
                    onClick={handleLogout}
                    className="flex flex-col leading-tight text-left px-2 py-1 rounded-md hover:bg-surface-hover transition-colors focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-1"
                >
                    <span className="text-[10px] text-text-muted">Hello</span>
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-0.5">
                        Sign Out <LogOut size={10} />
                    </span>
                </button>
            ) : (
                <Link to="/sign-in" className="flex flex-col leading-tight text-left px-2 py-1 rounded-md hover:bg-surface-hover transition-colors focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-1">
                    <span className="text-[10px] text-text-muted">Hello, Sign in</span>
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-0.5">
                        Account & Lists <ChevronDown size={10} />
                    </span>
                </Link>
            )}

            {open && user && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-0.5 w-56 bg-surface border border-border-default rounded-lg shadow-card py-2 z-50 animate-in fade-in slide-in-from-top-2"
                >
                    <div className="px-4 py-2 border-b border-border-default">
                        <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                        <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                    <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                        <LayoutDashboard size={15} className="text-text-muted" /> Dashboard
                    </Link>
                    <Link to="/dashboard/orders" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                        <ShoppingBag size={15} className="text-text-muted" /> Orders
                    </Link>
                    <Link to="/wishlist" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                        <Heart size={15} className="text-text-muted" /> Wishlist
                    </Link>
                    <Link to="/dashboard/settings" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                        <Settings size={15} className="text-text-muted" /> Settings
                    </Link>
                    <div className="border-t border-border-default mt-1 pt-1">
                        <button
                            onClick={handleLogout}
                            role="menuitem"
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-error hover:bg-surface-hover transition-colors w-full text-left"
                        >
                            <LogOut size={15} /> Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountDropdown;
