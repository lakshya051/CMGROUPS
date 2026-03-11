import React, { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import Button from '../../components/ui/Button';
import {
    CheckCircle, CreditCard, Truck, Store, Copy, Shield, AlertCircle, Gift,
    MapPin, Link2, Locate, Trash2, BookMarked
} from 'lucide-react';
import { checkoutSchema } from '../../utils/validationSchemas';
import { addressesAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { handleImageError } from '../../utils/image';
import { useSEO } from '../../hooks/useSEO';

// ── Smart Delivery defaults ─────────────────────────────────────────────────
const DEFAULT_CITY = 'Hathras';
const DEFAULT_PINCODE = '204101';

// ── Helper: build a Google Maps URL from coords ─────────────────────────────
const buildMapsUrl = (lat, lng) =>
    `https://www.google.com/maps?q=${lat},${lng}`;

// ── Saved Address Card ───────────────────────────────────────────────────────
const AddressCard = ({ addr, selected, onSelect, onDelete }) => (
    <div
        onClick={() => onSelect(addr)}
        className={`flex-shrink-0 w-48 p-3 rounded-xl border cursor-pointer transition-all duration-200 relative group
            ${selected
                ? 'border-trust bg-trust/10 ring-2 ring-trust/40 shadow-md'
                : 'border-border-default bg-surface hover:border-trust/40 hover:bg-surface-hover'
            }`}
    >
        {/* delete button */}
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(addr.id); }}
            className="absolute top-2 right-2 p-1 rounded-md text-text-muted hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all"
            title="Delete address"
        >
            <Trash2 size={12} />
        </button>

        <div className="flex items-center gap-1.5 mb-1">
            <MapPin size={12} className={selected ? 'text-trust' : 'text-text-muted'} />
            <span className={`text-xs font-bold truncate ${selected ? 'text-trust' : 'text-text-primary'}`}>
                {addr.label || 'Saved Address'}
            </span>
        </div>
        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{addr.address}</p>
        <p className="text-xs text-text-secondary mt-1">{addr.city} – {addr.pincode}</p>
        {selected && (
            <div className="mt-2 flex items-center gap-1 text-trust text-xs font-semibold">
                <CheckCircle size={10} /> Applied
            </div>
        )}
    </div>
);

