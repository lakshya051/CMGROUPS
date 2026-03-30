import React from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, Layers, Wrench, Percent } from 'lucide-react';
import { handleImageError } from '../../utils/image';
import toast from 'react-hot-toast';

const BundleCard = ({ bundle, compact = false }) => {
    const { addToCart } = useShop();
    const { user } = useAuth();

    const hasService = bundle.items?.some(bi => bi.itemType === 'service');
    const productItems = bundle.items?.filter(bi => bi.itemType === 'product' && bi.product) || [];
    const itemCount = bundle.items?.length || 0;

    const handleAddBundle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error('Please sign in to add items to your cart');
            return;
        }

        const bundleInstanceId = `bundle-${bundle.id}-${Date.now()}`;
        const addedItems = productItems.filter(bi => bi.product && bi.product.stock > 0);
        if (addedItems.length === 0) {
            toast.error('All items in this bundle are out of stock');
            return;
        }
        addedItems.forEach(bi => {
            const prod = bi.product;
            const variant = prod.hasVariants && prod.variants?.length > 0 ? prod.variants[0] : null;
            addToCart(
                { ...prod, bundleInfo: { bundleId: bundle.id, bundleInstanceId, bundleName: bundle.name, bundlePrice: bundle.bundlePrice } },
                bi.quantity,
                variant
            );
        });
        toast.success(`Added "${bundle.name}" bundle to cart (${addedItems.length} item${addedItems.length > 1 ? 's' : ''})`);
    };

    if (compact) {
        return (
            <div className="bg-surface border border-border-default rounded-xl p-3 hover:shadow-card-hover hover:border-trust/40 transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-page-bg rounded-lg border border-border-default flex items-center justify-center p-1 flex-shrink-0">
                        {bundle.image ? (
                            <img src={bundle.image} alt={bundle.name} onError={handleImageError} className="w-full h-full object-contain" />
                        ) : (
                            <Layers size={24} className="text-trust" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-text-primary line-clamp-1">{bundle.name}</h4>
                        <p className="text-xs text-text-muted">{itemCount} items</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-primary">₹{bundle.bundlePrice?.toLocaleString('en-IN')}</span>
                            {bundle.savings > 0 && (
                                <span className="text-xs text-success font-medium">Save {bundle.savingsPercent}%</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleAddBundle}
                        className="flex-shrink-0 p-2 bg-buy-primary hover:bg-buy-primary-hover text-text-primary rounded-lg transition-colors"
                    >
                        <ShoppingCart size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface border border-border-default rounded-xl overflow-hidden hover:shadow-card-hover hover:border-trust/40 transition-all group flex flex-col w-[280px] flex-shrink-0">
            <div className="relative bg-page-bg p-4 flex items-center justify-center h-40 border-b border-border-default">
                {bundle.image ? (
                    <img src={bundle.image} alt={bundle.name} onError={handleImageError} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                ) : (
                    <div className="flex gap-1">
                        {productItems.slice(0, 3).map(bi => (
                            <img
                                key={bi.id}
                                src={bi.product?.images?.[0]}
                                alt={bi.product?.title}
                                onError={handleImageError}
                                className="w-16 h-16 object-contain rounded border border-border-default bg-surface p-0.5"
                            />
                        ))}
                    </div>
                )}
                {bundle.savingsPercent > 0 && (
                    <div className="absolute top-2 right-2 bg-success text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <Percent size={10} /> Save {bundle.savingsPercent}%
                    </div>
                )}
                {hasService && (
                    <div className="absolute top-2 left-2 bg-trust text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <Wrench size={10} /> Includes Service
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col flex-1">
                <h3 className="text-sm font-bold text-text-primary line-clamp-2 group-hover:text-trust transition-colors mb-1">
                    {bundle.name}
                </h3>
                {bundle.description && (
                    <p className="text-xs text-text-muted line-clamp-2 mb-2">{bundle.description}</p>
                )}
                <p className="text-xs text-text-secondary mb-3">{itemCount} items in this bundle</p>

                <div className="mt-auto space-y-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-primary">₹{bundle.bundlePrice?.toLocaleString('en-IN')}</span>
                        {bundle.itemTotal > bundle.bundlePrice && (
                            <span className="text-sm text-text-muted line-through">₹{bundle.itemTotal?.toLocaleString('en-IN')}</span>
                        )}
                    </div>
                    {bundle.savings > 0 && (
                        <p className="text-xs text-success font-medium">You save ₹{bundle.savings?.toLocaleString('en-IN')}</p>
                    )}
                    <button
                        onClick={handleAddBundle}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-buy-primary hover:bg-buy-primary-hover text-text-primary text-sm font-bold rounded-lg transition-colors"
                    >
                        <ShoppingCart size={16} />
                        Add Bundle to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BundleCard;
