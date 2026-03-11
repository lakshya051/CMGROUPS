import React, { memo, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { Heart, ShoppingCart, Star, ArrowLeftRight, Eye } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { handleImageError } from '../../utils/image';

const ProductCard = ({ product }) => {
    const { addToCart, toggleWishlist, wishlist, addToCompare } = useShop();
    const navigate = useNavigate();
    const isWishlisted = useMemo(
        () => wishlist.includes(product.id),
        [wishlist, product.id]
    );

    // Variant logic
    const hasMultipleVariants = Array.isArray(product.variants) && product.variants.length > 1;

    const { isOutOfStock, isLowStock, displayPrice } = useMemo(() => {
        // If variants exist, stock/price badges should reflect variant data.
        const variants = Array.isArray(product.variants) ? product.variants : [];
        const totalStock = variants.length > 0
            ? variants.reduce((acc, v) => acc + v.stock, 0)
            : product.stock;
        const isOut = totalStock === 0;
        const isLow = totalStock > 0 && totalStock < 5;
        const price = hasMultipleVariants
            ? Math.min(...variants.map(v => v.price))
            : product.price;

        return { isOutOfStock: isOut, isLowStock: isLow, displayPrice: price };
    }, [hasMultipleVariants, product.price, product.stock, product.variants]);

    const handleAddToCart = useCallback((e) => {
        e.preventDefault();
        if (hasMultipleVariants) {
            navigate(`/products/${product.id}`);
        } else {
            addToCart(product); // Pass full product object
        }
    }, [addToCart, hasMultipleVariants, navigate, product]);

    const handleWishlistToggle = useCallback((e) => {
        e.preventDefault();
        toggleWishlist(product.id);
    }, [product.id, toggleWishlist]);

    const handleCompare = useCallback((e) => {
        e.preventDefault();
        addToCompare(product.id);
    }, [addToCompare, product.id]);

    return (
        <div className="glass-panel group relative flex flex-col overflow-hidden h-full">
            {/* Image Area */}
            <div className="relative aspect-square bg-page-bg flex items-center justify-center p-6 transition-colors group-hover:bg-surface-hover/80">
                <Link
                    to={`/products/${product.id}`}
                    className="block w-full h-full"
                    aria-label={`View ${product.title}`}
                >
                    <img
                        src={product.image}
                        alt={product.title}
                        loading="lazy"
                        decoding="async"
                        width={400}
                        height={400}
                        onError={handleImageError}
                        className="w-full h-full object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
                    />
                </Link>

                {/* Wishlist Button */}
                <button
                    onClick={handleWishlistToggle}
                    className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors ${isWishlisted ? 'bg-primary/20 text-primary' : 'bg-black/20 text-text-main hover:bg-primary hover:text-text-main'}`}
                >
                    <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
                </button>

                {/* Quick Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                    {isOutOfStock ? (
                        <span className="bg-red-500/80 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-md">
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
                    {hasMultipleVariants && (
                        <span className="inline-block mt-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                            {product.variants.length} options available
                        </span>
                    )}
                </Link>

                <div className="flex items-end justify-between mt-4 gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-text-muted">Price</span>
                        <span className="flex items-baseline gap-1 text-xl font-bold text-text-main">
                            {hasMultipleVariants && <span className="text-sm font-normal text-text-muted">From</span>}
                            ₹{displayPrice.toLocaleString()}
                        </span>
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
                            disabled={isOutOfStock}
                            className={`rounded-full h-10 w-10 p-0 flex items-center justify-center shrink-0 ${isOutOfStock ? 'bg-border-default text-text-muted cursor-not-allowed' : 'bg-surface-hover hover:bg-buy-primary text-text-primary hover:text-white'}`}
                            onClick={handleAddToCart}
                            title={isOutOfStock ? "Out of Stock" : hasMultipleVariants ? "Select Option" : "Add to Cart"}
                        >
                            {hasMultipleVariants ? <Eye size={18} /> : <ShoppingCart size={18} />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ProductCard);
