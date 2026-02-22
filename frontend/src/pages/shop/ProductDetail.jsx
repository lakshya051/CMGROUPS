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

    const [isStockAlertSet, setIsStockAlertSet] = useState(false);
    const [isPriceAlertSet, setIsPriceAlertSet] = useState(false);

    useEffect(() => {
        if (user && product) {
            alertsAPI.getAll().then(alerts => {
                const productAlerts = alerts.filter(a => a.productId === parseInt(id));
                setIsStockAlertSet(productAlerts.some(a => a.type === 'STOCK'));
                setIsPriceAlertSet(productAlerts.some(a => a.type === 'PRICE_DROP'));
            }).catch(err => console.error(err));
        }
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
                    {product.stock === 0 ? (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                            Out of Stock
                        </div>
                    ) : product.stock < 5 && (
                        <div className="absolute top-4 right-4 bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-sm font-medium border border-red-500/20">
                            Only {product.stock} left in stock!
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
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-warning">
                            <Star fill="currentColor" size={20} />
                            <span className="font-bold text-lg">{product.rating}</span>
                        </div>
                        <span className="text-text-muted">({product.reviews} reviews)</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-text-main">
                            ₹{product.price.toLocaleString()}
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

                    <div className="flex gap-4 pt-4">
                        {product.stock > 0 ? (
                            <Button size="lg" className="flex-1 gap-2" onClick={() => addToCart(product.id)}>
                                <ShoppingCart size={20} /> Add to Cart
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className={`flex-1 gap-2 ${isStockAlertSet ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-900'}`}
                                onClick={() => handleToggleAlert('STOCK')}
                            >
                                <Bell size={20} />
                                {isStockAlertSet ? 'You will be notified' : 'Notify Me When Available'}
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
