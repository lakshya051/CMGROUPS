import React, { memo, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import PriceDisplay from '../common/PriceDisplay';
import { Heart, ShoppingCart, Star, ArrowLeftRight, Eye, Bell, Zap } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { getProductImageUrl, handleImageError } from '../../utils/image';

const ProductCard = ({ product }) => {
    const { addToCart, toggleWishlist, wishlist, addToCompare, initBuyNow } = useShop();
    const navigate = useNavigate();
    const isWishlisted = useMemo(
        () => wishlist.includes(product.id),
        [wishlist, product.id]
    );

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const isVariableProduct = product.hasVariants && variants.length > 0;
    const hasMultipleVariants = variants.length > 1;
    const hasSingleVariant = variants.length === 1;

    const { isOutOfStock, isLowStock, displayPrice, displayOriginalPrice, effectiveVariant } = useMemo(() => {
        const totalStock = product.totalStock !== undefined
            ? product.totalStock
            : (isVariableProduct
                ? variants.reduce((acc, v) => acc + v.stock, 0)
                : (hasSingleVariant ? variants[0].stock : product.stock));
        const isOut = totalStock === 0;
        const isLow = totalStock > 0 && totalStock < 5;

        if (product.displayPrice !== undefined) {
            return {
                isOutOfStock: isOut,
                isLowStock: isLow,
                displayPrice: product.displayPrice,
                displayOriginalPrice: product.displayMrp || null,
                effectiveVariant: hasSingleVariant && !isVariableProduct ? variants[0] : null
            };
        }

        let price = product.price;
        let orig = product.originalPrice != null && product.originalPrice > price ? product.originalPrice : null;
        let singleVariant = null;

        if (hasSingleVariant && !isVariableProduct) {
            singleVariant = variants[0];
            price = singleVariant.price;
            orig = (singleVariant.originalPrice != null && singleVariant.originalPrice > price) ? singleVariant.originalPrice : (product.originalPrice != null && product.originalPrice > price ? product.originalPrice : null);
        } else if (variants.length > 0) {
            const sortedByPrice = [...variants].sort((a, b) => a.price - b.price);
            const cheapest = sortedByPrice[0];
            price = cheapest.price;
            orig = (cheapest.originalPrice != null && cheapest.originalPrice > price) ? cheapest.originalPrice : (product.originalPrice != null && product.originalPrice > price ? product.originalPrice : null);
        }

        return { isOutOfStock: isOut, isLowStock: isLow, displayPrice: price, displayOriginalPrice: orig, effectiveVariant: singleVariant };
    }, [variants, product.price, product.originalPrice, product.stock, product.displayPrice, product.displayMrp, isVariableProduct, hasSingleVariant]);

    const handleAddToCart = useCallback((e) => {
        e.preventDefault();
        if (isVariableProduct || hasMultipleVariants) {
            navigate(`/products/${product.id}`);
            return;
        }
        if (isOutOfStock) return;
        addToCart(product, 1, effectiveVariant || undefined);
    }, [addToCart, effectiveVariant, hasMultipleVariants, isVariableProduct, isOutOfStock, navigate, product]);

    const handleWishlistToggle = useCallback((e) => {
        e.preventDefault();
        toggleWishlist(product.id);
    }, [product.id, toggleWishlist]);

    const handleCompare = useCallback((e) => {
        e.preventDefault();
        addToCompare(product.id);
    }, [addToCompare, product.id]);

    const handleBuyNow = useCallback((e) => {
        e.preventDefault();
        if (isVariableProduct || hasMultipleVariants) {
            navigate(`/products/${product.id}`);
            return;
        }
        if (isOutOfStock) return;
        if (initBuyNow(product, 1, effectiveVariant || null)) {
            navigate('/checkout', { state: { buyNow: true } });
        }
    }, [initBuyNow, effectiveVariant, hasMultipleVariants, isVariableProduct, isOutOfStock, navigate, product]);

    return (
        <div className={`glass-panel group relative flex flex-col overflow-hidden h-full ${isOutOfStock ? 'opacity-90' : ''}`}>
            {/* Image Area */}
            <div className="relative aspect-square bg-page-bg flex items-center justify-center p-3 sm:p-6 transition-colors group-hover:bg-surface-hover/80">
                <Link
                    to={`/products/${product.id}`}
                    className="block w-full h-full"
                    aria-label={`View ${product.title}`}
                >
                    <img
                        src={getProductImageUrl(product)}
                        alt={product.title}
                        loading="lazy"
                        decoding="async"
                        width={400}
                        height={400}
                        onError={handleImageError}
                        className="w-full h-full object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
                    />
                </Link>
                {/* Out of stock overlay — pointer-events-none so card stays clickable */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-text-muted/40 pointer-events-none" aria-hidden />
                )}

                {/* Wishlist Button */}
                <button
                    onClick={handleWishlistToggle}
                    className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors z-10 ${isWishlisted ? 'bg-primary/20 text-primary' : 'bg-black/20 text-text-main hover:bg-primary hover:text-text-main'}`}
                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                    <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
                </button>

                {/* Quick Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-10">
                    {isOutOfStock ? (
                        <span className="bg-border-default text-text-muted text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-md">
                            Out of Stock
                        </span>
                    ) : isLowStock ? (
                        <span className="bg-orange-500/80 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-md">
                            Low Stock
                        </span>
                    ) : null}

                    {product.isSecondHand && (
                        <span className="bg-amber-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-md">
                            Pre-Owned ({product.condition})
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-2.5 sm:p-4 flex flex-col flex-grow">
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className="text-[10px] sm:text-xs font-medium text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded border border-primary/20 truncate max-w-[65%]">
                        {product.category}
                    </span>
                    <div className="flex items-center gap-0.5 text-warning text-[10px] sm:text-xs shrink-0">
                        <Star size={10} fill="currentColor" />
                        <span>{product.rating}</span>
                    </div>
                </div>

                <Link to={`/products/${product.id}`} className="block flex-grow">
                    <h3 className="font-heading font-bold text-sm sm:text-lg leading-tight mb-1 sm:mb-2 line-clamp-2 hover:text-primary transition-colors">
                        {product.title}
                    </h3>
                    {(isVariableProduct || hasMultipleVariants) && (
                        <span className="hidden sm:inline-block mt-1 text-[10px] font-medium text-text-muted">
                            Multiple options available
                        </span>
                    )}
                    {product.sellerName && (
                        <span className="hidden sm:block mt-1 text-[11px] text-text-muted">
                            Sold by: <span className="text-trust font-medium">{product.sellerName}</span>
                        </span>
                    )}
                </Link>

                {(product.referrerPoints > 0 || product.refereePoints > 0) && (
                    <div className="hidden sm:flex items-center gap-1 mt-2 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 w-fit">
                        <Star size={10} fill="currentColor" />
                        Earn up to {Math.max(product.referrerPoints || 0, product.refereePoints || 0)} pts
                    </div>
                )}

                {!isOutOfStock && (
                    <div className="hidden sm:flex items-center gap-1.5 mt-2 text-[11px] text-trust font-medium">
                        <Zap size={12} className="text-trust" />
                        <span>24-Hour Delivery</span>
                    </div>
                )}

                <div className="flex items-end justify-between mt-2 sm:mt-4 gap-2 sm:gap-4">
                    <div className="flex flex-col min-w-0">
                        {(isVariableProduct || hasMultipleVariants) && <span className="text-[10px] sm:text-xs text-text-muted">From</span>}
                        <PriceDisplay
                            sellingPrice={displayPrice}
                            originalPrice={displayOriginalPrice}
                            size="sm"
                            showBadge={true}
                        />
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button
                            className="hidden sm:flex rounded-full h-10 w-10 p-0 items-center justify-center border border-border-default text-text-muted hover:text-primary hover:border-primary shrink-0 transition-colors"
                            onClick={handleCompare}
                            aria-label="Compare product"
                        >
                            <ArrowLeftRight size={16} />
                        </button>
                        <Button
                            size="sm"
                            disabled={isOutOfStock && !isVariableProduct && !hasMultipleVariants}
                            className={`rounded-full h-8 w-8 sm:h-10 sm:w-10 p-0 flex items-center justify-center shrink-0 ${
                                isOutOfStock && !isVariableProduct && !hasMultipleVariants
                                    ? 'bg-border-default text-text-muted cursor-not-allowed'
                                    : (isOutOfStock && (isVariableProduct || hasMultipleVariants))
                                        ? 'bg-surface-hover hover:bg-trust text-text-primary hover:text-white'
                                        : 'bg-surface-hover hover:bg-buy-primary text-text-primary hover:text-white'
                            }`}
                            onClick={handleAddToCart}
                            aria-label={isOutOfStock ? ((isVariableProduct || hasMultipleVariants) ? "View Options" : "Out of Stock") : (isVariableProduct || hasMultipleVariants) ? "Select Option" : "Add to Cart"}
                        >
                            {(isVariableProduct || hasMultipleVariants) ? <Eye size={16} /> : <ShoppingCart size={16} />}
                        </Button>
                        <button
                            disabled={isOutOfStock && !isVariableProduct && !hasMultipleVariants}
                            className={`rounded-full h-8 w-8 sm:h-10 sm:w-10 p-0 flex items-center justify-center shrink-0 border-2 transition-colors ${
                                isOutOfStock && !isVariableProduct && !hasMultipleVariants
                                    ? 'border-border-default text-text-muted cursor-not-allowed opacity-50'
                                    : 'border-primary text-primary hover:bg-primary hover:text-white'
                            }`}
                            onClick={handleBuyNow}
                            aria-label={(isVariableProduct || hasMultipleVariants) ? "View Options" : "Buy Now"}
                        >
                            <Zap size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ProductCard);
