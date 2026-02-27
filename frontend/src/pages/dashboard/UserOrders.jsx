import React, { useState, useEffect, useMemo } from 'react'
import {
    Clock, CheckCircle, Package, Truck, MapPin, Eye, Copy, Shield, X,
    Download, Search, ChevronDown, ShoppingCart, Calendar, CircleDot,
    XCircle, ClipboardCopy,
} from 'lucide-react'
import { ordersAPI } from '../../lib/api'
import { useShop } from '../../context/ShopContext'
import { useNavigate } from 'react-router-dom'
import { EmptyState, SkeletonCard } from '../../components/ui/index'
import toast from 'react-hot-toast'

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
    { label: '2025', value: '2025' },
    { label: '2024', value: '2024' },
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
        ordersAPI.getMyOrders()
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
        order.items.forEach(item => {
            if (item.product) addToCart(item.product, item.quantity)
        })
        toast.success('Items added to cart!')
        navigate('/checkout')
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
                <div className="bg-gray-200 h-8 w-48 rounded animate-pulse" />
                <div className="bg-gray-200 h-4 w-64 rounded animate-pulse" />
                <div className="space-y-md">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-surface border border-border-default rounded-lg p-lg animate-pulse">
                            <div className="flex gap-md">
                                <div className="w-16 h-16 bg-gray-200 rounded" />
                                <div className="flex-1 space-y-sm">
                                    <div className="bg-gray-200 h-4 w-3/4 rounded" />
                                    <div className="bg-gray-200 h-3 w-1/2 rounded" />
                                    <div className="bg-gray-200 h-3 w-1/4 rounded" />
                                </div>
                            </div>
                        </div>
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
        <div className="space-y-lg">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary mb-xs">My Orders</h1>
                <p className="text-sm text-text-secondary">Track your orders and payment status.</p>
            </div>

            {/* Search + Time Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-md">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-md top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search by product name or order ID..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-2xl pr-md py-sm border border-border-default rounded-lg text-sm focus:outline-none focus:border-trust transition-colors duration-fast"
                    />
                </div>
                <div className="relative">
                    <Calendar size={14} className="absolute left-md top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <select
                        value={timeFilter}
                        onChange={e => setTimeFilter(e.target.value)}
                        className="appearance-none pl-2xl pr-xl py-sm border border-border-default rounded-lg text-sm bg-surface focus:outline-none focus:border-trust cursor-pointer transition-colors duration-fast"
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-surface rounded-xl p-xl max-w-sm w-full mx-lg relative shadow-glass">
                        <button onClick={() => setSelectedOtp(null)} className="absolute top-lg right-lg text-text-muted hover:text-text-primary transition-colors duration-fast">
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
                                className="bg-gray-50 border-2 border-dashed border-border-default rounded-xl p-lg cursor-pointer hover:border-trust/50 transition-colors duration-fast group relative"
                            >
                                <div className="text-3xl font-mono font-bold tracking-[0.2em] text-text-primary">{selectedOtp}</div>
                                <div className="absolute inset-0 flex items-center justify-center bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-smooth rounded-xl font-medium text-trust gap-sm">
                                    <Copy size={16} /> {otpCopied ? 'Copied!' : 'Click to Copy'}
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
    const isCancelled = order.status === 'Cancelled'
    const thumbnails = (order.items || []).filter(i => i.product?.image).slice(0, 3)

    return (
        <div className="bg-surface border border-border-default rounded-lg overflow-hidden">
            {/* Order header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md p-md border-b border-border-default bg-surface-hover">
                <div className="flex items-center gap-md">
                    {/* Product thumbnails (stacked) */}
                    <div className="flex -space-x-3">
                        {thumbnails.map((item, i) => (
                            <div
                                key={item.id}
                                className="w-10 h-10 bg-white border border-border-default rounded-lg p-xs flex-shrink-0"
                                style={{ zIndex: thumbnails.length - i }}
                            >
                                <img src={item.product.image} alt="" className="w-full h-full object-contain" />
                            </div>
                        ))}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-text-primary">Order #{order.id}</h3>
                        <p className="text-xs text-text-muted">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-sm flex-wrap">
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
                <div className="px-md py-md">
                    <OrderTimeline status={order.status} />
                </div>
            )}

            {isCancelled && order.cancelReason && (
                <div className="px-md py-sm">
                    <p className="text-xs text-error">Cancelled: {order.cancelReason}</p>
                </div>
            )}

            {/* Items */}
            <div className="px-md pb-sm space-y-xs">
                {order.items?.map(item => (
                    <div key={item.id} className="flex items-center gap-sm text-sm bg-gray-50 rounded-lg p-sm">
                        <div className="w-10 h-10 bg-white rounded p-xs flex-shrink-0">
                            <img src={item.product?.image} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="flex-1 text-text-primary text-sm line-clamp-1">{item.product?.title}</span>
                        <span className="text-text-muted text-xs">×{item.quantity}</span>
                        <span className="font-bold text-sm text-text-primary">₹{item.price.toLocaleString('en-IN')}</span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md p-md border-t border-border-default">
                <div className="flex items-center gap-md">
                    <span className="text-xs text-text-muted">
                        {order.paymentMethod === 'pay_at_store' ? 'Pay at Store'
                            : order.paymentMethod === 'cod' ? 'Cash on Delivery'
                                : order.paymentMethod === 'wallet' ? 'Wallet'
                                    : order.paymentMethod}
                    </span>
                    <span className="text-lg font-bold text-text-primary">₹{order.total?.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex flex-wrap gap-sm">
                    {/* Buy Again — only for Delivered */}
                    {order.status === 'Delivered' && (
                        <button
                            onClick={onBuyAgain}
                            className="flex items-center gap-xs px-md py-xs text-sm font-bold bg-buy-primary hover:bg-buy-primary-hover text-text-primary rounded-lg transition-colors duration-fast"
                        >
                            <ShoppingCart size={14} /> Buy Again
                        </button>
                    )}

                    {/* Track */}
                    {!isCancelled && order.status !== 'Delivered' && (
                        <button
                            onClick={onTrack}
                            className="flex items-center gap-xs px-md py-xs text-sm text-trust bg-trust/10 hover:bg-trust/20 rounded-lg transition-colors duration-fast"
                        >
                            <Eye size={14} /> Track
                        </button>
                    )}

                    {/* Cancel */}
                    {order.status === 'Processing' && (
                        <button onClick={onCancel} className="px-md py-xs text-sm text-error bg-error/10 hover:bg-error/20 rounded-lg transition-colors duration-fast">
                            Cancel
                        </button>
                    )}

                    {/* Return */}
                    {isReturnable && (
                        <button onClick={onReturn} className="px-md py-xs text-sm text-trust bg-trust/10 hover:bg-trust/20 rounded-lg transition-colors duration-fast">
                            Return
                        </button>
                    )}

                    {order.status === 'Delivered' && !isReturnable && order.returnStatus === 'None' && (
                        <span className="px-md py-xs text-sm text-text-muted bg-gray-100 rounded-lg" title="Return window expired">
                            Not Returnable
                        </span>
                    )}

                    {order.returnStatus !== 'None' && (
                        <span className="px-md py-xs text-sm text-purple-600 bg-purple-50 rounded-lg">
                            Return: {order.returnStatus}
                        </span>
                    )}

                    {/* Invoice */}
                    {order.isPaid && !isCancelled && (
                        <button onClick={onDownloadInvoice} className="flex items-center gap-xs px-md py-xs text-sm text-trust bg-trust/10 hover:bg-trust/20 rounded-lg transition-colors duration-fast">
                            <Download size={14} /> Invoice
                        </button>
                    )}

                    {/* OTP */}
                    {!order.isPaid && (order.paymentMethod === 'pay_at_store' || order.paymentMethod === 'cod') && !isCancelled && order.paymentOtp && (
                        <button onClick={onViewOtp} className="flex items-center gap-xs px-md py-xs text-sm text-text-primary bg-gray-900 text-white rounded-lg hover:bg-black transition-colors duration-fast">
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
        <div className="flex items-center w-full overflow-x-auto">
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
                  w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-smooth
                  ${isCompleted ? 'bg-success text-white' : 'bg-gray-200 text-text-muted'}
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
                            <div className={`flex-1 h-0.5 min-w-[20px] mx-xs ${i < currentIdx ? 'bg-success' : 'bg-gray-200'}`} />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-surface rounded-xl p-lg max-w-sm w-full mx-lg relative shadow-glass">
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
    const trackingNumber = order.trackingNumber || `TN${order.id}${Date.now().toString(36).toUpperCase().slice(-6)}`
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
            <div className="fixed z-50 inset-y-0 right-0 w-full sm:w-[420px] bg-surface shadow-glass flex flex-col
        sm:animate-none
        max-sm:inset-y-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:rounded-t-2xl max-sm:max-h-[85vh]
      ">
                {/* Header */}
                <div className="flex items-center justify-between p-lg border-b border-border-default">
                    <h3 className="text-lg font-bold text-text-primary">Track Order #{order.id}</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors duration-fast">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-lg space-y-xl">
                    {/* Tracking number */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-md">
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
