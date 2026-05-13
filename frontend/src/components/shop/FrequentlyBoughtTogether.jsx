import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productsAPI, bundlesAPI } from '../../lib/api';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import PriceDisplay from '../common/PriceDisplay';
import { Plus, ShoppingCart, Check, Zap } from 'lucide-react';
import { getProductImageUrl, handleImageError } from '../../utils/image';
import toast from 'react-hot-toast';

const FrequentlyBoughtTogether = ({ product }) => {
    const { addToCart, initBuyNowMultiple } = useShop();
    const { user } = useAuth();
    const { bundlesEnabled } = useFeatureFlags();
    const navigate = useNavigate();
    const [fbtProducts, setFbtProducts] = useState([]);
    const [checked, setChecked] = useState({});
    const [bundleSavings, setBundleSavings] = useState(null);
    const [matchedBundle, setMatchedBundle] = useState(null);

    useEffect(() => {
        if (!product?.id) return;
        productsAPI.getRelated(product.id)
            .then(items => {
                const top3 = items.filter(p => p.stock > 0).slice(0, 3);
                setFbtProducts(top3);
                const initial = {};
                top3.forEach(p => { initial[p.id] = true; });
                setChecked(initial);
            })
            .catch(() => setFbtProducts([]));
    }, [product?.id]);

    useEffect(() => {
        if (!product?.id) return;
        setBundleSavings(null);
        setMatchedBundle(null);
        if (!bundlesEnabled) return;
        bundlesAPI.getForProduct(product.id)
            .then(bundles => {
                if (bundles.length > 0) {
                    const bundle = bundles[0];
                    setMatchedBundle(bundle);
                    const itemTotal = bundle.items?.reduce((sum, bi) => sum + (bi.product?.price || 0) * bi.quantity, 0) || 0;
                    if (itemTotal > bundle.bundlePrice) {
                        setBundleSavings({ bundlePrice: bundle.bundlePrice, itemTotal, savings: itemTotal - bundle.bundlePrice });
                    }
                }
            })
            .catch(() => { setBundleSavings(null); setMatchedBundle(null); });
    }, [product?.id, bundlesEnabled]);

    if (fbtProducts.length === 0) return null;

    const selectedProducts = fbtProducts.filter(p => checked[p.id]);
    const combinedPrice = (Number(product.price) || 0) + selectedProducts.reduce((s, p) => s + (Number(p.price) || 0), 0);

    const toggleCheck = (id) => {
        setChecked(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleAddAll = () => {
        if (!user) {
            toast.error('Please sign in to add items to your cart');
            return;
        }
        const allItems = [product, ...selectedProducts];
        if (matchedBundle) {
            const bundleInstanceId = `bundle-${matchedBundle.id}-${Date.now()}`;
            const bundleInfo = { bundleId: matchedBundle.id, bundleInstanceId, bundleName: matchedBundle.name, bundlePrice: matchedBundle.bundlePrice };
            allItems.forEach(p => addToCart({ ...p, bundleInfo }, 1));
        } else {
            allItems.forEach(p => addToCart(p, 1));
        }
        toast.success(`Added ${allItems.length} items to cart`);
    };

    const handleBuyAllNow = () => {
        const allItems = [product, ...selectedProducts];
        const bundleInstanceId = matchedBundle ? `bundle-${matchedBundle.id}-${Date.now()}` : null;
        const bundleInfo = matchedBundle ? { bundleId: matchedBundle.id, bundleInstanceId, bundleName: matchedBundle.name, bundlePrice: matchedBundle.bundlePrice } : undefined;
        const entries = allItems.map(p => ({
            product: p, quantity: 1, variant: null,
            ...(bundleInfo ? { bundleInfo } : {}),
        }));
        if (initBuyNowMultiple(entries)) {
            navigate('/checkout', { state: { buyNow: true } });
        }
    };

    return (
        <div className="mt-10 pt-8 border-t border-border-default">
            <h2 className="text-xl font-heading font-bold text-text-primary mb-6">Frequently Bought Together</h2>
            <div className="flex items-stretch gap-2 mb-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4">
                {/* Current product */}
                <div className="snap-start shrink-0 w-[8rem] sm:w-32 bg-surface rounded-xl border-2 border-primary/30 p-2 text-center relative">
                    <img
                        src={getProductImageUrl(product)}
                        alt={product.title}
                        loading="lazy"
                        width={120}
                        height={80}
                        onError={handleImageError}
                        className="w-full h-20 object-contain mb-1"
                    />
                    <p className="text-[11px] font-medium text-text-primary line-clamp-2">{product.title}</p>
                    <p className="text-xs font-bold text-primary mt-1">₹{product.price?.toLocaleString('en-IN')}</p>
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center">
                        <Check size={12} />
                    </div>
                </div>

                {fbtProducts.map(p => (
                    <React.Fragment key={p.id}>
                        <div className="flex items-center shrink-0" aria-hidden="true">
                            <Plus size={20} className="text-text-muted" />
                        </div>
                        <button
                            onClick={() => toggleCheck(p.id)}
                            className={`snap-start shrink-0 w-[8rem] sm:w-32 rounded-xl border-2 p-2 text-center relative transition-all min-h-[10rem] ${
                                checked[p.id]
                                    ? 'bg-surface border-trust/30'
                                    : 'bg-page-bg border-border-default opacity-60'
                            }`}
                        >
                            <img
                                src={getProductImageUrl(p)}
                                alt={p.title}
                                loading="lazy"
                                width={120}
                                height={80}
                                onError={handleImageError}
                                className="w-full h-20 object-contain mb-1"
                            />
                            <p className="text-[11px] font-medium text-text-primary line-clamp-2">{p.title}</p>
                            <p className="text-xs font-bold text-primary mt-1">₹{p.price?.toLocaleString('en-IN')}</p>
                            {checked[p.id] && (
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-trust text-white rounded-full flex items-center justify-center">
                                    <Check size={12} />
                                </div>
                            )}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                <div>
                    <p className="text-sm text-text-muted">Combined Price ({1 + selectedProducts.length} items)</p>
                    <p className="text-xl font-bold text-text-primary">₹{combinedPrice.toLocaleString('en-IN')}</p>
                    {bundleSavings && (
                        <p className="text-sm text-success font-medium">
                            Save ₹{bundleSavings.savings.toLocaleString('en-IN')} with bundle!
                        </p>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleAddAll}
                        disabled={selectedProducts.length === 0}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 min-h-11 bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ShoppingCart size={18} />
                        Add {1 + selectedProducts.length} to Cart
                    </button>
                    <button
                        onClick={handleBuyAllNow}
                        disabled={selectedProducts.length === 0}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 min-h-11 border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Zap size={18} />
                        Buy {1 + selectedProducts.length} Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FrequentlyBoughtTogether;
