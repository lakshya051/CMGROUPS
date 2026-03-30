import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI, bundlesAPI } from '../../lib/api';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import PriceDisplay from '../common/PriceDisplay';
import { Plus, ShoppingCart, Check } from 'lucide-react';
import { handleImageError } from '../../utils/image';
import toast from 'react-hot-toast';

const FrequentlyBoughtTogether = ({ product }) => {
    const { addToCart } = useShop();
    const { user } = useAuth();
    const [fbtProducts, setFbtProducts] = useState([]);
    const [checked, setChecked] = useState({});
    const [bundleSavings, setBundleSavings] = useState(null);

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
        bundlesAPI.getForProduct(product.id)
            .then(bundles => {
                if (bundles.length > 0) {
                    const bundle = bundles[0];
                    const itemTotal = bundle.items?.reduce((sum, bi) => sum + (bi.product?.price || 0) * bi.quantity, 0) || 0;
                    if (itemTotal > bundle.bundlePrice) {
                        setBundleSavings({ bundlePrice: bundle.bundlePrice, itemTotal, savings: itemTotal - bundle.bundlePrice });
                    }
                }
            })
            .catch(() => setBundleSavings(null));
    }, [product?.id]);

    if (fbtProducts.length === 0) return null;

    const selectedProducts = fbtProducts.filter(p => checked[p.id]);
    const combinedPrice = product.price + selectedProducts.reduce((s, p) => s + p.price, 0);

    const toggleCheck = (id) => {
        setChecked(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleAddAll = () => {
        if (!user) {
            toast.error('Please sign in to add items to your cart');
            return;
        }
        addToCart(product, 1);
        selectedProducts.forEach(p => addToCart(p, 1));
        toast.success(`Added ${1 + selectedProducts.length} items to cart`);
    };

    return (
        <div className="mt-10 pt-8 border-t border-border-default">
            <h2 className="text-xl font-heading font-bold text-text-primary mb-6">Frequently Bought Together</h2>
            <div className="flex flex-wrap items-center gap-3 mb-6">
                {/* Current product */}
                <div className="w-28 bg-surface rounded-xl border-2 border-primary/30 p-2 text-center relative">
                    <img
                        src={product.images?.[0]}
                        alt={product.title}
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
                        <Plus size={20} className="text-text-muted flex-shrink-0" />
                        <button
                            onClick={() => toggleCheck(p.id)}
                            className={`w-28 rounded-xl border-2 p-2 text-center relative transition-all ${
                                checked[p.id]
                                    ? 'bg-surface border-trust/30'
                                    : 'bg-page-bg border-border-default opacity-60'
                            }`}
                        >
                            <img
                                src={p.images?.[0]}
                                alt={p.title}
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

            <div className="flex flex-wrap items-center gap-4">
                <div>
                    <p className="text-sm text-text-muted">Combined Price ({1 + selectedProducts.length} items)</p>
                    <p className="text-xl font-bold text-text-primary">₹{combinedPrice.toLocaleString('en-IN')}</p>
                    {bundleSavings && (
                        <p className="text-sm text-success font-medium">
                            Save ₹{bundleSavings.savings.toLocaleString('en-IN')} with bundle!
                        </p>
                    )}
                </div>
                <button
                    onClick={handleAddAll}
                    disabled={selectedProducts.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <ShoppingCart size={18} />
                    Add {1 + selectedProducts.length} items to Cart
                </button>
            </div>
        </div>
    );
};

export default FrequentlyBoughtTogether;
