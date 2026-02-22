import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import { Wrench, Monitor, Cpu, CheckCircle, Calendar, X, MapPin, Phone, User, Printer, HardDrive, Settings } from 'lucide-react';
import { servicesAPI, serviceTypesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useFormik } from 'formik';
import { serviceBookingSchema } from '../utils/validationSchemas';

const iconMap = {
    Wrench: <Wrench size={40} />,
    Monitor: <Monitor size={40} />,
    Cpu: <Cpu size={40} />,
    Printer: <Printer size={40} />,
    HardDrive: <HardDrive size={40} />,
    Settings: <Settings size={40} />,
};

const defaultServices = [
    { id: 'repair', title: 'Expert PC Repair', icon: 'Wrench', description: 'Diagnose and fix hardware/software issues.', price: '₹499', features: ['Free Diagnostics', 'No Fix, No Fee', 'Original Parts'] },
    { id: 'cleaning', title: 'Deep Cleaning', icon: 'Monitor', description: 'Professional dust removal and thermal repasting.', price: '₹999', features: ['Thermal Paste Replacement', 'Cable Management', 'Exterior Polish'] },
    { id: 'build', title: 'Custom PC Build', icon: 'Cpu', description: 'We build your dream PC with neat cable management.', price: '₹2,499', features: ['Component Selection', 'Stress Testing', 'BIOS Optimization'] },
];

const Services = () => {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedOtp, setSubmittedOtp] = useState('');
    const [pageLoading, setPageLoading] = useState(true);

    const deviceTypes = ['Laptop', 'Desktop', 'Printer', 'Monitor', 'Other'];
    const deviceBrands = ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Apple', 'Samsung', 'MSI', 'Other'];

    useEffect(() => {
        serviceTypesAPI.getAll()
            .then(data => {
                if (data && data.length > 0) {
                    setServices(data.map(s => ({ ...s, features: Array.isArray(s.features) ? s.features : [] })));
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
            deviceType: '',
            deviceBrand: '',
            address: '',
            city: '',
            pincode: '',
            landmark: '',
            date: '',
            description: '',
        },
        validationSchema: serviceBookingSchema,
        validateOnBlur: true,
        validateOnChange: false,
        onSubmit: async (values, { setSubmitting, setErrors }) => {
            try {
                const result = await servicesAPI.book({
                    serviceType: selectedService.title,
                    ...values,
                });
                setSubmittedOtp(result.pickupOtp);
                setIsSubmitted(true);
            } catch (err) {
                setErrors({ submit: err.message || 'Booking failed. Please try again.' });
            } finally {
                setSubmitting(false);
            }
        },
    });

    const openBooking = (service) => {
        formik.resetForm({
            values: {
                customerName: user?.name || '',
                customerPhone: user?.phone || '',
                deviceType: '',
                deviceBrand: '',
                address: '',
                city: '',
                pincode: '',
                landmark: '',
                date: '',
                description: '',
            }
        });
        setIsSubmitted(false);
        setSubmittedOtp('');
        setSelectedService(service);
    };

    const resetModal = () => {
        setSelectedService(null);
        setIsSubmitted(false);
        setSubmittedOtp('');
        formik.resetForm();
    };

    const ErrMsg = ({ name }) =>
        formik.touched[name] && formik.errors[name]
            ? <p className="text-red-400 text-sm mt-1">{formik.errors[name]}</p>
            : null;

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-heading font-bold mb-4">Professional Services</h1>
                <p className="text-text-muted max-w-2xl mx-auto">
                    From quick repairs to custom water-cooled builds, our certified technicians are here to help.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {services.map(service => (
                    <div key={service.id} className="glass-panel p-8 hover:border-primary/50 transition-colors group">
                        <div className="mb-6 text-primary group-hover:scale-110 transition-transform duration-300">
                            {iconMap[service.icon] || <Wrench size={40} />}
                        </div>
                        <h3 className="text-2xl font-bold mb-2">{service.title}</h3>
                        <p className="text-text-muted mb-6">{service.description}</p>
                        <ul className="space-y-3 mb-8">
                            {service.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm">
                                    <CheckCircle size={16} className="text-success" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <div className="flex items-center justify-between mt-auto">
                            <span className="text-2xl font-bold">Starting {service.price}</span>
                            <Button onClick={() => openBooking(service)}>Book Now</Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Booking Modal */}
            {selectedService && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative animate-in zoom-in duration-300">
                        <button onClick={resetModal} className="absolute top-4 right-4 text-text-muted hover:text-text-main z-10">
                            <X size={24} />
                        </button>

                        {!isSubmitted ? (
                            <>
                                <h2 className="text-2xl font-bold mb-1">Book {selectedService.title}</h2>
                                <p className="text-text-muted mb-6">Fill in your details and we'll pick up your device.</p>

                                {formik.errors.submit && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 text-sm text-center">
                                        {formik.errors.submit}
                                    </div>
                                )}

                                <form onSubmit={formik.handleSubmit} className="space-y-4">
                                    {/* Personal Details */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Full Name *</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input name="customerName" className={`input-field pl-10 ${formik.touched.customerName && formik.errors.customerName ? 'border-red-500' : ''}`} value={formik.values.customerName} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Your name" />
                                            </div>
                                            <ErrMsg name="customerName" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Phone *</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input name="customerPhone" type="tel" className={`input-field pl-10 ${formik.touched.customerPhone && formik.errors.customerPhone ? 'border-red-500' : ''}`} value={formik.values.customerPhone} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="10-digit phone" />
                                            </div>
                                            <ErrMsg name="customerPhone" />
                                        </div>
                                    </div>

                                    {/* Device Info */}
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

                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Pickup Address *</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <textarea name="address" className={`input-field pl-10 h-20 pt-2 ${formik.touched.address && formik.errors.address ? 'border-red-500' : ''}`} value={formik.values.address} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="House/Flat No., Street, Area" />
                                        </div>
                                        <ErrMsg name="address" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                                    {/* Date */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Preferred Date *</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input name="date" type="date" className={`input-field pl-10 ${formik.touched.date && formik.errors.date ? 'border-red-500' : ''}`} value={formik.values.date} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                                        </div>
                                        <ErrMsg name="date" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Describe Your Issue</label>
                                        <textarea name="description" className="input-field h-24 pt-2" value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Tell us what's wrong with your device..." />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={formik.isSubmitting}>
                                        {formik.isSubmitting ? 'Submitting...' : 'Confirm Booking'}
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Booking Confirmed!</h3>
                                <p className="text-text-muted mb-6">Your service request has been submitted successfully.</p>
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                                    <p className="text-sm text-text-muted mb-2">Your Pickup Verification OTP</p>
                                    <p className="text-3xl font-mono font-bold tracking-widest text-primary">{submittedOtp}</p>
                                    <p className="text-xs text-text-muted mt-2">Share this OTP with the technician during device pickup.</p>
                                </div>
                                <Button onClick={resetModal} variant="outline" className="mt-2">Close</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
