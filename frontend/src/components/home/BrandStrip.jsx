import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI } from '../../lib/api';

const BrandStrip = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        productsAPI.getAll({ limit: 100 })
            .then(res => {
                const data = res.data || [];
                // Aggregate brands + count
                const map = {};
                data.forEach(p => {
                    if (p.brand) {
                        map[p.brand] = (map[p.brand] || 0) + 1;
                    }
                });
                // Sort by count descending, take top 8
                const sorted = Object.entries(map)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([name, count]) => ({ name, count }));
                setBrands(sorted);
            })
            .catch(err => console.error('Failed to fetch brands:', err))
            .finally(() => setLoading(false));
    }, []);

    if (!loading && brands.length === 0) return null;

    return (
        <section className="py-xl sm:py-2xl bg-page-bg">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-text-primary">
                        Shop by Brand
                    </h2>
                </div>

                {loading ? (
                    <div className="flex gap-3 overflow-hidden">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-[140px] h-[70px] bg-surface rounded-lg animate-pulse border border-border-default" />
                        ))}
                    </div>
                ) : (
                    <div
                        className="flex gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-2 sm:pb-0"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {brands.map(b => (
                            <Link
                                key={b.name}
                                to={`/products?search=${encodeURIComponent(b.name)}`}
                                className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-3.5 sm:px-6 sm:py-4 bg-surface border border-border-default rounded-lg hover:bg-surface-hover hover:border-trust/40 hover:shadow-sm transition-all duration-smooth group"
                            >
                                <span className="font-bold text-sm sm:text-base text-text-primary group-hover:text-trust transition-colors whitespace-nowrap">
                                    {b.name}
                                </span>
                                <span className="text-xs text-text-secondary bg-page-bg px-2 py-0.5 rounded-full border border-border-default">
                                    {b.count}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default BrandStrip;
