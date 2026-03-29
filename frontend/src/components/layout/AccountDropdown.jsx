import React from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronDown, LogOut, LayoutDashboard, ShoppingBag, Heart, Settings,
} from 'lucide-react';

const AccountDropdown = ({
    user,
    isSignedIn,
    showAccountMenu,
    handleAccountEnter,
    handleAccountLeave,
    handleLogout,
    accountRef,
}) => (
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
);

export default AccountDropdown;
