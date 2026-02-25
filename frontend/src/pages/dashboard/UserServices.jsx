import React, { useState, useEffect } from 'react';
import { Wrench, Calendar, Clock, CheckCircle, XCircle, MapPin, Phone, Cpu, IndianRupee, User as UserIcon, Truck, Settings, Package, Gift } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { servicesAPI } from '../../lib/api';

const STATUS_STEPS = ['Pending', 'Confirmed', 'Picked Up', 'In Progress', 'Completed', 'Delivered'];

const StatusTimeline = ({ currentStatus }) => {
    const currentIdx = STATUS_STEPS.indexOf(currentStatus);
    const isCancelled = currentStatus === 'Cancelled';

    if (isCancelled) {
        return (
            <div className="flex items-center gap-2 py-3">
                <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0">
                    <XCircle size={16} />
                </div>
                <span className="text-sm font-bold text-red-500">Service Cancelled</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 py-3 overflow-x-auto">
            {STATUS_STEPS.map((step, idx) => {
                const isComplete = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                    <React.Fragment key={step}>
                        <div className="flex flex-col items-center min-w-[60px]">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${isComplete
                                    ? 'bg-primary border-primary text-white'
                                    : 'bg-white border-gray-300 text-gray-400'
                                } ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                                {isComplete ? '✓' : idx + 1}
                            </div>
                            <span className={`text-[10px] mt-1 text-center leading-tight ${isComplete ? 'text-primary font-bold' : 'text-gray-400'}`}>
                                {step}
                            </span>
                        </div>
                        {idx < STATUS_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 min-w-[16px] ${idx < currentIdx ? 'bg-primary' : 'bg-gray-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const UserServices = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        servicesAPI.getMyBookings()
            .then(data => setBookings(data))
            .catch(err => console.error('Failed to fetch bookings:', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="text-center py-12 text-text-muted">Loading bookings...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold mb-1">My Service Requests</h1>
                    <p className="text-text-muted">Track your repair and build appointments.</p>
                </div>
                <Link to="/services">
                    <Button>Book New Service</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {bookings.length > 0 ? (
                    bookings.map(booking => (
                        <div key={booking.id} className="glass-panel overflow-hidden">
                            {/* Main Row */}
                            <div
                                className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                        <Wrench size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg">{booking.serviceType}</h3>
                                            <span className="font-mono text-xs text-text-muted opacity-50">SRV-{booking.id}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                                            <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(booking.date).toLocaleDateString()}</span>
                                            {booking.deviceType && (
                                                <span className="flex items-center gap-1"><Cpu size={14} /> {booking.deviceType} {booking.deviceBrand && `(${booking.deviceBrand})`}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {(booking.estimatedPrice || booking.finalPrice) && (
                                        <div className="text-right">
                                            {booking.finalPrice ? (
                                                <span className="text-lg font-bold text-primary flex items-center gap-1"><IndianRupee size={16} />{booking.finalPrice}</span>
                                            ) : booking.estimatedPrice ? (
                                                <span className="text-sm text-text-muted flex items-center gap-1">Est: <IndianRupee size={12} />{booking.estimatedPrice}</span>
                                            ) : null}
                                        </div>
                                    )}
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${booking.status === 'Completed' || booking.status === 'Delivered' ? 'text-success bg-success/10 border-success/20' :
                                            booking.status === 'Cancelled' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                                                booking.status === 'In Progress' ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' :
                                                    'text-blue-500 bg-blue-500/10 border-blue-500/20'
                                        }`}>
                                        {booking.status === 'Completed' || booking.status === 'Delivered' ? <CheckCircle size={14} /> :
                                            booking.status === 'Cancelled' ? <XCircle size={14} /> :
                                                <Clock size={14} />}
                                        {booking.status}
                                    </span>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === booking.id && (
                                <div className="border-t border-gray-100 p-6 bg-gray-50/30 space-y-4 animate-in fade-in slide-in-from-top duration-200">
                                    {/* Status Timeline */}
                                    <StatusTimeline currentStatus={booking.status} />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Address */}
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-sm text-text-muted flex items-center gap-2"><MapPin size={14} /> Pickup Address</h4>
                                            <p className="text-sm">
                                                {booking.address}<br />
                                                {booking.city}, {booking.pincode}
                                                {booking.landmark && <><br />Near: {booking.landmark}</>}
                                            </p>
                                        </div>

                                        {/* Contact */}
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-sm text-text-muted flex items-center gap-2"><Phone size={14} /> Contact</h4>
                                            <p className="text-sm">{booking.customerName}</p>
                                            <p className="text-sm">{booking.customerPhone}</p>
                                        </div>

                                        {/* Pickup OTP */}
                                        {booking.pickupOtp && booking.status !== 'Cancelled' && (
                                            <div className="space-y-2">
                                                <h4 className="font-bold text-sm text-text-muted">🔑 Pickup OTP</h4>
                                                <p className="text-2xl font-mono font-bold tracking-widest text-primary">{booking.pickupOtp}</p>
                                                <p className="text-xs text-text-muted">Share with technician during pickup</p>
                                            </div>
                                        )}

                                        {/* Pricing */}
                                        {(booking.estimatedPrice || booking.finalPrice) && (
                                            <div className="space-y-2">
                                                <h4 className="font-bold text-sm text-text-muted flex items-center gap-2"><IndianRupee size={14} /> Pricing</h4>
                                                {booking.estimatedPrice && <p className="text-sm">Estimated: ₹{booking.estimatedPrice}</p>}
                                                {booking.finalPrice && <p className="text-sm font-bold">Final: ₹{booking.finalPrice}</p>}
                                            </div>
                                        )}

                                        {/* Assigned Technician */}
                                        {booking.assignedTo && (
                                            <div className="space-y-2">
                                                <h4 className="font-bold text-sm text-text-muted flex items-center gap-2"><UserIcon size={14} /> Assigned Technician</h4>
                                                <p className="text-sm">{booking.assignedTo}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {booking.description && (
                                        <div>
                                            <h4 className="font-bold text-sm text-text-muted mb-1">Issue Description</h4>
                                            <p className="text-sm bg-white p-3 rounded-lg border border-gray-100">{booking.description}</p>
                                        </div>
                                    )}

                                    {/* Referral Code Applied */}
                                    {booking.referralCodeUsed && (
                                        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
                                            <Gift size={16} className="text-primary flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-text-muted">Referral Code Applied</p>
                                                <span className="font-mono text-sm font-bold text-primary">{booking.referralCodeUsed}</span>
                                                <p className="text-xs text-text-muted mt-0.5">Your friend will receive store credit when this service is completed.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="glass-panel p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                            <Wrench size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No Service History</h3>
                        <p className="text-text-muted mb-6">You haven't booked any services yet.</p>
                        <Link to="/services">
                            <Button variant="outline">Browse Services</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserServices;
