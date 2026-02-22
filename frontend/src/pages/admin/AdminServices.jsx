import React, { useState, useEffect } from 'react';
import { Wrench, Search, CheckCircle, Clock, X, Calendar, MapPin, Phone, User, IndianRupee, Settings, Key, ChevronDown, ChevronUp, Truck, Package, AlertCircle } from 'lucide-react';
import { servicesAPI } from '../../lib/api';
import Button from '../../components/ui/Button';

const STATUS_PIPELINE = ['Pending', 'Confirmed', 'Picked Up', 'In Progress', 'Completed', 'Delivered'];

const AdminServices = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [otpInputs, setOtpInputs] = useState({});
    const [otpError, setOtpError] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [editData, setEditData] = useState({});

    useEffect(() => {
        servicesAPI.getAll()
            .then(data => setBookings(data))
            .catch(err => console.error('Failed to fetch bookings:', err))
            .finally(() => setLoading(false));
    }, []);

    const updateBooking = async (id, data) => {
        try {
            const updated = await servicesAPI.updateStatus(id, data);
            setBookings(prev => prev.map(b => b.id === id ? updated : b));
        } catch (err) {
            console.error('Failed to update booking:', err);
        }
    };

    const handleVerifyOtp = async (id) => {
        setOtpError('');
        try {
            const result = await servicesAPI.verifyPickupOtp(id, otpInputs[id] || '');
            if (result.success) {
                setBookings(prev => prev.map(b => b.id === id ? result.booking : b));
                setOtpInputs(prev => ({ ...prev, [id]: '' }));
            }
        } catch (err) {
            setOtpError(err.message || 'Invalid OTP');
        }
    };

    const getNextStatus = (current) => {
        const idx = STATUS_PIPELINE.indexOf(current);
        if (idx >= 0 && idx < STATUS_PIPELINE.length - 1) {
            return STATUS_PIPELINE[idx + 1];
        }
        return null;
    };

    const handleFieldChange = (id, field, value) => {
        setEditData(prev => ({
            ...prev,
            [id]: { ...(prev[id] || {}), [field]: value }
        }));
    };

    const saveFields = async (id) => {
        if (editData[id]) {
            await updateBooking(id, editData[id]);
            setEditData(prev => {
                const { [id]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    const filteredBookings = filterStatus === 'All'
        ? bookings
        : bookings.filter(b => b.status === filterStatus);

    const statusCounts = bookings.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
    }, {});

    if (loading) {
        return <div className="text-center py-12 text-text-muted">Loading service requests...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold mb-1">Service Requests</h1>
                    <p className="text-text-muted">Manage repair and build appointments.</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full font-bold">{statusCounts['Pending'] || 0} Pending</span>
                    <span className="bg-orange-500/10 text-orange-600 px-3 py-1 rounded-full font-bold">{statusCounts['In Progress'] || 0} In Progress</span>
                    <span className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full font-bold">{statusCounts['Completed'] || 0} Completed</span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['All', ...STATUS_PIPELINE, 'Cancelled'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === status
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                            }`}
                    >
                        {status} {status !== 'All' && statusCounts[status] ? `(${statusCounts[status]})` : ''}
                    </button>
                ))}
            </div>

            {/* Bookings List */}
            <div className="grid grid-cols-1 gap-4">
                {filteredBookings.length > 0 ? (
                    filteredBookings.map(booking => {
                        const isExpanded = expandedId === booking.id;
                        const nextStatus = getNextStatus(booking.status);
                        const edit = editData[booking.id] || {};

                        return (
                            <div key={booking.id} className="glass-panel overflow-hidden">
                                {/* Header Row */}
                                <div
                                    className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                                >
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="p-3 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                                            <Wrench size={24} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="font-bold text-lg">{booking.serviceType}</h3>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${booking.status === 'Completed' || booking.status === 'Delivered' ? 'text-success bg-success/10 border-success/20' :
                                                        booking.status === 'Cancelled' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                                                            booking.status === 'In Progress' ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' :
                                                                booking.status === 'Picked Up' ? 'text-purple-500 bg-purple-500/10 border-purple-500/20' :
                                                                    'text-blue-500 bg-blue-500/10 border-blue-500/20'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                                                <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(booking.date).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><User size={14} /> {booking.customerName || booking.user?.name || 'Unknown'}</span>
                                                <span className="flex items-center gap-1"><Phone size={14} /> {booking.customerPhone || booking.user?.phone || 'N/A'}</span>
                                                <span className="font-mono text-xs opacity-50">SRV-{booking.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {booking.estimatedPrice && (
                                            <span className="text-sm font-bold text-text-muted">₹{booking.estimatedPrice}</span>
                                        )}
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Expanded Panel */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/30 animate-in fade-in slide-in-from-top duration-200">
                                        <div className="p-6 space-y-6">
                                            {/* Two Column Layout */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Left: Customer & Device Info */}
                                                <div className="space-y-4">
                                                    <h4 className="font-bold text-sm uppercase tracking-wider text-text-muted">Customer Details</h4>
                                                    <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
                                                        <div className="flex items-start gap-3">
                                                            <User size={16} className="text-gray-400 mt-0.5" />
                                                            <div>
                                                                <p className="font-medium">{booking.customerName || booking.user?.name}</p>
                                                                <p className="text-sm text-text-muted">{booking.customerPhone || booking.user?.phone}</p>
                                                                <p className="text-sm text-text-muted">{booking.user?.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <MapPin size={16} className="text-gray-400 mt-0.5" />
                                                            <div className="text-sm">
                                                                <p>{booking.address || 'No address provided'}</p>
                                                                <p>{booking.city}{booking.pincode ? `, ${booking.pincode}` : ''}</p>
                                                                {booking.landmark && <p className="text-text-muted">Near: {booking.landmark}</p>}
                                                            </div>
                                                        </div>
                                                        {booking.deviceType && (
                                                            <div className="flex items-start gap-3">
                                                                <Settings size={16} className="text-gray-400 mt-0.5" />
                                                                <p className="text-sm">{booking.deviceType} {booking.deviceBrand && `— ${booking.deviceBrand}`}</p>
                                                            </div>
                                                        )}
                                                        {booking.description && (
                                                            <div className="border-t border-gray-100 pt-3">
                                                                <p className="text-xs uppercase tracking-wider text-text-muted mb-1">Issue Description</p>
                                                                <p className="text-sm">{booking.description}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: Admin Controls */}
                                                <div className="space-y-4">
                                                    <h4 className="font-bold text-sm uppercase tracking-wider text-text-muted">Admin Controls</h4>
                                                    <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-4">

                                                        {/* OTP Verification Section (only when Confirmed) */}
                                                        {booking.status === 'Confirmed' && (
                                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                                <h5 className="font-bold text-sm mb-2 flex items-center gap-2 text-yellow-700">
                                                                    <Key size={14} /> Verify Pickup OTP
                                                                </h5>
                                                                <p className="text-xs text-yellow-600 mb-3">Enter the OTP shared by the customer to verify pickup.</p>
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Enter 6-digit OTP"
                                                                        className="input-field flex-1 font-mono text-center tracking-widest"
                                                                        maxLength={6}
                                                                        value={otpInputs[booking.id] || ''}
                                                                        onChange={(e) => setOtpInputs(prev => ({ ...prev, [booking.id]: e.target.value.replace(/\D/g, '') }))}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                    <Button
                                                                        onClick={(e) => { e.stopPropagation(); handleVerifyOtp(booking.id); }}
                                                                        size="sm"
                                                                    >
                                                                        Verify
                                                                    </Button>
                                                                </div>
                                                                {otpError && <p className="text-red-500 text-xs mt-2">{otpError}</p>}
                                                            </div>
                                                        )}

                                                        {/* Pricing */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-medium text-text-muted mb-1">Estimated Price (₹)</label>
                                                                <input
                                                                    type="number"
                                                                    className="input-field"
                                                                    placeholder="0"
                                                                    defaultValue={booking.estimatedPrice || ''}
                                                                    onChange={(e) => handleFieldChange(booking.id, 'estimatedPrice', e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-text-muted mb-1">Final Price (₹)</label>
                                                                <input
                                                                    type="number"
                                                                    className="input-field"
                                                                    placeholder="0"
                                                                    defaultValue={booking.finalPrice || ''}
                                                                    onChange={(e) => handleFieldChange(booking.id, 'finalPrice', e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Assign Technician */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-text-muted mb-1">Assigned Technician</label>
                                                            <input
                                                                type="text"
                                                                className="input-field"
                                                                placeholder="Technician name"
                                                                defaultValue={booking.assignedTo || ''}
                                                                onChange={(e) => handleFieldChange(booking.id, 'assignedTo', e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>

                                                        {/* Admin Notes */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-text-muted mb-1">Admin Notes (internal)</label>
                                                            <textarea
                                                                className="input-field h-20 pt-2"
                                                                placeholder="Internal notes..."
                                                                defaultValue={booking.adminNotes || ''}
                                                                onChange={(e) => handleFieldChange(booking.id, 'adminNotes', e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>

                                                        {/* Save & Status Buttons */}
                                                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                                                            {editData[booking.id] && Object.keys(editData[booking.id]).length > 0 && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={(e) => { e.stopPropagation(); saveFields(booking.id); }}
                                                                >
                                                                    💾 Save Changes
                                                                </Button>
                                                            )}

                                                            {nextStatus && booking.status !== 'Confirmed' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => { e.stopPropagation(); updateBooking(booking.id, { status: nextStatus }); }}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    ➡️ Move to {nextStatus}
                                                                </Button>
                                                            )}

                                                            {booking.status === 'Pending' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => { e.stopPropagation(); updateBooking(booking.id, { status: 'Confirmed' }); }}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <CheckCircle size={14} /> Confirm
                                                                </Button>
                                                            )}

                                                            {booking.status !== 'Cancelled' && booking.status !== 'Delivered' && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); updateBooking(booking.id, { status: 'Cancelled' }); }}
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <X size={14} /> Cancel
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="glass-panel p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                            <Clock size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                            {filterStatus === 'All' ? 'No Requests Yet' : `No ${filterStatus} Requests`}
                        </h3>
                        <p className="text-text-muted">
                            {filterStatus === 'All' ? 'All service requests will appear here.' : 'Try selecting a different filter.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminServices;