// ── Main Checkout Component ──────────────────────────────────────────────────
const Checkout = () => {
    const { cart, placeOrder } = useShop();
    const { user } = useAuth();
    const navigate = useNavigate();
    useSEO({ title: 'Checkout — CMGROUPS', description: 'Complete your order.', noIndex: true });

    // ── Core flow state ─────────────────────────────────────────────────────
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [paymentOtp, setPaymentOtp] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('pay_at_store');
    const [otpCopied, setOtpCopied] = useState(false);
    const [orderError, setOrderError] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [useWallet, setUseWallet] = useState(false);

    // ── Smart Delivery state ────────────────────────────────────────────────
    const [gps, setGps] = useState({ lat: null, lng: null });
    const [manualLink, setManualLink] = useState('');
    const [locationMode, setLocationMode] = useState('gps');   // 'gps' | 'link'
    const [locationStatus, setLocationStatus] = useState('idle'); // idle|loading|success|error
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [saveAddressChecked, setSaveAddressChecked] = useState(false);
    const [addressLabel, setAddressLabel] = useState('');

    const resetSaveAddressState = () => {
        setSaveAddressChecked(false);
        setAddressLabel('');
    };

    // ── Fetch saved addresses on mount ──────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        addressesAPI.getAll()
            .then(setSavedAddresses)
            .catch(() => { });
    }, [user]);

    // ── Order totals ────────────────────────────────────────────────────────
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * 0.18;
    const computedTotal = subtotal + tax;
    const maxWalletUse = Math.min(Math.round(computedTotal), user?.walletBalance || 0);
    const discount = useWallet ? maxWalletUse : 0;
    const finalTotal = Math.max(0, Math.round(computedTotal) - discount);

    // ── Formik ──────────────────────────────────────────────────────────────
    const formik = useFormik({
        initialValues: {
            fullName: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            addressLine: '',
            city: DEFAULT_CITY,
            state: '',
            postalCode: DEFAULT_PINCODE,
        },
        validationSchema: checkoutSchema,
        validateOnBlur: true,
        validateOnChange: true,
        onSubmit: () => setStep(2),
    });

    const handleDeliveryFieldChange = (e) => {
        if (selectedAddressId !== null) {
            setSelectedAddressId(null);
            resetSaveAddressState();
        }
        formik.handleChange(e);
    };

    // ── GPS detection ────────────────────────────────────────────────────────
    const detectLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser.');
            return;
        }
        setLocationStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setGps({ lat, lng });
                setLocationStatus('success');
                toast.success('Location detected! ✓');
            },
            (err) => {
                console.warn('GPS error:', err);
                setLocationStatus('error');
                toast.error(
                    err.code === 1
                        ? 'Location permission denied. You can still proceed with the text address.'
                        : 'Could not detect location. Please enter it manually.'
                );
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // ── Apply saved address to form ──────────────────────────────────────────
    const applyAddress = (addr) => {
        setSelectedAddressId(addr.id);
        resetSaveAddressState();
        formik.setFieldValue('addressLine', addr.address);
        formik.setFieldValue('city', addr.city);
        formik.setFieldValue('postalCode', addr.pincode);
        formik.setFieldValue('phone', addr.phone);

        if (addr.latitude && addr.longitude) {
            setGps({ lat: addr.latitude, lng: addr.longitude });
            setManualLink('');
            setLocationStatus('success');
            setLocationMode('gps');
        } else if (addr.googleMapLink) {
            setGps({ lat: null, lng: null });
            setManualLink(addr.googleMapLink);
            setLocationMode('link');
            setLocationStatus('idle');
        } else {
            setLocationMode('gps');
            setLocationStatus('idle');
            setGps({ lat: null, lng: null });
            setManualLink('');
        }
    };

    // ── Delete saved address ─────────────────────────────────────────────────
    const handleDeleteAddress = async (id) => {
        try {
            await addressesAPI.delete(id);
            setSavedAddresses(prev => prev.filter(a => a.id !== id));
            if (selectedAddressId === id) setSelectedAddressId(null);
            toast.success('Address deleted.');
        } catch {
            toast.error('Failed to delete address.');
        }
    };

    // ── Place order ──────────────────────────────────────────────────────────
    const handlePlaceOrder = async () => {
        setIsProcessing(true);
        setOrderError('');
        try {
            const shippingAddress = {
                fullName: formik.values.fullName,
                email: formik.values.email,
                phone: formik.values.phone,
                address: formik.values.addressLine,
                city: formik.values.city,
                state: formik.values.state,
                postalCode: formik.values.postalCode,
            };

            // 1. Save address if checkbox is ticked
            if (saveAddressChecked && user && !selectedAddressId) {
                const locationPayloadForSave = {
                    label: addressLabel.trim() || null,
                    address: formik.values.addressLine,
                    city: formik.values.city,
                    pincode: formik.values.postalCode,
                    phone: formik.values.phone,
                    latitude: gps.lat || null,
                    longitude: gps.lng || null,
                    googleMapLink: locationMode === 'link' ? manualLink : (gps.lat ? buildMapsUrl(gps.lat, gps.lng) : null),
                };
                try {
                    const saved = await addressesAPI.create(locationPayloadForSave);
                    setSavedAddresses(prev => [saved, ...prev]);
                } catch (saveErr) {
                    console.warn('Could not save address (non-blocking):', saveErr);
                }
            }

            // 2. Resolve final location payload
            const finalLatitude = gps.lat || null;
            const finalLongitude = gps.lng || null;
            const finalMapLink =
                locationMode === 'link'
                    ? (manualLink.trim() || null)
                    : (gps.lat ? buildMapsUrl(gps.lat, gps.lng) : null);

            const method = finalTotal === 0 ? 'wallet' : paymentMethod;
            const order = await placeOrder({
                total: finalTotal,
                paymentMethod: method,
                shippingAddress,
                referralCode: referralCode.trim() || null,
                useWallet,
                walletUsed: discount,
                latitude: finalLatitude,
                longitude: finalLongitude,
                googleMapLink: finalMapLink,
            });

            setOrderId(order.id);
            setPaymentOtp(order.paymentOtp);
            setStep(3);
        } catch (err) {
            const errorMessage = err.message || 'Failed to place order. Please try again.';
            setOrderError(errorMessage);
            if (errorMessage.includes('Insufficient stock')) {
                setTimeout(() => navigate('/cart'), 3500);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const copyOtp = () => {
        if (paymentOtp) {
            navigator.clipboard.writeText(paymentOtp);
            setOtpCopied(true);
            setTimeout(() => setOtpCopied(false), 2000);
        }
    };

    // ── Step 3 – Order Confirmation ──────────────────────────────────────────
    if (step === 3) {
        return (
            <div className="container mx-auto px-4 py-20 text-center animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>
                <h1 className="text-4xl font-heading font-bold mb-4">Order Placed!</h1>
                <p className="text-text-muted max-w-md mx-auto mb-8">
                    Thank you, {user?.name}! Your order <span className="text-primary font-bold">#{orderId}</span> has been placed successfully.
                </p>

                <div className="max-w-md mx-auto bg-surface border border-border-default rounded-lg shadow-sm p-lg mb-8 space-y-4">
                    <div className="flex items-center gap-2 justify-center text-warning">
                        <Shield size={20} />
                        <h3 className="font-bold text-lg text-text-primary">Payment Verification OTP</h3>
                    </div>
                    <p className="text-text-secondary text-sm">
                        {paymentMethod === 'pay_at_store'
                            ? 'Show this OTP at the store when you pay to confirm your order.'
                            : paymentMethod === 'wallet'
                                ? 'Your order is fully paid using wallet balance.'
                                : 'Show this OTP to the delivery agent upon receiving your order.'}
                    </p>
                    {paymentOtp ? (
                        <>
                            <div className="flex items-center justify-center gap-3">
                                <div className="bg-page-bg border border-trust/50 rounded-xl px-xl py-lg font-mono text-4xl font-bold text-trust tracking-[0.3em] select-all">
                                    {paymentOtp}
                                </div>
                                <button
                                    onClick={copyOtp}
                                    className="p-sm bg-page-bg border border-border-default hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-text-primary"
                                    title="Copy OTP"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                            {otpCopied && <p className="text-success font-bold text-sm">✓ OTP copied to clipboard!</p>}
                            <p className="text-xs text-text-muted">⚠️ Keep this OTP safe. It's required to verify your payment.</p>
                        </>
                    ) : (
                        <div className="bg-success/10 text-success p-md rounded-xl border border-success/20 font-bold">
                            Fully Paid via Wallet
                        </div>
                    )}
                </div>

                <div className="flex gap-4 justify-center">
                    <Button onClick={() => navigate('/dashboard/orders')}>View My Orders</Button>
                    <Button variant="outline" onClick={() => navigate('/')}>Return Home</Button>
                </div>
            </div>
        );
    }

    // ── Steps 1 & 2 ─────────────────────────────────────────────────────────
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-heading font-bold mb-8">Checkout</h1>

            {orderError && (
                <div className="bg-error/10 border border-error/20 text-error p-4 rounded-lg mb-6 flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span>{orderError}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* ── Left Column ── */}
                <div className="space-y-8">

                    {/* ── Shipping Information Card ── */}
                    <div className={`bg-surface border rounded-lg shadow-sm p-lg transition-all duration-300 ${step === 1 ? 'border-trust ring-1 ring-trust/50' : 'border-border-default opacity-70'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <Truck className={step === 1 ? 'text-trust' : 'text-text-muted'} />
                            <h2 className={`text-xl font-bold ${step === 1 ? 'text-text-primary' : 'text-text-secondary'}`}>Shipping Information</h2>
                            {step > 1 && <span className="text-success font-bold text-sm ml-auto flex items-center gap-1"><CheckCircle size={14} /> Done</span>}
                        </div>

                        <form onSubmit={formik.handleSubmit} className="space-y-3">

                            {/* ── Saved Address Book (Phase 4) ── */}
                            {savedAddresses.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookMarked size={14} className="text-trust" />
                                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Saved Addresses</span>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border-default">
                                        {savedAddresses.map(addr => (
                                            <AddressCard
                                                key={addr.id}
                                                addr={addr}
                                                selected={selectedAddressId === addr.id}
                                                onSelect={applyAddress}
                                                onDelete={handleDeleteAddress}
                                            />
                                        ))}
                                    </div>
                                    <div className="mt-2 border-b border-border-default" />
                                </div>
                            )}

                            {/* Full Name */}
                            <div>
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Full Name *"
                                    className={`input-field ${formik.touched.fullName && formik.errors.fullName ? 'border-red-500' : ''}`}
                                    value={formik.values.fullName}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    readOnly={step !== 1}
                                />
                                {formik.touched.fullName && formik.errors.fullName && (
                                    <p className="text-red-400 text-sm mt-1">{formik.errors.fullName}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email Address *"
                                    className={`input-field ${formik.touched.email && formik.errors.email ? 'border-red-500' : ''}`}
                                    value={formik.values.email}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    readOnly={step !== 1}
                                />
                                {formik.touched.email && formik.errors.email && (
                                    <p className="text-red-400 text-sm mt-1">{formik.errors.email}</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="Phone Number *"
                                    className={`input-field ${formik.touched.phone && formik.errors.phone ? 'border-red-500' : ''}`}
                                    value={formik.values.phone}
                                    onChange={handleDeliveryFieldChange}
                                    onBlur={formik.handleBlur}
                                    readOnly={step !== 1}
                                />
                                {formik.touched.phone && formik.errors.phone && (
                                    <p className="text-red-400 text-sm mt-1">{formik.errors.phone}</p>
                                )}
                            </div>

                            {/* Address */}
                            <div>
                                <input
                                    type="text"
                                    name="addressLine"
                                    placeholder="Address Line *"
                                    className={`input-field ${formik.touched.addressLine && formik.errors.addressLine ? 'border-red-500' : ''}`}
                                    value={formik.values.addressLine}
                                    onChange={handleDeliveryFieldChange}
                                    onBlur={formik.handleBlur}
                                    readOnly={step !== 1}
                                />
                                {formik.touched.addressLine && formik.errors.addressLine && (
                                    <p className="text-red-400 text-sm mt-1">{formik.errors.addressLine}</p>
                                )}
                            </div>

                            {/* ── Smart Location Section (Phase 3) ── */}
                            {step === 1 && (
                                <div className="bg-page-bg border border-border-default rounded-xl p-4 space-y-3">
                                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                                        <MapPin size={12} className="text-trust" /> Smart Location (optional)
                                    </p>

                                    {/* Radio toggle */}
                                    <div className="flex gap-3">
                                        <label className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm
                                            ${locationMode === 'gps'
                                                ? 'border-trust bg-trust/10 text-trust font-semibold'
                                                : 'border-border-default text-text-secondary hover:border-trust/30'}`}>
                                            <input
                                                type="radio"
                                                className="sr-only"
                                                checked={locationMode === 'gps'}
                                                onChange={() => setLocationMode('gps')}
                                            />
                                            <MapPin size={14} /> 📍 GPS Location
                                        </label>
                                        <label className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm
                                            ${locationMode === 'link'
                                                ? 'border-trust bg-trust/10 text-trust font-semibold'
                                                : 'border-border-default text-text-secondary hover:border-trust/30'}`}>
                                            <input
                                                type="radio"
                                                className="sr-only"
                                                checked={locationMode === 'link'}
                                                onChange={() => setLocationMode('link')}
                                            />
                                            <Link2 size={14} /> 🔗 Maps Link
                                        </label>
                                    </div>

                                    {/* GPS mode */}
                                    {locationMode === 'gps' && (
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={detectLocation}
                                                disabled={locationStatus === 'loading'}
                                                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-trust text-trust hover:bg-trust/10 transition-colors disabled:opacity-60 disabled:cursor-wait font-medium"
                                            >
                                                <Locate size={14} className={locationStatus === 'loading' ? 'animate-spin' : ''} />
                                                {locationStatus === 'loading' ? 'Detecting…' : 'Detect My Location'}
                                            </button>

                                            {locationStatus === 'success' && (
                                                <span className="flex items-center gap-1.5 text-success text-sm font-semibold">
                                                    <CheckCircle size={14} />
                                                    Captured ({gps.lat?.toFixed(4)}, {gps.lng?.toFixed(4)})
                                                </span>
                                            )}
                                            {locationStatus === 'error' && (
                                                <span className="flex items-center gap-1.5 text-error text-xs">
                                                    <AlertCircle size={13} /> Denied – text address is enough
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Link mode */}
                                    {locationMode === 'link' && (
                                        <input
                                            type="url"
                                            value={manualLink}
                                            onChange={(e) => setManualLink(e.target.value)}
                                            placeholder="Paste Google Maps link here…"
                                            className="input-field text-sm"
                                        />
                                    )}
                                </div>
                            )}

                            {/* City / State / PIN row */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <input
                                        type="text"
                                        name="city"
                                        placeholder="City *"
                                        className={`input-field ${formik.touched.city && formik.errors.city ? 'border-red-500' : ''}`}
                                        value={formik.values.city}
                                        onChange={handleDeliveryFieldChange}
                                        onBlur={formik.handleBlur}
                                        readOnly={step !== 1}
                                    />
                                    {formik.touched.city && formik.errors.city && (
                                        <p className="text-red-400 text-sm mt-1">{formik.errors.city}</p>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    name="state"
                                    placeholder="State"
                                    className="input-field"
                                    value={formik.values.state}
                                    onChange={handleDeliveryFieldChange}
                                    onBlur={formik.handleBlur}
                                    readOnly={step !== 1}
                                />
                                <div>
                                    <input
                                        type="text"
                                        name="postalCode"
                                        placeholder="PIN Code *"
                                        className={`input-field ${formik.touched.postalCode && formik.errors.postalCode ? 'border-red-500' : ''}`}
                                        value={formik.values.postalCode}
                                        onChange={handleDeliveryFieldChange}
                                        onBlur={formik.handleBlur}
                                        readOnly={step !== 1}
                                    />
                                    {formik.touched.postalCode && formik.errors.postalCode && (
                                        <p className="text-red-400 text-sm mt-1">{formik.errors.postalCode}</p>
                                    )}
                                </div>
                            </div>

                            {step === 1 && (
                                <Button type="submit" disabled={formik.isSubmitting}>
                                    Continue to Payment
                                </Button>
                            )}
                        </form>
                    </div>

                    {/* ── Payment Method Card ── */}
                    <div className={`bg-surface border rounded-lg shadow-sm p-lg transition-all duration-300 ${step === 2 ? 'border-trust ring-1 ring-trust/50' : 'border-border-default opacity-50'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <CreditCard className={step === 2 ? 'text-trust' : 'text-text-muted'} />
                            <h2 className={`text-xl font-bold ${step === 2 ? 'text-text-primary' : 'text-text-secondary'}`}>Payment Method</h2>
                        </div>
                        {step === 2 && (
                            <div className="space-y-4">
                                {/* Pay at Store */}
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('pay_at_store')}
                                    className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left ${paymentMethod === 'pay_at_store'
                                        ? 'border-trust bg-trust/5 ring-1 ring-trust/30'
                                        : 'border-border-default bg-page-bg hover:border-text-muted hover:bg-surface-hover'
                                        }`}
                                >
                                    <div className={`p-3 rounded-lg flex items-center justify-center border ${paymentMethod === 'pay_at_store' ? 'bg-trust/10 text-trust border-trust/20' : 'bg-surface text-text-muted border-border-default'}`}>
                                        <Store size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-primary">Pay at Store</h3>
                                        <p className="text-sm text-text-secondary">Visit our store and pay in person. You'll receive an OTP to verify your payment.</p>
                                    </div>
                                    {paymentMethod === 'pay_at_store' && <CheckCircle className="ml-auto text-trust" size={24} />}
                                </button>

                                {/* Cash on Delivery */}
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('cod')}
                                    className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left ${paymentMethod === 'cod'
                                        ? 'border-trust bg-trust/5 ring-1 ring-trust/30'
                                        : 'border-border-default bg-page-bg hover:border-text-muted hover:bg-surface-hover'
                                        }`}
                                >
                                    <div className={`p-3 rounded-lg flex items-center justify-center border ${paymentMethod === 'cod' ? 'bg-trust/10 text-trust border-trust/20' : 'bg-surface text-text-muted border-border-default'}`}>
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-primary">Cash on Delivery</h3>
                                        <p className="text-sm text-text-secondary">Pay when you receive your order. Show the OTP to the delivery agent.</p>
                                    </div>
                                    {paymentMethod === 'cod' && <CheckCircle className="ml-auto text-trust" size={24} />}
                                </button>

                                <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-3 text-sm text-blue-400 flex items-start gap-2">
                                    <Shield size={16} className="mt-0.5 flex-shrink-0" />
                                    <span>A 6-digit OTP will be generated when you place your order. Show it when making payment to verify your order.</span>
                                </div>

                                {/* Wallet */}
                                {(user?.walletBalance > 0) && (
                                    <div className="border border-trust/20 bg-trust/5 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-trust/10 text-trust rounded-lg border border-trust/20">
                                                <Gift size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-text-primary">Use Wallet Balance</h4>
                                                <p className="text-sm text-text-secondary">Available: ₹{user.walletBalance.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={useWallet}
                                                onChange={() => setUseWallet(!useWallet)}
                                            />
                                            <div className="w-11 h-6 bg-border-default peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-trust/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-default after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-trust"></div>
                                        </label>
                                    </div>
                                )}

                                {/* Referral Code */}
                                <div className="border border-border-default rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-trust">
                                        <Gift size={18} />
                                        <h4 className="font-bold text-sm">Have a Referral Code?</h4>
                                        <span className="text-xs text-text-muted">(optional)</span>
                                    </div>
                                    <input
                                        type="text"
                                        className="input-field uppercase"
                                        placeholder="Enter code e.g. TNAB3F7E"
                                        value={referralCode}
                                        onChange={(e) => setReferralCode(e.target.value)}
                                    />
                                    <p className="text-xs text-text-secondary">Enter a friend's referral code to give them ₹200 store credit!</p>
                                </div>

                                {/* ── Save Address Checkbox (Phase 3) ── */}
                                {user && (
                                    <div className="border border-border-default rounded-xl p-4 space-y-3">
                                        {selectedAddressId ? (
                                            <div className="text-sm text-text-secondary">
                                                Using a saved address. Edit the delivery fields above if you want to save this as a new address.
                                            </div>
                                        ) : (
                                            <>
                                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded accent-trust cursor-pointer"
                                                        checked={saveAddressChecked}
                                                        onChange={(e) => setSaveAddressChecked(e.target.checked)}
                                                    />
                                                    <div>
                                                        <span className="font-semibold text-sm text-text-primary">Save this address for future orders</span>
                                                        <p className="text-xs text-text-muted">Quickly auto-fill next time</p>
                                                    </div>
                                                </label>
                                                {saveAddressChecked && (
                                                    <input
                                                        type="text"
                                                        placeholder="Label (e.g. Home, Office)"
                                                        className="input-field text-sm"
                                                        value={addressLabel}
                                                        onChange={(e) => setAddressLabel(e.target.value)}
                                                        maxLength={30}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                <Button
                                    type="button"
                                    className="w-full"
                                    onClick={handlePlaceOrder}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Placing Order…' : `Place Order — ₹${finalTotal.toLocaleString()}`}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Order Summary Side ── */}
                <div className="bg-surface border border-border-default rounded-lg shadow-sm p-lg h-fit sticky top-24">
                    <h3 className="font-bold mb-4 text-lg text-text-primary">Your Order</h3>
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                        {cart.map(item => (
                            <div key={item.id} className="flex gap-3 text-sm">
                                <img
                                    src={item.image}
                                    alt=""
                                    loading="lazy"
                                    width={48}
                                    height={48}
                                    onError={handleImageError}
                                    className="w-12 h-12 rounded bg-surface object-contain"
                                />
                                <div className="flex-grow text-text-primary">
                                    <p className="font-medium line-clamp-1">{item.title}</p>
                                    <p className="text-text-secondary">x{item.quantity}</p>
                                </div>
                                <span className="font-bold text-text-primary">₹{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-border-default pt-4 space-y-2 text-sm">
                        <div className="flex justify-between text-text-muted">
                            <span>Subtotal</span>
                            <span>₹{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-text-muted">
                            <span>GST (18%)</span>
                            <span>₹{Math.round(tax).toLocaleString()}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-success">
                                <span>Wallet Discount</span>
                                <span className="font-bold">-₹{discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-xl pt-2 border-t border-border-default text-text-primary">
                            <span>Total</span>
                            <span>₹{finalTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
