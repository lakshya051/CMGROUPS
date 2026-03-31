import React, { useState, useEffect, useRef } from 'react';
import { bundleTemplatesAPI } from '../../lib/api';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronUp, Check, ShoppingCart, Percent, Zap, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { handleImageError } from '../../utils/image';
import toast from 'react-hot-toast';

const BundleBuilder = ({ template }) => {
    const { addToCart, initBuyNowMultiple } = useShop();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [productsBySlot, setProductsBySlot] = useState({});
    const [selections, setSelections] = useState({});
    const [expandedSlot, setExpandedSlot] = useState(null);
    const [pricing, setPricing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const calculateReqId = useRef(0);

    useEffect(() => {
        if (!template?.id) return;
        setSelections({});
        setPricing(null);
        setLoading(true);
        setLoadError(false);
        setExpandedSlot(null);
        setProductsBySlot({});
        bundleTemplatesAPI.getProducts(template.id)
            .then(data => {
                setProductsBySlot(data.productsBySlot || {});
                if (template.slots?.length > 0) {
                    setExpandedSlot(template.slots[0].id);
                }
            })
            .catch(() => {
                setLoadError(true);
                toast.error('Failed to load bundle products');
            })
            .finally(() => setLoading(false));
    }, [template?.id]);

    useEffect(() => {
        if (!template?.id) return;
        const allSelected = Object.values(selections).flat().filter(Boolean);
        if (allSelected.length === 0) { setPricing(null); return; }

        const selectionPayload = allSelected.map(p => ({
            productId: p.id,
            variantId: p._selectedVariantId || null,
        }));

        const reqId = ++calculateReqId.current;
        bundleTemplatesAPI.calculate(template.id, null, selectionPayload)
            .then((data) => {
                if (reqId !== calculateReqId.current) return;
                setPricing(data);
            })
            .catch(() => {
                if (reqId !== calculateReqId.current) return;
                setPricing(null);
            });
    }, [selections, template?.id]);

    const handleSelect = (slot, product) => {
        const maxQty = slot.maxQty || 1;
        setSelections(prev => {
            if (maxQty <= 1) {
                const current = prev[slot.id];
                const isArray = Array.isArray(current);
                const currentProduct = isArray ? current[0] : current;
                return {
                    ...prev,
                    [slot.id]: currentProduct?.id === product.id ? null : product,
                };
            }
            const current = Array.isArray(prev[slot.id]) ? prev[slot.id] : (prev[slot.id] ? [prev[slot.id]] : []);
            const idx = current.findIndex(p => p.id === product.id);
            if (idx >= 0) {
                const next = current.filter((_, i) => i !== idx);
                return { ...prev, [slot.id]: next.length > 0 ? next : null };
            }
            if (current.length >= maxQty) {
                toast.error(`Max ${maxQty} products for "${slot.label}"`);
                return prev;
            }
            return { ...prev, [slot.id]: [...current, product] };
        });
    };

    const handleVariantSelect = (slotId, productId, variantId) => {
        setSelections(prev => {
            const val = prev[slotId];
            if (!val) return prev;
            const arr = Array.isArray(val) ? val : [val];
            const updated = arr.map(p => p.id === productId ? { ...p, _selectedVariantId: variantId } : p);
            return { ...prev, [slotId]: updated.length === 1 ? updated[0] : updated };
        });
    };

    const getSelectedForSlot = (slotId) => {
        const val = selections[slotId];
        if (!val) return [];
        return Array.isArray(val) ? val : [val];
    };

    const allSelectedProducts = Object.values(selections).flat().filter(Boolean);

    const requiredSlots = template.slots?.filter(s => s.required) || [];
    const allRequiredSelected = requiredSlots.every(slot => {
        const selected = getSelectedForSlot(slot.id);
        return selected.length >= (slot.minQty || 1);
    });
    const hasSelections = allSelectedProducts.length > 0;
    const canProceed = allRequiredSelected && hasSelections;

    const handleAddToCart = () => {
        if (!user) {
            toast.error('Please sign in to add items to your cart');
            return;
        }
        if (!hasSelections) {
            toast.error('Please select at least one product');
            return;
        }
        const bundleInstanceId = `byob-${template.id}-${Date.now()}`;
        const bundleInfo = {
            bundleId: `byob-${template.id}`,
            bundleInstanceId,
            bundleName: template.name,
            discount: template.discount,
            bundlePrice: pricing?.discountedPrice ?? null,
        };
        allSelectedProducts.forEach(product => {
            const variant = product._selectedVariantId
                ? productsBySlot[Object.keys(productsBySlot).find(k => (productsBySlot[k] || []).some(p => p.id === product.id))]
                    ?.find(p => p.id === product.id)?.variants?.find(v => v.id === product._selectedVariantId) || null
                : null;
            addToCart({ ...product, bundleInfo }, 1, variant);
        });
        toast.success(`Added custom "${template.name}" bundle to cart`);
    };

    const handleBuyBundleNow = () => {
        if (allSelectedProducts.length === 0) return;
        const bundleInstanceId = `byob-${template.id}-${Date.now()}`;
        const bundleInfo = {
            bundleId: `byob-${template.id}`,
            bundleInstanceId,
            bundleName: template.name,
            discount: template.discount,
            bundlePrice: pricing?.discountedPrice ?? null,
        };
        const entries = allSelectedProducts.map(product => {
            const variant = product._selectedVariantId
                ? Object.values(productsBySlot).flat().find(p => p.id === product.id)?.variants?.find(v => v.id === product._selectedVariantId) || null
                : null;
            return { product, quantity: 1, variant, bundleInfo };
        });
        if (initBuyNowMultiple(entries)) {
            navigate('/checkout', { state: { buyNow: true } });
        }
    };

    if (loading) {
        return <div className="animate-pulse bg-surface rounded-xl border border-border-default h-64" />;
    }

    if (loadError) {
        return (
            <div className="bg-surface border border-error/30 rounded-xl p-6 text-center">
                <AlertCircle size={24} className="mx-auto text-error mb-2" />
                <p className="text-sm text-text-muted">Failed to load bundle products. Please try again later.</p>
            </div>
        );
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
                        <Percent size={14} />
                        {template.templateType === 'mixMatch' && template.mixMatchQty
                            ? `Any ${template.mixMatchQty} for ₹${template.mixMatchPrice?.toLocaleString('en-IN')}`
                            : `${template.discount}% OFF`
                        }
                    </div>
                </div>
            </div>

            <div className="divide-y divide-border-default">
                {template.slots?.map(slot => {
                    const isExpanded = expandedSlot === slot.id;
                    const products = productsBySlot[slot.id] || [];
                    const selectedList = getSelectedForSlot(slot.id);
                    const hasSelection = selectedList.length > 0;
                    const maxQty = slot.maxQty || 1;

                    return (
                        <div key={slot.id}>
                            <button
                                onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                        hasSelection ? 'border-trust bg-trust text-white' : 'border-border-default'
                                    }`}>
                                        {hasSelection && <Check size={14} />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-text-primary">
                                            {slot.label}
                                            {slot.required && <span className="text-error ml-1">*</span>}
                                            {maxQty > 1 && (
                                                <span className="text-text-muted font-normal ml-1">
                                                    ({selectedList.length}/{maxQty})
                                                </span>
                                            )}
                                        </p>
                                        {selectedList.length === 1 && (
                                            <p className="text-xs text-trust">{selectedList[0].title} — ₹{selectedList[0].price?.toLocaleString('en-IN')}</p>
                                        )}
                                        {selectedList.length > 1 && (
                                            <p className="text-xs text-trust">{selectedList.length} products selected</p>
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
                                        const selectedProduct = selectedList.find(p => p.id === product.id);
                                        const isSelected = !!selectedProduct;
                                        const hasVariants = product.hasVariants && product.variants?.length > 0;
                                        const selectedVariantId = selectedProduct?._selectedVariantId || null;
                                        const displayPrice = selectedVariantId
                                            ? product.variants.find(v => v.id === selectedVariantId)?.price ?? product.price
                                            : product.price;

                                        return (
                                            <div
                                                key={product.id}
                                                className={`rounded-lg border-2 p-2 text-left transition-all ${
                                                    isSelected ? 'border-trust bg-trust/5' : 'border-border-default hover:border-trust/30'
                                                }`}
                                            >
                                                <button
                                                    onClick={() => handleSelect(slot, product)}
                                                    className="w-full text-left"
                                                >
                                                    <img
                                                        src={product.images?.[0]}
                                                        alt={product.title}
                                                        onError={handleImageError}
                                                        className="w-full h-16 object-contain mb-1"
                                                    />
                                                    <p className="text-xs font-medium text-text-primary line-clamp-2">{product.title}</p>
                                                    <p className="text-xs font-bold text-primary mt-1">₹{displayPrice?.toLocaleString('en-IN')}</p>
                                                </button>
                                                {hasVariants && isSelected && (
                                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                                        {product.variants.map(v => (
                                                            <button
                                                                key={v.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleVariantSelect(slot.id, product.id, v.id);
                                                                }}
                                                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                                                    selectedVariantId === v.id
                                                                        ? 'border-trust bg-trust/10 text-trust font-semibold'
                                                                        : 'border-border-default text-text-muted hover:border-trust/30'
                                                                }`}
                                                            >
                                                                {v.name || (v.combination ? Object.values(v.combination).join('/') : `₹${v.price}`)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t border-border-default bg-page-bg">
                {/* Mix-and-match progress */}
                {pricing && pricing.templateType === 'mixMatch' && !pricing.mixMatchReached && pricing.mixMatchQty && (
                    <div className="mb-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-primary">
                            Pick {pricing.mixMatchQty - (pricing.itemCount || 0)} more to get all for ₹{pricing.mixMatchPrice?.toLocaleString('en-IN')}!
                        </p>
                        <div className="mt-1.5 h-1.5 bg-border-default rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, ((pricing.itemCount || 0) / pricing.mixMatchQty) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Tiered discount progress bar */}
                {pricing?.nextTier && (
                    <div className="mb-3 bg-success/5 border border-success/20 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-success">
                            Add {pricing.nextTier.minItems - (pricing.itemCount || 0)} more item{pricing.nextTier.minItems - (pricing.itemCount || 0) !== 1 ? 's' : ''} to unlock {pricing.nextTier.discount}% off!
                        </p>
                        <div className="mt-1.5 h-1.5 bg-border-default rounded-full overflow-hidden">
                            <div
                                className="h-full bg-success rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, ((pricing.itemCount || 0) / pricing.nextTier.minItems) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

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
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddToCart}
                            disabled={!canProceed}
                            className="flex items-center gap-2 px-5 py-2.5 bg-buy-primary hover:bg-buy-primary-hover text-text-primary text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ShoppingCart size={16} />
                            Add to Cart
                        </button>
                        <button
                            onClick={handleBuyBundleNow}
                            disabled={!canProceed}
                            className="flex items-center gap-2 px-5 py-2.5 border-2 border-primary text-primary hover:bg-primary hover:text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Zap size={16} />
                            Buy Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BundleBuilder;
