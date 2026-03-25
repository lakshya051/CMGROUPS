import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../shop/ProductCard';
import { SkeletonCard } from '../ui';

const ProductRow = ({ title, products = [], viewAllLink, loading = false, gridOnDesktop = false }) => {
    const scrollRef = useRef(null);

    const scroll = (dir) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
    };

    if (!loading && products.length === 0) return null;

    return (
        <section className="py-xl sm:py-2xl">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">
                        {title}
                    </h2>
                    {viewAllLink && (
                        <Link
                            to={viewAllLink}
                            className="text-sm font-semibold text-trust hover:underline flex-shrink-0"
                        >
                            View All →
                        </Link>
                    )}
                </div>

                {loading ? (
                    <div className={gridOnDesktop
                        ? 'grid grid-cols-2 md:grid-cols-4 gap-4'
                        : 'flex gap-4 overflow-hidden'
                    }>
                        {Array.from({ length: gridOnDesktop ? 4 : 5 }).map((_, i) => (
                            <div key={i} className={gridOnDesktop ? '' : 'flex-shrink-0 w-[260px] sm:w-[280px]'}>
                                <SkeletonCard />
                            </div>
                        ))}
                    </div>
                ) : gridOnDesktop ? (
                    <>
                        {/* Desktop: grid layout */}
                        <div className="hidden md:grid md:grid-cols-4 gap-4">
                            {products.slice(0, 8).map(p => (
                                <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                        {/* Mobile: horizontal scroll */}
                        <div className="md:hidden relative group/row">
                            <div
                                ref={scrollRef}
                            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
                        >
                                {products.map(p => (
                                    <div key={p.id} className="flex-shrink-0 w-[260px] sm:w-[280px] snap-start">
                                        <ProductCard product={p} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="relative group/row">
                        <div
                            ref={scrollRef}
                            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
                        >
                            {products.map(p => (
                                <div key={p.id} className="flex-shrink-0 w-[260px] sm:w-[280px] snap-start">
                                    <ProductCard product={p} />
                                </div>
                            ))}
                        </div>

                        {products.length > 4 && (
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
                )}
            </div>
        </section>
    );
};

export default ProductRow;
