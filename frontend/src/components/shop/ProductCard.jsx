import React, { memo, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import PriceDisplay from '../common/PriceDisplay';
import { Heart, ShoppingCart, Star, ArrowLeftRight, Eye, Bell } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { handleImageError } from '../../utils/image';

const ProductCard = ({ product }) => {
    const { addToCart, toggleWishlist, wishlist, addToCompare } = useShop();
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

    return (
        <div className={`glass-panel group relative flex flex-col overflow-hidden h-full ${isOutOfStock ? 'opacity-90' : ''}`}>
            {/* Image Area */}
            <div className="relative aspect-square bg-page-bg flex items-center justify-center p-6 transition-colors group-hover:bg-surface-hover/80">
                <Link
                    to={`/products/${product.id}`}
                    className="block w-full h-full"
                    aria-label={`View ${product.title}`}
                >
                    <img
                        src={product.images?.[0] || product.image}
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
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {product.category}
                    </span>
                    <div className="flex items-center gap-1 text-warning text-xs">
                        <Star size={12} fill="currentColor" />
                        <span>{product.rating}</span>
                    </div>
                </div>

                <Link to={`/products/${product.id}`} className="block flex-grow">
                    <h3 className="font-heading font-bold text-lg leading-tight mb-2 line-clamp-2 hover:text-primary transition-colors">
                        {product.title}
                    </h3>
                    {(isVariableProduct || hasMultipleVariants) && (
                        <span className="inline-block mt-1 text-[10px] font-medium text-text-muted">
                            Multiple options available
                        </span>
                    )}
                    {product.sellerName && (
                        <span className="block mt-1 text-[11px] text-text-muted">
                            Sold by: <span className="text-trust font-medium">{product.sellerName}</span>
                        </span>
                    )}
                </Link>

                <div className="flex items-end justify-between mt-4 gap-4">
                    <div className="flex flex-col">
                        {(isVariableProduct || hasMultipleVariants) && <span className="text-xs text-text-muted">From</span>}
                        <PriceDisplay
                            sellingPrice={displayPrice}
                            originalPrice={displayOriginalPrice}
                            size="sm"
                            showBadge={true}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="rounded-full h-10 w-10 p-0 flex items-center justify-center border border-border-default text-text-muted hover:text-primary hover:border-primary shrink-0 transition-colors"
                            onClick={handleCompare}
                            title="Compare"
                        >
                            <ArrowLeftRight size={16} />
                        </button>
                        <Button
                            size="sm"
                            disabled={isOutOfStock && !isVariableProduct && !hasMultipleVariants}
                            className={`rounded-full h-10 w-10 p-0 flex items-center justify-center shrink-0 ${
                                isOutOfStock && !isVariableProduct && !hasMultipleVariants
                                    ? 'bg-border-default text-text-muted cursor-not-allowed'
                                    : (isOutOfStock && (isVariableProduct || hasMultipleVariants))
                                        ? 'bg-surface-hover hover:bg-trust text-text-primary hover:text-white'
                                        : 'bg-surface-hover hover:bg-buy-primary text-text-primary hover:text-white'
                            }`}
                            onClick={handleAddToCart}
                            title={isOutOfStock ? ((isVariableProduct || hasMultipleVariants) ? "View Options" : "Out of Stock") : (isVariableProduct || hasMultipleVariants) ? "Select Option" : "Add to Cart"}
                        >
                            {(isVariableProduct || hasMultipleVariants) ? <Eye size={18} /> : <ShoppingCart size={18} />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ProductCard);
