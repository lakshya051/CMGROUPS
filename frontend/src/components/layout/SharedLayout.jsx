import React, { useState, useCallback } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { needsPhoneCapture } from '../../lib/authProfile';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNav from './BottomNav';
import MobileDrawer from './MobileDrawer';
import BackToTop from '../ui/BackToTop';

const SharedLayout = () => {
    const location = useLocation();
    const { isSignedIn, user, loading } = useAuth();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const openDrawer = useCallback(() => setDrawerOpen(true), []);
    const closeDrawer = useCallback(() => setDrawerOpen(false), []);

    // H11: users who choose "Skip for now" on /onboarding shouldn't be bounced
    // back every time they navigate. We honour the skip for the current tab
    // session; actions that genuinely require a phone number (checkout,
    // service booking) prompt inline instead. The flag is cleared when
    // onboarding is actually completed (OnboardingPage does that).
    let onboardingSkipped = false;
    try {
        onboardingSkipped = typeof window !== 'undefined'
            && window.sessionStorage?.getItem('onboardingSkipped') === '1';
    } catch { /* sessionStorage unavailable */ }

    if (!loading && isSignedIn && needsPhoneCapture(user) && !onboardingSkipped) {
        return <Navigate to="/onboarding" state={{ from: location }} replace />;
    }

    return (
        <div className="min-h-screen flex flex-col bg-background text-text-main pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom,0px))]">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-[calc(1rem+env(safe-area-inset-top,0px))] focus:left-4 focus:z-[999] focus:bg-trust focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none"
            >
                Skip to main content
            </a>
            <Navbar />
            <main id="main-content" className="flex-grow pt-[calc(var(--nav-h)+env(safe-area-inset-top,0px))]">
                <Outlet />
            </main>
            <Footer />
            <BottomNav onMenuClick={openDrawer} />
            <MobileDrawer isOpen={drawerOpen} onClose={closeDrawer} />
            <BackToTop />
        </div>
    );
};

export default SharedLayout;
