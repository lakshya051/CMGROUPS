import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const SharedLayout = () => {
    const location = useLocation();
    const hasMobileSearchHeader = !location.pathname.startsWith('/tally-erp');

    return (
        <div className="safe-screen min-h-screen flex flex-col bg-background text-text-main">
            <Navbar />
            <main className={`flex-grow md:pt-16 ${hasMobileSearchHeader ? 'pt-32' : 'pt-16'}`}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default SharedLayout;
