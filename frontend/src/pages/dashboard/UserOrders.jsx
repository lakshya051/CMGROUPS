import React, { useState, useEffect, useMemo } from 'react'
import {
    Clock, CheckCircle, Package, Truck, MapPin, Eye, Copy, Shield, X,
    Download, Search, ChevronDown, ShoppingCart, Calendar, CircleDot,
    ClipboardCopy,
} from 'lucide-react'
import { ordersAPI } from '../../lib/api'
import { useShop } from '../../context/ShopContext'
import { useNavigate } from 'react-router-dom'
import { EmptyState, SkeletonCard } from '../../components/ui/index'
import toast from 'react-hot-toast'
import { getOrderLineThumbUrl, handleImageError } from '../../utils/image'

// ─── Order Timeline Steps ───────────────────────────────────────
const TIMELINE_STEPS = [
    { key: 'Processing', label: 'Processing', icon: Clock },
    { key: 'Confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'Shipped', label: 'Shipped', icon: Truck },
    { key: 'OutForDelivery', label: 'Out for Delivery', icon: MapPin },
    { key: 'Delivered', label: 'Delivered', icon: Package },
]

const STATUS_INDEX = {
    Processing: 0, Confirmed: 1, Shipped: 2, OutForDelivery: 3, Delivered: 4,
}

const TIME_FILTERS = [
    { label: 'All Orders', value: 'all' },
    { label: 'Past 3 Months', value: '3months' },
    { label: String(new Date().getFullYear()), value: String(new Date().getFullYear()) },
    { label: String(new Date().getFullYear() - 1), value: String(new Date().getFullYear() - 1) },
    { label: String(new Date().getFullYear() - 2), value: String(new Date().getFullYear() - 2) },
]

const UserOrders = () => {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [selectedOtp, setSelectedOtp] = useState(null)
    const [otpCopied, setOtpCopied] = useState(false)

    const [cancelOrderId, setCancelOrderId] = useState(null)
    const [returnOrderId, setReturnOrderId] = useState(null)
    const [reason, setReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState('')

    const [searchQuery, setSearchQuery] = useState('')
    const [timeFilter, setTimeFilter] = useState('all')
    const [trackingOrderId, setTrackingOrderId] = useState(null)

    const { addToCart } = useShop()
    const navigate = useNavigate()

    // ─── Fetch Orders ───────────────────────────────────────────
    useEffect(() => {
        setError(null)
        ordersAPI.getMyOrders({ limit: 100, page: 1 })
            .then(data => setOrders(data.orders || data))
            .catch(() => setError('We couldn\'t load your orders. Please try again.'))
            .finally(() => setLoading(false))
    }, [])

    // ─── Filtered Orders ────────────────────────────────────────
    const filteredOrders = useMemo(() => {
        let result = [...orders]

        // Time filter
        if (timeFilter !== 'all') {
            const now = new Date()
            result = result.filter(o => {
                const d = new Date(o.createdAt)
                if (timeFilter === '3months') {
                    const three = new Date()
                    three.setMonth(three.getMonth() - 3)
                    return d >= three
                }
                return String(d.getFullYear()) === timeFilter
            })
        }

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            result = result.filter(o => {
                if (String(o.id).includes(q)) return true
                return o.items?.some(i => i.product?.title?.toLowerCase().includes(q))
            })
        }

        return result
    }, [orders, timeFilter, searchQuery])

    // ─── Handlers ───────────────────────────────────────────────
    const handleBuyAgain = (order) => {
        let addedCount = 0
        const outOfStock = []

        order.items.forEach(item => {
            if (!item.product) return
            const stock = item.product.stock ?? 0
            if (stock <= 0) {
                outOfStock.push(item.product.title || 'Unknown Product')
                return
            }
            const qty = Math.min(item.quantity, stock)
            const variant = item.variantId
                ? { id: item.variantId, price: item.price, stock }
                : null
            addToCart(item.product, qty, variant)
            addedCount++
        })

        if (addedCount === 0) {
            toast.error(outOfStock.length > 0
                ? 'All items are currently out of stock'
                : 'No items could be added to cart')
            return
        }

        if (outOfStock.length > 0) {
            toast(`${outOfStock.length} item${outOfStock.length > 1 ? 's' : ''} skipped (out of stock)`, { icon: '⚠️' })
        }

        toast.success(`${addedCount} item${addedCount > 1 ? 's' : ''} added to cart!`)
        navigate('/cart')
    }

    const handleCancelOrder = async () => {
        if (!reason.trim()) { setActionError('Please provide a reason'); return }
        setActionLoading(true)
        setActionError('')
        try {
            await ordersAPI.cancel(cancelOrderId, reason)
            setOrders(prev => prev.map(o =>
                o.id === cancelOrderId ? { ...o, status: 'Cancelled', cancelReason: reason } : o
            ))
            setCancelOrderId(null)
            setReason('')
            toast.success('Order cancelled successfully')
        } catch (err) {
            setActionError(err.message || 'Failed to cancel order. Please try again.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleReturnOrder = async () => {
        if (!reason.trim()) { setActionError('Please provide a reason'); return }
        setActionLoading(true)
        setActionError('')
        try {
            await ordersAPI.returnOrder(returnOrderId, reason)
            setOrders(prev => prev.map(o =>
                o.id === returnOrderId ? { ...o, returnStatus: 'Requested', returnReason: reason } : o
            ))
            setReturnOrderId(null)
            setReason('')
            toast.success('Return requested successfully')
        } catch (err) {
            setActionError(err.message || 'Failed to request return. Please try again.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleDownloadInvoice = async (orderId) => {
        try {
            await ordersAPI.downloadInvoice(orderId)
        } catch {
            toast.error('Failed to download invoice. Please try again.')
        }
    }

    const isOrderReturnable = (order) => {
        if (order.status !== 'Delivered' || order.returnStatus !== 'None') return false
        let hasReturnable = false, maxWindowDays = 0
        if (order.items) {
            for (const item of order.items) {
                if (item.product?.isReturnable) {
                    hasReturnable = true
                    if (item.product.returnWindowDays > maxWindowDays) maxWindowDays = item.product.returnWindowDays
                }
            }
        }
        if (!hasReturnable) return false
        const refDate = order.deliveredAt || order.createdAt
        const expiryDate = new Date(refDate)
        expiryDate.setDate(expiryDate.getDate() + (order.deliveredAt ? maxWindowDays : maxWindowDays + 10))
        return new Date() <= expiryDate
    }

    const copyOtp = (otp) => {
        navigator.clipboard.writeText(otp)
        setOtpCopied(true)
        setTimeout(() => setOtpCopied(false), 2000)
    }

    const trackingOrder = useMemo(() =>
        orders.find(o => o.id === trackingOrderId), [orders, trackingOrderId]
    )

    // ─── Loading State ──────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-lg">
                <div className="bg-page-bg border border-border-default h-8 w-48 rounded animate-pulse" />
                <div className="bg-page-bg border border-border-default h-4 w-64 rounded animate-pulse" />
                <div className="space-y-md">
                    {[1, 2, 3].map(i => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        )
    }

    // ─── Error State ────────────────────────────────────────────
    if (error) {
        return (
            <div className="space-y-lg">
                <h1 className="text-3xl font-heading font-bold text-text-primary">My Orders</h1>
                <div className="bg-red-50 border border-red-200 rounded-lg p-lg text-center">
                    <p className="text-sm text-red-700 mb-sm">{error}</p>
                    <button onClick={() => window.location.reload()} className="text-sm text-trust hover:underline font-medium">
                        Try again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-lg min-w-0">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-text-primary mb-xs">My Orders</h1>
                <p className="text-sm text-text-secondary">Track your orders and payment status.</p>
            </div>

            {/* Search + Time Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-md min-w-0">
                <div className="relative flex-1 min-w-0">
                    <Search size={16} className="absolute left-md top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input
                        type="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        placeholder="Search by product name or order ID..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full min-w-0 pl-2xl pr-md py-sm border border-border-default rounded-lg text-base sm:text-sm focus:outline-none focus:border-trust transition-colors duration-fast"
                    />
                </div>
                <div className="relative w-full sm:w-auto sm:min-w-[160px] shrink-0">
                    <Calendar size={14} className="absolute left-md top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-[1]" />
                    <select
                        value={timeFilter}
                        onChange={e => setTimeFilter(e.target.value)}
                        className="w-full sm:w-auto appearance-none pl-2xl pr-xl py-sm border border-border-default rounded-lg text-base sm:text-sm bg-surface focus:outline-none focus:border-trust cursor-pointer transition-colors duration-fast"
                    >
                        {TIME_FILTERS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-md top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title={orders.length === 0 ? 'No orders yet' : 'No matching orders'}
                    subtitle={orders.length === 0 ? 'Your orders will appear here once you make a purchase.' : 'Try changing your search or time filter.'}
                    ctaLabel="Start Shopping →"
                    onCta={() => navigate('/products')}
                />
            ) : (
                <div className="space-y-md">
                    {filteredOrders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onCancel={() => setCancelOrderId(order.id)}
                            onReturn={() => setReturnOrderId(order.id)}
                            onBuyAgain={() => handleBuyAgain(order)}
                            onDownloadInvoice={() => handleDownloadInvoice(order.id)}
                            onViewOtp={() => setSelectedOtp(order.paymentOtp)}
                            onTrack={() => setTrackingOrderId(order.id)}
                            isReturnable={isOrderReturnable(order)}
                        />
                    ))}
                </div>
            )}

            {/* Cancel Modal */}
            {cancelOrderId && (
                <ActionModal
                    title={`Cancel Order #${cancelOrderId}`}
                    description="Are you sure? Any paid amount will be refunded to your wallet."
                    placeholder="Reason for cancellation..."
                    confirmLabel="Confirm Cancel"
                    confirmClass="bg-error hover:bg-red-600 text-white"
                    reason={reason}
                    onReasonChange={setReason}
                    onConfirm={handleCancelOrder}
                    onClose={() => { setCancelOrderId(null); setReason(''); setActionError('') }}
                    loading={actionLoading}
                    error={actionError}
                />
            )}

            {/* Return Modal */}
            {returnOrderId && (
                <ActionModal
                    title={`Return Order #${returnOrderId}`}
                    description="Why are you returning this item?"
                    placeholder="Reason for return..."
                    confirmLabel="Request Return"
                    confirmClass="bg-trust hover:opacity-90 text-white"
                    reason={reason}
                    onReasonChange={setReason}
                    onConfirm={handleReturnOrder}
                    onClose={() => { setReturnOrderId(null); setReason(''); setActionError('') }}
                    loading={actionLoading}
                    error={actionError}
                />
            )}

            {/* OTP Modal */}
            {selectedOtp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-lg pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-lg">
                    <div className="bg-surface rounded-t-2xl sm:rounded-xl p-xl max-w-sm w-full max-h-[90dvh] overflow-y-auto mx-0 sm:mx-lg relative shadow-glass">
                        <button onClick={() => setSelectedOtp(null)} className="absolute top-lg right-lg text-text-muted hover:text-text-primary transition-colors duration-fast" aria-label="Close dialog">
                            <X size={20} />
                        </button>
                        <div className="text-center space-y-lg">
                            <div className="w-16 h-16 bg-trust/10 text-trust rounded-full flex items-center justify-center mx-auto">
                                <Shield size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-heading font-bold text-text-primary mb-xs">Payment OTP</h3>
                                <p className="text-text-secondary text-sm">Share this code with store staff or delivery agent</p>
                            </div>
                            <div
                                onClick={() => copyOtp(selectedOtp)}
                                className="bg-surface-hover border-2 border-dashed border-border-default rounded-xl p-lg cursor-pointer hover:border-trust/50 transition-colors duration-fast group relative"
                            >
                                <div className="text-3xl font-mono font-bold tracking-[0.2em] text-text-primary">{selectedOtp}</div>
                                <div className="absolute inset-0 flex items-center justify-center bg-white/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-smooth rounded-xl font-medium text-trust gap-sm">
                                    <Copy size={16} /> {otpCopied ? 'Copied!' : 'Tap to Copy'}
                                </div>
                            </div>
                            <p className="text-xs text-text-muted">Valid for payment confirmation upon delivery</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tracking Modal */}
            {trackingOrder && (
                <TrackingModal
                    order={trackingOrder}
                    onClose={() => setTrackingOrderId(null)}
                />
            )}
        </div>
    )
}

// ─── OrderCard ──────────────────────────────────────────────────
function OrderCard({ order, onCancel, onReturn, onBuyAgain, onDownloadInvoice, onViewOtp, onTrack, isReturnable }) {
    const navigate = useNavigate()
    const isCancelled = order.status === 'Cancelled'
    const thumbnails = (order.items || []).slice(0, 3)

    return (
        <div className="bg-surface border border-border-default rounded-lg overflow-hidden min-w-0">
            {/* Order header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md p-md border-b border-border-default bg-surface-hover min-w-0">
                <div className="flex items-center gap-md min-w-0">
                    {/* Product thumbnails (stacked) */}
                    <div className="flex -space-x-3">
                        {thumbnails.map((item, i) => (
                            <div
                                key={item.id}
                                className="w-10 h-10 bg-white border border-border-default rounded-lg p-xs flex-shrink-0"
                                style={{ zIndex: thumbnails.length - i }}
                            >
                                <img
                                    src={getOrderLineThumbUrl(item)}
                                    alt=""
                                    loading="lazy"
                                    width={40}
                                    height={40}
                                    onError={handleImageError}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-text-primary truncate">
                            <button onClick={() => navigate(`/dashboard/orders/${order.id}`)} className="hover:text-trust transition-colors underline-offset-2 hover:underline">Order #{order.id}</button>
                        </h3>
                        <p className="text-xs text-text-muted">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-sm flex-wrap sm:justify-end">
                    <StatusBadge
                        label={order.isPaid ? '✓ Paid' : '⏳ Unpaid'}
                        color={order.isPaid ? 'success' : 'warning'}
                    />
                    <StatusBadge
                        label={order.status}
                        color={isCancelled ? 'error' : order.status === 'Delivered' ? 'success' : 'trust'}
                    />
                </div>
            </div>

            {/* Timeline */}
            {!isCancelled && (
                <div className="px-md py-md -mx-px">
                    <OrderTimeline status={order.status} />
                </div>
            )}

            {isCancelled && order.cancelReason && (
                <div className="px-md py-sm">
                    <p className="text-xs text-error">Cancelled: {order.cancelReason}</p>
                </div>
            )}

            {/* Items */}
            <div className="px-md pb-sm space-y-xs min-w-0">
                {order.items?.map(item => (
                    <div key={item.id} className="flex items-start sm:items-center gap-sm text-sm bg-page-bg border border-border-default rounded-lg p-sm min-w-0">
                        <div className="w-10 h-10 bg-surface border border-border-default rounded p-xs flex-shrink-0">
                            <img
                                src={getOrderLineThumbUrl(item)}
                                alt=""
                                loading="lazy"
                                width={40}
                                height={40}
                                onError={handleImageError}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-text-primary text-sm line-clamp-2 break-words">{item.product?.title}</span>
                            <div className="mt-xs flex items-center justify-between gap-sm sm:hidden">
                                <span className="text-text-muted text-xs">Qty ×{item.quantity}</span>
                                <span className="font-bold text-sm text-text-primary shrink-0">₹{item.price.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                        <span className="hidden sm:inline text-text-muted text-xs shrink-0">×{item.quantity}</span>
                        <span className="hidden sm:inline font-bold text-sm text-text-primary shrink-0">₹{item.price.toLocaleString('en-IN')}</span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-md p-md border-t border-border-default min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-xs">
                    <span className="text-xs text-text-muted">
                        {order.paymentMethod === 'pay_at_store' ? 'Pay at Store'
                            : order.paymentMethod === 'cod' ? 'Cash on Delivery'
                                : order.paymentMethod === 'wallet' ? 'Wallet'
                                    : order.paymentMethod}
                    </span>
                    <span className="text-lg font-bold text-text-primary">₹{order.total?.toLocaleString('en-IN')}</span>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-sm">
                    {/* Buy Again — only for Delivered */}
                    {order.status === 'Delivered' && (
                        <button
                            onClick={onBuyAgain}
                            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-xs px-md py-sm sm:py-xs text-sm font-bold bg-buy-primary hover:bg-buy-primary-hover text-text-primary rounded-lg transition-colors duration-fast"
                        >
                            <ShoppingCart size={14} /> Buy Again
                        </button>
                    )}

                    {/* Track */}
                    {!isCancelled && order.status !== 'Delivered' && (
                        <button
                            onClick={onTrack}
                            className="flex items-center justify-center gap-xs px-md py-sm sm:py-xs text-sm text-trust bg-trust/10 hover:bg-trust/20 rounded-lg transition-colors duration-fast"
                        >
                            <Eye size={14} /> Track
                        </button>
                    )}

                    {/* Cancel */}
                    {order.status === 'Processing' && (
                        <button onClick={onCancel} className="px-md py-sm sm:py-xs text-sm text-error bg-error/10 hover:bg-error/20 rounded-lg transition-colors duration-fast">
                            Cancel
                        </button>
                    )}

                    {/* Return */}
                    {isReturnable && (
                        <button onClick={onReturn} className="px-md py-sm sm:py-xs text-sm text-trust bg-trust/10 hover:bg-trust/20 rounded-lg transition-colors duration-fast">
                            Return
                        </button>
                    )}

                    {order.status === 'Delivered' && !isReturnable && order.returnStatus === 'None' && (
                        <span className="col-span-2 sm:col-span-1 px-md py-sm sm:py-xs text-sm text-text-muted bg-page-bg border border-border-default rounded-lg text-center sm:text-left" title="Return window expired">
                            Not Returnable
                        </span>
                    )}

                    {order.returnStatus !== 'None' && (
                        <span className="col-span-2 sm:col-span-1 px-md py-sm sm:py-xs text-sm text-purple-600 bg-purple-50 rounded-lg text-center sm:text-left">
                            Return: {order.returnStatus}
                        </span>
                    )}

                    {/* Invoice */}
                    {order.isPaid && !isCancelled && (
                        <button onClick={onDownloadInvoice} className="flex items-center justify-center gap-xs px-md py-sm sm:py-xs text-sm text-trust bg-trust/10 hover:bg-trust/20 rounded-lg transition-colors duration-fast">
                            <Download size={14} /> Invoice
                        </button>
                    )}

                    {/* OTP */}
                    {!order.isPaid && (order.paymentMethod === 'pay_at_store' || order.paymentMethod === 'cod') && !isCancelled && order.paymentOtp && (
                        <button onClick={onViewOtp} className="col-span-2 sm:col-span-1 flex items-center justify-center gap-xs px-md py-sm sm:py-xs text-sm text-surface bg-text-primary rounded-lg hover:bg-black transition-colors duration-fast">
                            <Shield size={14} /> View OTP
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── OrderTimeline ──────────────────────────────────────────────
function OrderTimeline({ status }) {
    const currentIdx = STATUS_INDEX[status] ?? -1

    return (
        <div className="flex items-center w-full min-w-0 overflow-x-auto overflow-y-hidden pb-sm -mb-sm scrollbar-hide touch-pan-x">
            {TIMELINE_STEPS.map((step, i) => {
                const isCompleted = i <= currentIdx
                const isCurrent = i === currentIdx
                const Icon = step.icon
                const isLast = i === TIMELINE_STEPS.length - 1

                return (
                    <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center flex-shrink-0 min-w-[64px]">
                            <div
                                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-smooth border
                  ${isCompleted ? 'bg-success text-white border-success' : 'bg-page-bg border-border-default text-text-muted'}
                  ${isCurrent ? 'ring-2 ring-success/40 animate-pulse' : ''}
                `}
                            >
                                <Icon size={14} />
                            </div>
                            <span className={`text-[10px] mt-xs text-center leading-tight ${isCompleted ? 'text-success font-medium' : 'text-text-muted'}`}>
                                {step.label}
                            </span>
                        </div>
                        {!isLast && (
                            <div className={`flex-1 h-0.5 min-w-[20px] mx-xs ${i < currentIdx ? 'bg-success' : 'bg-border-default'}`} />
                        )}
                    </React.Fragment>
                )
            })}
        </div>
    )
}

// ─── StatusBadge ────────────────────────────────────────────────
function StatusBadge({ label, color }) {
    const colors = {
        success: 'text-success bg-success/10 border-success/20',
        warning: 'text-warning bg-warning/10 border-warning/20',
        error: 'text-error bg-error/10 border-error/20',
        trust: 'text-trust bg-trust/10 border-trust/20',
    }
    return (
        <span className={`px-sm py-xs rounded text-xs font-bold border ${colors[color] || colors.trust}`}>
            {label}
        </span>
    )
}

// ─── ActionModal ────────────────────────────────────────────────
function ActionModal({ title, description, placeholder, confirmLabel, confirmClass, reason, onReasonChange, onConfirm, onClose, loading, error }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-lg pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-lg">
            <div className="bg-surface rounded-t-2xl sm:rounded-xl p-lg max-w-sm w-full max-h-[90dvh] overflow-y-auto mx-0 sm:mx-lg relative shadow-glass">
                <h3 className="text-lg font-bold text-text-primary mb-sm">{title}</h3>
                <p className="text-sm text-text-secondary mb-md">{description}</p>
                <textarea
                    className="w-full border border-border-default rounded-lg px-md py-sm text-sm mb-sm focus:outline-none focus:border-trust transition-colors duration-fast resize-none"
                    rows={3}
                    placeholder={placeholder}
                    value={reason}
                    onChange={e => onReasonChange(e.target.value)}
                />
                {error && <p className="text-xs text-error mb-sm">{error}</p>}
                <div className="flex justify-end gap-sm">
                    <button onClick={onClose} className="px-md py-sm text-sm text-text-secondary hover:text-text-primary transition-colors duration-fast">
                        Close
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-md py-sm rounded-lg text-sm font-medium disabled:opacity-50 transition-colors duration-fast ${confirmClass}`}
                    >
                        {loading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── TrackingModal ──────────────────────────────────────────────
function TrackingModal({ order, onClose }) {
    const trackingNumber = order.trackingNumber || `TN${order.id}${String(order.id * 2654435761 >>> 0).slice(-6)}`
    const [copied, setCopied] = useState(false)

    const copyTracking = () => {
        navigator.clipboard.writeText(trackingNumber)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Simulated scan events based on status
    const scanEvents = useMemo(() => {
        const events = []
        const base = new Date(order.createdAt)

        events.push({ time: base.toLocaleString('en-IN'), event: 'Order Placed', location: 'Online' })

        if (STATUS_INDEX[order.status] >= 1) {
            const d = new Date(base); d.setHours(d.getHours() + 2)
            events.push({ time: d.toLocaleString('en-IN'), event: 'Order Confirmed', location: 'Warehouse' })
        }
        if (STATUS_INDEX[order.status] >= 2) {
            const d = new Date(base); d.setDate(d.getDate() + 1)
            events.push({ time: d.toLocaleString('en-IN'), event: 'Shipped from Warehouse', location: 'Distribution Center' })
        }
        if (STATUS_INDEX[order.status] >= 3) {
            const d = new Date(base); d.setDate(d.getDate() + 2)
            events.push({ time: d.toLocaleString('en-IN'), event: 'Out for Delivery', location: 'Local Facility' })
        }
        if (STATUS_INDEX[order.status] >= 4) {
            const d = order.deliveredAt ? new Date(order.deliveredAt) : new Date(base)
            if (!order.deliveredAt) d.setDate(d.getDate() + 3)
            events.push({ time: d.toLocaleString('en-IN'), event: 'Delivered', location: 'Destination' })
        }

        return events.reverse()
    }, [order])

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

            {/* Panel — slides from right on desktop, bottom sheet on mobile */}
            <div
                className="fixed z-[60] flex flex-col bg-surface shadow-glass
                inset-x-0 bottom-0 top-auto max-h-[85vh] rounded-t-2xl w-full
                sm:inset-y-0 sm:top-0 sm:bottom-0 sm:left-auto sm:right-0 sm:max-h-none sm:rounded-none sm:w-[420px]
                pb-[env(safe-area-inset-bottom,0px)]"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-lg border-b border-border-default shrink-0">
                    <h3 className="text-lg font-bold text-text-primary">Track Order #{order.id}</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors duration-fast" aria-label="Close dialog">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto scrollable p-lg space-y-xl">
                    {/* Tracking number */}
                    <div className="flex items-center justify-between bg-page-bg border border-border-default rounded-lg p-md">
                        <div>
                            <p className="text-xs text-text-muted">Tracking Number</p>
                            <p className="text-sm font-mono font-bold text-text-primary">{trackingNumber}</p>
                        </div>
                        <button
                            onClick={copyTracking}
                            className="text-trust hover:text-text-primary transition-colors duration-fast"
                            title="Copy tracking number"
                        >
                            {copied ? <CheckCircle size={18} className="text-success" /> : <ClipboardCopy size={18} />}
                        </button>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h4 className="text-sm font-bold text-text-primary mb-md">Delivery Status</h4>
                        <OrderTimeline status={order.status} />
                    </div>

                    {/* Scan Events */}
                    <div>
                        <h4 className="text-sm font-bold text-text-primary mb-md">Scan History</h4>
                        <div className="space-y-md">
                            {scanEvents.map((ev, i) => (
                                <div key={i} className="flex gap-md">
                                    <div className="flex flex-col items-center">
                                        <CircleDot size={14} className={i === 0 ? 'text-success' : 'text-text-muted'} />
                                        {i < scanEvents.length - 1 && <div className="w-px flex-1 bg-border-default mt-xs" />}
                                    </div>
                                    <div className="pb-md">
                                        <p className="text-sm font-medium text-text-primary">{ev.event}</p>
                                        <p className="text-xs text-text-muted">{ev.time}</p>
                                        <p className="text-xs text-text-secondary">{ev.location}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default UserOrders
