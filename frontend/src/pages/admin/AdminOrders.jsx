import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Eye, CheckCircle, Truck, XCircle, Shield, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import { ordersAPI } from '../../lib/api';
import SectionLoader from '../../components/ui/SectionLoader';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);

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
                    limit: 15,
                    status: filter !== 'All' ? filter : undefined,
                    search: searchTerm || undefined
                };
                const res = await ordersAPI.getAll(params);
                // The API returns { data, total, page, limit, totalPages } for paginated requests
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

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [filter, searchTerm]);

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
        if (!otpInput) {
            alert('Please enter the OTP');
            return;
        }

        setIsVerifying(true);
        try {
            await ordersAPI.verifyPayment(verifyingOrderId, otpInput);
            setOrders(prev => prev.map(order =>
                order.id === verifyingOrderId
                    ? { ...order, isPaid: true, status: order.status === 'Processing' ? 'Confirmed' : order.status }
                    : order
            ));
            alert('Payment verified! Order confirmed.');
            setVerifyingOrderId(null);
            setOtpInput('');
        } catch (err) {
            alert(err.message || 'Failed to verify payment');
        } finally {
            setIsVerifying(false);
        }
    };

    // Filter & Sort Logic removed, backend handles it directly.
    const displayOrders = orders;

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
            default: return 'text-text-muted bg-page-bg border-border-default';
        }
    };

    if (loading) {
        return <SectionLoader message="Loading orders..." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-1">Order Management</h1>
                    <p className="text-sm text-text-secondary">View and manage customer orders. Manually verify COD/Pay At Store payments.</p>
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
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-surface border border-border-default shadow-sm rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-page-bg text-text-secondary text-xs uppercase font-bold tracking-wider border-b border-border-default">
                                <th className="p-4">Order ID</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Items</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Payment</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-border-default">
                            {displayOrders.length > 0 ? (
                                displayOrders.map(order => (
                                    <tr key={order.id} className="border-b border-border-default hover:bg-surface-hover transition-colors">
                                        <td className="p-4 font-mono text-sm">#{order.id}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-text-primary">{order.user?.name || 'Guest'}</div>
                                            <div className="text-xs text-text-secondary">{order.user?.email}</div>
                                        </td>
                                        <td className="p-4 text-sm text-text-secondary font-medium">
                                            {order.items?.length || 0} items
                                        </td>
                                        <td className="p-4 font-bold text-text-primary">₹{order.total?.toLocaleString()}</td>
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

                                                {!order.isPaid && (order.paymentMethod === 'pay_at_store' || order.paymentMethod === 'cod') && order.status !== 'Cancelled' && (
                                                    <button
                                                        onClick={() => setVerifyingOrderId(order.id)}
                                                        className="p-xs text-trust hover:text-white hover:bg-trust rounded tooltip transition-colors"
                                                        title="Mark as Paid"
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

            {/* OTP Modal */}
            {verifyingOrderId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-sm">
                    <div className="bg-surface rounded-lg border border-border-default shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
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
                                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
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
