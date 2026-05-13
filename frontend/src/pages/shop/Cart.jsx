import React, { useMemo, useState, useEffect } from 'react'
import { useShop } from '../../context/ShopContext'
import { useFeatureFlags } from '../../context/FeatureFlagsContext'
import { Link, useNavigate } from 'react-router-dom'
import { QuantitySelector, ProgressBar, EmptyState, SkeletonCard } from '../../components/ui/index'
import PriceDisplay from '../../components/common/PriceDisplay'
import { ShoppingCart, Tag, Bookmark, ArrowRight, Zap, Layers, ChevronDown, ChevronUp, Trash2, Wrench, Package } from 'lucide-react'
import { couponsAPI, productsAPI, bundlesAPI } from '../../lib/api'
import { FREE_DELIVERY_THRESHOLD, EMI_MINIMUM_ORDER, SAVED_LATER_STORAGE_KEY } from '../../constants'
import { getProductImageUrl, handleImageError } from '../../utils/image'
import { computeBundleAwareSubtotal, computeBundleSavings } from '../../utils/bundleUtils'
import { buildCartItemsSummary, buildCouponStateFromValidation, computeCouponDiscountFromRules } from '../../utils/couponPricing'
import { useSEO } from '../../hooks/useSEO'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const Cart = () => {
    const { cart, cartLoading, addToCart, removeFromCart, removeBundleFromCart, updateCartQuantity, coupon, applyCoupon, removeCoupon } = useShop()
    const { bundlesEnabled } = useFeatureFlags()
    const navigate = useNavigate()
    useSEO({ title: 'Your Cart — Shoptify', description: 'Review your shopping cart before checkout.', noIndex: true })

    const [couponCode, setCouponCode] = useState('')
    const appliedCoupon = coupon?.code || null
    const [couponError, setCouponError] = useState('')
    const [couponLoading, setCouponLoading] = useState(false)

    // Save for later
    const [savedItems, setSavedItems] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(SAVED_LATER_STORAGE_KEY) || '[]')
        } catch { return [] }
    })

    // Cross-sell products
    const [crossSell, setCrossSell] = useState([])
    const [bundleSuggestions, setBundleSuggestions] = useState([])
    const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

    useEffect(() => {
        localStorage.setItem(SAVED_LATER_STORAGE_KEY, JSON.stringify(savedItems))
    }, [savedItems])

    const cartSignature = useMemo(
        () => cart.map(i => `${i.uniqueId || i.id}:${i.quantity}`).join(','),
        [cart]
    )

    // Fetch cross-sell when cart changes
    useEffect(() => {
        if (cart.length === 0) { setCrossSell([]); setBundleSuggestions([]); return }
        const productIds = [...new Set(cart.map(i => i.productId || i.id).filter(Boolean))]

        productsAPI.getAll({ limit: 8 })
            .then(res => {
                const ids = new Set(cart.map(i => i.id))
                const items = (res.data || res || []).filter(p => !ids.has(p.id)).slice(0, 6)
                setCrossSell(items)
            })
            .catch((err) => { console.error('Failed to load cross-sell products:', err); })

        if (bundlesEnabled && productIds.length > 0) {
            bundlesAPI.getSuggestions(productIds)
                .then(setBundleSuggestions)
                .catch(() => setBundleSuggestions([]))
        } else {
            setBundleSuggestions([])
        }
    }, [cartSignature, bundlesEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

    const subtotal = useMemo(
        () => computeBundleAwareSubtotal(cart),
        [cart]
    )

    const discount = useMemo(() => {
        if (!coupon?.code) return 0
        return computeCouponDiscountFromRules(coupon, cart, subtotal)
    }, [coupon, cart, subtotal])

    const totalItems = useMemo(
        () => cart.reduce((n, item) => n + item.quantity, 0),
        [cart]
    )

    const savings = useMemo(() => {
        return cart.reduce((s, item) => {
            if (item.originalPrice && item.originalPrice > item.price) {
                return s + (item.originalPrice - item.price) * item.quantity
            }
            return s
        }, 0)
    }, [cart])

    const bundleSavings = useMemo(() => computeBundleSavings(cart), [cart])

    const outOfStockItems = useMemo(
        () => cart.filter(item => item.stock != null && item.stock <= 0),
        [cart]
    )
    const hasOutOfStockItems = outOfStockItems.length > 0

    const overStockItems = useMemo(
        () => cart.filter(item => item.stock != null && item.stock > 0 && item.quantity > item.stock),
        [cart]
    )
    const hasOverStockItems = overStockItems.length > 0

    const deliveryProgress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100))
    const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)

    const deliveryFee = remainingForFreeDelivery > 0 ? 40 : 0
    const taxAmount = Math.round((subtotal - discount) * 0.18)
    const grandTotal = Math.round((subtotal - discount) * 1.18 + deliveryFee)

    // ─── Handlers ───────────────────────────────────────────────
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return
        setCouponLoading(true)
        setCouponError('')
        try {
            const cartItemsSummary = buildCartItemsSummary(cart)
            const data = await couponsAPI.validate(couponCode.trim(), cartItemsSummary, subtotal)
            applyCoupon(buildCouponStateFromValidation(data, cart))
            setCouponCode('')
        } catch (err) {
            setCouponError(err?.message || 'Invalid or expired coupon code')
            removeCoupon()
        } finally {
            setCouponLoading(false)
        }
    }

    const handleRemoveCoupon = () => {
        removeCoupon()
        setCouponError('')
    }

    const handleQuantityChange = (uniqueId, newQty) => {
        if (newQty <= 0) {
            removeFromCart(uniqueId)
            return
        }
        updateCartQuantity(uniqueId, newQty)
    }

    const handleSaveForLater = (item) => {
        setSavedItems(prev => {
            if (prev.some(s => s.uniqueId === item.uniqueId)) return prev
            return [...prev, { ...item, savedAt: Date.now() }]
        })
        removeFromCart(item.uniqueId)
    }

    const handleMoveToCart = (item) => {
        addToCart(item, item.quantity)
        setSavedItems(prev => prev.filter(s => s.uniqueId !== item.uniqueId))
    }

    const handleRemoveSaved = (uniqueId) => {
        setSavedItems(prev => prev.filter(s => s.uniqueId !== uniqueId))
    }

    const requestRemoveFromCart = (uniqueId) => {
        setConfirmState({
            isOpen: true,
            title: 'Remove item?',
            message: 'Remove this item from your cart?',
            onConfirm: () => {
                setConfirmState(prev => ({ ...prev, isOpen: false }))
                removeFromCart(uniqueId)
            },
        })
    }

    // ─── Empty Cart ─────────────────────────────────────────────
    if (cartLoading) {
        return (
            <div className="container mx-auto min-w-0 px-4 sm:px-lg py-4 sm:py-lg">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-text-primary mb-lg">
                    Shopping Cart
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        )
    }

    if (cart.length === 0 && savedItems.length === 0) {
        return (
            <div className="container mx-auto min-w-0 px-4 sm:px-lg py-2xl">
                <EmptyState
                    icon={ShoppingCart}
                    title="Your cart is empty"
                    subtitle="Looks like you haven't added any gear yet. Start browsing our collection!"
                    ctaLabel="Start Shopping →"
                    onCta={() => navigate('/products')}
                />
            </div>
        )
    }

    return (
        <div className={`container mx-auto min-w-0 px-4 sm:px-lg py-4 sm:py-lg ${cart.length > 0 ? 'pb-28 lg:pb-lg' : 'pb-8'}`}>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-text-primary mb-md sm:mb-lg">
                Shopping Cart
            </h1>

            {/* ─── Delivery Progress Bar ───────────────────────────── */}
            {hasOutOfStockItems && (
                <div className="bg-deal/10 border border-deal/30 rounded-lg p-md mb-lg">
                    <p className="text-sm font-semibold text-deal">
                        {outOfStockItems.length === 1 ? '1 item is' : `${outOfStockItems.length} items are`} out of stock in your cart.
                    </p>
                    <p className="text-sm text-text-secondary mt-xs">
                        Remove them or save them for later before proceeding to checkout.
                    </p>
                </div>
            )}

            {hasOverStockItems && (
                <div className="bg-urgency/10 border border-urgency/30 rounded-lg p-md mb-lg">
                    <p className="text-sm font-semibold text-urgency">
                        {overStockItems.length === 1 ? '1 item has' : `${overStockItems.length} items have`} insufficient stock.
                    </p>
                    <p className="text-sm text-text-secondary mt-xs">
                        {overStockItems.map(item => (
                            <span key={item.uniqueId} className="block">
                                "{item.title}" — only {item.stock} available (you have {item.quantity} in cart).
                            </span>
                        ))}
                    </p>
                    <button
                        type="button"
                        onClick={() => overStockItems.forEach(item => handleQuantityChange(item.uniqueId, item.stock))}
                        className="mt-sm text-sm font-medium text-trust hover:underline"
                    >
                        Adjust all to available stock
                    </button>
                </div>
            )}

            {cart.length > 0 && (
                <div className="bg-surface border border-border-default rounded-lg p-3 sm:p-md mb-md sm:mb-lg">
                    {remainingForFreeDelivery > 0 ? (
                        <p className="text-sm text-text-secondary mb-sm">
                            Add <span className="font-bold text-deal">₹{remainingForFreeDelivery.toLocaleString('en-IN')}</span> for{' '}
                            <span className="font-bold text-success">FREE Delivery</span>
                        </p>
                    ) : (
                        <p className="text-sm text-success font-bold mb-sm">
                            ✓ You qualify for FREE Delivery!
                        </p>
                    )}
                    <ProgressBar value={subtotal} max={FREE_DELIVERY_THRESHOLD} color="success" />
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-trust font-medium">
                        <Zap size={12} />
                        <span>Express 24-Hour Delivery — order now, get it by tomorrow</span>
                    </div>
                </div>
            )}

            {/* ─── Main Layout: 68% left / 30% right ──────────────── */}
            <div className="flex flex-col lg:flex-row gap-lg lg:gap-xl min-w-0">
                {/* Left: Cart Items + Save for Later */}
                <div className="w-full min-w-0 lg:w-[68%] space-y-md">
                    {cart.length > 0 ? (
                        <CartItemsList
                            cart={cart}
                            onQuantityChange={handleQuantityChange}
                            onRemove={requestRemoveFromCart}
                            onSaveForLater={handleSaveForLater}
                            onRemoveBundle={removeBundleFromCart}
                        />
                    ) : (
                        <div className="bg-surface border border-border-default rounded-lg p-lg text-center">
                            <p className="text-sm text-text-secondary">Your cart is empty. Check your saved items below!</p>
                        </div>
                    )}

                    {/* Bundle Suggestions — gated behind admin toggle */}
                    {bundlesEnabled && bundleSuggestions.length > 0 && (
                        <div className="mt-md">
                            <h3 className="text-sm font-bold text-text-primary mb-sm flex items-center gap-1.5">
                                <Package size={14} className="text-trust" />
                                Complete a Bundle &amp; Save More
                            </h3>
                            <div className="space-y-sm">
                                {bundleSuggestions.map(bundle => (
                                    <Link
                                        key={bundle.id}
                                        to={`/bundles/${bundle.slug || bundle.id}`}
                                        className="block bg-trust/5 border border-trust/20 rounded-lg p-3 hover:border-trust/40 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-text-primary truncate">{bundle.name}</p>
                                                <p className="text-xs text-text-muted mt-0.5">
                                                    You have {bundle.ownedCount} of {bundle.totalCount} items
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                {bundle.savingsPercent > 0 && (
                                                    <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                                                        Save {bundle.savingsPercent}%
                                                    </span>
                                                )}
                                                <p className="text-sm font-bold text-primary mt-0.5">₹{bundle.bundlePrice?.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── Save for Later ──────────────────────────── */}
                    {savedItems.length > 0 && (
                        <div className="mt-xl">
                            <h2 className="text-lg font-bold text-text-primary mb-md flex items-center gap-sm">
                                <Bookmark size={18} className="text-trust" />
                                Saved for Later ({savedItems.length})
                            </h2>
                            <div className="space-y-md">
                                {savedItems.map(item => (
                                    <div
                                        key={item.uniqueId}
                                        className="bg-surface border border-border-default rounded-lg p-3 sm:p-md flex gap-3 items-start min-w-0"
                                    >
                                        <div className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] bg-page-bg border border-border-default rounded-lg flex items-center justify-center p-xs flex-shrink-0">
                                            <img
                                                src={getProductImageUrl(item)}
                                                alt={item.title}
                                                loading="lazy"
                                                width={80}
                                                height={80}
                                                onError={handleImageError}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Link to={`/products/${item.id}`} className="text-sm font-medium text-text-primary hover:text-trust transition-colors duration-fast line-clamp-2">
                                                {item.title}
                                            </Link>
                                            <PriceDisplay sellingPrice={item.price} originalPrice={item.originalPrice} size="sm" showBadge={false} />
                                            <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                                <button type="button" onClick={() => handleMoveToCart(item)} className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 rounded-lg bg-trust/10 text-trust font-medium text-sm text-center active:bg-trust/20">
                                                    Move to Cart
                                                </button>
                                                <button type="button" onClick={() => handleRemoveSaved(item.uniqueId)} className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 rounded-lg border border-border-default text-text-muted text-sm hover:text-deal hover:border-deal/30 transition-colors">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Order Summary (sticky) */}
                {cart.length > 0 && (
                    <div className="w-full min-w-0 lg:w-[30%]">
                        <div className="lg:sticky lg:top-24 bg-surface border border-border-default rounded-lg p-4 sm:p-lg space-y-md sm:space-y-lg">
                            <h2 className="text-base sm:text-lg font-bold text-text-primary border-b border-border-default pb-md">
                                Order Summary
                            </h2>

                            {/* Coupon — accordion on mobile if unapplied, always visible once applied */}
                            {appliedCoupon ? (
                                <div className="flex items-center justify-between gap-sm bg-success/10 border border-success/20 rounded-lg px-md py-sm">
                                    <span className="text-sm text-success font-medium flex items-center gap-xs min-w-0">
                                        <Tag size={14} className="shrink-0" /> <span className="truncate">{appliedCoupon} applied</span>
                                    </span>
                                    <button type="button" onClick={handleRemoveCoupon} className="min-h-11 px-3 text-xs text-text-muted hover:text-deal shrink-0">
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <details className="group lg:open" open={false}>
                                    <summary className="list-none flex items-center justify-between gap-sm cursor-pointer min-h-11 py-1 lg:py-0 lg:pointer-events-none">
                                        <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                                            <Tag size={14} className="text-trust" /> Have a promo code?
                                        </span>
                                        <span className="lg:hidden text-xs text-trust font-semibold group-open:rotate-180 transition-transform">▾</span>
                                    </summary>
                                    <div className="mt-3 flex flex-col sm:flex-row gap-sm">
                                        <input
                                            type="text"
                                            placeholder="Promo Code"
                                            value={couponCode}
                                            onChange={e => { setCouponCode(e.target.value); setCouponError('') }}
                                            aria-label="Promo code"
                                            className="flex-1 min-w-0 border border-border-default rounded-lg px-md py-3 text-base sm:text-sm focus:outline-none focus:border-trust transition-colors duration-fast"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleApplyCoupon}
                                            disabled={couponLoading}
                                            className="min-h-11 border border-border-default rounded-lg px-md text-sm font-medium hover:bg-surface-hover disabled:opacity-40 transition-colors duration-fast shrink-0 sm:w-auto w-full"
                                        >
                                            {couponLoading ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                    {couponError && <p className="text-xs text-deal mt-xs">{couponError}</p>}
                                </details>
                            )}

                            {/* Line items */}
                            <div className="space-y-sm text-sm">
                                <div className="flex justify-between">
                                    <span className="text-text-secondary">Subtotal ({totalItems} items)</span>
                                    <span className="text-text-primary font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                                </div>
                                {savings > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-deal">Savings</span>
                                        <span className="text-deal font-medium">−₹{savings.toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                {bundleSavings > 0 && (
                                    <div className="flex justify-between text-success">
                                        <span className="flex items-center gap-1"><Layers size={12} /> Bundle Discount</span>
                                        <span className="font-medium">−₹{bundleSavings.toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-sm">
                                    <div className="flex items-center gap-1">
                                        <span className="text-text-secondary">Delivery</span>
                                        <span className="text-[10px] text-trust font-semibold bg-trust/10 px-1.5 py-0.5 rounded">24-HR</span>
                                    </div>
                                    <span className={remainingForFreeDelivery <= 0 ? 'text-success font-medium' : 'text-text-primary'}>
                                        {remainingForFreeDelivery <= 0 ? 'FREE' : `₹${deliveryFee}`}
                                    </span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-success">
                                        <span>Coupon Discount</span>
                                        <span className="font-medium">−₹{discount.toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-sm">
                                    <span className="text-text-secondary">Tax (18% GST)</span>
                                    <span className="text-text-primary">₹{taxAmount.toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="border-t border-border-default pt-md flex justify-between items-center gap-sm">
                                <span className="text-lg font-bold text-text-primary">Total</span>
                                <span className="text-xl font-bold text-text-primary tabular-nums">
                                    ₹{grandTotal.toLocaleString('en-IN')}
                                </span>
                            </div>

                            {/* EMI Note */}
                            {subtotal >= EMI_MINIMUM_ORDER && (
                                <p className="text-xs text-text-muted">
                                    EMI available from ₹{Math.round(subtotal / 6).toLocaleString('en-IN')}/month.{' '}
                                    <span className="text-trust cursor-pointer hover:underline">View plans</span>
                                </p>
                            )}

                            {/* CTA — hidden on small screens; mobile uses fixed bar */}
                            <button
                                type="button"
                                onClick={() => navigate('/checkout')}
                                disabled={hasOutOfStockItems || hasOverStockItems}
                                className={`hidden lg:flex w-full font-bold py-md rounded-lg text-sm items-center justify-center gap-sm transition-colors duration-base ${hasOutOfStockItems || hasOverStockItems
                                    ? 'bg-border-default text-text-muted cursor-not-allowed'
                                    : 'bg-buy-primary hover:bg-buy-primary-hover text-text-primary'
                                    }`}
                            >
                                {hasOutOfStockItems
                                    ? 'Remove unavailable items to continue'
                                    : hasOverStockItems
                                    ? 'Adjust quantities to continue'
                                    : `Proceed to Buy (${totalItems} item${totalItems > 1 ? 's' : ''})`}
                                <ArrowRight size={16} />
                            </button>

                            <p className="text-xs text-center text-text-muted hidden lg:block">
                                {hasOutOfStockItems || hasOverStockItems
                                    ? 'Checkout is disabled while cart items exceed available stock.'
                                    : 'Secure Checkout powered by Shoptify'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile: sticky checkout bar above bottom nav */}
            {cart.length > 0 && (
                <div
                    className="lg:hidden fixed left-0 right-0 z-[45] border-t border-border-default bg-surface/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-4 py-3"
                    style={{ bottom: 'calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px))' }}
                >
                    <div className="flex items-center gap-3 max-w-7xl mx-auto">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-text-muted">Total</p>
                            <p className="text-lg font-bold text-text-primary tabular-nums truncate">₹{grandTotal.toLocaleString('en-IN')}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/checkout')}
                            disabled={hasOutOfStockItems || hasOverStockItems}
                            className={`flex-1 min-w-0 max-w-[min(100%,280px)] font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors duration-base touch-manipulation ${hasOutOfStockItems || hasOverStockItems
                                ? 'bg-border-default text-text-muted cursor-not-allowed'
                                : 'bg-buy-primary hover:bg-buy-primary-hover text-text-primary active:scale-[0.98]'
                                }`}
                        >
                            {hasOutOfStockItems || hasOverStockItems ? (
                                <span className="text-center leading-tight">Fix cart first</span>
                            ) : (
                                <>
                                    Checkout
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Cross-Sell Carousel ──────────────────────────────── */}
            {crossSell.length > 0 && cart.length > 0 && (
                <div className="mt-xl sm:mt-2xl min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-text-primary mb-md">
                        Frequently Bought Together
                    </h2>
                    <div className="flex gap-md overflow-x-auto snap-x snap-mandatory pb-md -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide touch-pan-x">
                        {crossSell.map(product => (
                            <Link
                                key={product.id}
                                to={`/products/${product.id}`}
                                className="snap-start flex-shrink-0 w-[180px] bg-surface border border-border-default rounded-lg p-md hover:border-trust transition-colors duration-fast group"
                            >
                                <div className="w-full h-[120px] bg-page-bg border border-border-default rounded-lg flex items-center justify-center p-xs mb-sm">
                                    <img
                                        src={getProductImageUrl(product)}
                                        alt={product.title}
                                        loading="lazy"
                                        width={180}
                                        height={120}
                                        onError={handleImageError}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-smooth"
                                    />
                                </div>
                                <h3 className="text-xs font-medium text-text-primary line-clamp-2 mb-xs">{product.title}</h3>
                                <PriceDisplay sellingPrice={product.price} originalPrice={product.originalPrice} size="sm" showBadge={true} />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
            />
        </div>
    )
}

// ─── CartItemsList — groups bundle items together ─────────────────
function CartItemsList({ cart, onQuantityChange, onRemove, onSaveForLater, onRemoveBundle }) {
    const { bundleGroups, standaloneItems } = useMemo(() => {
        const groups = {}
        const standalone = []
        for (const item of cart) {
            const instId = item.bundleInfo?.bundleInstanceId
            if (instId) {
                if (!groups[instId]) groups[instId] = { items: [], bundleInfo: item.bundleInfo }
                groups[instId].items.push(item)
            } else {
                standalone.push(item)
            }
        }
        return { bundleGroups: Object.entries(groups), standaloneItems: standalone }
    }, [cart])

    return (
        <div className="space-y-md">
            {bundleGroups.map(([instanceId, group]) => (
                <BundleGroupCard
                    key={instanceId}
                    instanceId={instanceId}
                    bundleInfo={group.bundleInfo}
                    items={group.items}
                    onRemoveBundle={onRemoveBundle}
                />
            ))}
            {standaloneItems.map(item => (
                <CartItemRow
                    key={item.uniqueId}
                    item={item}
                    onQuantityChange={onQuantityChange}
                    onRemove={() => onRemove(item.uniqueId)}
                    onSaveForLater={() => onSaveForLater(item)}
                />
            ))}
        </div>
    )
}

// ─── BundleGroupCard — grouped bundle display in cart ─────────────
function BundleGroupCard({ instanceId, bundleInfo, items, onRemoveBundle }) {
    const [expanded, setExpanded] = useState(false)
    const navigate = useNavigate()
    const isServiceOnly = bundleInfo.isServiceOnly || items.every(i => i.isServiceBundle)
    const catalogTotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    const bundlePrice = bundleInfo.bundlePrice ?? catalogTotal
    const savings = isServiceOnly ? 0 : Math.max(0, catalogTotal - bundlePrice)
    const isByob = String(bundleInfo.bundleId).startsWith('byob-')
    const hasService = bundleInfo.hasService
    const serviceNames = bundleInfo.serviceNames || []

    return (
        <div className="rounded-lg border border-trust/30 bg-trust/[0.02] overflow-hidden">
            <div className="p-3 sm:p-md">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isServiceOnly ? 'bg-primary/10' : 'bg-trust/10'}`}>
                            {isServiceOnly ? <Wrench size={16} className="text-primary" /> : <Layers size={16} className="text-trust" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-text-primary truncate">
                                {bundleInfo.bundleName || 'Bundle'}
                            </p>
                            <p className="text-xs text-text-muted">
                                {isServiceOnly
                                    ? `${serviceNames.length} service${serviceNames.length !== 1 ? 's' : ''}`
                                    : `${items.length} item${items.length !== 1 ? 's' : ''}`
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                            {savings > 0 && (
                                <p className="text-xs text-text-muted line-through">₹{catalogTotal.toLocaleString('en-IN')}</p>
                            )}
                            <p className="text-base font-bold text-text-primary">₹{bundlePrice.toLocaleString('en-IN')}</p>
                            {savings > 0 && (
                                <p className="text-[10px] font-semibold text-success">You save ₹{savings.toLocaleString('en-IN')}</p>
                            )}
                        </div>
                    </div>
                </div>

                {isServiceOnly ? (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-trust font-medium bg-trust/5 rounded px-2 py-1 w-fit">
                        <Wrench size={11} />
                        Service bundle — you'll schedule at checkout
                    </div>
                ) : hasService && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-trust font-medium bg-trust/5 rounded px-2 py-1 w-fit">
                        <Wrench size={11} />
                        Includes service — you'll schedule at checkout
                    </div>
                )}

                {isServiceOnly && serviceNames.length > 0 ? (
                    <div className="mt-2 space-y-1">
                        {serviceNames.map((name, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-text-secondary">
                                <Wrench size={11} className="text-trust shrink-0" />
                                {name}
                            </div>
                        ))}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2 flex items-center gap-1 text-xs text-trust font-medium hover:underline"
                    >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded ? 'Hide items' : 'View items'}
                    </button>
                )}
            </div>

            {expanded && !isServiceOnly && (
                <div className="border-t border-trust/10 divide-y divide-border-default">
                    {items.map(item => (
                        <div key={item.uniqueId} className="flex gap-3 p-3 sm:px-md">
                            <div className="w-12 h-12 bg-page-bg border border-border-default rounded flex items-center justify-center p-0.5 shrink-0">
                                <img
                                    src={getProductImageUrl(item)}
                                    alt={item.title}
                                    loading="lazy"
                                    width={48}
                                    height={48}
                                    onError={handleImageError}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <Link to={`/products/${item.id}`} className="text-xs font-medium text-text-primary hover:text-trust line-clamp-1">
                                    {item.title}
                                </Link>
                                {item.variantName && item.variantName !== 'Standard' && (
                                    <p className="text-[10px] text-text-muted">{item.variantName}</p>
                                )}
                                <p className="text-xs text-text-muted">Qty: {item.quantity}</p>
                            </div>
                            <p className="text-xs font-medium text-text-primary shrink-0">
                                ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <div className="border-t border-trust/10 px-3 sm:px-md py-2 flex items-center gap-2 justify-end flex-wrap">
                {isByob && (
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="min-h-11 inline-flex items-center text-xs font-medium text-trust hover:underline px-3"
                    >
                        Edit Bundle
                    </button>
                )}
                {isServiceOnly && (
                    <Link
                        to={`/bundles/${bundleInfo.bundleId}`}
                        className="min-h-11 inline-flex items-center text-xs font-medium text-trust hover:underline px-3"
                    >
                        View Details
                    </Link>
                )}
                <button
                    type="button"
                    onClick={() => onRemoveBundle(instanceId)}
                    className="min-h-11 flex items-center gap-1 text-xs font-medium text-deal hover:text-deal/80 px-3"
                >
                    <Trash2 size={12} />
                    Remove Bundle
                </button>
            </div>
        </div>
    )
}

// ─── CartItemRow ──────────────────────────────────────────────────
function CartItemRow({ item, onQuantityChange, onRemove, onSaveForLater }) {
    const inStock = item.stock == null || item.stock > 0
    const isLowStock = item.stock != null && item.stock > 0 && item.stock < 5
    const isOverStock = item.stock != null && item.stock > 0 && item.quantity > item.stock

    return (
        <div className={`rounded-lg p-3 sm:p-md border min-w-0 ${!inStock ? 'bg-deal/5 border-deal/30' : isOverStock ? 'bg-urgency/5 border-urgency/30' : 'bg-surface border-border-default'}`}>
            <div className="flex gap-3 sm:gap-md">
                <Link
                    to={`/products/${item.id}`}
                    className={`w-20 h-20 sm:w-[100px] sm:h-[100px] bg-page-bg border border-border-default rounded-lg flex items-center justify-center p-1.5 flex-shrink-0 ${inStock ? '' : 'opacity-60'}`}
                >
                    <img
                        src={getProductImageUrl(item)}
                        alt={item.title}
                        loading="lazy"
                        width={100}
                        height={100}
                        onError={handleImageError}
                        className="w-full h-full object-contain"
                    />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex gap-2 justify-between items-start">
                        <div className="min-w-0 flex-1">
                            <Link to={`/products/${item.id}`} className="text-sm font-medium text-text-primary hover:text-trust transition-colors duration-fast line-clamp-2">
                                {item.title}
                            </Link>

                            {item.variantCombination && typeof item.variantCombination === 'object' ? (
                                <p className="text-xs text-text-muted mt-1 break-words">
                                    {Object.entries(item.variantCombination).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                </p>
                            ) : item.variantName && item.variantName !== 'Standard' ? (
                                <p className="text-xs text-text-muted mt-1">
                                    Variant: <span className="text-text-secondary">{item.variantName}</span>
                                </p>
                            ) : null}

                            {item.bundleInfo?.bundleName && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-trust bg-trust/10 px-1.5 py-0.5 rounded">
                                    <Layers size={10} /> {item.bundleInfo.bundleName}
                                </span>
                            )}

                            {!inStock ? (
                                <div className="mt-1.5">
                                    <p className="text-xs text-deal font-medium">Out of Stock</p>
                                    <p className="text-xs text-text-muted mt-1 leading-snug">
                                        Remove or save for later to checkout.
                                    </p>
                                </div>
                            ) : isOverStock ? (
                                <div className="mt-1.5">
                                    <p className="text-xs text-urgency font-medium">
                                        Insufficient stock — only {item.stock} available
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => onQuantityChange(item.uniqueId, item.stock)}
                                        className="text-xs text-trust font-medium mt-1 hover:underline"
                                    >
                                        Adjust to {item.stock}
                                    </button>
                                </div>
                            ) : isLowStock ? (
                                <p className="text-xs text-urgency font-medium mt-1.5">Only {item.stock} left</p>
                            ) : (
                                <p className="text-xs text-success font-medium mt-1.5">In Stock</p>
                            )}
                            {inStock && (
                                <p className="text-[11px] text-trust font-medium mt-1 flex items-center gap-1">
                                    <Zap size={10} /> 24-Hour Delivery
                                </p>
                            )}

                            {item.price >= EMI_MINIMUM_ORDER && (
                                <p className="text-xs text-text-muted mt-1">
                                    EMI from ₹{Math.round(item.price / 6).toLocaleString('en-IN')}/mo
                                </p>
                            )}
                        </div>

                        <div className="shrink-0 text-right pl-1 max-w-[45%] sm:max-w-none">
                            <PriceDisplay
                                sellingPrice={item.price * item.quantity}
                                originalPrice={item.originalPrice != null ? item.originalPrice * item.quantity : null}
                                size="md"
                                showBadge={false}
                            />
                            {item.quantity > 1 && (
                                <p className="text-[11px] sm:text-xs text-text-muted mt-0.5 whitespace-nowrap">
                                    ₹{item.price.toLocaleString('en-IN')} each
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <QuantitySelector
                            value={item.quantity}
                            onChange={(newQty) => onQuantityChange(item.uniqueId, newQty)}
                            max={item.stock != null ? item.stock : undefined}
                            disabled={!inStock}
                        />
                        <div className="flex items-center gap-1 text-sm">
                            <button
                                type="button"
                                onClick={onRemove}
                                className="min-h-[44px] px-3 rounded-lg text-trust font-medium hover:bg-trust/10 active:bg-trust/15 transition-colors"
                            >
                                Delete
                            </button>
                            <span className="text-border-default text-xs px-0.5" aria-hidden>·</span>
                            <button
                                type="button"
                                onClick={onSaveForLater}
                                className="min-h-[44px] px-3 rounded-lg text-trust font-medium hover:bg-trust/10 active:bg-trust/15 transition-colors"
                            >
                                Save for later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Cart
