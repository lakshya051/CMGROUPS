import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bundlesAPI } from '../../lib/api';
import BundleCard from '../shop/BundleCard';

const BundleRow = ({ title = 'Hot Combos — Save More Together', displayOn, initialBundles }) => {
    const hasInitial = Array.isArray(initialBundles);
    const [bundles, setBundles] = useState(() => hasInitial ? initialBundles : []);
    const [loading, setLoading] = useState(!hasInitial);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (hasInitial) return;
        const params = {};
        if (displayOn) params.displayOn = displayOn;
        bundlesAPI.getAll(params)
            .then(setBundles)
            .catch(() => setBundles([]))
            .finally(() => setLoading(false));
    }, [displayOn, hasInitial]);

    const scroll = (dir) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
    };

    if (!loading && bundles.length === 0) return null;

    if (loading) {
        return (
            <section className="py-xl sm:py-2xl">
                <div className="container mx-auto px-4">
                    <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary mb-6 sm:mb-8">{title}</h2>
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-[280px] h-[320px] bg-surface rounded-xl border border-border-default animate-pulse" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-xl sm:py-2xl">
            <div className="container mx-auto px-4">
                <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary mb-6 sm:mb-8">{title}</h2>
                <div className="relative group/row">
                    <div
                        ref={scrollRef}
                        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
                    >
                        {bundles.map(bundle => (
                            <div key={bundle.id} className="snap-start">
                                <BundleCard bundle={bundle} />
                            </div>
                        ))}
                    </div>

                    {bundles.length > 3 && (
                        <>
                            <button
                                onClick={() => scroll(-1)}
                                className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface hover:bg-surface-hover shadow-sm border border-border-default rounded-full items-center justify-center text-text-primary opacity-0 group-hover/row:opacity-100 transition-opacity z-10"
                                aria-label="Scroll left"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => scroll(1)}
                                className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface hover:bg-surface-hover shadow-sm border border-border-default rounded-full items-center justify-center text-text-primary opacity-0 group-hover/row:opacity-100 transition-opacity z-10"
                                aria-label="Scroll right"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};

export default BundleRow;
