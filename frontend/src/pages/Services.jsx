import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import {
    Wrench, Monitor, Cpu, CheckCircle, Calendar, X, MapPin, Phone, User,
    Printer, HardDrive, Settings, Gift, Clock, Shield, Award, Star,
    ArrowRight, MousePointerClick, MessageSquare, CreditCard, Zap, Wifi,
    PcCase, Smartphone, BadgeCheck
} from 'lucide-react';
import { servicesAPI, serviceTypesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useFormik } from 'formik';
import { serviceBookingSchema } from '../utils/validationSchemas';

const iconMap = {
    Wrench: Wrench, Monitor: Monitor, Cpu: Cpu, Printer: Printer,
    HardDrive: HardDrive, Settings: Settings, Wifi: Wifi, Smartphone: Smartphone,
    PcCase: PcCase, Zap: Zap,
};

const defaultServices = [
    {
        id: 'repair', title: 'Expert PC Repair', icon: 'Wrench',
        description: 'Diagnose and fix hardware/software issues fast.',
        price: '₹499', estTime: '2–4 hours',
        features: ['Free Diagnostics', 'No Fix, No Fee', 'Original Parts']
    },
    {
        id: 'cleaning', title: 'Deep Cleaning', icon: 'Monitor',
        description: 'Professional dust removal and thermal repasting.',
        price: '₹999', estTime: '1–2 hours',
        features: ['Thermal Paste Replacement', 'Cable Management', 'Exterior Polish']
    },
    {
        id: 'build', title: 'Custom PC Build', icon: 'Cpu',
        description: 'We build your dream PC with neat cable management.',
        price: '₹2,499', estTime: '3–5 hours',
        features: ['Component Selection', 'Stress Testing', 'BIOS Optimization']
    },
];

const HOW_IT_WORKS = [
    { icon: MousePointerClick, step: '01', title: 'Book Online', desc: 'Choose your service, pick a slot, and fill in your details — takes 2 minutes.' },
    { icon: MessageSquare, step: '02', title: 'We Quote & Confirm', desc: 'Our admin reviews, sets a price, and sends you a confirmation with a pickup OTP.' },
    { icon: Wrench, step: '03', title: 'Tech Arrives', desc: 'Our certified technician arrives at your door at the scheduled time.' },
    { icon: CreditCard, step: '04', title: 'Pay on Delivery', desc: 'Device repaired. Pay the final amount when we return your device.' },
];

const TRUST_POINTS = [
    { icon: BadgeCheck, label: 'Certified Technicians' },
    { icon: Shield, label: '90-Day Warranty' },
    { icon: Award, label: 'Genuine Parts' },
    { icon: Star, label: '4.8★ Rated Service' },
];

