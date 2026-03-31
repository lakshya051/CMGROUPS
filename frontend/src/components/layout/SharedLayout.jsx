import React, { useState, useCallback } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { needsPhoneCapture } from '../../lib/authProfile';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNav from './BottomNav';
import MobileDrawer from './MobileDrawer';

const SharedLayout = () => {
    const location = useLocation();
    const { isSignedIn, user, loading } = useAuth();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const openDrawer = useCallback(() => setDrawerOpen(true), []);
    const closeDrawer = useCallback(() => setDrawerOpen(false), []);

    if (!loading && isSignedIn && needsPhoneCapture(user)) {
        return <Navigate to="/onboarding" state={{ from: location }} replace />;
    }

    return (
        <div className="min-h-screen flex flex-col bg-background text-text-main pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:bg-trust focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none"
            >
                Skip to main content
            </a>
            <Navbar />
            <main id="main-content" className="flex-grow pt-[calc(10rem+env(safe-area-inset-top,0px))] md:pt-[calc(6.5rem+env(safe-area-inset-top,0px))]">
                <Outlet />
            </main>
            <Footer />
            <BottomNav onMenuClick={openDrawer} />
            <MobileDrawer isOpen={drawerOpen} onClose={closeDrawer} />
        </div>
    );
};

export default SharedLayout;
