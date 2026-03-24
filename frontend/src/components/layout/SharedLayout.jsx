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
    const hasMobileSearchHeader = !location.pathname.startsWith('/tally-erp') && !location.pathname.startsWith('/cctv');
    const [drawerOpen, setDrawerOpen] = useState(false);

    const openDrawer = useCallback(() => setDrawerOpen(true), []);
    const closeDrawer = useCallback(() => setDrawerOpen(false), []);

    if (!loading && isSignedIn && needsPhoneCapture(user)) {
        return <Navigate to="/onboarding" state={{ from: location }} replace />;
    }

    return (
        <div className="safe-screen min-h-screen flex flex-col bg-background text-text-main pb-14 md:pb-0">
            <Navbar />
            <main className={`flex-grow md:pt-[104px] ${hasMobileSearchHeader ? 'pt-36' : 'pt-24'}`}>
                <Outlet />
            </main>
            <Footer />
            <BottomNav onMenuClick={openDrawer} />
            <MobileDrawer isOpen={drawerOpen} onClose={closeDrawer} />
        </div>
    );
};

export default SharedLayout;
