import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI } from '../../lib/api';

const BrandStrip = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        productsAPI.getAll({ limit: 100 })
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
    }, []);

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
                    <div className="overflow-hidden relative group">
                        <div
                            className="flex gap-4 w-max group-hover:[animation-play-state:paused]"
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
                )}
            </div>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </section>
    );
};

export default BrandStrip;
