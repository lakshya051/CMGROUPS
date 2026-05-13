import React, { useEffect, useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { homeAPI } from '../lib/api';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

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
    // One round-trip for everything the homepage needs (banners, categories,
    // deals, bundles, courses, services, brands, best-sellers). Replaces the
    // 9 parallel calls each child component used to make. While `bootstrap`
    // is loading, we pass `undefined` to children so they fall back to their
    // own legacy fetch path — keeps the components reusable on other pages
    // and means a partial backend rollout still works.
    const [bootstrap, setBootstrap] = useState(null);
    const [bootstrapError, setBootstrapError] = useState(false);
    const { items: recentlyViewed } = useRecentlyViewed();
    const { bundlesEnabled } = useFeatureFlags();

    useEffect(() => {
        // Prefetch the next likely chunks while the network is idle.
        import('./shop/Products');
        import('./shop/ProductDetail');
        import('./shop/Cart');
    }, []);

    useEffect(() => {
        let cancelled = false;
        homeAPI.getBootstrap()
            .then(data => { if (!cancelled) setBootstrap(data); })
            .catch(() => { if (!cancelled) setBootstrapError(true); });
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="min-h-screen bg-page-bg pb-4 md:pb-0">
            {/* 1. Hero Banner Slider */}
            <HeroBannerSlider initialBanners={bootstrap?.banners} />

            {/* 2. Trust Strip */}
            <TrustStrip />

            {/* 3. What We Offer — 4 verticals */}
            <WhatWeOffer />

            {/* 4. Our Businesses */}
            <OurBusinesses />

            {/* 5. Shop by Category */}
            <CategoryGrid initialCategories={bootstrap?.categories} />

            {/* 6. Deal of the Day */}
            <DealOfTheDay initialDeals={bootstrap?.deals} />

            {/* 7. Hot Combos — Bundles (gated behind admin toggle) */}
            {bundlesEnabled && (
                <>
                    <div className="bg-page-bg border-t border-border-default">
                        <BundleRow
                            title="Hot Combos — Save More Together"
                            displayOn="home"
                            initialBundles={bootstrap?.bundles}
                        />
                    </div>

                    {/* 8. Build Your Own Bundle */}
                    <BYOBSection initialTemplates={bootstrap?.bundleTemplates} />
                </>
            )}

            {/* 9. Popular Right Now */}
            <div className="bg-page-bg border-t border-border-default">
                {bootstrapError ? (
                    <div className="container mx-auto px-4 py-12 text-center">
                        <p className="text-text-muted text-sm">
                            Unable to load products right now.{' '}
                            <button onClick={() => window.location.reload()} className="text-primary underline">Retry</button>
                        </p>
                    </div>
                ) : (
                    <ProductRow
                        title="Popular Right Now"
                        products={bootstrap?.bestSellers || []}
                        viewAllLink="/products?sort=rating"
                        loading={bootstrap === null}
                        gridOnDesktop
                    />
                )}
            </div>

            {/* 10. Services Showcase */}
            <ServicesShowcase initialServiceTypes={bootstrap?.serviceTypes} />

            {/* 11. Academy / Courses Teaser */}
            <AcademyTeaser initialCourses={bootstrap?.courses} />

            {/* 12. Brand Strip */}
            <BrandStrip initialBrands={bootstrap?.brands} />

            {/* 13. B2B Strip */}
            <B2BStrip />

            {/* 14. PWA Install Section */}
            <PWAInstallSection />

            {/* 15. Recently Viewed */}
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
