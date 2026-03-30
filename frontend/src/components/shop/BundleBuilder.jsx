import React, { useState, useEffect } from 'react';
import { bundleTemplatesAPI } from '../../lib/api';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronUp, Check, ShoppingCart, Percent } from 'lucide-react';
import { handleImageError } from '../../utils/image';
import toast from 'react-hot-toast';

const BundleBuilder = ({ template }) => {
    const { addToCart } = useShop();
    const { user } = useAuth();
    const [productsBySlot, setProductsBySlot] = useState({});
    const [selections, setSelections] = useState({});
    const [expandedSlot, setExpandedSlot] = useState(null);
    const [pricing, setPricing] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!template?.id) return;
        setSelections({});
        setPricing(null);
        setLoading(true);
        setExpandedSlot(null);
        bundleTemplatesAPI.getProducts(template.id)
            .then(data => {
                setProductsBySlot(data.productsBySlot || {});
                if (template.slots?.length > 0) {
                    setExpandedSlot(template.slots[0].id);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [template?.id]);

    useEffect(() => {
        const selectedIds = Object.values(selections).filter(Boolean).map(p => p.id);
        if (selectedIds.length === 0) { setPricing(null); return; }

        bundleTemplatesAPI.calculate(template.id, selectedIds)
            .then(setPricing)
            .catch(() => setPricing(null));
    }, [selections, template?.id]);

    const handleSelect = (slotId, product) => {
        setSelections(prev => ({
            ...prev,
            [slotId]: prev[slotId]?.id === product.id ? null : product,
        }));
    };

    const requiredSlots = template.slots?.filter(s => s.required) || [];
    const allRequiredSelected = requiredSlots.every(slot => selections[slot.id]);

    const handleAddToCart = () => {
        if (!user) {
            toast.error('Please sign in to add items to your cart');
            return;
        }
        const bundleInstanceId = `byob-${template.id}-${Date.now()}`;
        Object.values(selections).filter(Boolean).forEach(product => {
            addToCart(
                { ...product, bundleInfo: { bundleId: `byob-${template.id}`, bundleInstanceId, bundleName: template.name, discount: template.discount } },
                1
            );
        });
        toast.success(`Added custom "${template.name}" bundle to cart`);
    };

    if (loading) {
        return <div className="animate-pulse bg-surface rounded-xl border border-border-default h-64" />;
    }

    return (
        <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border-default bg-page-bg">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-text-primary">{template.name}</h3>
                        {template.description && (
                            <p className="text-sm text-text-muted mt-1">{template.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 bg-success/10 text-success px-3 py-1 rounded-full text-sm font-bold">
                        <Percent size={14} /> {template.discount}% OFF
                    </div>
                </div>
            </div>

            <div className="divide-y divide-border-default">
                {template.slots?.map(slot => {
                    const isExpanded = expandedSlot === slot.id;
                    const products = productsBySlot[slot.id] || [];
                    const selected = selections[slot.id];

                    return (
                        <div key={slot.id}>
                            <button
                                onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                        selected ? 'border-trust bg-trust text-white' : 'border-border-default'
                                    }`}>
                                        {selected && <Check size={14} />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-text-primary">
                                            {slot.label}
                                            {slot.required && <span className="text-error ml-1">*</span>}
                                        </p>
                                        {selected && (
                                            <p className="text-xs text-trust">{selected.title} — ₹{selected.price?.toLocaleString('en-IN')}</p>
                                        )}
                                    </div>
                                </div>
                                {isExpanded ? <ChevronUp size={18} className="text-text-muted" /> : <ChevronDown size={18} className="text-text-muted" />}
                            </button>

                            {isExpanded && (
                                <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {products.length === 0 ? (
                                        <p className="text-sm text-text-muted col-span-full py-2">No products available for this category</p>
                                    ) : products.map(product => {
                                        const isSelected = selected?.id === product.id;
                                        return (
                                            <button
                                                key={product.id}
                                                onClick={() => handleSelect(slot.id, product)}
                                                className={`rounded-lg border-2 p-2 text-left transition-all ${
                                                    isSelected ? 'border-trust bg-trust/5' : 'border-border-default hover:border-trust/30'
                                                }`}
                                            >
                                                <img
                                                    src={product.images?.[0]}
                                                    alt={product.title}
                                                    onError={handleImageError}
                                                    className="w-full h-16 object-contain mb-1"
                                                />
                                                <p className="text-xs font-medium text-text-primary line-clamp-2">{product.title}</p>
                                                <p className="text-xs font-bold text-primary mt-1">₹{product.price?.toLocaleString('en-IN')}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t border-border-default bg-page-bg">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        {pricing ? (
                            <>
                                <p className="text-sm text-text-muted line-through">₹{pricing.totalPrice?.toLocaleString('en-IN')}</p>
                                <p className="text-xl font-bold text-primary">₹{pricing.discountedPrice?.toLocaleString('en-IN')}</p>
                                <p className="text-xs text-success font-medium">You save ₹{pricing.savings?.toLocaleString('en-IN')}</p>
                            </>
                        ) : (
                            <p className="text-sm text-text-muted">Select products to see price</p>
                        )}
                    </div>
                    <button
                        onClick={handleAddToCart}
                        disabled={!allRequiredSelected}
                        className="flex items-center gap-2 px-5 py-2.5 bg-buy-primary hover:bg-buy-primary-hover text-text-primary text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ShoppingCart size={16} />
                        Add Bundle to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BundleBuilder;
