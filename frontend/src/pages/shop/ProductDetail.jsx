import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { alertsAPI } from '../../lib/api';
import Button from '../../components/ui/Button';
import { Star, ShoppingCart, Heart, ArrowLeft, CheckCircle, Bell, TrendingDown, ArrowLeftRight } from 'lucide-react';
import ReviewSection from '../../components/shop/ReviewSection';

const ProductDetail = () => {
    const { id } = useParams();
    const { getProduct, addToCart, toggleWishlist, wishlist, addToCompare } = useShop();
    const { user } = useAuth();
    const product = getProduct(id);

    const [selectedVariant, setSelectedVariant] = useState(null);
    const [isStockAlertSet, setIsStockAlertSet] = useState(false);
    const [isPriceAlertSet, setIsPriceAlertSet] = useState(false);
    const [shake, setShake] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (user && product) {
            alertsAPI.getAll().then(alerts => {
                const productAlerts = alerts.filter(a => a.productId === parseInt(id));
                setIsStockAlertSet(productAlerts.some(a => a.type === 'STOCK'));
                setIsPriceAlertSet(productAlerts.some(a => a.type === 'PRICE_DROP'));
            }).catch(err => console.error(err));
        }

        // Removed auto-select so users must actively choose a variant
    }, [user, id, product]);

    const handleToggleAlert = async (type) => {
        if (!user) return alert('Please login to set alerts');
        try {
            const res = await alertsAPI.toggle(id, type);
            if (type === 'STOCK') setIsStockAlertSet(res.subscribed);
            if (type === 'PRICE_DROP') setIsPriceAlertSet(res.subscribed);
            alert(res.message);
        } catch (err) {
            alert('Failed to update alert');
        }
    };

    if (!product) {
        return <div className="container mx-auto py-20 text-center">Product not found</div>;
    }

    const isWishlisted = wishlist.includes(product.id);

    const hasMultipleVariants = product.variants && product.variants.length > 1;
    let totalStock = product.stock;
    if (product.variants && product.variants.length > 0) {
        totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
    }
    const isOutOfStock = hasMultipleVariants ? totalStock === 0 : product.stock === 0;

    const currentStock = selectedVariant ? selectedVariant.stock : (hasMultipleVariants ? totalStock : product.stock);
    const isCurrentlyOutOfStock = currentStock === 0;
    const isCurrentlyLowStock = currentStock > 0 && currentStock <= 5;

    const displayPrice = selectedVariant ? selectedVariant.price : (hasMultipleVariants ? Math.min(...product.variants.map(v => v.price)) : product.price);



    const handleAddToCartClick = () => {
        if (hasMultipleVariants && !selectedVariant) {
            setShake(true);
            setErrorMsg("Please select an option");
            setTimeout(() => setShake(false), 500);
            return;
        }
        setErrorMsg("");
        const variantToAdd = hasMultipleVariants ? selectedVariant : (product.variants?.[0] || null);
        addToCart(product, 1, variantToAdd);
    };

    return (
        <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
            <Link to="/products" className="inline-flex items-center gap-2 text-text-muted hover:text-primary mb-8 transition-colors">
                <ArrowLeft size={18} /> Back to Products
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                {/* Image Section */}
                <div className="bg-gray-50/50 rounded-2xl p-8 flex items-center justify-center border border-gray-100 relative">
                    <img
                        src={product.image}
                        alt={product.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full max-w-md object-contain drop-shadow-2xl"
                    />
                    {isCurrentlyOutOfStock ? (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-md">
                            Out of Stock
                        </div>
                    ) : isCurrentlyLowStock && (
                        <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-md">
                            Only {currentStock} left!
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
                        <span className="text-text-muted">({product.reviews} reviews)</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                            {hasMultipleVariants && !selectedVariant && (
                                <span className="text-lg font-medium text-text-muted">Starting from</span>
                            )}
                            <div className="text-3xl font-bold text-text-main">
                                ₹{displayPrice.toLocaleString()}
                            </div>
                            {selectedVariant && selectedVariant.price < product.price && (
                                <div className="text-xl font-medium text-text-muted line-through ml-2">
                                    ₹{product.price.toLocaleString()}
                                </div>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-2 ${isPriceAlertSet ? 'text-primary bg-primary/10' : 'text-text-muted'}`}
                            onClick={() => handleToggleAlert('PRICE_DROP')}
                        >
                            <TrendingDown size={18} />
                            {isPriceAlertSet ? 'Price Alert Set' : 'Set Price Alert'}
                        </Button>
                    </div>

                    <p className="text-text-muted leading-relaxed text-lg">
                        {product.description}
                    </p>

                    {/* Variants Selector */}
                    {hasMultipleVariants && (
                        <div className={`pt-4 border-t border-gray-100 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Select Option:</h3>
                                {errorMsg && <span className="text-sm font-medium text-red-500">{errorMsg}</span>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {product.variants.map(variant => {
                                    const outOfStock = variant.stock === 0;
                                    const isSelected = selectedVariant?.id === variant.id;
                                    return (
                                        <button
                                            key={variant.id}
                                            onClick={() => {
                                                if (!outOfStock) {
                                                    setSelectedVariant(variant);
                                                    setErrorMsg("");
                                                }
                                            }}
                                            disabled={outOfStock}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${outOfStock ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 line-through' : isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-text-main hover:border-primary hover:bg-gray-50'}`}
                                        >
                                            {variant.name} {isSelected && !outOfStock && <CheckCircle size={14} className="text-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Selected Variant Stock Indicator */}
                            {selectedVariant && (
                                <div className="mt-3">
                                    {selectedVariant.stock > 10 ? null : selectedVariant.stock > 5 ? (
                                        <span className="text-sm font-medium text-yellow-600">Limited stock available</span>
                                    ) : selectedVariant.stock > 0 ? (
                                        <span className="text-sm font-medium text-orange-500">Only {selectedVariant.stock} left!</span>
                                    ) : (
                                        <span className="text-sm font-medium text-red-500">Out of Stock</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-4 pt-4 border-t border-gray-100">
                        {hasMultipleVariants && !selectedVariant ? (
                            <Button size="lg" className="flex-1 gap-2" variant="outline" onClick={handleAddToCartClick}>
                                <ShoppingCart size={20} /> Select an Option
                            </Button>
                        ) : isCurrentlyOutOfStock ? (
                            <Button
                                size="lg"
                                className={`flex-1 gap-2 ${isStockAlertSet ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-900 border-none text-white'}`}
                                onClick={() => handleToggleAlert('STOCK')}
                            >
                                <Bell size={20} /> {isStockAlertSet ? 'You will be notified' : 'Notify Me When Available'}
                            </Button>
                        ) : (
                            <Button size="lg" className="flex-1 gap-2" onClick={handleAddToCartClick}>
                                <ShoppingCart size={20} /> Add to Cart
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => toggleWishlist(product.id)}
                            className={isWishlisted ? "border-primary text-primary" : ""}
                            title="Wishlist"
                        >
                            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => addToCompare(product.id)}
                            title="Compare"
                        >
                            <ArrowLeftRight size={20} />
                        </Button>
                    </div>

                    {/* Specs */}
                    {product.specs && Object.keys(product.specs).length > 0 && (
                        <div className="pt-8 border-t border-gray-200">
                            <h3 className="text-lg font-bold mb-4">Technical Specifications</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(product.specs).map(([key, value]) => (
                                    <div key={key} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <span className="block text-xs text-text-muted uppercase tracking-wider mb-1">{key}</span>
                                        <span className="font-medium">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Benefits */}
                    <div className="pt-6 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-text-muted">
                            <CheckCircle size={16} className="text-success" />
                            <span>Free Priority Shipping</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-muted">
                            <CheckCircle size={16} className="text-success" />
                            <span>2 Year Replacement Warranty</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews Section */}
            {/* Enhanced Reviews Section */}
            <ReviewSection productId={product.id} />
        </div>
    );
};

export default ProductDetail;
