import React, { useState, useEffect, useCallback } from 'react';
import {
    Wrench, Calendar, Clock, CheckCircle, XCircle, MapPin, Phone,
    Cpu, IndianRupee, User as UserIcon, Settings, Gift, FileText,
    AlertTriangle, RefreshCw, ShieldCheck, UserCheck, Download, Shield, Package
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { servicesAPI } from '../../lib/api';

// ── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    Pending: { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400', label: 'Pending Review' },
    Confirmed: { color: 'text-blue-600 bg-blue-50 border-blue-200', dot: 'bg-blue-500', label: 'Confirmed' },
    'Picked Up': { color: 'text-purple-600 bg-purple-50 border-purple-200', dot: 'bg-purple-500', label: 'Picked Up' },
    'In Progress': { color: 'text-orange-600 bg-orange-50 border-orange-200', dot: 'bg-orange-400', label: 'In Progress' },
    Completed: { color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500', label: 'Completed' },
    Delivered: { color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500', label: 'Delivered' },
    Cancelled: { color: 'text-red-600 bg-red-50 border-red-200', dot: 'bg-red-500', label: 'Cancelled' },
};

const TIMELINE_STEPS = [
    { key: 'Pending', label: 'Booked', icon: Calendar },
    { key: 'Confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'Picked Up', label: 'Tech Assigned', icon: UserCheck },
    { key: 'In Progress', label: 'In Progress', icon: Wrench },
    { key: 'Completed', label: 'Ready', icon: ShieldCheck },
    { key: 'Delivered', label: 'Delivered', icon: Package },
];

const ORDER_IDX = Object.fromEntries(TIMELINE_STEPS.map((s, i) => [s.key, i]));

// ── Status Badge ───────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

// ── Price Display ──────────────────────────────────────────────────────────
const PriceDisplay = ({ booking }) => {
    if (booking.status === 'Pending') {
        return (
            <div className="text-right">
                <p className="text-xs text-text-muted">Price</p>
                <p className="text-sm font-semibold text-yellow-600">Pending Assessment</p>
            </div>
        );
    }
    if (booking.status === 'Completed' || booking.status === 'Delivered') {
        return (
            <div className="text-right">
                <p className="text-xs text-text-muted">Final Cost</p>
                <p className="text-lg font-bold text-green-700 flex items-center gap-1">
                    <IndianRupee size={14} />{booking.finalPrice ?? booking.estimatedPrice ?? '—'}
                </p>
            </div>
        );
    }
    if (booking.estimatedPrice) {
        return (
            <div className="text-right">
                <p className="text-xs text-text-muted">Estimated Cost</p>
                <p className="text-base font-bold text-blue-600 flex items-center gap-1">
                    <IndianRupee size={13} />{booking.estimatedPrice}
                </p>
            </div>
        );
    }
    return null;
};

// ── Status Timeline ────────────────────────────────────────────────────────
const StatusTimeline = ({ currentStatus }) => {
    if (currentStatus === 'Cancelled') {
        return (
            <div className="flex items-center gap-2 py-3">
                <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0">
                    <XCircle size={16} />
                </div>
                <div>
                    <p className="text-sm font-bold text-red-600">Service Cancelled</p>
                    <p className="text-xs text-text-muted">This booking has been cancelled.</p>
                </div>
            </div>
        );
    }

    const currentIdx = ORDER_IDX[currentStatus] ?? 0;
    // When past the last timeline key (shouldn't happen), cap at final step
    const lastIdx = TIMELINE_STEPS.length - 1;
    const activeIdx = Math.min(currentIdx, lastIdx);

    return (
        <div className="relative py-3">
            <div className="flex items-start justify-between gap-1">
                {TIMELINE_STEPS.map(({ key, label, icon: Icon }, idx) => {
                    const isComplete = idx <= activeIdx;
                    const isCurrent = idx === activeIdx;
                    return (
                        <React.Fragment key={key}>
                            <div className="flex flex-col items-center min-w-[56px]">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                    ${isComplete
                                        ? isCurrent
                                            ? 'bg-trust border-trust text-white ring-4 ring-trust/20 scale-110'
                                            : 'bg-trust border-trust text-white'
                                        : 'bg-page-bg border-border-default text-text-muted'
                                    }`}>
                                    <Icon size={14} />
                                </div>
                                <span className={`text-[9px] mt-1.5 text-center leading-tight max-w-[56px] ${isComplete ? 'text-text-primary font-bold' : 'text-text-muted'}`}>
                                    {label}
                                </span>
                            </div>
                            {idx < TIMELINE_STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mt-4 transition-all duration-300 ${idx < activeIdx ? 'bg-trust' : 'bg-border-default'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

// ── Masked Phone ───────────────────────────────────────────────────────────
const maskPhone = (phone) => {
    if (!phone || phone.length < 6) return phone || 'N/A';
    return phone.slice(0, 3) + '•'.repeat(phone.length - 6) + phone.slice(-3);
};

// ── Main Component ─────────────────────────────────────────────────────────
const UserServices = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [otpInput, setOtpInput] = useState({});
    const [otpLoading, setOtpLoading] = useState({});
    const [otpError, setOtpError] = useState({});
    const [cancelModal, setCancelModal] = useState(null); // booking id
    const [cancelReason, setCancelReason] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);

    const fetchBookings = useCallback(() => {
        setLoading(true);
        servicesAPI.getMyBookings()
            .then(data => setBookings(Array.isArray(data) ? data : []))
            .catch(err => console.error('Failed to fetch bookings:', err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    useEffect(() => {
        const onVis = () => {
            if (document.visibilityState === 'visible') fetchBookings();
        };
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, [fetchBookings]);

    const handleVerifyOtp = async (bookingId) => {
        const otp = otpInput[bookingId]?.trim();
        if (!otp) return;
        setOtpLoading(p => ({ ...p, [bookingId]: true }));
        setOtpError(p => ({ ...p, [bookingId]: '' }));
        try {
            const res = await servicesAPI.verifyOtp(bookingId, otp);
            if (res.booking) {
                setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...res.booking } : b));
            }
        } catch (err) {
            setOtpError(p => ({ ...p, [bookingId]: err.message || 'Invalid OTP' }));
        } finally {
            setOtpLoading(p => ({ ...p, [bookingId]: false }));
        }
    };

    const handleCancel = async () => {
        if (!cancelModal) return;
        setCancelLoading(true);
        try {
            await servicesAPI.cancelBooking(cancelModal, cancelReason);
            setBookings(prev => prev.map(b => b.id === cancelModal
                ? { ...b, status: 'Cancelled', cancellationReason: cancelReason }
                : b));
            setCancelModal(null);
            setCancelReason('');
        } catch (err) {
            console.error('Cancel failed:', err);
        } finally {
            setCancelLoading(false);
        }
    };

    const handleDownloadInvoice = (invoiceUrl) => {
        if (!invoiceUrl) return;
        // Base64 data URL — convert to blob and trigger download
        const link = document.createElement('a');
        link.href = invoiceUrl;
        link.download = 'Shoptify_Service_Invoice.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-surface border border-border-default rounded-xl p-5 animate-pulse">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-surface-hover flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-surface-hover rounded w-1/3" />
                                <div className="h-3 bg-surface-hover rounded w-1/4" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-1">My Service Requests</h1>
                    <p className="text-sm text-text-secondary">Track your repair and build appointments.</p>
                </div>
                <Link to="/services"><Button>Book New Service</Button></Link>
            </div>

            {bookings.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {bookings.map(booking => {
                        const isExpanded = expandedId === booking.id;
                        const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.Pending;

                        return (
                            <div key={booking.id} className={`bg-surface border rounded-xl shadow-sm overflow-hidden transition-colors ${isExpanded ? 'border-trust/30' : 'border-border-default'}`}>
                                {/* ── Card Header ─────────────────────────── */}
                                <div
                                    className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-surface-hover transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                                >
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-xl bg-trust/10 text-trust flex items-center justify-center flex-shrink-0">
                                            <Wrench size={22} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="font-bold text-text-primary">{booking.serviceType}</h3>
                                                <span className="font-mono text-xs text-text-muted">SRV-{booking.id}</span>
                                                <StatusBadge status={booking.status} />
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                                                <span className="flex items-center gap-1"><Calendar size={12} />{new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                {booking.deviceType && (
                                                    <span className="flex items-center gap-1"><Cpu size={12} />{booking.deviceType}{booking.deviceBrand ? ` (${booking.deviceBrand})` : ''}</span>
                                                )}
                                                {booking.technician?.name && (
                                                    <span className="flex items-center gap-1"><UserCheck size={12} />{booking.technician.name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 ml-auto">
                                        <PriceDisplay booking={booking} />
                                        <div className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                                    </div>
                                </div>

                                {/* ── Expanded Panel ───────────────────────── */}
                                {isExpanded && (
                                    <div className="border-t border-border-default bg-page-bg p-5 space-y-5 animate-in fade-in slide-in-from-top duration-200">
                                        {/* Timeline */}
                                        <StatusTimeline currentStatus={booking.status} />

                                        {/* Info Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Pickup Address */}
                                            <div className="bg-surface rounded-xl border border-border-default p-4 space-y-1">
                                                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5"><MapPin size={12} />Pickup Address</p>
                                                <p className="text-sm font-medium text-text-primary">{booking.address}</p>
                                                <p className="text-sm text-text-secondary">{booking.city}, {booking.pincode}</p>
                                                {booking.landmark && <p className="text-xs text-text-muted">Near: {booking.landmark}</p>}
                                            </div>

                                            {/* Pricing */}
                                            <div className="bg-surface rounded-xl border border-border-default p-4 space-y-2">
                                                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5"><IndianRupee size={12} />Pricing</p>
                                                {booking.status === 'Pending' && (
                                                    <p className="text-sm text-yellow-600 font-semibold">Pending Assessment — our admin will quote you shortly.</p>
                                                )}
                                                {booking.estimatedPrice && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-text-secondary">Estimated</span>
                                                        <span className="font-bold text-text-primary">₹{booking.estimatedPrice}</span>
                                                    </div>
                                                )}
                                                {booking.finalPrice && (
                                                    <div className="flex items-center justify-between border-t border-border-default pt-2">
                                                        <span className="text-sm font-bold text-text-primary">Final Amount</span>
                                                        <span className="text-lg font-bold text-green-700">₹{booking.finalPrice}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Technician */}
                                            {(booking.technician || booking.assignedTo) && (
                                                <div className="bg-surface rounded-xl border border-border-default p-4 space-y-2">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5"><UserCheck size={12} />Assigned Technician</p>
                                                    <p className="font-semibold text-text-primary">{booking.technician?.name || booking.assignedTo}</p>
                                                    {booking.technician?.phone && (
                                                        <p className="text-sm text-text-secondary flex items-center gap-1">
                                                            <Phone size={12} />
                                                            {maskPhone(booking.technician.phone)}
                                                        </p>
                                                    )}
                                                    {booking.technician?.skills?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {booking.technician.skills.map(s => (
                                                                <span key={s} className="text-xs bg-trust/10 text-trust border border-trust/20 px-2 py-0.5 rounded-full">{s}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Contact Info */}
                                            <div className="bg-surface rounded-xl border border-border-default p-4 space-y-1">
                                                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5"><Phone size={12} />Contact</p>
                                                <p className="font-semibold text-text-primary">{booking.customerName}</p>
                                                <p className="text-sm text-text-secondary">{booking.customerPhone}</p>
                                            </div>
                                        </div>

                                        {/* OTP Verify Panel */}
                                        {booking.status === 'Confirmed' && !booking.otpVerified && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 flex items-center gap-1.5">
                                                    <ShieldCheck size={12} />OTP Verification
                                                </p>
                                                <p className="text-sm text-blue-700 mb-3">
                                                    When the technician arrives for pickup, they will give you a 6-digit OTP. Enter it here to confirm the device handover — only then will the pickup be recorded.
                                                </p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        maxLength={6}
                                                        className="input-field flex-1 font-mono text-center text-lg tracking-widest"
                                                        placeholder="Enter 6-digit OTP"
                                                        value={otpInput[booking.id] || ''}
                                                        onChange={e => setOtpInput(p => ({ ...p, [booking.id]: e.target.value }))}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        disabled={otpLoading[booking.id]}
                                                        onClick={e => { e.stopPropagation(); handleVerifyOtp(booking.id); }}
                                                    >
                                                        {otpLoading[booking.id] ? <RefreshCw size={14} className="animate-spin" /> : 'Verify'}
                                                    </Button>
                                                </div>
                                                {otpError[booking.id] && (
                                                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertTriangle size={12} />{otpError[booking.id]}</p>
                                                )}
                                            </div>
                                        )}

                                        {booking.otpVerified && (
                                            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                                                <CheckCircle size={16} />OTP Verified — Device is with our technician
                                            </div>
                                        )}

                                        {/* Delivered — success banner */}
                                        {booking.status === 'Delivered' && (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                                        <Package size={20} className="text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-green-800">Device Delivered Successfully</p>
                                                        {booking.deliveredAt && (
                                                            <p className="text-xs text-green-600">
                                                                {new Date(booking.deliveredAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-green-700 ml-[52px]">
                                                    Your service is complete. Thank you for choosing Shoptify!
                                                </p>
                                            </div>
                                        )}

                                        {/* Delivery OTP — show to customer when Completed (not yet delivered) */}
                                        {booking.status === 'Completed' && booking.deliveryOtp && !booking.deliveryOtpVerified && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 flex items-center gap-1.5">
                                                    <Shield size={12} />Delivery Verification OTP
                                                </p>
                                                <p className="text-sm text-blue-700 mb-3">
                                                    Your device is ready! When the technician delivers your device, share this OTP with them to confirm receipt.
                                                </p>
                                                <div className="bg-white border-2 border-blue-300 rounded-lg py-3">
                                                    <p className="text-3xl font-mono font-bold tracking-[0.4em] text-blue-900 text-center">{booking.deliveryOtp}</p>
                                                </div>
                                                <p className="text-xs text-blue-600 mt-2">Do not share this OTP with anyone except the delivery technician.</p>
                                            </div>
                                        )}
                                        {booking.status === 'Completed' && booking.deliveryOtpVerified && (
                                            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                                <CheckCircle size={16} />OTP Verified — Delivery in progress
                                            </div>
                                        )}

                                        {/* Description */}
                                        {booking.description && (
                                            <div className="bg-surface rounded-xl border border-border-default p-4">
                                                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Issue Description</p>
                                                <p className="text-sm text-text-primary">{booking.description}</p>
                                            </div>
                                        )}

                                        {/* Custom Fields */}
                                        {booking.customFields && typeof booking.customFields === 'object' && Object.keys(booking.customFields).length > 0 && (
                                            <div className="bg-surface rounded-xl border border-border-default p-4">
                                                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2 flex items-center gap-1.5"><Settings size={12} />Service Details</p>
                                                <div className="space-y-1.5">
                                                    {Object.entries(booking.customFields).map(([key, value]) => (
                                                        <div key={key} className="flex items-start gap-2 text-sm">
                                                            <span className="font-semibold text-text-primary capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}:</span>
                                                            <span className="text-text-secondary">{String(value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Cancellation Reason */}
                                        {booking.status === 'Cancelled' && booking.cancellationReason && (
                                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                                <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">Cancellation Reason</p>
                                                <p className="text-sm text-red-700">{booking.cancellationReason}</p>
                                            </div>
                                        )}

                                        {/* Referral Code */}
                                        {booking.referralCodeUsed && (
                                            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
                                                <Gift size={16} className="text-primary flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs text-text-muted">Referral Code Applied</p>
                                                    <span className="font-mono text-sm font-bold text-primary">{booking.referralCodeUsed}</span>
                                                    <p className="text-xs text-text-muted mt-0.5">Your friend earns store credit when this service completes.</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-border-default">
                                            {/* Invoice Download */}
                                            {booking.status === 'Delivered' && booking.invoiceUrl && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={e => { e.stopPropagation(); handleDownloadInvoice(booking.invoiceUrl); }}
                                                    className="flex items-center gap-1.5"
                                                >
                                                    <Download size={14} />Download Invoice
                                                </Button>
                                            )}
                                            {booking.status === 'Completed' && booking.invoiceUrl && (
                                                <p className="text-xs text-text-secondary flex items-center gap-1.5 w-full">
                                                    <FileText size={14} className="flex-shrink-0 text-text-muted" />
                                                    Invoice will be available for download after your device is marked as delivered.
                                                </p>
                                            )}

                                            {/* Cancel Button — Pending only */}
                                            {booking.status === 'Pending' && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); setCancelModal(booking.id); setCancelReason(''); }}
                                                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-error hover:bg-error/10 rounded-lg transition-colors border border-error/20 min-h-[40px] touch-manipulation"
                                                >
                                                    <XCircle size={14} />Cancel Booking
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-surface border border-border-default rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-page-bg rounded-xl border border-border-default flex items-center justify-center mx-auto mb-4 text-text-muted">
                        <Wrench size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-text-primary">No Service History</h3>
                    <p className="text-text-secondary mb-5">You haven't booked any services yet.</p>
                    <Link to="/services"><Button variant="outline">Browse Services</Button></Link>
                </div>
            )}

            {/* ── Cancel Confirmation Modal ───────────────────────────── */}
            {cancelModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-default rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-text-primary">Cancel Booking</h3>
                                <p className="text-xs text-text-secondary">SRV-{cancelModal}</p>
                            </div>
                        </div>
                        <p className="text-sm text-text-secondary mb-4">Are you sure you want to cancel this booking? This cannot be undone.</p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                            <textarea
                                className="input-field h-20 pt-2 text-sm"
                                placeholder="Tell us why you're cancelling..."
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setCancelModal(null)}>Keep Booking</Button>
                            <button
                                disabled={cancelLoading}
                                onClick={handleCancel}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
                            >
                                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserServices;
