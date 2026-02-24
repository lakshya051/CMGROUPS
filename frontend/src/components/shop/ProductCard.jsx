import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { Heart, ShoppingCart, Star, ArrowLeftRight, Eye } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

const ProductCard = ({ product }) => {
    const { addToCart, toggleWishlist, wishlist, addToCompare } = useShop();
    const navigate = useNavigate();
    const isWishlisted = wishlist.includes(product.id);

    // Variant logic
    const hasMultipleVariants = product.variants && product.variants.length > 1;

    // Calculate stock: if multiple variants, it's out of stock ONLY if ALL variants have 0 stock.
    // Low stock: if total stock across all variants is > 0 but < 5.
    let totalStock = product.stock;
    if (product.variants && product.variants.length > 0) {
        totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
    }
    const isOutOfStock = totalStock === 0;
    const isLowStock = totalStock > 0 && totalStock < 5;

    // Calculate price display
    let displayPrice = product.price;
    if (hasMultipleVariants) {
        displayPrice = Math.min(...product.variants.map(v => v.price));
    }

    const handleAddToCart = (e) => {
        e.preventDefault();
        if (hasMultipleVariants) {
            navigate(`/products/${product.id}`);
        } else {
            addToCart(product); // Pass full product object
        }
    };

    return (
        <div className="glass-panel group relative flex flex-col overflow-hidden h-full">
            {/* Image Area */}
            <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-6 transition-colors group-hover:bg-gray-100/80">
                <img
                    src={product.image}
                    alt={product.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
                />

                {/* Wishlist Button */}
                <button
                    onClick={() => toggleWishlist(product.id)}
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
                        <span className="inline-block mt-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
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
                            className="rounded-full h-10 w-10 p-0 flex items-center justify-center border border-gray-200 text-text-muted hover:text-primary hover:border-primary shrink-0 transition-colors"
                            onClick={(e) => { e.preventDefault(); addToCompare(product.id); }}
                            title="Compare"
                        >
                            <ArrowLeftRight size={16} />
                        </button>
                        <Button
                            size="sm"
                            disabled={isOutOfStock}
                            className={`rounded-full h-10 w-10 p-0 flex items-center justify-center shrink-0 ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-primary'}`}
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

export default ProductCard;
