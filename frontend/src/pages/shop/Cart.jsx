import React, { useMemo, useState, useEffect } from 'react'
import { useShop } from '../../context/ShopContext'
import { Link, useNavigate } from 'react-router-dom'
import { QuantitySelector, ProgressBar, EmptyState, PriceDisplay } from '../../components/ui/index'
import { ShoppingCart, Tag, Bookmark, Trash2, ArrowRight, ChevronRight, Package } from 'lucide-react'
import { couponsAPI, productsAPI } from '../../lib/api'
import { FREE_DELIVERY_THRESHOLD, EMI_MINIMUM_ORDER, SAVED_LATER_STORAGE_KEY } from '../../constants'

const Cart = () => {
    const { cart, addToCart, removeFromCart } = useShop()
    const navigate = useNavigate()

    const [couponCode, setCouponCode] = useState('')
    const [discount, setDiscount] = useState(0)
    const [appliedCoupon, setAppliedCoupon] = useState(null)
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

    useEffect(() => {
        localStorage.setItem(SAVED_LATER_STORAGE_KEY, JSON.stringify(savedItems))
    }, [savedItems])

    // Fetch cross-sell when cart changes
    useEffect(() => {
        if (cart.length === 0) { setCrossSell([]); return }
        productsAPI.getAll({ limit: 8 })
            .then(res => {
                const ids = new Set(cart.map(i => i.id))
                const items = (res.data || res || []).filter(p => !ids.has(p.id)).slice(0, 6)
                setCrossSell(items)
            })
            .catch(() => { })
    }, [cart.length])

    const subtotal = useMemo(
        () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
        [cart]
    )

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

    const deliveryProgress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100))
    const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)

    // ─── Handlers ───────────────────────────────────────────────
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return
        setCouponLoading(true)
        setCouponError('')
        try {
            const data = await couponsAPI.validate(couponCode)
            if (data.valid) {
                const disc = data.discountType === 'percent'
                    ? subtotal * (data.value / 100)
                    : data.value
                setDiscount(disc)
                setAppliedCoupon(data.code)
                setCouponCode('')
            }
        } catch {
            setCouponError('Invalid or expired coupon code')
            setDiscount(0)
            setAppliedCoupon(null)
        } finally {
            setCouponLoading(false)
        }
    }

    const handleRemoveCoupon = () => {
        setDiscount(0)
        setAppliedCoupon(null)
        setCouponError('')
    }

    const handleQuantityChange = (uniqueId, newQty) => {
        const item = cart.find(i => i.uniqueId === uniqueId)
        if (!item) return
        const diff = newQty - item.quantity
        addToCart(uniqueId, diff)
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

    // ─── Empty Cart ─────────────────────────────────────────────
    if (cart.length === 0 && savedItems.length === 0) {
        return (
            <div className="container mx-auto px-lg py-2xl">
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
        <div className="container mx-auto px-lg py-lg">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary mb-lg">
                Shopping Cart
            </h1>

            {/* ─── Delivery Progress Bar ───────────────────────────── */}
            {cart.length > 0 && (
                <div className="bg-surface border border-border-default rounded-lg p-md mb-lg">
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
                </div>
            )}

            {/* ─── Main Layout: 68% left / 30% right ──────────────── */}
            <div className="flex flex-col lg:flex-row gap-xl">
                {/* Left: Cart Items + Save for Later */}
                <div className="w-full lg:w-[68%] space-y-md">
                    {cart.length > 0 ? (
                        cart.map(item => (
                            <CartItemRow
                                key={item.uniqueId}
                                item={item}
                                onQuantityChange={handleQuantityChange}
                                onRemove={() => removeFromCart(item.uniqueId)}
                                onSaveForLater={() => handleSaveForLater(item)}
                            />
                        ))
                    ) : (
                        <div className="bg-surface border border-border-default rounded-lg p-lg text-center">
                            <p className="text-sm text-text-secondary">Your cart is empty. Check your saved items below!</p>
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
                                        className="bg-surface border border-border-default rounded-lg p-md flex flex-wrap sm:flex-nowrap gap-md items-center"
                                    >
                                        <div className="w-[80px] h-[80px] bg-page-bg border border-border-default rounded-lg flex items-center justify-center p-xs flex-shrink-0">
                                            <img src={item.image} alt={item.title} className="w-full h-full object-contain" loading="lazy" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Link to={`/products/${item.id}`} className="text-sm font-medium text-text-primary hover:text-trust transition-colors duration-fast line-clamp-2">
                                                {item.title}
                                            </Link>
                                            <p className="text-sm font-bold text-text-primary mt-xs">₹{item.price.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="flex items-center gap-md text-sm">
                                            <button onClick={() => handleMoveToCart(item)} className="text-trust hover:underline font-medium">
                                                Move to Cart
                                            </button>
                                            <button onClick={() => handleRemoveSaved(item.uniqueId)} className="text-text-muted hover:text-deal transition-colors duration-fast">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Order Summary (sticky) */}
                {cart.length > 0 && (
                    <div className="w-full lg:w-[30%]">
                        <div className="lg:sticky lg:top-24 bg-surface border border-border-default rounded-lg p-lg space-y-lg">
                            <h2 className="text-lg font-bold text-text-primary border-b border-border-default pb-md">
                                Order Summary
                            </h2>

                            {/* Coupon */}
                            <div>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between bg-success/10 border border-success/20 rounded-lg px-md py-sm">
                                        <span className="text-sm text-success font-medium flex items-center gap-xs">
                                            <Tag size={14} /> {appliedCoupon} applied
                                        </span>
                                        <button onClick={handleRemoveCoupon} className="text-xs text-text-muted hover:text-deal">
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-sm">
                                        <input
                                            type="text"
                                            placeholder="Promo Code"
                                            value={couponCode}
                                            onChange={e => { setCouponCode(e.target.value); setCouponError('') }}
                                            className="flex-1 border border-border-default rounded-lg px-md py-sm text-sm focus:outline-none focus:border-trust transition-colors duration-fast"
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={couponLoading}
                                            className="border border-border-default rounded-lg px-md py-sm text-sm font-medium hover:bg-surface-hover disabled:opacity-40 transition-colors duration-fast"
                                        >
                                            {couponLoading ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                )}
                                {couponError && <p className="text-xs text-deal mt-xs">{couponError}</p>}
                            </div>

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
                                <div className="flex justify-between">
                                    <span className="text-text-secondary">Delivery</span>
                                    <span className={remainingForFreeDelivery <= 0 ? 'text-success font-medium' : 'text-text-primary'}>
                                        {remainingForFreeDelivery <= 0 ? 'FREE' : '₹40'}
                                    </span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-success">
                                        <span>Coupon Discount</span>
                                        <span className="font-medium">−₹{discount.toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-text-secondary">Tax (18% GST)</span>
                                    <span className="text-text-primary">₹{Math.round((subtotal - discount) * 0.18).toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="border-t border-border-default pt-md flex justify-between items-center">
                                <span className="text-lg font-bold text-text-primary">Total</span>
                                <span className="text-xl font-bold text-text-primary">
                                    ₹{Math.round((subtotal - discount) * 1.18 + (remainingForFreeDelivery > 0 ? 40 : 0)).toLocaleString('en-IN')}
                                </span>
                            </div>

                            {/* EMI Note */}
                            {subtotal >= EMI_MINIMUM_ORDER && (
                                <p className="text-xs text-text-muted">
                                    EMI available from ₹{Math.round(subtotal / 6).toLocaleString('en-IN')}/month.{' '}
                                    <span className="text-trust cursor-pointer hover:underline">View plans</span>
                                </p>
                            )}

                            {/* CTA */}
                            <button
                                onClick={() => navigate('/checkout')}
                                className="w-full bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold py-md rounded-lg text-sm flex items-center justify-center gap-sm transition-colors duration-base"
                            >
                                Proceed to Buy ({totalItems} item{totalItems > 1 ? 's' : ''})
                                <ArrowRight size={16} />
                            </button>

                            <p className="text-xs text-center text-text-muted">
                                Secure Checkout powered by TechNova
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Cross-Sell Carousel ──────────────────────────────── */}
            {crossSell.length > 0 && cart.length > 0 && (
                <div className="mt-2xl">
                    <h2 className="text-lg font-bold text-text-primary mb-md">
                        Frequently Bought Together
                    </h2>
                    <div className="flex gap-md overflow-x-auto snap-x snap-mandatory pb-md scrollbar-thin">
                        {crossSell.map(product => (
                            <Link
                                key={product.id}
                                to={`/products/${product.id}`}
                                className="snap-start flex-shrink-0 w-[180px] bg-surface border border-border-default rounded-lg p-md hover:border-trust transition-colors duration-fast group"
                            >
                                <div className="w-full h-[120px] bg-page-bg border border-border-default rounded-lg flex items-center justify-center p-xs mb-sm">
                                    <img src={product.image} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-smooth" loading="lazy" />
                                </div>
                                <h3 className="text-xs font-medium text-text-primary line-clamp-2 mb-xs">{product.title}</h3>
                                <p className="text-sm font-bold text-text-primary">₹{product.price.toLocaleString('en-IN')}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── CartItemRow ──────────────────────────────────────────────────
function CartItemRow({ item, onQuantityChange, onRemove, onSaveForLater }) {
    const inStock = item.stock == null || item.stock > 0
    const isLowStock = item.stock != null && item.stock > 0 && item.stock < 5

    return (
        <div className="bg-surface border border-border-default rounded-lg p-md flex flex-wrap sm:flex-nowrap gap-md">
            {/* Image */}
            <Link to={`/products/${item.id}`} className="w-[100px] h-[100px] bg-page-bg border border-border-default rounded-lg flex items-center justify-center p-xs flex-shrink-0">
                <img src={item.image} alt={item.title} className="w-full h-full object-contain" loading="lazy" />
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <Link to={`/products/${item.id}`} className="text-sm font-medium text-text-primary hover:text-trust transition-colors duration-fast line-clamp-2">
                    {item.title}
                </Link>

                {item.variantName && item.variantName !== 'Standard' && (
                    <p className="text-xs text-text-muted mt-xs">
                        Variant: <span className="text-text-secondary">{item.variantName}</span>
                    </p>
                )}

                {/* Stock badge */}
                {!inStock ? (
                    <p className="text-xs text-deal font-medium mt-xs">Out of Stock</p>
                ) : isLowStock ? (
                    <p className="text-xs text-urgency font-medium mt-xs">Only {item.stock} left in stock</p>
                ) : (
                    <p className="text-xs text-success font-medium mt-xs">In Stock</p>
                )}

                {/* EMI line */}
                {item.price >= EMI_MINIMUM_ORDER && (
                    <p className="text-xs text-text-muted mt-xs">
                        EMI from ₹{Math.round(item.price / 6).toLocaleString('en-IN')}/mo
                    </p>
                )}

                {/* Quantity + Actions row */}
                <div className="flex flex-wrap items-center gap-md mt-md">
                    <QuantitySelector
                        value={item.quantity}
                        onChange={(newQty) => onQuantityChange(item.uniqueId, newQty)}
                    />
                    <span className="text-border-default">|</span>
                    <button onClick={onRemove} className="text-xs text-trust hover:underline">
                        Delete
                    </button>
                    <span className="text-border-default">|</span>
                    <button onClick={onSaveForLater} className="text-xs text-trust hover:underline">
                        Save for later
                    </button>
                </div>
            </div>

            {/* Price */}
            <div className="flex-shrink-0 text-right">
                <p className="text-lg font-bold text-text-primary">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </p>
                {item.quantity > 1 && (
                    <p className="text-xs text-text-muted">₹{item.price.toLocaleString('en-IN')} each</p>
                )}
            </div>
        </div>
    )
}

export default Cart
