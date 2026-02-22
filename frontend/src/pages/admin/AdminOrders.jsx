import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Eye, CheckCircle, Truck, XCircle, Shield, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import { ordersAPI } from '../../lib/api';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // OTP verification state
    const [verifyingOrderId, setVerifyingOrderId] = useState(null);
    const [otpInput, setOtpInput] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [verifySuccess, setVerifySuccess] = useState('');

    useEffect(() => {
        ordersAPI.getAll()
            .then(data => setOrders(data))
            .catch(err => console.error('Failed to fetch orders:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            await ordersAPI.updateStatus(orderId, newStatus);
            setOrders(prev => prev.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            ));
        } catch (err) {
            console.error('Failed to update order status:', err);
        }
    };

    const handleVerifyPayment = async () => {
        if (otpInput.length !== 6) {
            setVerifyError('OTP must be 6 digits');
            return;
        }
        setVerifyError('');
        try {
            const result = await ordersAPI.verifyPayment(verifyingOrderId, otpInput);
            setVerifySuccess('Payment verified! Order confirmed.');
            setOrders(prev => prev.map(order =>
                order.id === verifyingOrderId
                    ? { ...order, isPaid: true, status: 'Confirmed', paymentOtp: null }
                    : order
            ));
            setTimeout(() => {
                setVerifyingOrderId(null);
                setOtpInput('');
                setVerifySuccess('');
            }, 1500);
        } catch (err) {
            setVerifyError(err.message || 'Invalid OTP');
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesFilter = filter === 'All' || order.status === filter || (filter === 'Returns' && order.returnStatus === 'Requested');
        const matchesSearch = String(order.id).includes(searchTerm);
        return matchesFilter && matchesSearch;
    });

    const handleRefund = async (orderId, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this return?`)) return;
        try {
            await ordersAPI.processRefund(orderId, action);
            setOrders(prev => prev.map(order =>
                order.id === orderId
                    ? { ...order, returnStatus: action === 'approve' ? 'Completed' : 'Rejected', refundStatus: action === 'approve' ? 'Processed' : 'None' }
                    : order
            ));
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
            default: return 'text-text-muted bg-gray-100 border-gray-200';
        }
    };

    if (loading) {
        return <div className="text-center py-12 text-text-muted">Loading orders...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold mb-1">Order Management</h1>
                    <p className="text-text-muted">View and manage customer orders. Verify payments with OTP.</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    {['All', 'Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returns'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filter === status
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-gray-100 text-text-muted hover:bg-slate-700'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Order ID..."
                        className="input-field pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Orders Table */}
            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="p-4 font-semibold text-text-muted">Order ID</th>
                                <th className="p-4 font-semibold text-text-muted">Customer</th>
                                <th className="p-4 font-semibold text-text-muted">Items</th>
                                <th className="p-4 font-semibold text-text-muted">Total</th>
                                <th className="p-4 font-semibold text-text-muted">Status</th>
                                <th className="p-4 font-semibold text-text-muted">Payment</th>
                                <th className="p-4 font-semibold text-text-muted">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map(order => (
                                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                                        <td className="p-4 font-mono text-sm">#{order.id}</td>
                                        <td className="p-4">
                                            <div className="font-medium">{order.user?.name || 'Guest'}</div>
                                            <div className="text-xs text-text-muted">{order.user?.email}</div>
                                        </td>
                                        <td className="p-4 text-sm text-text-muted">
                                            {order.items?.length || 0} items
                                        </td>
                                        <td className="p-4 font-bold">₹{order.total?.toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(order.status, order.returnStatus)}`}>
                                                {order.returnStatus === 'Requested' ? 'Return Requested' :
                                                    order.returnStatus === 'Completed' ? 'Returned' :
                                                        order.status}
                                            </span>
                                            {order.cancelReason && <div className="text-xs text-error mt-1">Reason: {order.cancelReason}</div>}
                                            {order.returnReason && <div className="text-xs text-purple-500 mt-1">Return: {order.returnReason}</div>}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {order.isPaid ? (
                                                    <span className="flex items-center gap-1 text-success text-xs font-bold bg-success/10 px-2 py-1 rounded">
                                                        <CheckCircle size={12} /> PAID
                                                    </span>
                                                ) : (
                                                    <span className="text-orange-400 text-xs font-bold bg-orange-400/10 px-2 py-1 rounded">PENDING</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-text-muted mt-1 uppercase">{order.paymentMethod.replace('_', ' ')}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {order.returnStatus === 'Requested' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleRefund(order.id, 'approve')}
                                                            className="p-2 text-success hover:bg-success/10 rounded tooltip"
                                                            title="Approve Return & Refund"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRefund(order.id, 'reject')}
                                                            className="p-2 text-error hover:bg-error/10 rounded tooltip"
                                                            title="Reject Return"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <select
                                                        className="text-xs border rounded p-1"
                                                        value={order.status}
                                                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                                        disabled={order.status === 'Cancelled' || order.status === 'Delivered'}
                                                    >
                                                        <option value="Processing">Processing</option>
                                                        <option value="Confirmed">Confirmed</option>
                                                        <option value="Shipped">Shipped</option>
                                                        <option value="Delivered">Delivered</option>
                                                        <option value="Cancelled">Cancelled</option>
                                                    </select>
                                                )}

                                                {!order.isPaid && order.paymentMethod === 'pay_at_store' && order.status !== 'Cancelled' && (
                                                    <button
                                                        onClick={() => setVerifyingOrderId(order.id)}
                                                        className="p-2 text-primary hover:bg-primary/10 rounded"
                                                        title="Verify OTP"
                                                    >
                                                        <Shield size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-text-muted">
                                        No orders found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* OTP Verification Modal */}
            {
                verifyingOrderId && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                        <div className="glass-panel p-8 max-w-md w-full mx-4 relative animate-in zoom-in duration-300">
                            <button
                                onClick={() => setVerifyingOrderId(null)}
                                className="absolute top-4 right-4 text-text-muted hover:text-text-main"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-warning/20 text-warning rounded-full flex items-center justify-center mx-auto">
                                    <Shield size={32} />
                                </div>
                                <h2 className="text-2xl font-heading font-bold">Verify Payment</h2>
                                <p className="text-text-muted text-sm">
                                    Enter the 6-digit OTP from the customer to confirm payment for Order <span className="text-primary font-bold">#{verifyingOrderId}</span>
                                </p>

                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otpInput}
                                    onChange={(e) => {
                                        setOtpInput(e.target.value.replace(/\D/g, ''));
                                        setVerifyError('');
                                    }}
                                    placeholder="Enter 6-digit OTP"
                                    className="input-field text-center text-2xl font-mono tracking-[0.5em] py-4"
                                    autoFocus
                                />

                                {verifyError && (
                                    <p className="text-error text-sm flex items-center justify-center gap-1">
                                        <XCircle size={14} /> {verifyError}
                                    </p>
                                )}
                                {verifySuccess && (
                                    <p className="text-success text-sm flex items-center justify-center gap-1">
                                        <CheckCircle size={14} /> {verifySuccess}
                                    </p>
                                )}

                                <Button
                                    className="w-full"
                                    onClick={handleVerifyPayment}
                                    disabled={otpInput.length !== 6 || !!verifySuccess}
                                >
                                    {verifySuccess ? '✓ Verified!' : 'Verify & Confirm Payment'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminOrders;
