import React, { useEffect, useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { productsAPI } from '../lib/api';
import { RECENTLY_VIEWED_KEY } from '../constants';

// Homepage section components
import HeroBannerSlider from '../components/home/HeroBannerSlider';
import CategoryGrid from '../components/home/CategoryGrid';
import DealOfTheDay from '../components/home/DealOfTheDay';
import ProductRow from '../components/home/ProductRow';
import BrandStrip from '../components/home/BrandStrip';

const Home = () => {
    useSEO({ title: 'CMGROUPS — Shop, Services & Courses in Etah', description: 'Your one-stop destination for computers, tech services, CCTV, Tally ERP and professional courses in Etah.' });
    const [bestSellers, setBestSellers] = useState([]);
    const [bestSellersLoading, setBestSellersLoading] = useState(true);

    // ── Recently Viewed ──
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    useEffect(() => {
        import('./shop/Products');
        import('./shop/ProductDetail');
        import('./shop/Cart');
    }, []);

    useEffect(() => {
        // Best sellers: top-rated products
        productsAPI.getAll({ sort: 'rating', limit: 10 })
            .then(res => setBestSellers(res.data || []))
            .catch(err => console.error('Failed to fetch best sellers:', err))
            .finally(() => setBestSellersLoading(false));

        // Recently viewed from localStorage
        try {
            const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
            setRecentlyViewed(stored.slice(0, 6));
        } catch { /* ignore */ }
    }, []);

    return (
        <div className="min-h-screen bg-page-bg">
            {/* 1. Hero Banner Slider */}
            <HeroBannerSlider />

            {/* 2. Shop by Category */}
            <CategoryGrid />

            {/* 3. Deal of the Day */}
            <DealOfTheDay />

            {/* 4. Best Sellers */}
            <div className="bg-page-bg border-t border-border-default">
                <ProductRow
                    title="Best Sellers"
                    products={bestSellers}
                    viewAllLink="/products?sort=rating"
                    loading={bestSellersLoading}
                    badge="bestseller"
                />
            </div>

            {/* 5. Brand Spotlight */}
            <BrandStrip />

            {/* 6. Recently Viewed (conditional) */}
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
