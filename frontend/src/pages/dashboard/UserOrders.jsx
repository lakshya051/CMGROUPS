import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, CheckCircle, Package, Truck, Eye, Copy, Shield, X, Download, Repeat } from 'lucide-react';
import { ordersAPI } from '../../lib/api';
import { useShop } from '../../context/ShopContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const UserOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOtp, setSelectedOtp] = useState(null);
    const [otpCopied, setOtpCopied] = useState(false);

    const [cancelOrderId, setCancelOrderId] = useState(null);
    const [returnOrderId, setReturnOrderId] = useState(null);
    const [reason, setReason] = useState('');

    const { addToCart } = useShop();
    const navigate = useNavigate();

    const handleReorder = (order) => {
        order.items.forEach(item => {
            if (item.product) {
                addToCart(item.product.id, item.quantity);
            }
        });
        toast.success('Items added to cart!');
        navigate('/checkout');
    };

    useEffect(() => {
        ordersAPI.getMyOrders()
            .then(data => setOrders(data.orders || data))
            .catch(err => console.error('Failed to fetch orders:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleCancelOrder = async () => {
        if (!reason.trim()) return alert('Please provide a reason');
        try {
            await ordersAPI.cancel(cancelOrderId, reason);
            setOrders(prev => prev.map(o => o.id === cancelOrderId ? { ...o, status: 'Cancelled', cancelReason: reason } : o));
            setCancelOrderId(null);
            setReason('');
        } catch (err) {
            alert(err.message || 'Failed to cancel order');
        }
    };

    const handleReturnOrder = async () => {
        if (!reason.trim()) return alert('Please provide a reason');
        try {
            await ordersAPI.returnOrder(returnOrderId, reason);
            setOrders(prev => prev.map(o => o.id === returnOrderId ? { ...o, returnStatus: 'Requested', returnReason: reason } : o));
            setReturnOrderId(null);
            setReason('');
        } catch (err) {
            alert(err.message || 'Failed to request return');
        }
    };

    const handleDownloadInvoice = async (orderId) => {
        try {
            await ordersAPI.downloadInvoice(orderId);
        } catch (err) {
            alert(err.message || 'Failed to download invoice');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Processing': return <Clock size={16} className="text-blue-400" />;
            case 'Confirmed': return <CheckCircle size={16} className="text-success" />;
            case 'Shipped': return <Truck size={16} className="text-orange-400" />;
            case 'Delivered': return <Package size={16} className="text-success" />;
            default: return <ShoppingBag size={16} />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Processing': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'Confirmed': return 'text-success bg-success/10 border-success/20';
            case 'Shipped': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case 'Delivered': return 'text-success bg-success/10 border-success/20';
            default: return 'text-text-muted bg-gray-100 border-gray-200';
        }
    };

    const copyOtp = (otp) => {
        navigator.clipboard.writeText(otp);
        setOtpCopied(true);
        setTimeout(() => setOtpCopied(false), 2000);
    };

    if (loading) return <div className="text-center py-12 text-text-muted">Loading your orders...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-heading font-bold mb-1">My Orders</h1>
                <p className="text-text-muted">Track your orders and payment status.</p>
            </div>

            {orders.length === 0 ? (
                <div className="glass-panel p-12 text-center">
                    <ShoppingBag size={48} className="text-text-muted mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No Orders Yet</h3>
                    <p className="text-text-muted">Your orders will appear here once you make a purchase.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="glass-panel p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(order.status)}
                                    <div>
                                        <h3 className="font-bold">Order #{order.id}</h3>
                                        <p className="text-xs text-text-muted">
                                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Payment Status Badge */}
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${order.isPaid
                                        ? 'text-success bg-success/10 border-success/20'
                                        : 'text-warning bg-warning/10 border-warning/20'
                                        }`}>
                                        {order.isPaid ? '✓ Paid' : '⏳ Unpaid'}
                                    </span>
                                    {/* Order Status Badge */}
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-2 mb-4">
                                {order.items?.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 text-sm bg-gray-50/50 rounded-lg p-2">
                                        <div className="w-10 h-10 bg-white rounded p-1 flex-shrink-0">
                                            <img src={item.product?.image} alt="" className="w-full h-full object-contain" />
                                        </div>
                                        <span className="flex-grow">{item.product?.title}</span>
                                        <span className="text-text-muted">x{item.quantity}</span>
                                        <span className="font-bold">₹{item.price.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-4">
                                    <span className="text-text-muted text-sm">
                                        {order.paymentMethod === 'pay_at_store' ? '🏪 Pay at Store' : '🚚 Cash on Delivery'}
                                    </span>
                                    <span className="font-bold text-lg">₹{order.total.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <div className="text-sm font-bold">
                                    Total: <span className="text-primary text-lg">₹{order.total?.toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2">
                                    {order.status === 'Processing' && (
                                        <button
                                            onClick={() => setCancelOrderId(order.id)}
                                            className="px-3 py-1.5 text-sm text-error bg-error/10 hover:bg-error/20 rounded-lg transition-colors"
                                        >
                                            Cancel Order
                                        </button>
                                    )}
                                    {order.status === 'Delivered' && order.returnStatus === 'None' && (
                                        <button
                                            onClick={() => setReturnOrderId(order.id)}
                                            className="px-3 py-1.5 text-sm text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                                        >
                                            Return Item
                                        </button>
                                    )}
                                    {order.returnStatus !== 'None' && (
                                        <span className="px-3 py-1.5 text-sm text-purple-600 bg-purple-100 rounded-lg">
                                            Return: {order.returnStatus}
                                        </span>
                                    )}

                                    {/* Invoice Button */}
                                    {order.isPaid && order.status !== 'Cancelled' && (
                                        <button
                                            onClick={() => handleDownloadInvoice(order.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                                            title="Download GST Invoice"
                                        >
                                            <Download size={14} />
                                            Invoice
                                        </button>
                                    )}

                                    {/* Reorder Button */}
                                    <button
                                        onClick={() => handleReorder(order)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                                        title="Reorder Items"
                                    >
                                        <Repeat size={14} />
                                        Reorder
                                    </button>

                                    {/* Existing OTP Button */}
                                    {!order.isPaid && order.paymentMethod === 'pay_at_store' && order.status !== 'Cancelled' && (
                                        <button
                                            onClick={() => setSelectedOtp(order.paymentOtp)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors text-sm"
                                        >
                                            <Shield size={14} />
                                            View Pickup OTP
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Cancel Order Modal */}
            {cancelOrderId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
                    <div className="glass-panel p-6 max-w-sm w-full mx-4 relative">
                        <h3 className="text-xl font-bold mb-4">Cancel Order #{cancelOrderId}</h3>
                        <p className="text-sm text-text-muted mb-4">Are you sure? Any paid amount will be refunded to your wallet.</p>
                        <textarea
                            className="input-field w-full mb-4"
                            placeholder="Reason for cancellation..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setCancelOrderId(null)} className="px-4 py-2 text-sm">Close</button>
                            <button
                                onClick={handleCancelOrder}
                                className="px-4 py-2 bg-error text-white rounded-lg text-sm hover:bg-red-600"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Order Modal */}
            {returnOrderId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
                    <div className="glass-panel p-6 max-w-sm w-full mx-4 relative">
                        <h3 className="text-xl font-bold mb-4">Return Order #{returnOrderId}</h3>
                        <p className="text-sm text-text-muted mb-4">Why are you returning this item?</p>
                        <textarea
                            className="input-field w-full mb-4"
                            placeholder="Reason for return..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setReturnOrderId(null)} className="px-4 py-2 text-sm">Close</button>
                            <button
                                onClick={handleReturnOrder}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-600"
                            >
                                Request Return
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OTP Modal */}
            {selectedOtp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="glass-panel p-8 max-w-sm w-full mx-4 relative animate-in zoom-in duration-300">
                        <button
                            onClick={() => setSelectedOtp(null)}
                            className="absolute top-4 right-4 text-text-muted hover:text-text-main"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto">
                                <Shield size={32} />
                            </div>

                            <div>
                                <h3 className="text-xl font-heading font-bold mb-1">Pickup OTP</h3>
                                <p className="text-text-muted text-sm">Share this code with the delivery agent</p>
                            </div>

                            <div
                                onClick={() => copyOtp(selectedOtp)}
                                className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors group relative"
                            >
                                <div className="text-3xl font-mono font-bold tracking-[0.2em] text-text-main">
                                    {selectedOtp}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl font-medium text-primary gap-2">
                                    <Copy size={16} />
                                    {otpCopied ? 'Copied!' : 'Click to Copy'}
                                </div>
                            </div>

                            <p className="text-xs text-text-muted">
                                Valid for payment confirmation upon delivery
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserOrders;