const Services = () => {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    const deviceTypes = ['Laptop', 'Desktop', 'Printer', 'Monitor', 'Other'];
    const deviceBrands = ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Apple', 'Samsung', 'MSI', 'Other'];
    const fallbackTimeSlots = ['10:00 AM - 12:00 PM', '12:00 PM - 02:00 PM', '02:00 PM - 04:00 PM', '04:00 PM - 06:00 PM'];

    useEffect(() => {
        serviceTypesAPI.getAll()
            .then(data => {
                if (data && data.length > 0) {
                    setServices(data.map(s => ({
                        ...s,
                        features: Array.isArray(s.features) ? s.features : [],
                        estTime: s.estTime || '1–3 hours'
                    })));
                } else {
                    setServices(defaultServices);
                }
            })
            .catch(() => setServices(defaultServices))
            .finally(() => setPageLoading(false));
    }, []);

    const formik = useFormik({
        initialValues: {
            customerName: user?.name || '',
            customerPhone: user?.phone || '',
            deviceType: '', deviceBrand: '',
            address: '', city: '', pincode: '', landmark: '',
            date: '', timeSlot: '', description: '', referralCode: '',
        },
        validationSchema: serviceBookingSchema,
        validateOnBlur: true, validateOnChange: true,
        onSubmit: async (values, { setSubmitting, setErrors }) => {
            try {
                await servicesAPI.book({ serviceType: selectedService.title, ...values });
                setIsSubmitted(true);
            } catch (err) {
                setErrors({ submit: err.message || 'Booking failed. Please try again.' });
            } finally {
                setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        if (!selectedService || !formik.values.date) { setAvailableSlots([]); return; }
        let mounted = true;
        setSlotsLoading(true);
        servicesAPI.getAvailableSlots(formik.values.date)
            .then(slots => {
                if (!mounted) return;
                setAvailableSlots(Array.isArray(slots) && slots.length > 0
                    ? slots
                    : fallbackTimeSlots.map(time => ({ time, available: true })));
            })
            .catch(() => {
                if (mounted) setAvailableSlots(fallbackTimeSlots.map(time => ({ time, available: true })));
            })
            .finally(() => { if (mounted) setSlotsLoading(false); });
        return () => { mounted = false; };
    }, [selectedService, formik.values.date]);

    const openBooking = (service) => {
        formik.resetForm({
            values: {
                customerName: user?.name || '', customerPhone: user?.phone || '',
                deviceType: '', deviceBrand: '', address: '', city: '', pincode: '',
                landmark: '', date: '', timeSlot: '', description: '', referralCode: '',
            }
        });
        setIsSubmitted(false);
        setSelectedService(service);
    };

    const resetModal = () => { setSelectedService(null); setIsSubmitted(false); formik.resetForm(); };

    const ErrMsg = ({ name }) =>
        formik.touched[name] && formik.errors[name]
            ? <p className="text-red-400 text-sm mt-1">{formik.errors[name]}</p>
            : null;

    const getIcon = (iconName) => {
        const Comp = iconMap[iconName] || Wrench;
        return <Comp size={32} />;
    };

    return (
        <div className="min-h-screen">
            {/* ── Hero ──────────────────────────────────────────────── */}
            <div className="relative bg-gradient-to-br from-trust/10 via-surface to-page-bg border-b border-border-default overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, #3B82F6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8B5CF6 0%, transparent 50%)'
                }} />
                <div className="container mx-auto px-4 py-16 text-center relative">
                    <div className="inline-flex items-center gap-2 bg-trust/10 border border-trust/20 text-trust text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                        <Zap size={14} />
                        Doorstep Repair Service
                    </div>
                    <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4 text-text-primary">
                        Expert Tech Repairs,<br />
                        <span className="text-trust">At Your Doorstep</span>
                    </h1>
                    <p className="text-text-muted max-w-xl mx-auto mb-6 text-lg">
                        Certified technicians for laptops, desktops, printers, and more. Book in 2 minutes.
                    </p>
                    {/* Trust Strip */}
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-2">
                        {TRUST_POINTS.map(({ icon: Icon, label }) => (
                            <span key={label} className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                                <Icon size={14} className="text-trust" />
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 space-y-16">
                {/* ── Service Cards ──────────────────────────────────── */}
                {pageLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-surface border border-border-default rounded-xl p-6 animate-pulse">
                                <div className="w-12 h-12 bg-surface-hover rounded-lg mb-4" />
                                <div className="h-5 bg-surface-hover rounded w-2/3 mb-2" />
                                <div className="h-4 bg-surface-hover rounded w-full mb-1" />
                                <div className="h-4 bg-surface-hover rounded w-3/4 mb-6" />
                                <div className="h-10 bg-surface-hover rounded" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-text-primary mb-2">Our Services</h2>
                            <p className="text-text-muted">Pick a service and book your slot in seconds.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services.map(service => (
                                <div key={service.id}
                                    className="group bg-surface border border-border-default rounded-xl p-6 hover:border-trust/40 hover:shadow-lg transition-all duration-300 flex flex-col">
                                    {/* Icon */}
                                    <div className="w-14 h-14 rounded-xl bg-trust/10 text-trust flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-trust/20 transition-all duration-300">
                                        {getIcon(service.icon)}
                                    </div>
                                    {/* Title & meta */}
                                    <h3 className="text-xl font-bold text-text-primary mb-1">{service.title}</h3>
                                    <p className="text-text-muted text-sm mb-4 flex-1">{service.description}</p>

                                    {/* Features */}
                                    <ul className="space-y-2 mb-5">
                                        {service.features.map((feat, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-sm text-text-secondary">
                                                <CheckCircle size={14} className="text-success flex-shrink-0" />
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Price + Time + CTA */}
                                    <div className="border-t border-border-default pt-4 mt-auto">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="text-xs text-text-muted">Starting from</p>
                                                <p className="text-xl font-bold text-text-primary">{service.price}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-text-muted">Est. time</p>
                                                <div className="flex items-center gap-1 text-sm font-medium text-text-secondary">
                                                    <Clock size={12} />
                                                    {service.estTime || '1–3 hrs'}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => openBooking(service)}
                                            className="w-full flex items-center justify-center gap-2"
                                        >
                                            Book Now <ArrowRight size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── How It Works ────────────────────────────────────── */}
                <div>
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-text-primary mb-2">How It Works</h2>
                        <p className="text-text-muted">Simple, transparent, and hassle-free.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                        {/* Connector line */}
                        <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-trust/20 via-trust/50 to-trust/20" />
                        {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
                            <div key={step} className="relative flex flex-col items-center text-center group">
                                <div className="w-16 h-16 rounded-2xl bg-trust text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform duration-200 relative z-10">
                                    <Icon size={28} />
                                </div>
                                <span className="text-xs font-mono font-bold text-trust/60 mb-1">STEP {step}</span>
                                <h3 className="font-bold text-text-primary mb-2">{title}</h3>
                                <p className="text-text-muted text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Trust Banner ─────────────────────────────────────── */}
                <div className="bg-gradient-to-r from-trust/10 via-trust/5 to-trust/10 border border-trust/20 rounded-2xl p-8 text-center">
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        {TRUST_POINTS.map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-2 bg-surface border border-border-default px-4 py-2 rounded-full text-sm font-semibold text-text-secondary shadow-sm">
                                <Icon size={16} className="text-trust" />
                                {label}
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-text-muted">
                        Every repair is covered by our 90-day service warranty. Not satisfied? We fix it free.
                    </p>
                </div>
            </div>

            {/* ── Booking Modal ───────────────────────────────────────── */}
            {selectedService && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-default shadow-2xl rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative animate-in zoom-in duration-200">
                        <button onClick={resetModal} className="absolute top-4 right-4 text-text-muted hover:text-text-primary z-10 hover:bg-surface-hover rounded-full p-1 transition-colors">
                            <X size={22} />
                        </button>

                        {!isSubmitted ? (
                            <>
                                {/* Modal Header */}
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-xl bg-trust/10 text-trust flex items-center justify-center">
                                        {getIcon(selectedService.icon)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-text-primary">Book {selectedService.title}</h2>
                                        <p className="text-text-secondary text-sm">Fill in your details and we'll pick up your device.</p>
                                    </div>
                                </div>

                                {formik.errors.submit && (
                                    <div className="bg-error/10 border border-error/20 text-error p-3 rounded-lg mb-4 text-sm text-center">
                                        {formik.errors.submit}
                                    </div>
                                )}

                                <form onSubmit={formik.handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Full Name *</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
                                                <input name="customerName" className={`input-field pl-9 ${formik.touched.customerName && formik.errors.customerName ? 'border-red-500' : ''}`} value={formik.values.customerName} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Your name" />
                                            </div>
                                            <ErrMsg name="customerName" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Phone *</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
                                                <input name="customerPhone" type="tel" className={`input-field pl-9 ${formik.touched.customerPhone && formik.errors.customerPhone ? 'border-red-500' : ''}`} value={formik.values.customerPhone} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="10-digit phone" />
                                            </div>
                                            <ErrMsg name="customerPhone" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Device Type</label>
                                            <select name="deviceType" className="input-field" value={formik.values.deviceType} onChange={formik.handleChange} onBlur={formik.handleBlur}>
                                                <option value="">Select device</option>
                                                {deviceTypes.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Brand</label>
                                            <select name="deviceBrand" className="input-field" value={formik.values.deviceBrand} onChange={formik.handleChange} onBlur={formik.handleBlur}>
                                                <option value="">Select brand</option>
                                                {deviceBrands.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Pickup Address *</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 text-text-muted" size={15} />
                                            <textarea name="address" className={`input-field pl-9 h-20 pt-2 ${formik.touched.address && formik.errors.address ? 'border-red-500' : ''}`} value={formik.values.address} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="House/Flat No., Street, Area" />
                                        </div>
                                        <ErrMsg name="address" />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">City *</label>
                                            <input name="city" className={`input-field ${formik.touched.city && formik.errors.city ? 'border-red-500' : ''}`} value={formik.values.city} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="City" />
                                            <ErrMsg name="city" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Pincode *</label>
                                            <input name="pincode" className={`input-field ${formik.touched.pincode && formik.errors.pincode ? 'border-red-500' : ''}`} value={formik.values.pincode} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="000000" maxLength={6} />
                                            <ErrMsg name="pincode" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Landmark</label>
                                            <input name="landmark" className="input-field" value={formik.values.landmark} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Near..." />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Preferred Date *</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
                                            <input name="date" type="date" className={`input-field pl-9 ${formik.touched.date && formik.errors.date ? 'border-red-500' : ''}`} value={formik.values.date} onChange={(e) => { formik.handleChange(e); formik.setFieldValue('timeSlot', ''); }} onBlur={formik.handleBlur} />
                                        </div>
                                        <ErrMsg name="date" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Preferred Time Slot *</label>
                                        <select name="timeSlot" className={`input-field ${formik.touched.timeSlot && formik.errors.timeSlot ? 'border-red-500' : ''}`} value={formik.values.timeSlot} onChange={formik.handleChange} onBlur={formik.handleBlur} disabled={!formik.values.date || slotsLoading}>
                                            <option value="">{!formik.values.date ? 'Select date first' : slotsLoading ? 'Loading...' : 'Select a time slot'}</option>
                                            {availableSlots.map(slot => (
                                                <option key={slot.time} value={slot.time} disabled={!slot.available}>
                                                    {slot.time}{!slot.available ? ' (Full)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ErrMsg name="timeSlot" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Describe Your Issue</label>
                                        <textarea name="description" className="input-field h-20 pt-2" value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Tell us what's wrong with your device..." />
                                    </div>

                                    <div className="border border-border-default rounded-xl p-4 space-y-2 bg-page-bg">
                                        <div className="flex items-center gap-2 text-primary">
                                            <Gift size={16} />
                                            <h4 className="font-bold text-sm">Have a Referral Code?</h4>
                                            <span className="text-xs text-text-muted">(optional)</span>
                                        </div>
                                        <input name="referralCode" type="text" className="input-field uppercase" placeholder="Enter code e.g. TNAB3F7E" value={formik.values.referralCode} onChange={formik.handleChange} />
                                        <p className="text-xs text-text-muted">Your friend earns store credit when your service is completed!</p>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={formik.isSubmitting}>
                                        {formik.isSubmitting ? 'Submitting...' : 'Confirm Booking'}
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center py-10">
                                <div className="w-20 h-20 bg-success/10 border-2 border-success/30 text-success rounded-full flex items-center justify-center mx-auto mb-5">
                                    <CheckCircle size={40} />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-text-primary">Booking Received!</h3>
                                <p className="text-text-secondary mb-2">We've received your request for <strong>{selectedService.title}</strong>.</p>
                                <p className="text-text-muted text-sm mb-6">Our admin will review and send you a confirmation with the estimated price and pickup OTP.</p>
                                <div className="bg-trust/5 border border-trust/20 rounded-xl p-4 mb-6 text-left">
                                    <p className="text-xs font-bold text-trust uppercase tracking-wider mb-2">What happens next?</p>
                                    <div className="space-y-1 text-sm text-text-secondary">
                                        <p>✅ Admin reviews and confirms your booking</p>
                                        <p>📧 You receive a confirmation with estimated price</p>
                                        <p>🔑 A Pickup OTP is sent to your registered email</p>
                                        <p>🛠️ Technician arrives at the scheduled time</p>
                                    </div>
                                </div>
                                <Button onClick={resetModal} variant="outline">Close</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
