import React, { useState, useEffect } from 'react';
import { Wrench, Calendar, Clock, CheckCircle, XCircle, MapPin, Phone, Cpu, IndianRupee, User as UserIcon, Truck, Settings, Package } from 'lucide-react';
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
                                ? 'bg-buy-primary border-buy-primary text-text-primary'
                                : 'bg-page-bg border-border-default text-text-muted'
                                } ${isCurrent ? 'ring-4 ring-buy-primary/20 scale-110' : ''}`}>
                                {isComplete ? '✓' : idx + 1}
                            </div>
                            <span className={`text-[10px] mt-1 text-center leading-tight ${isComplete ? 'text-text-primary font-bold' : 'text-text-muted'}`}>
                                {step}
                            </span>
                        </div>
                        {idx < STATUS_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 min-w-[16px] ${idx < currentIdx ? 'bg-buy-primary' : 'bg-border-default'}`} />
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
        <div className="space-y-lg">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-1">My Service Requests</h1>
                    <p className="text-sm text-text-secondary">Track your repair and build appointments.</p>
                </div>
                <Link to="/services">
                    <Button>Book New Service</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {bookings.length > 0 ? (
                    bookings.map(booking => (
                        <div key={booking.id} className="bg-surface border border-border-default rounded-lg shadow-sm overflow-hidden">
                            {/* Main Row */}
                            <div
                                className="p-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-surface-hover transition-colors"
                                onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-sm rounded bg-trust/10 text-trust border border-trust/20">
                                        <Wrench size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg text-text-primary">{booking.serviceType}</h3>
                                            <span className="font-mono text-xs text-text-muted opacity-80">SRV-{booking.id}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary font-medium">
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
                                    <span className={`px-3 py-1 rounded text-xs font-bold border flex items-center gap-2 ${booking.status === 'Completed' || booking.status === 'Delivered' ? 'text-success bg-success/10 border-success/20' :
                                        booking.status === 'Cancelled' ? 'text-error bg-error/10 border-error/20' :
                                            booking.status === 'In Progress' ? 'text-warning bg-warning/10 border-warning/20' :
                                                'text-trust bg-trust/10 border-trust/20'
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
                                <div className="border-t border-border-default p-md bg-page-bg space-y-md animate-in fade-in slide-in-from-top duration-200">
                                    {/* Status Timeline */}
                                    <StatusTimeline currentStatus={booking.status} />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                                        {/* Address */}
                                        <div className="space-y-sm">
                                            <h4 className="font-bold text-sm text-text-secondary flex items-center gap-2"><MapPin size={14} /> Pickup Address</h4>
                                            <p className="text-sm font-medium text-text-primary">
                                                {booking.address}<br />
                                                {booking.city}, {booking.pincode}
                                                {booking.landmark && <><br />Near: {booking.landmark}</>}
                                            </p>
                                        </div>

                                        {/* Contact */}
                                        <div className="space-y-sm">
                                            <h4 className="font-bold text-sm text-text-secondary flex items-center gap-2"><Phone size={14} /> Contact</h4>
                                            <p className="text-sm font-medium text-text-primary">{booking.customerName}</p>
                                            <p className="text-sm text-text-secondary">{booking.customerPhone}</p>
                                        </div>

                                        {/* Pickup OTP */}
                                        {booking.pickupOtp && booking.status !== 'Cancelled' && (
                                            <div className="space-y-sm">
                                                <h4 className="font-bold text-sm text-text-secondary flex items-center gap-2">🔑 Pickup OTP</h4>
                                                <p className="text-2xl font-mono font-bold tracking-widest text-trust">{booking.pickupOtp}</p>
                                                <p className="text-xs text-text-muted">Share with technician during pickup</p>
                                            </div>
                                        )}

                                        {/* Pricing */}
                                        {(booking.estimatedPrice || booking.finalPrice) && (
                                            <div className="space-y-sm">
                                                <h4 className="font-bold text-sm text-text-secondary flex items-center gap-2"><IndianRupee size={14} /> Pricing</h4>
                                                {booking.estimatedPrice && <p className="text-sm font-medium text-text-primary">Estimated: ₹{booking.estimatedPrice}</p>}
                                                {booking.finalPrice && <p className="text-sm font-bold text-text-primary">Final: ₹{booking.finalPrice}</p>}
                                            </div>
                                        )}

                                        {/* Assigned Technician */}
                                        {booking.assignedTo && (
                                            <div className="space-y-sm">
                                                <h4 className="font-bold text-sm text-text-secondary flex items-center gap-2"><UserIcon size={14} /> Assigned Technician</h4>
                                                <p className="text-sm font-medium text-text-primary">{booking.assignedTo}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {booking.description && (
                                        <div>
                                            <h4 className="font-bold text-sm text-text-secondary mb-2">Issue Description</h4>
                                            <p className="text-sm bg-surface p-sm rounded border border-border-default text-text-primary">{booking.description}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="bg-surface border border-border-default rounded-lg shadow-sm p-xl text-center">
                        <div className="w-16 h-16 bg-page-bg rounded-lg border border-border-default flex items-center justify-center mx-auto mb-md text-text-muted">
                            <Wrench size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-text-primary">No Service History</h3>
                        <p className="text-text-secondary mb-lg">You haven't booked any services yet.</p>
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
