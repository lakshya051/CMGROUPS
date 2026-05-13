import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI } from '../../lib/api';

const BrandStrip = ({ initialBrands }) => {
    // When the home bootstrap supplies a pre-aggregated `[{name, count}]`
    // array, use it. Otherwise, fall back to the legacy approach (used when
    // this component is mounted outside the homepage).
    const hasInitial = Array.isArray(initialBrands);
    const [brands, setBrands] = useState(() => hasInitial ? initialBrands : []);
    const [loading, setLoading] = useState(!hasInitial);

    useEffect(() => {
        if (hasInitial) return;
        // Legacy fallback path: derive top brands from the first page of
        // products. Capped at 24 (down from 100) — the marquee never shows
        // more than 10, and 24 is plenty of variety to derive that from
        // without pulling a bandwidth-heavy product page.
        productsAPI.getAll({ limit: 24 })
            .then(res => {
                const data = res.data || [];
                const map = {};
                data.forEach(p => {
                    if (p.brand) {
                        map[p.brand] = (map[p.brand] || 0) + 1;
                    }
                });
                const sorted = Object.entries(map)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([name, count]) => ({ name, count }));
                setBrands(sorted);
            })
            .catch(err => console.error('Failed to fetch brands:', err))
            .finally(() => setLoading(false));
    }, [hasInitial]);

    if (!loading && brands.length === 0) return null;

    const marqueeItems = [...brands, ...brands];

    return (
        <section className="py-xl sm:py-2xl bg-page-bg">
            <div className="container mx-auto px-4">
                <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary mb-6 sm:mb-8">
                    Brands We Carry
                </h2>

                {loading ? (
                    <div className="flex gap-3 overflow-hidden">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-[140px] h-[60px] bg-surface rounded-lg animate-pulse border border-border-default" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Mobile: static grid — tappable logos */}
                        <div className="md:hidden grid grid-cols-2 gap-3">
                            {brands.map((b) => (
                                <Link
                                    key={b.name}
                                    to={`/products?search=${encodeURIComponent(b.name)}`}
                                    className="min-h-11 flex items-center justify-center gap-2 px-3 py-3 bg-surface border border-border-default rounded-lg hover:bg-surface-hover hover:border-trust/40 transition-all duration-smooth"
                                >
                                    <span className="font-bold text-sm text-text-primary truncate">
                                        {b.name}
                                    </span>
                                    <span className="text-xs text-text-secondary bg-page-bg px-2 py-0.5 rounded-full border border-border-default shrink-0">
                                        {b.count}
                                    </span>
                                </Link>
                            ))}
                        </div>

                        {/* Desktop: marquee */}
                        <div className="hidden md:block overflow-hidden relative group motion-reduce:overflow-x-auto">
                            <div
                                className="flex gap-4 w-max group-hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:w-auto"
                                style={{
                                    animation: `marquee ${brands.length * 3}s linear infinite`,
                                }}
                            >
                                {marqueeItems.map((b, idx) => (
                                    <Link
                                        key={`${b.name}-${idx}`}
                                        to={`/products?search=${encodeURIComponent(b.name)}`}
                                        className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-4 bg-surface border border-border-default rounded-lg hover:bg-surface-hover hover:border-trust/40 hover:shadow-sm transition-all duration-smooth"
                                    >
                                        <span className="font-bold text-sm text-text-primary hover:text-trust transition-colors whitespace-nowrap">
                                            {b.name}
                                        </span>
                                        <span className="text-xs text-text-secondary bg-page-bg px-2 py-0.5 rounded-full border border-border-default">
                                            {b.count}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .animate-none, [style*="marquee"] { animation: none !important; }
                }
            `}</style>
        </section>
    );
};

export default BrandStrip;
