import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI } from '../../lib/api';
import { useShop } from '../../context/ShopContext';
import { ShoppingCart, Clock, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import PriceDisplay from '../common/PriceDisplay';
import { handleImageError } from '../../utils/image';

const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

    useEffect(() => {
        const calc = () => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const diff = midnight - now;
            if (diff <= 0) return { h: 0, m: 0, s: 0 };
            return {
                h: Math.floor(diff / 3600000),
                m: Math.floor((diff % 3600000) / 60000),
                s: Math.floor((diff % 60000) / 1000),
            };
        };
        setTimeLeft(calc());
        const id = setInterval(() => setTimeLeft(calc()), 1000);
        return () => clearInterval(id);
    }, []);

    const pad = (n) => String(n).padStart(2, '0');

    return (
        <div className="flex items-center gap-1 sm:gap-2">
            <Clock size={18} className="text-deal hidden sm:block" />
            {[
                { val: timeLeft.h, label: 'Hrs' },
                { val: timeLeft.m, label: 'Min' },
                { val: timeLeft.s, label: 'Sec' },
            ].map((unit, i) => (
                <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-deal font-bold text-lg">:</span>}
                    <span className="bg-deal text-white font-bold text-sm sm:text-base px-2 py-1 rounded min-w-[2rem] text-center">
                        {pad(unit.val)}
                    </span>
                </span>
            ))}
        </div>
    );
};

const DealCard = ({ product }) => {
    const { addToCart } = useShop();
    const variants = product.variants || [];
    const isVariableProduct = product.hasVariants && variants.length > 0;
    const hasMultipleVariants = !isVariableProduct && variants.length > 1;
    const singleVariant = !isVariableProduct && variants.length === 1 ? variants[0] : null;
    const { displayPrice, displayOriginalPrice, discountPct } = React.useMemo(() => {
        let price, orig;
        if (product.displayPrice !== undefined) {
            price = product.displayPrice;
            orig = product.displayMrp || null;
        } else if (singleVariant) {
            price = singleVariant.price;
            orig = product.originalPrice != null && product.originalPrice > singleVariant.price ? product.originalPrice : (singleVariant.originalPrice ?? null);
        } else if (variants.length > 1) {
            const sorted = [...variants].sort((a, b) => a.price - b.price);
            price = sorted[0].price;
            orig = product.originalPrice != null && product.originalPrice > price ? product.originalPrice : null;
        } else {
            price = product.price;
            orig = product.originalPrice;
        }
        const pct = orig != null && orig > price
            ? Math.round(((orig - price) / orig) * 100)
            : 0;
        return { displayPrice: price, displayOriginalPrice: orig, discountPct: pct };
    }, [singleVariant, product.price, product.originalPrice, product.displayPrice, product.displayMrp, variants]);

    const handleAdd = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isVariableProduct || hasMultipleVariants) return;
        addToCart(product, 1, singleVariant || undefined);
    };

    return (
        <Link
            to={`/products/${product.id}`}
            className="flex-shrink-0 w-[180px] sm:w-[210px] bg-surface rounded-xl overflow-hidden border border-border-default hover:shadow-card-hover transition-all duration-smooth group snap-start"
        >
            <div className="relative aspect-square bg-page-bg border-b border-border-default p-4 flex items-center justify-center">
                {discountPct >= 5 && (
                    <div className="absolute top-2 left-2 bg-deal text-white text-xs font-bold px-2 py-1 rounded z-10">
                        {discountPct}% OFF
                    </div>
                )}
                <img
                    src={product.images?.[0] || product.image}
                    alt={product.title}
                    loading="lazy"
                    width={320}
                    height={320}
                    onError={handleImageError}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
            </div>
            <div className="p-3 space-y-2">
                <h3 className="text-sm font-semibold text-text-primary line-clamp-2 leading-tight">
                    {product.title}
                </h3>
                {(isVariableProduct || hasMultipleVariants) && <span className="text-xs text-text-muted">From </span>}
                <PriceDisplay sellingPrice={displayPrice} originalPrice={displayOriginalPrice} size="sm" showBadge={true} />
                <button
                    onClick={handleAdd}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold text-xs rounded-lg transition-colors"
                >
                    <ShoppingCart size={14} />
                    {(isVariableProduct || hasMultipleVariants) ? 'View options' : 'Add to Cart'}
                </button>
            </div>
        </Link>
    );
};

const DealOfTheDay = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = React.useRef(null);

    useEffect(() => {
        productsAPI.getAll({ sort: 'price_asc', limit: 12 })
            .then(res => {
                const all = res.data || [];
                const withDiscount = all.filter(p => {
                    const orig = p.displayMrp || p.originalPrice;
                    const price = p.displayPrice || p.price;
                    return orig != null && orig > price;
                });
                const sorted = withDiscount.sort((a, b) => {
                    const discA = ((a.displayMrp || a.originalPrice) - (a.displayPrice || a.price)) / (a.displayMrp || a.originalPrice);
                    const discB = ((b.displayMrp || b.originalPrice) - (b.displayPrice || b.price)) / (b.displayMrp || b.originalPrice);
                    return discB - discA;
                });
                setProducts(sorted.length > 0 ? sorted.slice(0, 8) : all.slice(0, 6));
            })
            .catch(err => console.error('Failed to fetch deals:', err))
            .finally(() => setLoading(false));
    }, []);

    const scroll = (dir) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir * 230, behavior: 'smooth' });
    };

    if (!loading && products.length === 0) return null;

    return (
        <section className="py-xl sm:py-2xl bg-surface border-y border-border-default">
            <div className="container mx-auto px-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <Flame size={24} className="text-deal" />
                            <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">
                                Deal of the Day
                            </h2>
                        </div>
                        <CountdownTimer />
                    </div>
                    <Link
                        to="/products?sort=price_asc"
                        className="text-sm font-semibold text-deal hover:underline flex-shrink-0"
                    >
                        View All Deals →
                    </Link>
                </div>

                {loading ? (
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-[210px] h-[310px] bg-page-bg border border-border-default rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="relative group/row">
                        <div
                            ref={scrollRef}
                            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
                        >
                            {products.map(p => (
                                <DealCard key={p.id} product={p} />
                            ))}
                        </div>
                        <button
                            onClick={() => scroll(-1)}
                            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface hover:bg-surface-hover border border-border-default shadow-sm rounded-full items-center justify-center text-text-primary opacity-0 group-hover/row:opacity-100 transition-all duration-fast"
                            aria-label="Scroll left"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => scroll(1)}
                            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface hover:bg-surface-hover border border-border-default shadow-sm rounded-full items-center justify-center text-text-primary opacity-0 group-hover/row:opacity-100 transition-all duration-fast"
                            aria-label="Scroll right"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default DealOfTheDay;
