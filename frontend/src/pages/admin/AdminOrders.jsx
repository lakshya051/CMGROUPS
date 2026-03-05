import React, { useState, useEffect } from 'react';
import {
    ShoppingBag, Search, Eye, CheckCircle, Truck, XCircle,
    Shield, X, MapPin, User, Package, CreditCard, Tag, Calendar,
    ChevronRight, Wallet, Download, ExternalLink
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { ordersAPI } from '../../lib/api';
import SectionLoader from '../../components/ui/SectionLoader';
import { handleImageError } from '../../utils/image';

// ─── Order Detail Modal ────────────────────────────────────────────────────────

const OrderDetailModal = ({ order, onClose, onStatusUpdate, onVerifyPayment }) => {
    if (!order) return null;

    const addr = order.shippingAddress;
    const customerName = order.user?.name || order.guestInfo?.name || 'Guest';
    const customerEmail = order.user?.email || order.guestInfo?.email || '—';
    const customerPhone = order.user?.phone || order.guestInfo?.phone || '—';

    const statusColors = {
        Processing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        Confirmed: 'text-success bg-success/10 border-success/20',
        Shipped: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        Delivered: 'text-success bg-success/10 border-success/20',
        Cancelled: 'text-error bg-error/10 border-error/20',
    };

    const displayStatus =
        order.returnStatus === 'Requested' ? 'Return Requested' :
            order.returnStatus === 'Completed' ? 'Returned' :
                order.status;

    const statusColor =
        order.returnStatus === 'Requested' ? 'text-purple-500 bg-purple-500/10 border-purple-500/20' :
            order.returnStatus === 'Completed' ? 'text-purple-700 bg-purple-500/20 border-purple-500/30' :
                (statusColors[order.status] || 'text-text-muted bg-page-bg border-border-default');

    const subtotal = order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
    const walletUsed = order.walletUsed || 0;
    const addressLine1 = addr?.address || addr?.line1 || null;
    const addressLine2 = addr?.line2 || null;
    const postalCode = addr?.postalCode || addr?.pincode || addr?.zip || addr?.zipCode || null;
    const lat = Number(order.latitude);
    const lng = Number(order.longitude);
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
    const googleMapsUrl =
        order.googleMapLink ||
        addr?.googleMapLink ||
        (hasCoordinates ? `https://www.google.com/maps?q=${lat},${lng}` : null);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                className="bg-surface rounded-xl border border-border-default shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-border-default bg-page-bg flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-bold text-text-primary">Order #{order.id}</h2>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusColor}`}>
                                {displayStatus}
                            </span>
                            {order.isPaid ? (
                                <span className="flex items-center gap-1 text-success text-xs font-bold bg-success/10 px-2 py-0.5 rounded border border-success/20">
                                    <CheckCircle size={11} /> PAID
                                </span>
                            ) : (
                                <span className="text-orange-400 text-xs font-bold bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20">UNPAID</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
                            <Calendar size={12} />
                            {new Date(order.createdAt).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                            {order.deliveredAt && (
                                <span className="ml-2 text-success">
                                    · Delivered {new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-text-primary flex-shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5">

                    {/* ── Ordered Items ─────────────────────────────── */}
                    <section>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 uppercase tracking-wide">
                            <Package size={15} className="text-text-muted" /> Ordered Items
                        </h3>
                        <div className="border border-border-default rounded-lg overflow-hidden divide-y divide-border-default">
                            {order.items?.length > 0 ? order.items.map((item, idx) => {
                                const product = item.product || {};
                                return (
                                    <div key={idx} className="flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors">
                                        {/* Product Image */}
                                        <div className="w-14 h-14 rounded-lg bg-page-bg border border-border-default flex-shrink-0 overflow-hidden">
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.title}
                                                    loading="lazy"
                                                    width={56}
                                                    height={56}
                                                    onError={handleImageError}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-text-muted">
                                                    <ShoppingBag size={20} />
                                                </div>
                                            )}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-text-primary truncate">
                                                {product.title || `Product #${item.productId}`}
                                            </p>
                                            {item.variantId && (
                                                <p className="text-xs text-text-muted">Variant ID: {item.variantId}</p>
                                            )}
                                            <p className="text-xs text-text-secondary mt-0.5">
                                                ₹{item.price?.toLocaleString()} × {item.quantity}
                                            </p>
                                        </div>
                                        {/* Subtotal */}
                                        <div className="text-sm font-bold text-text-primary flex-shrink-0">
                                            ₹{(item.price * item.quantity).toLocaleString()}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="p-4 text-center text-text-muted text-sm">No items found</div>
                            )}
                        </div>
                    </section>

                    {/* ── Order Summary ──────────────────────────────── */}
                    <section className="bg-page-bg rounded-lg border border-border-default p-4 space-y-2">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 uppercase tracking-wide">
                            <CreditCard size={15} className="text-text-muted" /> Order Summary
                        </h3>
                        <Row label="Subtotal" value={`₹${subtotal.toLocaleString()}`} />
                        {walletUsed > 0 && (
                            <Row
                                label={<span className="flex items-center gap-1"><Wallet size={13} /> Wallet Used</span>}
                                value={`−₹${walletUsed.toLocaleString()}`}
                                valueClass="text-success"
                            />
                        )}
                        <div className="border-t border-border-default pt-2 mt-1">
                            <Row label="Total Paid" value={`₹${order.total?.toLocaleString()}`} bold />
                        </div>
                        <Row
                            label="Payment Method"
                            value={<span className="uppercase font-bold">{order.paymentMethod?.replace('_', ' ')}</span>}
                        />
                        {order.referralCodeUsed && (
                            <Row
                                label={<span className="flex items-center gap-1"><Tag size={13} /> Referral Code Used</span>}
                                value={<span className="font-mono text-trust">{order.referralCodeUsed}</span>}
                            />
                        )}
                    </section>

                    {/* Two-col: Customer + Shipping */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* ── Customer Info ──────────────────────────── */}
                        <section className="bg-page-bg rounded-lg border border-border-default p-4">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 uppercase tracking-wide">
                                <User size={15} className="text-text-muted" /> Customer
                                {!order.user && <span className="ml-auto text-xs font-normal text-text-muted normal-case">Guest</span>}
                            </h3>
                            <p className="font-semibold text-sm text-text-primary">{customerName}</p>
                            <p className="text-xs text-text-secondary mt-0.5 break-all">{customerEmail}</p>
                            {customerPhone && customerPhone !== '—' && (
                                <p className="text-xs text-text-secondary mt-0.5">{customerPhone}</p>
                            )}
                        </section>

                        {/* ── Shipping Address ───────────────────────── */}
                        <section className="bg-page-bg rounded-lg border border-border-default p-4">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 uppercase tracking-wide">
                                <MapPin size={15} className="text-text-muted" /> Shipping Address
                            </h3>
                            {addr ? (
                                <div className="space-y-2">
                                    <address className="not-italic text-xs text-text-secondary leading-relaxed space-y-0.5">
                                    <p className="font-semibold text-sm text-text-primary">{addr.fullName || addr.name}</p>
                                    {addressLine1 && <p>{addressLine1}</p>}
                                    {addressLine2 && <p>{addressLine2}</p>}
                                    {(addr.city || addr.state) && <p>{[addr.city, addr.state].filter(Boolean).join(', ')}</p>}
                                    {postalCode && <p>PIN: {postalCode}</p>}
                                    {addr.phone && <p>📞 {addr.phone}</p>}
                                </address>
                                {googleMapsUrl && (
                                    <a
                                        href={googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-trust hover:text-trust/80 border border-trust/40 hover:border-trust rounded-lg px-2.5 py-1.5 transition-colors"
                                    >
                                        <ExternalLink size={12} />
                                        Open in Google Maps
                                    </a>
                                )}
                                </div>
                            ) : (
                                <p className="text-xs text-text-muted">No shipping address provided</p>
                            )}
                        </section>
                    </div>

                    {/* ── Notes / Reasons ────────────────────────────── */}
                    {(order.cancelReason || order.returnReason || order.returnStatus) && (
                        <section className="bg-error/5 border border-error/20 rounded-lg p-4 space-y-1">
                            {order.cancelReason && (
                                <p className="text-xs text-error"><span className="font-bold">Cancel reason:</span> {order.cancelReason}</p>
                            )}
                            {order.returnReason && (
                                <p className="text-xs text-purple-500"><span className="font-bold">Return reason:</span> {order.returnReason}</p>
                            )}
                        </section>
                    )}

                    {/* ── Admin Actions ──────────────────────────────── */}
                    <section className="bg-page-bg rounded-lg border border-border-default p-4">
                        <h3 className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wide">Actions</h3>
                        <div className="flex flex-wrap items-center gap-3">
                            {order.returnStatus === 'Requested' ? (
                                <>
                                    <Button
                                        variant="primary"
                                        onClick={() => { onStatusUpdate(order.id, 'approve-return'); onClose(); }}
                                        className="flex items-center gap-1.5"
                                    >
                                        <CheckCircle size={15} /> Approve Return & Refund
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => { onStatusUpdate(order.id, 'reject-return'); onClose(); }}
                                        className="flex items-center gap-1.5 text-error"
                                    >
                                        <XCircle size={15} /> Reject Return
                                    </Button>
                                </>
                            ) : (
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div>
                                        <label className="block text-xs text-text-muted mb-1">Update Status</label>
                                        <select
                                            className="text-sm border border-border-default rounded-lg px-3 py-1.5 bg-surface text-text-primary focus:outline-none focus:border-trust"
                                            value={order.status}
                                            onChange={e => onStatusUpdate(order.id, e.target.value)}
                                            disabled={order.status === 'Cancelled' || order.status === 'Delivered'}
                                        >
                                            <option value="Processing">Processing</option>
                                            <option value="Confirmed">Confirmed</option>
                                            <option value="Shipped">Shipped</option>
                                            <option value="Delivered">Delivered</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    {!order.isPaid && (order.paymentMethod === 'pay_at_store' || order.paymentMethod === 'cod') && order.status !== 'Cancelled' && (
                                        <div>
                                            <label className="block text-xs text-text-muted mb-1">Payment</label>
                                            <Button
                                                variant="outline"
                                                onClick={() => onVerifyPayment(order.id)}
                                                className="flex items-center gap-1.5 text-trust border-trust hover:bg-trust hover:text-white"
                                            >
                                                <Shield size={15} /> Verify Payment OTP
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

// Small helper for summary rows
const Row = ({ label, value, bold, valueClass }) => (
    <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className={`${bold ? 'font-bold text-text-primary text-base' : 'text-text-primary font-medium'} ${valueClass || ''}`}>
            {value}
        </span>
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);

    // Detail modal
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Verification state
    const [verifyingOrderId, setVerifyingOrderId] = useState(null);
    const [otpInput, setOtpInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const params = {
                    page,
                    limit: 20,
                    status: filter !== 'All' ? filter : undefined,
                    search: searchTerm || undefined
                };
                const res = await ordersAPI.getAll(params);
                if (res.data) {
                    setOrders(res.data);
                    setTotalPages(res.totalPages);
                    setTotalOrders(res.total);
                } else {
                    setOrders(res);
                }
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [page, filter, searchTerm]);

    // Reset page when filter/search changes
    useEffect(() => { setPage(1); }, [filter, searchTerm]);

    const handleStatusUpdate = async (orderId, newStatus) => {
        // Handle return actions (approve/reject) routed through the refund API
        if (newStatus === 'approve-return' || newStatus === 'reject-return') {
            const action = newStatus === 'approve-return' ? 'approve' : 'reject';
            await handleRefund(orderId, action);
            return;
        }
        try {
            await ordersAPI.updateStatus(orderId, newStatus);
            setOrders(prev => prev.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            ));
            // Sync the open modal if it matches
            setSelectedOrder(prev => prev?.id === orderId ? { ...prev, status: newStatus } : prev);
        } catch (err) {
            console.error('Failed to update order status:', err);
            alert(err.message || 'Failed to update status');
        }
    };

    const handleVerifyPayment = async () => {
        if (!otpInput) { alert('Please enter the OTP'); return; }
        setIsVerifying(true);
        try {
            await ordersAPI.verifyPayment(verifyingOrderId, otpInput);
            setOrders(prev => prev.map(order =>
                order.id === verifyingOrderId
                    ? { ...order, isPaid: true, status: order.status === 'Processing' ? 'Confirmed' : order.status }
                    : order
            ));
            setSelectedOrder(prev => prev?.id === verifyingOrderId
                ? { ...prev, isPaid: true, status: prev.status === 'Processing' ? 'Confirmed' : prev.status }
                : prev
            );
            alert('Payment verified! Order confirmed.');
            setVerifyingOrderId(null);
            setOtpInput('');
        } catch (err) {
            alert(err.message || 'Failed to verify payment');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleRefund = async (orderId, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this return?`)) return;
        try {
            await ordersAPI.processRefund(orderId, action);
            setOrders(prev => prev.map(order =>
                order.id === orderId
                    ? { ...order, returnStatus: action === 'approve' ? 'Completed' : 'Rejected', refundStatus: action === 'approve' ? 'Processed' : 'None' }
                    : order
            ));
            setSelectedOrder(prev => prev?.id === orderId
                ? { ...prev, returnStatus: action === 'approve' ? 'Completed' : 'Rejected' }
                : prev
            );
        } catch (err) {
            alert(err.message || 'Failed to process refund');
        }
    };

    const getStatusColor = (status, returnStatus) => {
        if (returnStatus === 'Requested') return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
        if (returnStatus === 'Completed') return 'text-purple-700 bg-purple-500/20 border-purple-500/30';
        switch (status) {
            case 'Processing': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'Confirmed': return 'text-success bg-success/10 border-success/20';
            case 'Shipped': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case 'Delivered': return 'text-success bg-success/10 border-success/20';
            case 'Cancelled': return 'text-error bg-error/10 border-error/20';
            default: return 'text-text-muted bg-page-bg border-border-default';
        }
    };

    if (loading) return <SectionLoader message="Loading orders..." />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-1">Order Management</h1>
                    <p className="text-sm text-text-secondary">
                        View and manage customer orders. Click <Eye size={13} className="inline" /> to see full order details.
                    </p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-surface border border-border-default shadow-sm rounded-lg p-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-xs overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                    {['All', 'Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returns'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-sm py-xs rounded text-sm font-semibold transition-colors whitespace-nowrap border ${filter === status
                                ? 'bg-buy-primary text-text-primary border-buy-primary shadow-sm hover:bg-buy-primary-hover'
                                : 'bg-page-bg text-text-secondary border-border-default hover:bg-surface-hover hover:text-text-primary'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Search Order ID..."
                        className="input-field pl-10 bg-page-bg"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-surface border border-border-default shadow-sm rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-page-bg text-text-secondary text-xs uppercase font-bold tracking-wider border-b border-border-default">
                                <th className="p-4">Order</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Items</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Payment</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-border-default">
                            {orders.length > 0 ? (
                                orders.map(order => {
                                    // Compact item names for the table row
                                    const itemNames = order.items?.map(i => i.product?.title || `#${i.productId}`) || [];
                                    const itemPreview = itemNames.slice(0, 2).join(', ');
                                    const extraItems = itemNames.length > 2 ? ` +${itemNames.length - 2} more` : '';

                                    return (
                                        <tr
                                            key={order.id}
                                            className="border-b border-border-default hover:bg-surface-hover transition-colors cursor-pointer"
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <td className="p-4 font-mono text-sm font-bold text-text-primary">#{order.id}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-text-primary">{order.user?.name || order.guestInfo?.name || 'Guest'}</div>
                                                <div className="text-xs text-text-secondary">{order.user?.email || order.guestInfo?.email || '—'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-text-primary font-medium max-w-[180px]">
                                                    <span className="line-clamp-1">{itemPreview}</span>
                                                    {extraItems && <span className="text-xs text-text-muted">{extraItems}</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-text-primary">₹{order.total?.toLocaleString()}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(order.status, order.returnStatus)}`}>
                                                    {order.returnStatus === 'Requested' ? 'Return Requested' :
                                                        order.returnStatus === 'Completed' ? 'Returned' :
                                                            order.status}
                                                </span>
                                                {order.cancelReason && <div className="text-xs text-error mt-1 max-w-[120px] truncate" title={order.cancelReason}>Reason: {order.cancelReason}</div>}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5">
                                                    {order.isPaid ? (
                                                        <span className="flex items-center gap-1 text-success text-xs font-bold bg-success/10 px-2 py-1 rounded border border-success/20">
                                                            <CheckCircle size={11} /> PAID
                                                        </span>
                                                    ) : (
                                                        <span className="text-orange-400 text-xs font-bold bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20">PENDING</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-text-muted mt-1 uppercase">{order.paymentMethod?.replace('_', ' ')}</div>
                                            </td>
                                            <td className="p-4 text-xs text-text-muted whitespace-nowrap">
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                    {/* Eye — open detail */}
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="p-1.5 text-text-muted hover:text-trust hover:bg-trust/10 rounded-lg transition-colors"
                                                        title="View full order details"
                                                    >
                                                        <Eye size={17} />
                                                    </button>

                                                    {order.returnStatus === 'Requested' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleRefund(order.id, 'approve')}
                                                                className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors"
                                                                title="Approve Return & Refund"
                                                            >
                                                                <CheckCircle size={17} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRefund(order.id, 'reject')}
                                                                className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                                                                title="Reject Return"
                                                            >
                                                                <XCircle size={17} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <select
                                                                className="text-xs border border-border-default rounded px-1.5 py-1 bg-surface text-text-primary focus:outline-none"
                                                                value={order.status}
                                                                onChange={e => handleStatusUpdate(order.id, e.target.value)}
                                                                disabled={order.status === 'Cancelled' || order.status === 'Delivered'}
                                                                title="Change order status"
                                                            >
                                                                <option value="Processing">Processing</option>
                                                                <option value="Confirmed">Confirmed</option>
                                                                <option value="Shipped">Shipped</option>
                                                                <option value="Delivered">Delivered</option>
                                                                <option value="Cancelled">Cancelled</option>
                                                            </select>

                                                            {!order.isPaid && (order.paymentMethod === 'pay_at_store' || order.paymentMethod === 'cod') && order.status !== 'Cancelled' && (
                                                                <button
                                                                    onClick={() => setVerifyingOrderId(order.id)}
                                                                    className="p-1.5 text-trust hover:text-white hover:bg-trust rounded-lg transition-colors"
                                                                    title="Verify Payment OTP"
                                                                >
                                                                    <Shield size={17} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-text-muted">
                                        No orders found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-sm bg-surface p-sm rounded-lg border border-border-default mt-4">
                    <button
                        className={`px-md py-xs rounded text-sm font-semibold transition-colors ${page === 1 ? 'bg-page-bg text-text-muted cursor-not-allowed border border-border-default' : 'bg-surface border border-border-default hover:bg-surface-hover text-text-primary'}`}
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span className="text-sm font-bold text-text-primary">
                        Page {page} of {totalPages} ({totalOrders} total)
                    </span>
                    <button
                        className={`px-md py-xs rounded text-sm font-semibold transition-colors ${page === totalPages ? 'bg-page-bg text-text-muted cursor-not-allowed border border-border-default' : 'bg-buy-primary text-text-primary hover:bg-buy-primary-hover border border-border-default'}`}
                        disabled={page === totalPages || loading}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* ── Order Detail Modal ─────────────────────────────────────── */}
            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onStatusUpdate={handleStatusUpdate}
                    onVerifyPayment={(id) => {
                        setSelectedOrder(null);
                        setVerifyingOrderId(id);
                    }}
                />
            )}

            {/* ── OTP Verification Modal ─────────────────────────────────── */}
            {verifyingOrderId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-sm">
                    <div className="bg-surface rounded-lg border border-border-default shadow-lg w-full max-w-md overflow-hidden">
                        <div className="p-md border-b border-border-default flex justify-between items-center bg-page-bg">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
                                    <Shield className="text-trust" size={24} />
                                    Verify Payment
                                </h2>
                                <p className="text-xs text-text-secondary mt-1">Order #{verifyingOrderId}</p>
                            </div>
                            <button
                                onClick={() => { setVerifyingOrderId(null); setOtpInput(''); }}
                                className="p-xs hover:bg-surface-hover rounded transition-colors text-text-muted hover:text-text-primary"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-lg">
                            <label className="block text-sm font-semibold mb-3 text-text-primary text-center">Enter 6-Digit Payment OTP</label>
                            <input
                                type="text"
                                maxLength="6"
                                placeholder="000000"
                                className="w-full text-center text-3xl tracking-[0.5em] font-mono py-4 border-2 border-border-default rounded-lg focus:border-trust transition-all outline-none bg-surface"
                                value={otpInput}
                                onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                autoFocus
                            />
                            <p className="text-xs text-text-secondary mt-4 text-center">
                                Ask the customer for the verification code sent to them during checkout.
                            </p>
                        </div>
                        <div className="p-md bg-page-bg border-t border-border-default flex gap-sm">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => { setVerifyingOrderId(null); setOtpInput(''); }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={handleVerifyPayment}
                                isLoading={isVerifying}
                                disabled={otpInput.length !== 6}
                            >
                                Verify & Confirm
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
