import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { productsAPI, categoriesAPI } from '../lib/api';
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
    const [bestSellersError, setBestSellersError] = useState(false);
    const [pillCategories, setPillCategories] = useState([]);

    // ── Recently Viewed ──
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
        // Best sellers: top-rated products
        productsAPI.getAll({ sort: 'rating', limit: 10 })
            .then(res => setBestSellers(res.data || []))
            .catch(() => setBestSellersError(true))
            .finally(() => setBestSellersLoading(false));

        // Recently viewed from localStorage
        try {
            const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
            setRecentlyViewed(stored.slice(0, 6));
        } catch { /* ignore */ }
    }, []);

    return (
        <div className="min-h-screen bg-page-bg">
            {/* Category Pills — mobile only */}
            {pillCategories.length > 0 && (
                <div className="md:hidden flex gap-2 overflow-x-auto px-4 py-3 bg-surface border-b border-border-default [&::-webkit-scrollbar]:hidden">
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

            {/* 1. Hero Banner Slider */}
            <HeroBannerSlider />

            {/* 2. Shop by Category */}
            <CategoryGrid />

            {/* 3. Deal of the Day */}
            <DealOfTheDay />

            {/* 4. Best Sellers */}
            <div className="bg-page-bg border-t border-border-default">
                {bestSellersError ? (
                    <div className="container mx-auto px-4 py-12 text-center">
                        <p className="text-text-muted text-sm">Unable to load best sellers right now. <button onClick={() => window.location.reload()} className="text-primary underline">Retry</button></p>
                    </div>
                ) : (
                    <ProductRow
                        title="Best Sellers"
                        products={bestSellers}
                        viewAllLink="/products?sort=rating"
                        loading={bestSellersLoading}
                        badge="bestseller"
                    />
                )}
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
