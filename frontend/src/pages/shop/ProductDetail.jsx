import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { alertsAPI, productsAPI } from '../../lib/api';
import Button from '../../components/ui/Button';
import PriceDisplay from '../../components/common/PriceDisplay';
import { Star, ShoppingCart, Heart, ArrowLeft, CheckCircle, Bell, TrendingDown, ArrowLeftRight, Award, Zap, Truck, ShieldCheck } from 'lucide-react';
import ReviewSection from '../../components/shop/ReviewSection';
import FrequentlyBoughtTogether from '../../components/shop/FrequentlyBoughtTogether';
import QuantityTierDisplay from '../../components/shop/QuantityTierDisplay';
import BundleCard from '../../components/shop/BundleCard';
import { bundlesAPI } from '../../lib/api';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { getProductImageUrl, handleImageError, resolveImageUrl } from '../../utils/image';
import toast from 'react-hot-toast';

const ProductDetail = () => {
    const { id } = useParams();
    const { addToCart, toggleWishlist, wishlist, addToCompare, initBuyNow } = useShop();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeImageIdx, setActiveImageIdx] = useState(0);

    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState({});
    const [isStockAlertSet, setIsStockAlertSet] = useState(false);
    const [isPriceAlertSet, setIsPriceAlertSet] = useState(false);
    const [shake, setShake] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const { items: recentlyViewed, save: saveToRecentlyViewed } = useRecentlyViewed(id);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [productBundles, setProductBundles] = useState([]);

    useEffect(() => {
        let cancelled = false;
        productsAPI.getById(id)
            .then(data => {
                if (cancelled) return;
                setProduct(data);
                if (data) saveToRecentlyViewed(data);
            })
            .catch(err => { if (!cancelled) console.error(err); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id, saveToRecentlyViewed]);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        productsAPI.getRelated(id)
            .then(data => { if (!cancelled) setRelatedProducts(data); })
            .catch(() => { if (!cancelled) setRelatedProducts([]); });
        bundlesAPI.getForProduct(id)
            .then(data => { if (!cancelled) setProductBundles(data); })
            .catch(() => { if (!cancelled) setProductBundles([]); });
        return () => { cancelled = true; };
    }, [id]);

    useEffect(() => {
        if (!user || !product) return;
        let cancelled = false;
        alertsAPI.getAll().then(alerts => {
            if (cancelled) return;
            const productAlerts = alerts.filter(a => a.productId === parseInt(id));
            setIsStockAlertSet(productAlerts.some(a => a.type === 'STOCK'));
            setIsPriceAlertSet(productAlerts.some(a => a.type === 'PRICE_DROP'));
        }).catch(err => { if (!cancelled) console.error(err); });
        return () => { cancelled = true; };
    }, [user, id, product]);

    useEffect(() => {
        if (!product) return;
        let cancelled = false;
        if (product.hasVariants && product.variantOptions?.length > 0) {
            const initial = {};
            product.variantOptions.forEach(opt => { initial[opt.name] = null; });
            if (!cancelled) {
                setSelectedOptions(initial);
                setSelectedVariant(null);
            }
        }
        return () => { cancelled = true; };
    }, [product]);

    useEffect(() => {
        if (!product?.hasVariants || !product.variants) return;
        let cancelled = false;
        const allSelected = Object.values(selectedOptions).every(v => v !== null);
        if (!allSelected) {
            if (!cancelled) setSelectedVariant(null);
            return () => { cancelled = true; };
        }

        const match = product.variants.find(v => {
            if (!v.combination) return false;
            return Object.entries(selectedOptions).every(
                ([key, val]) => v.combination[key] === val
            );
        });
        if (!cancelled) setSelectedVariant(match || null);

        if (match?.image) {
            const imgIdx = product.images?.indexOf(match.image);
            if (imgIdx >= 0 && !cancelled) setActiveImageIdx(imgIdx);
        }
        return () => { cancelled = true; };
    }, [selectedOptions, product]);

    const handleOptionSelect = (optionName, value) => {
        setSelectedOptions(prev => ({ ...prev, [optionName]: value }));
        setErrorMsg("");
    };

    const isValueAvailable = (optionName, value) => {
        if (!product?.variants) return false;
        const testSelection = { ...selectedOptions, [optionName]: value };
        return product.variants.some(v => {
            if (!v.combination || !v.isActive) return false;
            return Object.entries(testSelection).every(
                ([key, val]) => val === null || v.combination[key] === val
            );
        });
    };

    const isValueInStock = (optionName, value) => {
        if (!product?.variants) return false;
        const testSelection = { ...selectedOptions, [optionName]: value };
        return product.variants.some(v => {
            if (!v.combination || !v.isActive || v.stock <= 0) return false;
            return Object.entries(testSelection).every(
                ([key, val]) => val === null || v.combination[key] === val
            );
        });
    };

    const handleToggleAlert = async (type) => {
        if (!user) { toast.error('Please sign in to set alerts'); return; }
        try {
            const res = await alertsAPI.toggle(id, type);
            if (type === 'STOCK') setIsStockAlertSet(res.subscribed);
            if (type === 'PRICE_DROP') setIsPriceAlertSet(res.subscribed);
            toast.success(res.message || 'Alert updated');
        } catch (err) {
            toast.error('Failed to update alert');
        }
    };

    if (loading) return <div className="container mx-auto py-20 text-center">Loading product...</div>;

    if (!product) {
        return <div className="container mx-auto py-20 text-center">Product not found</div>;
    }

    const isWishlisted = wishlist.includes(product.id);

    const isVariableProduct = product.hasVariants && product.variantOptions?.length > 0;
    const variants = product.variants && product.variants.length > 0 ? product.variants : [];
    const hasMultipleVariants = !isVariableProduct && variants.length > 1;
    const hasSingleVariant = !isVariableProduct && variants.length === 1;
    const totalStock = variants.length > 0
        ? variants.reduce((acc, v) => acc + v.stock, 0)
        : product.stock;
    const isOutOfStock = totalStock === 0;

    const effectiveVariant = isVariableProduct
        ? selectedVariant
        : (selectedVariant || (hasSingleVariant ? variants[0] : null));
    const currentStock = effectiveVariant ? effectiveVariant.stock : (isVariableProduct ? totalStock : product.stock);
    const isCurrentlyOutOfStock = effectiveVariant ? effectiveVariant.stock === 0 : (isVariableProduct ? isOutOfStock : product.stock === 0);
    const isCurrentlyLowStock = !isCurrentlyOutOfStock && currentStock > 0 && currentStock <= 5;

    const displayPrice = effectiveVariant
        ? effectiveVariant.price
        : (isVariableProduct && variants.length > 0
            ? Math.min(...variants.map(v => v.price))
            : (hasMultipleVariants ? Math.min(...variants.map(v => v.price)) : product.price));

    const effectiveOriginal = effectiveVariant
        ? (effectiveVariant.originalPrice != null && effectiveVariant.originalPrice > effectiveVariant.price ? effectiveVariant.originalPrice : null)
        : (() => {
            if ((isVariableProduct || hasMultipleVariants) && variants.length > 0) {
                const cheapest = variants.reduce((min, v) => (v.price < min.price ? v : min), variants[0]);
                return cheapest.originalPrice != null && cheapest.originalPrice > cheapest.price ? cheapest.originalPrice : null;
            }
            return product.originalPrice != null && product.originalPrice > product.price ? product.originalPrice : null;
        })();
    const displayOriginalPrice = effectiveOriginal;
    const discountPct = displayOriginalPrice ? Math.round(((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100) : 0;
    const savingsAmount = displayOriginalPrice ? displayOriginalPrice - displayPrice : 0;

    const allOptionsSelected = isVariableProduct
        ? Object.values(selectedOptions).every(v => v !== null)
        : true;

    const firstUnselectedOption = isVariableProduct
        ? Object.entries(selectedOptions).find(([, v]) => v === null)?.[0]
        : null;

    const handleAddToCartClick = () => {
        if (isVariableProduct) {
            if (!allOptionsSelected) {
                setShake(true);
                setErrorMsg(`Please select ${firstUnselectedOption}`);
                setTimeout(() => setShake(false), 500);
                return;
            }
            if (!selectedVariant) {
                setShake(true);
                setErrorMsg("This combination is not available");
                setTimeout(() => setShake(false), 500);
                return;
            }
            if (selectedVariant.stock <= 0) return;
            setErrorMsg("");
            addToCart(product, 1, selectedVariant);
            return;
        }

        if (hasMultipleVariants && !selectedVariant) {
            setShake(true);
            setErrorMsg("Please select an option above");
            setTimeout(() => setShake(false), 500);
            return;
        }
        if (isCurrentlyOutOfStock) return;
        setErrorMsg("");
        const variantToAdd = hasMultipleVariants ? selectedVariant : (hasSingleVariant ? variants[0] : null);
        addToCart(product, 1, variantToAdd);
    };

    const handleBuyNow = () => {
        if (isVariableProduct) {
            if (!allOptionsSelected) {
                setShake(true);
                setErrorMsg(`Please select ${firstUnselectedOption}`);
                setTimeout(() => setShake(false), 500);
                return;
            }
            if (!selectedVariant) {
                setShake(true);
                setErrorMsg("This combination is not available");
                setTimeout(() => setShake(false), 500);
                return;
            }
            if (selectedVariant.stock <= 0) return;
            setErrorMsg("");
            if (initBuyNow(product, 1, selectedVariant)) {
                navigate('/checkout', { state: { buyNow: true } });
            }
            return;
        }

        if (hasMultipleVariants && !selectedVariant) {
            setShake(true);
            setErrorMsg("Please select an option above");
            setTimeout(() => setShake(false), 500);
            return;
        }
        if (isCurrentlyOutOfStock) return;
        setErrorMsg("");
        const variantToAdd = hasMultipleVariants ? selectedVariant : (hasSingleVariant ? variants[0] : null);
        if (initBuyNow(product, 1, variantToAdd)) {
            navigate('/checkout', { state: { buyNow: true } });
        }
    };

    return (
        <div className="container mx-auto px-4 py-4 sm:py-8 pb-28 lg:pb-8 animate-in fade-in duration-500">
            <Link to="/products" className="inline-flex items-center gap-2 text-text-muted hover:text-primary mb-8 transition-colors">
                <ArrowLeft size={18} /> Back to Products
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                {/* Image Section */}
                <div className="flex flex-col gap-3">
                    <div className="bg-surface rounded-lg p-xl flex items-center justify-center border border-border-default relative shadow-sm">
                        <img
                            src={getProductImageUrl(product, activeImageIdx)}
                            alt={product.title}
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                            width={800}
                            height={800}
                            onError={handleImageError}
                            className="w-full max-w-md object-contain drop-shadow-2xl"
                        />
                        {isCurrentlyOutOfStock ? (
                            <div className="absolute top-4 right-4 bg-error text-white px-3 py-1 rounded text-sm font-bold shadow-md">
                                Out of Stock
                            </div>
                        ) : isCurrentlyLowStock && (
                            <div className="absolute top-4 right-4 bg-warning text-white px-3 py-1 rounded text-sm font-bold shadow-md">
                                Only {currentStock} left!
                            </div>
                        )}
                    </div>
                    {(product.images || []).length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {product.images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImageIdx(idx)}
                                    className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${activeImageIdx === idx ? 'border-primary ring-2 ring-primary/30' : 'border-border-default hover:border-primary/50'}`}
                                >
                                    <img
                                        src={resolveImageUrl(img)}
                                        alt={`${product.title} - ${idx + 1}`}
                                        loading="lazy"
                                        width={64}
                                        height={64}
                                        onError={handleImageError}
                                        className="w-full h-full object-contain"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="space-y-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-primary font-medium">{product.brand}</span>
                            <span className="text-text-muted">•</span>
                            <span className="text-text-muted">{product.category}</span>
                            {product.isSecondHand && (
                                <>
                                    <span className="text-text-muted">•</span>
                                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-amber-200">
                                        Pre-Owned ({product.condition})
                                    </span>
                                </>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-heading font-bold leading-tight">{product.title}</h1>
                        {(selectedVariant?.sku || product.sku) && (
                            <p className="text-sm text-text-muted mt-1 font-mono">
                                SKU: {selectedVariant?.sku || product.sku}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-warning">
                            <Star fill="currentColor" size={20} />
                            <span className="font-bold text-lg">{product.rating}</span>
                        </div>
                        <span className="text-text-muted">({Array.isArray(product.reviews) ? product.reviews.length : (product.reviews || 0)} reviews)</span>
                    </div>

                    {product.sellerName && (
                        <p className="text-sm text-text-secondary">
                            Sold by: <span className="font-semibold text-trust">{product.sellerName}</span>
                        </p>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            {(isVariableProduct || hasMultipleVariants) && !selectedVariant && (
                                <span className="text-base font-medium text-text-muted block">Starting from</span>
                            )}
                            {selectedVariant && (isVariableProduct || hasMultipleVariants) && (
                                <span className="text-sm text-text-secondary block">
                                    Price for {selectedVariant.combination
                                        ? Object.values(selectedVariant.combination).join(' / ')
                                        : selectedVariant.name}
                                </span>
                            )}
                            <PriceDisplay
                                sellingPrice={displayPrice}
                                originalPrice={displayOriginalPrice}
                                size="lg"
                                showBadge={true}
                            />
                            {displayOriginalPrice != null && displayOriginalPrice > displayPrice && discountPct >= 5 && (
                                <p className="text-sm text-success font-medium">
                                    You save ₹{savingsAmount.toLocaleString('en-IN')} ({discountPct}% OFF)
                                </p>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-2 ${isPriceAlertSet ? 'text-trust bg-trust/10' : 'text-text-muted'}`}
                            onClick={() => handleToggleAlert('PRICE_DROP')}
                        >
                            <TrendingDown size={18} />
                            {isPriceAlertSet ? 'Price Alert Set' : 'Set Price Alert'}
                        </Button>
                    </div>

                    {(product.referrerPoints > 0 || product.refereePoints > 0) && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                            <Award size={18} className="text-amber-600 flex-shrink-0" />
                            <div className="text-sm">
                                {product.referrerPoints > 0 && (
                                    <span className="font-semibold text-amber-700">Earn {product.referrerPoints} points</span>
                                )}
                                {product.referrerPoints > 0 && product.refereePoints > 0 && <span className="text-amber-600"> · </span>}
                                {product.refereePoints > 0 && (
                                    <span className="text-amber-600">Referred buyer gets {product.refereePoints} points</span>
                                )}
                            </div>
                        </div>
                    )}

                    <p className="text-text-secondary leading-relaxed text-lg">
                        {product.description}
                    </p>

                    {/* Combination-based Variant Selector */}
                    {isVariableProduct && product.variantOptions?.length > 0 && (
                        <div className={`pt-4 border-t border-border-default space-y-4 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                            {errorMsg && <span className="text-sm font-medium text-error">{errorMsg}</span>}
                            {product.variantOptions.map(option => (
                                <div key={option.id}>
                                    <h3 className="text-sm font-bold text-text-primary mb-2">
                                        {option.name}:
                                        {selectedOptions[option.name] && (
                                            <span className="font-normal text-text-secondary ml-2">{selectedOptions[option.name]}</span>
                                        )}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {option.values.map(optVal => {
                                            const isSelected = selectedOptions[option.name] === optVal.value;
                                            const available = isValueAvailable(option.name, optVal.value);
                                            const inStock = isValueInStock(option.name, optVal.value);

                                            return (
                                                <button
                                                    key={optVal.id}
                                                    type="button"
                                                    disabled={!available}
                                                    onClick={() => handleOptionSelect(option.name, optVal.value)}
                                                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                                                        isSelected
                                                            ? 'border-primary bg-primary text-white'
                                                            : !available
                                                                ? 'border-border-default bg-page-bg text-text-muted opacity-50 cursor-not-allowed line-through'
                                                                : !inStock
                                                                    ? 'border-border-default bg-page-bg text-text-muted'
                                                                    : 'border-border-default text-text-primary hover:border-primary hover:bg-surface-hover'
                                                    }`}
                                                >
                                                    {optVal.value}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {selectedVariant && (
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    {selectedVariant.stock > 10 ? (
                                        <span className="text-success font-medium">In Stock ({selectedVariant.stock} left)</span>
                                    ) : selectedVariant.stock > 0 ? (
                                        <span className="font-medium text-orange-500">Only {selectedVariant.stock} left — order soon!</span>
                                    ) : (
                                        <span className="font-medium text-error flex items-center gap-1.5">
                                            <Bell size={14} /> Out of Stock
                                        </span>
                                    )}
                                    {selectedVariant.sku && (
                                        <span className="text-text-muted font-mono text-xs">SKU: {selectedVariant.sku}</span>
                                    )}
                                </div>
                            )}

                            {allOptionsSelected && !selectedVariant && (
                                <p className="text-sm text-error font-medium">This combination is not available</p>
                            )}
                        </div>
                    )}

                    {/* Old-style flat variants selector (non hasVariants products with 2+ variants) */}
                    {hasMultipleVariants && (
                        <div className={`pt-4 border-t border-border-default ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-text-primary">Choose an option</h3>
                                {errorMsg && <span className="text-sm font-medium text-error">{errorMsg}</span>}
                            </div>
                            <p className="text-xs text-text-muted mb-2">Each option may have a different price and availability.</p>
                            <div className="flex flex-wrap gap-2">
                                {variants.map(variant => {
                                    const outOfStock = variant.stock === 0;
                                    const isSelected = selectedVariant?.id === variant.id;
                                    return (
                                        <button
                                            key={variant.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedVariant(variant);
                                                setErrorMsg("");
                                            }}
                                            className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 min-w-[100px] justify-center ${
                                                isSelected
                                                    ? outOfStock
                                                        ? 'border-error bg-error/10 text-error'
                                                        : 'border-trust bg-trust/10 text-trust'
                                                    : outOfStock
                                                        ? 'opacity-60 bg-page-bg border-border-default text-text-muted cursor-not-allowed'
                                                        : 'border-border-default text-text-primary hover:border-trust hover:bg-surface-hover'
                                            }`}
                                        >
                                            <span className={outOfStock && !isSelected ? 'line-through' : ''}>{variant.name}</span>
                                            {variant.stock > 0 && (
                                                <span className="text-xs text-text-muted font-normal">
                                                    ₹{variant.price.toLocaleString('en-IN')}
                                                </span>
                                            )}
                                            {isSelected && !outOfStock && <CheckCircle size={14} className="text-trust flex-shrink-0" />}
                                            {outOfStock && <span className="text-[10px] font-bold uppercase tracking-wider">Out of stock</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedVariant && (
                                <div className="mt-3 flex items-center gap-2">
                                    {selectedVariant.stock > 10 ? (
                                        <span className="text-sm text-success font-medium">In stock</span>
                                    ) : selectedVariant.stock > 5 ? (
                                        <span className="text-sm font-medium text-yellow-600">Only {selectedVariant.stock} left</span>
                                    ) : selectedVariant.stock > 0 ? (
                                        <span className="text-sm font-medium text-orange-500">Only {selectedVariant.stock} left — order soon!</span>
                                    ) : (
                                        <span className="text-sm font-medium text-error flex items-center gap-1.5">
                                            <Bell size={14} /> Out of stock — notify me when available
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Single variant: show selected option name for clarity */}
                    {hasSingleVariant && (
                        <div className="pt-4 border-t border-border-default">
                            <p className="text-sm text-text-secondary">
                                Option: <span className="font-medium text-text-primary">{variants[0].name}</span>
                                {variants[0].sku && <span className="text-text-muted ml-2">SKU: {variants[0].sku}</span>}
                            </p>
                        </div>
                    )}

                    {/* Desktop action buttons */}
                    <div className="hidden lg:flex gap-4 pt-4 border-t border-border-default">
                        {isVariableProduct && !allOptionsSelected ? (
                            <Button size="lg" className="flex-1 gap-2" variant="outline" onClick={handleAddToCartClick}>
                                <ShoppingCart size={20} /> Select {firstUnselectedOption}
                            </Button>
                        ) : isVariableProduct && allOptionsSelected && !selectedVariant ? (
                            <Button size="lg" className="flex-1 gap-2 bg-border-default text-text-muted cursor-not-allowed border-none" disabled>
                                Unavailable
                            </Button>
                        ) : hasMultipleVariants && !selectedVariant && totalStock > 0 ? (
                            <Button size="lg" className="flex-1 gap-2" variant="outline" onClick={handleAddToCartClick}>
                                <ShoppingCart size={20} /> Select an option above
                            </Button>
                        ) : isCurrentlyOutOfStock ? (
                            <>
                                <Button
                                    size="lg"
                                    className="flex-1 gap-2 bg-border-default text-text-muted cursor-not-allowed border-none"
                                    disabled
                                >
                                    Out of Stock
                                </Button>
                                <Button
                                    size="lg"
                                    className={`gap-2 ${isStockAlertSet ? 'bg-success hover:bg-green-700' : 'bg-text-primary hover:bg-text-primary/90 border-none text-surface'}`}
                                    onClick={() => handleToggleAlert('STOCK')}
                                >
                                    <Bell size={20} /> {isStockAlertSet ? 'You will be notified' : 'Notify Me When Available'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button size="lg" className="flex-1 gap-2" onClick={handleAddToCartClick}>
                                    <ShoppingCart size={20} /> Add to Cart
                                </Button>
                                <Button
                                    size="lg"
                                    className="flex-1 gap-2 border-primary text-primary hover:bg-primary hover:text-white"
                                    variant="outline"
                                    onClick={handleBuyNow}
                                >
                                    <Zap size={20} /> Buy Now
                                </Button>
                            </>
                        )}

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => toggleWishlist(product.id)}
                            className={isWishlisted ? "border-trust text-trust" : ""}
                            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        >
                            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => addToCompare(product.id)}
                            aria-label="Compare"
                        >
                            <ArrowLeftRight size={20} />
                        </Button>
                    </div>

                    {/* Mobile action row (wishlist + compare only) */}
                    <div className="flex lg:hidden gap-3 pt-4 border-t border-border-default">
                        <button
                            onClick={() => toggleWishlist(product.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${isWishlisted ? 'border-trust text-trust bg-trust/5' : 'border-border-default text-text-secondary'}`}
                        >
                            <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
                            {isWishlisted ? 'Wishlisted' : 'Wishlist'}
                        </button>
                        <button
                            onClick={() => addToCompare(product.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border-default text-sm font-medium text-text-secondary transition-colors"
                        >
                            <ArrowLeftRight size={18} />
                            Compare
                        </button>
                    </div>

                    {/* Specs */}
                    {product.specs && Object.keys(product.specs).length > 0 && (
                        <div className="pt-8 border-t border-border-default">
                            <h3 className="text-lg font-bold mb-4 text-text-primary">Technical Specifications</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(product.specs).map(([key, value]) => (
                                    <div key={key} className="bg-page-bg p-sm rounded-lg border border-border-default">
                                        <span className="block text-xs text-text-muted uppercase tracking-wider mb-1">{key}</span>
                                        <span className="font-medium text-text-primary">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity Tiers */}
                    {product.quantityTiers && product.quantityTiers.length > 0 && (
                        <QuantityTierDisplay tiers={product.quantityTiers} currentQty={1} basePrice={product.price} />
                    )}

                    {/* Available in Bundle */}
                    {productBundles.length > 0 && (
                        <div className="pt-4 border-t border-border-default">
                            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                                <span className="w-5 h-5 bg-trust/10 rounded flex items-center justify-center"><span className="text-trust text-xs font-bold">B</span></span>
                                Available in Bundle
                            </h3>
                            <div className="space-y-2">
                                {productBundles.slice(0, 3).map(b => (
                                    <BundleCard key={b.id} bundle={b} compact />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Benefits */}
                    <div className="pt-6 space-y-3">
                        <div className="flex items-center gap-3 bg-trust/5 border border-trust/20 rounded-xl px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-trust/10 flex items-center justify-center flex-shrink-0">
                                <Zap size={18} className="text-trust" />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-trust">24-Hour Express Delivery</span>
                                <p className="text-xs text-text-muted">Order now, get it by tomorrow</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-muted">
                            <Truck size={16} className="text-success" />
                            <span>Free Shipping on orders above ₹499</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-muted">
                            <ShieldCheck size={16} className="text-success" />
                            <span>2 Year Replacement Warranty</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Frequently Bought Together */}
            <FrequentlyBoughtTogether product={product} />

            {/* Customers Also Bought */}
            {relatedProducts.length > 0 && (
                <div className="mt-12 pt-8 border-t border-border-default">
                    <h2 className="text-xl font-heading font-bold text-text-primary mb-6">Customers Also Bought</h2>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                        {relatedProducts.map(rp => (
                            <Link
                                key={rp.id}
                                to={`/products/${rp.id}`}
                                className="flex-shrink-0 w-44 bg-surface rounded-xl border border-border-default p-3 hover:shadow-card-hover hover:border-trust/40 transition-all group"
                            >
                                <img
                                    src={getProductImageUrl(rp)}
                                    alt={rp.title}
                                    loading="lazy"
                                    onError={handleImageError}
                                    className="w-full h-32 object-contain mb-2"
                                />
                                <h3 className="text-sm font-semibold text-text-primary line-clamp-2 group-hover:text-trust transition-colors">{rp.title}</h3>
                                <p className="text-sm font-bold text-primary mt-1">₹{rp.price?.toLocaleString('en-IN')}</p>
                                {rp.rating > 0 && (
                                    <div className="flex items-center gap-1 mt-1 text-warning">
                                        <Star fill="currentColor" size={12} />
                                        <span className="text-xs font-medium">{rp.rating}</span>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Reviews Section */}
            <ReviewSection productId={product.id} />

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
                <div className="mt-12 pt-8 border-t border-border-default">
                    <h2 className="text-xl font-heading font-bold text-text-primary mb-6">Recently Viewed</h2>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                        {recentlyViewed.map(rv => (
                            <Link
                                key={rv.id}
                                to={`/products/${rv.id}`}
                                className="flex-shrink-0 w-44 bg-surface rounded-xl border border-border-default p-3 hover:shadow-card-hover hover:border-trust/40 transition-all group"
                            >
                                <img
                                    src={getProductImageUrl(rv)}
                                    alt={rv.title}
                                    loading="lazy"
                                    onError={handleImageError}
                                    className="w-full h-32 object-contain mb-2"
                                />
                                <h3 className="text-sm font-semibold text-text-primary line-clamp-2 group-hover:text-trust transition-colors">{rv.title}</h3>
                                <p className="text-sm font-bold text-primary mt-1">₹{rv.price?.toLocaleString('en-IN')}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Mobile sticky buy bar */}
            <div className="lg:hidden fixed left-0 right-0 z-[45] border-t border-border-default bg-surface/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-4 py-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
                <div className="flex items-center gap-3 max-w-7xl mx-auto">
                    <div className="flex-1 min-w-0">
                        <PriceDisplay sellingPrice={displayPrice} originalPrice={displayOriginalPrice} size="md" showBadge={false} />
                    </div>
                    {isVariableProduct && !allOptionsSelected ? (
                        <button onClick={handleAddToCartClick} className="flex-1 min-w-0 font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 bg-trust text-white transition-colors touch-manipulation active:scale-[0.98]">
                            Select Option
                        </button>
                    ) : isVariableProduct && allOptionsSelected && !selectedVariant ? (
                        <button disabled className="flex-1 min-w-0 font-bold py-3.5 px-4 rounded-xl text-sm bg-border-default text-text-muted cursor-not-allowed">
                            Unavailable
                        </button>
                    ) : isCurrentlyOutOfStock ? (
                        <button onClick={() => handleToggleAlert('STOCK')} className={`flex-1 min-w-0 font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors touch-manipulation ${isStockAlertSet ? 'bg-success text-white' : 'bg-text-primary text-surface'}`}>
                            <Bell size={16} /> {isStockAlertSet ? 'Alert Set' : 'Notify Me'}
                        </button>
                    ) : (
                        <>
                            <button onClick={handleAddToCartClick} className="flex-1 min-w-0 font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 bg-buy-primary hover:bg-buy-primary-hover text-text-primary transition-colors touch-manipulation active:scale-[0.98]">
                                <ShoppingCart size={16} /> Add to Cart
                            </button>
                            <button onClick={handleBuyNow} className="flex-1 min-w-0 font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 border-2 border-primary text-primary transition-colors touch-manipulation active:scale-[0.98]">
                                <Zap size={16} /> Buy Now
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
