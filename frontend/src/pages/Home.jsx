import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { productsAPI, categoriesAPI } from '../lib/api';
import { RECENTLY_VIEWED_KEY } from '../constants';

import HeroBannerSlider from '../components/home/HeroBannerSlider';
import WhatWeOffer from '../components/home/WhatWeOffer';
import TrustStrip from '../components/home/TrustStrip';
import CategoryGrid from '../components/home/CategoryGrid';
import DealOfTheDay from '../components/home/DealOfTheDay';
import ProductRow from '../components/home/ProductRow';
import ServicesShowcase from '../components/home/ServicesShowcase';
import AcademyTeaser from '../components/home/AcademyTeaser';
import BrandStrip from '../components/home/BrandStrip';
import B2BStrip from '../components/home/B2BStrip';
import PWAInstallSection from '../components/home/PWAInstallSection';

const Home = () => {
    useSEO({ title: 'CMGROUPS — Shop, Services & Courses in Etah', description: 'Your one-stop destination for computers, tech services, CCTV, Tally Prime and professional courses in Etah.' });
    const [bestSellers, setBestSellers] = useState([]);
    const [bestSellersLoading, setBestSellersLoading] = useState(true);
    const [bestSellersError, setBestSellersError] = useState(false);
    const [pillCategories, setPillCategories] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    useEffect(() => {
        import('./shop/Products');
        import('./shop/ProductDetail');
        import('./shop/Cart');
    }, []);

    useEffect(() => {
        categoriesAPI.getAll()
            .then(setPillCategories)
            .catch(console.error);
    }, []);

    useEffect(() => {
        productsAPI.getAll({ sort: 'rating', limit: 10 })
            .then(res => setBestSellers(res.data || []))
            .catch(() => setBestSellersError(true))
            .finally(() => setBestSellersLoading(false));

        try {
            const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
            setRecentlyViewed(stored.slice(0, 6));
        } catch { /* ignore */ }
    }, []);

    return (
        <div className="min-h-screen bg-page-bg">
            {/* 1. Category Pills — mobile only */}
            {pillCategories.length > 0 && (
                <div className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 bg-surface border-b border-border-default">
                    <Link
                        to="/products"
                        className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium bg-trust text-white border border-trust whitespace-nowrap"
                    >
                        All
                    </Link>
                    {pillCategories.map(cat => (
                        <Link
                            key={cat.id}
                            to={`/products?category=${encodeURIComponent(cat.name)}`}
                            className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium bg-surface text-text-primary border border-border-default whitespace-nowrap hover:border-trust/40 transition-colors"
                        >
                            {cat.name}
                        </Link>
                    ))}
                </div>
            )}

            {/* 2. Hero Banner Slider */}
            <HeroBannerSlider />

            {/* 3. Trust Strip */}
            <TrustStrip />

            {/* 4. What We Offer — 4 verticals */}
            <WhatWeOffer />

            {/* 5. Shop by Category */}
            <CategoryGrid />

            {/* 6. Deal of the Day */}
            <DealOfTheDay />

            {/* 7. Popular Right Now */}
            <div className="bg-page-bg border-t border-border-default">
                {bestSellersError ? (
                    <div className="container mx-auto px-4 py-12 text-center">
                        <p className="text-text-muted text-sm">
                            Unable to load products right now.{' '}
                            <button onClick={() => window.location.reload()} className="text-primary underline">Retry</button>
                        </p>
                    </div>
                ) : (
                    <ProductRow
                        title="Popular Right Now"
                        products={bestSellers}
                        viewAllLink="/products?sort=rating"
                        loading={bestSellersLoading}
                        gridOnDesktop
                    />
                )}
            </div>

            {/* 7. Services Showcase */}
            <ServicesShowcase />

            {/* 8. Academy / Courses Teaser */}
            <AcademyTeaser />

            {/* 9. Brand Strip */}
            <BrandStrip />

            {/* 10. B2B Strip */}
            <B2BStrip />

            {/* 11. PWA Install Section */}
            <PWAInstallSection />

            {/* 12. Recently Viewed */}
            {recentlyViewed.length > 0 && (
                <div className="bg-page-bg border-t border-border-default">
                    <ProductRow
                        title="Recently Viewed"
                        products={recentlyViewed}
                    />
                </div>
            )}
        </div>
    );
};

export default Home;
