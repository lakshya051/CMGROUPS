import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { productsAPI, categoriesAPI } from '../lib/api';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';

import HeroBannerSlider from '../components/home/HeroBannerSlider';
import WhatWeOffer from '../components/home/WhatWeOffer';
import TrustStrip from '../components/home/TrustStrip';
import CategoryGrid from '../components/home/CategoryGrid';
import DealOfTheDay from '../components/home/DealOfTheDay';
import ProductRow from '../components/home/ProductRow';
import ServicesShowcase from '../components/home/ServicesShowcase';
import AcademyTeaser from '../components/home/AcademyTeaser';
import BrandStrip from '../components/home/BrandStrip';
import OurBusinesses from '../components/home/OurBusinesses';
import B2BStrip from '../components/home/B2BStrip';
import PWAInstallSection from '../components/home/PWAInstallSection';
import BundleRow from '../components/home/BundleRow';
import BYOBSection from '../components/home/BYOBSection';

const Home = () => {
    useSEO({ title: 'Shoptify — Shop, Services & Courses in Etah', description: 'Your one-stop destination for computers, tech services, CCTV, Tally Prime and professional courses in Etah.' });
    const [bestSellers, setBestSellers] = useState([]);
    const [bestSellersLoading, setBestSellersLoading] = useState(true);
    const [bestSellersError, setBestSellersError] = useState(false);
    const [pillCategories, setPillCategories] = useState([]);
    const [pillCategoriesError, setPillCategoriesError] = useState(false);
    const { items: recentlyViewed } = useRecentlyViewed();

    useEffect(() => {
        import('./shop/Products');
        import('./shop/ProductDetail');
        import('./shop/Cart');
    }, []);

    const loadPillCategories = () => {
        setPillCategoriesError(false);
        categoriesAPI.getAll()
            .then(setPillCategories)
            .catch(() => setPillCategoriesError(true));
    };

    useEffect(() => { loadPillCategories(); }, []);

    useEffect(() => {
        productsAPI.getAll({ sort: 'rating', limit: 10 })
            .then(res => setBestSellers(res.data || []))
            .catch(() => setBestSellersError(true))
            .finally(() => setBestSellersLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-page-bg pb-4 md:pb-0">
            {/* 1. Category Pills — mobile only */}
            {pillCategoriesError ? (
                <div className="md:hidden flex items-center justify-center gap-2 px-4 py-3 bg-surface border-b border-border-default">
                    <span className="text-sm text-text-muted">Couldn't load categories.</span>
                    <button onClick={loadPillCategories} className="text-sm text-primary font-semibold underline">Retry</button>
                </div>
            ) : pillCategories.length > 0 && (
                <div className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 bg-surface border-b border-border-default">
                    <Link
                        to="/products"
                        className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium bg-trust text-white border border-trust whitespace-nowrap"
                    >
                        All
                    </Link>
                    {pillCategories.slice(0, 10).map(cat => (
                        <Link
                            key={cat.id}
                            to={cat.slug ? `/products/category/${cat.slug}` : `/products?category=${encodeURIComponent(cat.name)}`}
                            className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium bg-surface text-text-primary border border-border-default whitespace-nowrap hover:border-trust/40 transition-colors"
                        >
                            {cat.name}
                        </Link>
                    ))}
                    {pillCategories.length > 10 && (
                        <Link
                            to="/products"
                            className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium bg-trust/10 text-trust border border-trust/20 whitespace-nowrap"
                        >
                            +{pillCategories.length - 10} More
                        </Link>
                    )}
                </div>
            )}

            {/* 2. Hero Banner Slider */}
            <HeroBannerSlider />

            {/* 3. Trust Strip */}
            <TrustStrip />

            {/* 4. What We Offer — 4 verticals */}
            <WhatWeOffer />

            {/* 4.5. Our Businesses */}
            <OurBusinesses />

            {/* 5. Shop by Category */}
            <CategoryGrid />

            {/* 6. Deal of the Day */}
            <DealOfTheDay />

            {/* 6.5. Hot Combos - Bundles */}
            <div className="bg-page-bg border-t border-border-default">
                <BundleRow title="Hot Combos — Save More Together" displayOn="home" />
            </div>

            {/* 6.75. Build Your Own Bundle */}
            <BYOBSection />

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
                        products={recentlyViewed.slice(0, 6)}
                        viewAllLink="/products"
                    />
                </div>
            )}
        </div>
    );
};

export default Home;
