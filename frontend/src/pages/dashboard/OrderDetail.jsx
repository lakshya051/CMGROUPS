import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Clock, CheckCircle, Package, Truck, MapPin,
    Download, ShoppingCart, Calendar, XCircle, RotateCcw,
} from 'lucide-react';
import { ordersAPI } from '../../lib/api';
import { getLineItemImageUrl, handleImageError } from '../../utils/image';
import toast from 'react-hot-toast';

const TIMELINE_STEPS = [
    { key: 'Processing', label: 'Processing', icon: Clock },
    { key: 'Confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'Shipped', label: 'Shipped', icon: Truck },
    { key: 'OutForDelivery', label: 'Out for Delivery', icon: MapPin },
    { key: 'Delivered', label: 'Delivered', icon: Package },
];
const STATUS_INDEX = { Processing: 0, Confirmed: 1, Shipped: 2, OutForDelivery: 3, Delivered: 4 };

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [returning, setReturning] = useState(false);

    useEffect(() => {
        ordersAPI.getById(id)
            .then(setOrder)
            .catch(() => setError('Could not load order details.'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return;
        setCancelling(true);
        try {
            await ordersAPI.cancel(order.id, 'Cancelled by customer');
            toast.success('Order cancelled successfully');
            setOrder(prev => ({ ...prev, status: 'Cancelled' }));
        } catch (err) {
            toast.error(err.message || 'Failed to cancel order');
        } finally {
            setCancelling(false);
        }
    };

    const handleReturn = async () => {
        const reason = window.prompt('Please provide a reason for return:');
        if (!reason) return;
        setReturning(true);
        try {
            await ordersAPI.returnOrder(order.id, reason);
            toast.success('Return request submitted');
            setOrder(prev => ({ ...prev, returnStatus: 'Requested', returnReason: reason }));
        } catch (err) {
            toast.error(err.message || 'Failed to request return');
        } finally {
            setReturning(false);
        }
    };

    const handleDownloadInvoice = async () => {
        try {
            await ordersAPI.downloadInvoice(order.id);
        } catch (err) {
            toast.error(err.message || 'Failed to download invoice');
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />)}
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="text-center py-16">
                <p className="text-text-muted mb-4">{error || 'Order not found'}</p>
                <Link to="/dashboard/orders" className="text-primary font-semibold underline">Back to Orders</Link>
            </div>
        );
    }

    const isCancelled = order.status === 'Cancelled';
    const isDelivered = order.status === 'Delivered';
    const stepIndex = STATUS_INDEX[order.status] ?? -1;
    const addr = order.shippingAddress;
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/dashboard/orders')} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-heading font-bold text-text-primary">Order #{order.id}</h1>
                    <p className="text-sm text-text-muted flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
                <div className="ml-auto flex gap-2">
                    {order.isPaid && (
                        <button onClick={handleDownloadInvoice} className="flex items-center gap-1.5 text-sm font-medium text-trust hover:underline">
                            <Download size={16} /> Invoice
                        </button>
                    )}
                </div>
            </div>

            {/* Status Timeline */}
            {!isCancelled && (
                <div className="bg-surface rounded-xl border border-border-default p-6">
                    <div className="flex items-center justify-between">
                        {TIMELINE_STEPS.map((step, idx) => {
                            const Icon = step.icon;
                            const done = idx <= stepIndex;
                            const active = idx === stepIndex;
                            return (
                                <div key={step.key} className="flex flex-col items-center flex-1 relative">
                                    {idx > 0 && (
                                        <div className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${idx <= stepIndex ? 'bg-success' : 'bg-border-default'}`} />
                                    )}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${done ? 'bg-success text-white' : 'bg-page-bg border-2 border-border-default text-text-muted'} ${active ? 'ring-2 ring-success/30' : ''}`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className={`text-xs mt-2 text-center ${done ? 'text-success font-semibold' : 'text-text-muted'}`}>{step.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isCancelled && (
                <div className="bg-error/5 border border-error/20 rounded-xl p-4 flex items-center gap-3">
                    <XCircle size={20} className="text-error" />
                    <div>
                        <p className="font-semibold text-error">Order Cancelled</p>
                        {order.cancelReason && <p className="text-sm text-text-muted">{order.cancelReason}</p>}
                    </div>
                </div>
            )}

            {order.returnStatus && order.returnStatus !== 'None' && (
                <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-center gap-3">
                    <RotateCcw size={20} className="text-warning" />
                    <div>
                        <p className="font-semibold text-warning">Return {order.returnStatus}</p>
                        {order.returnReason && <p className="text-sm text-text-muted">{order.returnReason}</p>}
                        {order.refundAmount > 0 && <p className="text-sm text-success font-medium">Refund: ₹{order.refundAmount.toLocaleString('en-IN')}</p>}
                    </div>
                </div>
            )}

            {/* Items */}
            <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
                <div className="p-4 border-b border-border-default">
                    <h2 className="font-bold text-text-primary flex items-center gap-2">
                        <ShoppingCart size={18} /> Items ({order.items.length})
                    </h2>
                </div>
                <div className="divide-y divide-border-default">
                    {order.items.map(item => (
                        <div key={item.id} className="p-4 flex gap-4">
                            <Link to={`/products/${item.productId}`} className="flex-shrink-0">
                                <img
                                    src={getLineItemImageUrl(item)}
                                    alt={item.product?.title}
                                    onError={handleImageError}
                                    className="w-16 h-16 object-contain rounded-lg border border-border-default"
                                />
                            </Link>
                            <div className="flex-1 min-w-0">
                                <Link to={`/products/${item.productId}`} className="font-semibold text-text-primary hover:text-trust line-clamp-2 transition-colors">
                                    {item.product?.title}
                                </Link>
                                {item.variant && (
                                    <p className="text-xs text-text-muted mt-0.5">
                                        {item.variant.combination ? Object.values(item.variant.combination).join(' / ') : item.variant.name}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 mt-1 text-sm">
                                    <span className="text-text-muted">Qty: {item.quantity}</span>
                                    <span className="font-bold text-text-primary">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment & Totals */}
                <div className="bg-surface rounded-xl border border-border-default p-5">
                    <h3 className="font-bold text-text-primary mb-4">Payment Summary</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                        {order.discountAmount > 0 && (
                            <div className="flex justify-between"><span className="text-text-muted">Discount {order.couponCode && `(${order.couponCode})`}</span><span className="text-success">-₹{order.discountAmount.toLocaleString('en-IN')}</span></div>
                        )}
                        {order.walletUsed > 0 && (
                            <div className="flex justify-between"><span className="text-text-muted">Wallet Used</span><span className="text-success">-₹{order.walletUsed.toLocaleString('en-IN')}</span></div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-border-default font-bold text-base">
                            <span>Total</span><span>₹{order.total.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-text-muted">
                            <span>Payment</span>
                            <span>{order.paymentMethod === 'pay_at_store' ? 'Pay at Store' : order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between text-text-muted">
                            <span>Status</span>
                            <span className={order.isPaid ? 'text-success font-medium' : 'text-warning font-medium'}>{order.isPaid ? 'Paid' : 'Unpaid'}</span>
                        </div>
                    </div>
                </div>

                {/* Shipping Address */}
                {addr && (
                    <div className="bg-surface rounded-xl border border-border-default p-5">
                        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2"><MapPin size={16} /> Shipping Address</h3>
                        <div className="text-sm text-text-secondary space-y-1">
                            <p className="font-semibold text-text-primary">{addr.fullName}</p>
                            <p>{addr.address || addr.addressLine1}</p>
                            {(addr.addressLine2) && <p>{addr.addressLine2}</p>}
                            <p>{addr.city}{addr.state ? `, ${addr.state}` : ''} - {addr.postalCode || addr.pincode}</p>
                            {addr.phone && <p>Phone: {addr.phone}</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
                {order.status === 'Processing' && !isCancelled && (
                    <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="px-5 py-2.5 rounded-xl border border-error text-error text-sm font-semibold hover:bg-error/5 transition-colors disabled:opacity-50"
                    >
                        {cancelling ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                )}
                {isDelivered && (!order.returnStatus || order.returnStatus === 'None') && (
                    <button
                        onClick={handleReturn}
                        disabled={returning}
                        className="px-5 py-2.5 rounded-xl border border-warning text-warning text-sm font-semibold hover:bg-warning/5 transition-colors disabled:opacity-50"
                    >
                        {returning ? 'Submitting...' : 'Request Return'}
                    </button>
                )}
            </div>
        </div>
    );
}
