import React, { useState, useEffect } from 'react';
import {
    CheckCircle, Calendar, X, MapPin, Phone, User,
    Gift, Info, LocateFixed, Loader2,
} from 'lucide-react';
import { servicesAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useFormik } from 'formik';
import { serviceBookingSchema } from '../../utils/validationSchemas';
import Button from '../../components/ui/Button';
import { getServiceIcon } from './ServiceCard';

const ErrMsg = ({ name, touched, errors }) =>
    touched[name] && errors[name]
        ? <p className="text-error text-sm mt-1">{errors[name]}</p>
        : null;

const BookingModal = ({
    isOpen,
    onClose,
    selectedService,
    serviceTypes: _serviceTypes,
}) => {
    const { user } = useAuth();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [gps, setGps] = useState({ lat: null, lng: null });
    const [locationStatus, setLocationStatus] = useState('idle');

    const fallbackTimeSlots = ['10:00 AM - 12:00 PM', '12:00 PM - 02:00 PM', '02:00 PM - 04:00 PM', '04:00 PM - 06:00 PM'];

    const buildMapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            return;
        }
        setLocationStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setGps({ lat, lng });
                setLocationStatus('success');
            },
            () => { setLocationStatus('error'); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const formik = useFormik({
        initialValues: {
            customerName: user?.name || '',
            customerPhone: user?.phone || '',
            address: '', city: '', pincode: '', landmark: '',
            date: '', timeSlot: '', referralCode: '',
            customFields: {},
        },
        validationSchema: serviceBookingSchema,
        validateOnBlur: true, validateOnChange: true,
        onSubmit: async (values, { setSubmitting, setErrors }) => {
            try {
                const { customFields: cf, ...rest } = values;
                const serviceFormFields = selectedService?.formFields;

                if (Array.isArray(serviceFormFields)) {
                    const missing = serviceFormFields
                        .filter(f => f.required && (!cf?.[f.name] || !String(cf[f.name]).trim()))
                        .map(f => f.label);
                    if (missing.length > 0) {
                        setErrors({ submit: `Please fill in: ${missing.join(', ')}` });
                        setSubmitting(false);
                        return;
                    }
                }
                const hasCustomFields = Array.isArray(serviceFormFields) && serviceFormFields.length > 0;

                const deviceType = cf?.deviceType || null;
                const deviceBrand = cf?.deviceBrand || null;
                const description = cf?.issueDescription || null;

                await servicesAPI.book({
                    serviceType: selectedService.title,
                    ...rest,
                    deviceType,
                    deviceBrand,
                    description,
                    customFields: hasCustomFields ? cf : null,
                    latitude: gps.lat || null,
                    longitude: gps.lng || null,
                    googleMapLink: gps.lat ? buildMapsUrl(gps.lat, gps.lng) : null,
                });
                setIsSubmitted(true);
            } catch (err) {
                setErrors({ submit: err.message || 'Booking failed. Please try again.' });
            } finally {
                setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        if (!isOpen || !selectedService) return;
        formik.resetForm({
            values: {
                customerName: user?.name || '',
                customerPhone: user?.phone || '',
                address: '', city: '', pincode: '',
                landmark: '', date: '', timeSlot: '', referralCode: '',
                customFields: {},
            },
        });
        setGps({ lat: null, lng: null });
        setLocationStatus('idle');
        setIsSubmitted(false);
    }, [isOpen, selectedService?.id]);

    useEffect(() => {
        if (!isOpen || !selectedService || !formik.values.date) { setAvailableSlots([]); return; }
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
    }, [isOpen, selectedService?.id, formik.values.date]);

    const handleClose = () => {
        setIsSubmitted(false);
        setGps({ lat: null, lng: null });
        setLocationStatus('idle');
        formik.resetForm();
        onClose();
    };

    if (!isOpen || !selectedService) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border-default shadow-2xl rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 relative animate-in zoom-in duration-200">
                <button onClick={handleClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary z-10 hover:bg-surface-hover rounded-full p-1 transition-colors" aria-label="Close booking dialog">
                    <X size={22} />
                </button>

                {!isSubmitted ? (
                    <>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-trust/10 text-trust flex items-center justify-center">
                                {getServiceIcon(selectedService.icon)}
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
                                    <ErrMsg name="customerName" touched={formik.touched} errors={formik.errors} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Phone *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
                                        <input name="customerPhone" type="tel" className={`input-field pl-9 ${formik.touched.customerPhone && formik.errors.customerPhone ? 'border-red-500' : ''}`} value={formik.values.customerPhone} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="10-digit phone" />
                                    </div>
                                    <ErrMsg name="customerPhone" touched={formik.touched} errors={formik.errors} />
                                </div>
                            </div>

                            {Array.isArray(selectedService.formFields) && selectedService.formFields.length > 0 && (
                                <div className="space-y-4">
                                    {(() => {
                                        const fields = selectedService.formFields;
                                        const pairs = [];
                                        let i = 0;
                                        while (i < fields.length) {
                                            const f = fields[i];
                                            if (f.type === 'textarea') {
                                                pairs.push([f]);
                                                i++;
                                            } else if (i + 1 < fields.length && fields[i + 1].type !== 'textarea') {
                                                pairs.push([f, fields[i + 1]]);
                                                i += 2;
                                            } else {
                                                pairs.push([f]);
                                                i++;
                                            }
                                        }
                                        return pairs.map((group, gIdx) => (
                                            <div key={gIdx} className={group.length === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
                                                {group.map(field => {
                                                    const val = formik.values.customFields?.[field.name] || '';
                                                    const setVal = (v) => formik.setFieldValue(`customFields.${field.name}`, v);
                                                    return (
                                                        <div key={field.name}>
                                                            <label className="block text-sm font-medium mb-1">
                                                                {field.label}{field.required ? ' *' : ''}
                                                            </label>
                                                            {field.type === 'select' ? (
                                                                <select className="input-field" value={val} onChange={e => setVal(e.target.value)}>
                                                                    <option value="">Select {field.label.toLowerCase()}</option>
                                                                    {(field.options || []).map(opt => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                            ) : field.type === 'textarea' ? (
                                                                <textarea className="input-field h-20 pt-2" placeholder={`Enter ${field.label.toLowerCase()}...`} value={val} onChange={e => setVal(e.target.value)} />
                                                            ) : (
                                                                <input type={field.type === 'number' ? 'number' : 'text'} className="input-field" placeholder={`Enter ${field.label.toLowerCase()}`} value={val} onChange={e => setVal(e.target.value)} />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">Pickup Address *</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-text-muted" size={15} />
                                    <textarea name="address" className={`input-field pl-9 h-20 pt-2 ${formik.touched.address && formik.errors.address ? 'border-red-500' : ''}`} value={formik.values.address} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="House/Flat No., Street, Area" />
                                </div>
                                <ErrMsg name="address" touched={formik.touched} errors={formik.errors} />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">City *</label>
                                    <input name="city" className={`input-field ${formik.touched.city && formik.errors.city ? 'border-red-500' : ''}`} value={formik.values.city} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="City" />
                                    <ErrMsg name="city" touched={formik.touched} errors={formik.errors} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Pincode *</label>
                                    <input name="pincode" className={`input-field ${formik.touched.pincode && formik.errors.pincode ? 'border-red-500' : ''}`} value={formik.values.pincode} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="000000" maxLength={6} />
                                    <ErrMsg name="pincode" touched={formik.touched} errors={formik.errors} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Landmark</label>
                                    <input name="landmark" className="input-field" value={formik.values.landmark} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Near..." />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="button"
                                    onClick={detectLocation}
                                    disabled={locationStatus === 'loading'}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                                        locationStatus === 'success'
                                            ? 'bg-green-50 border-green-300 text-green-700'
                                            : locationStatus === 'error'
                                                ? 'bg-red-50 border-red-300 text-red-700'
                                                : 'bg-trust/5 border-trust/30 text-trust hover:bg-trust/10'
                                    }`}
                                >
                                    {locationStatus === 'loading' ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                        <LocateFixed size={15} />
                                    )}
                                    {locationStatus === 'success' ? 'Location Detected' : locationStatus === 'error' ? 'Detection Failed — Try Again' : 'Detect My Location'}
                                </button>
                                {locationStatus === 'success' && (
                                    <p className="text-xs text-green-600 mt-1">GPS coordinates captured. This helps our technician reach you faster.</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Preferred Date *</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
                                    <input name="date" type="date" className={`input-field pl-9 ${formik.touched.date && formik.errors.date ? 'border-red-500' : ''}`} value={formik.values.date} onChange={(e) => { formik.handleChange(e); formik.setFieldValue('timeSlot', ''); }} onBlur={formik.handleBlur} />
                                </div>
                                <ErrMsg name="date" touched={formik.touched} errors={formik.errors} />
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
                                <ErrMsg name="timeSlot" touched={formik.touched} errors={formik.errors} />
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

                            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 leading-relaxed">
                                <Info size={16} className="flex-shrink-0 mt-0.5" />
                                <p>
                                    Note: The {selectedService.price} covers technician visit and diagnostics.
                                    Any required hardware parts or premium software will be quoted separately
                                    after inspection and require your approval before proceeding.
                                </p>
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
                        <Button onClick={handleClose} variant="outline">Close</Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingModal;
