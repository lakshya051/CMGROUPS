import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const SharedLayout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-background text-text-main">
            <Navbar />
            <main className="flex-grow pt-32 md:pt-16">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default SharedLayout;
