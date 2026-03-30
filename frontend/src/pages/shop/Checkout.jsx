import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
    CheckCircle, CreditCard, Shield, AlertCircle, Copy,
} from 'lucide-react';
import { checkoutSchema } from '../../utils/validationSchemas';
import { addressesAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { useSEO } from '../../hooks/useSEO';
import ShippingStep from './checkout/ShippingStep';
import PaymentStep, { OrderSummaryPanel } from './checkout/PaymentStep';
import { FREE_DELIVERY_THRESHOLD } from '../../constants';

const DEFAULT_CITY = 'Hathras';
const DEFAULT_PINCODE = '204101';

const buildMapsUrl = (lat, lng) =>
    `https://www.google.com/maps?q=${lat},${lng}`;

const Checkout = () => {
    const { cart, placeOrder, coupon } = useShop();
    const { user } = useAuth();
    const navigate = useNavigate();
    useSEO({ title: 'Checkout — Shoptify', description: 'Complete your order.', noIndex: true });

    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [paymentOtp, setPaymentOtp] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('pay_at_store');
    const [otpCopied, setOtpCopied] = useState(false);
    const [orderError, setOrderError] = useState('');
    const orderSuccessRef = useRef(false);
    const placingOrderRef = useRef(false);
    const [referralCode, setReferralCode] = useState('');
    const [useWallet, setUseWallet] = useState(false);

    const [gps, setGps] = useState({ lat: null, lng: null });
    const [manualLink, setManualLink] = useState('');
    const [locationMode, setLocationMode] = useState('gps');
    const [locationStatus, setLocationStatus] = useState('idle');
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [saveAddressChecked, setSaveAddressChecked] = useState(false);
    const [addressLabel, setAddressLabel] = useState('');
    const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const resetSaveAddressState = () => {
        setSaveAddressChecked(false);
        setAddressLabel('');
    };

    useEffect(() => {
        if (!user) return;
        addressesAPI.getAll()
            .then(setSavedAddresses)
            .catch(() => { });
    }, [user]);

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const couponDiscount = coupon?.discount || 0;
    const deliveryFee = subtotal < FREE_DELIVERY_THRESHOLD ? 40 : 0;
    const tax = Math.round((subtotal - couponDiscount) * 0.18);
    const computedTotal = Math.round((subtotal - couponDiscount) * 1.18 + deliveryFee);
    const maxWalletUse = Math.min(computedTotal, user?.walletBalance || 0);
    const walletDiscount = useWallet ? maxWalletUse : 0;
    const finalTotal = Math.max(0, computedTotal - walletDiscount);

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
        enableReinitialize: true,
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

    const handleDeleteAddress = (id) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete address?',
            message: 'Delete this saved address?',
            onConfirm: async () => {
                setConfirmState(prev => ({ ...prev, isOpen: false }));
                try {
                    await addressesAPI.delete(id);
                    setSavedAddresses(prev => prev.filter(a => a.id !== id));
                    if (selectedAddressId === id) setSelectedAddressId(null);
                    toast.success('Address deleted.');
                } catch {
                    toast.error('Failed to delete address.');
                }
            },
        });
    };

    const handlePlaceOrder = async () => {
        if (placingOrderRef.current) return;
        placingOrderRef.current = true;
        orderSuccessRef.current = false;
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
                walletUsed: walletDiscount,
                latitude: finalLatitude,
                longitude: finalLongitude,
                googleMapLink: finalMapLink,
            });

            orderSuccessRef.current = true;
            setOrderId(order.id);
            setPaymentOtp(order.paymentOtp);
            setOrderError('');
            setStep(3);
        } catch (err) {
            if (orderSuccessRef.current) return;
            const errorMessage = err.message || 'Failed to place order. Please try again.';
            setOrderError(errorMessage);
            if (errorMessage.includes('Insufficient stock')) {
                setTimeout(() => navigate('/cart'), 3500);
            }
        } finally {
            placingOrderRef.current = false;
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

    useEffect(() => {
        if (cart.length === 0 && step !== 3 && !orderId && !placingOrderRef.current && !orderSuccessRef.current) {
            navigate('/cart', { replace: true });
        }
    }, [cart.length, step, orderId, navigate]);

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
                        {!paymentOtp
                            ? 'Your order is fully paid using wallet balance.'
                            : paymentMethod === 'pay_at_store'
                                ? 'Show this OTP at the store when you pay to confirm your order.'
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
                                    aria-label="Copy OTP to clipboard"
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

                {cart.some?.(item => item.bundleInfo?.bundleId) && (
                    <div className="max-w-md mx-auto bg-trust/5 border border-trust/20 rounded-lg p-4 mb-6 text-sm text-text-secondary">
                        Your order includes a service combo. Installation/service will be scheduled after delivery. Check status in <span className="font-semibold text-trust">Dashboard &gt; Services</span>.
                    </div>
                )}

                <div className="flex gap-4 justify-center">
                    <Button onClick={() => navigate('/dashboard/orders')}>View My Orders</Button>
                    <Button variant="outline" onClick={() => navigate('/')}>Return Home</Button>
                </div>
            </div>
        );
    }

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
                <div className="space-y-8">
                    <ShippingStep
                        step={step}
                        formik={formik}
                        savedAddresses={savedAddresses}
                        selectedAddressId={selectedAddressId}
                        onApplyAddress={applyAddress}
                        onDeleteAddress={handleDeleteAddress}
                        onDeliveryFieldChange={handleDeliveryFieldChange}
                        locationMode={locationMode}
                        setLocationMode={setLocationMode}
                        locationStatus={locationStatus}
                        gps={gps}
                        manualLink={manualLink}
                        setManualLink={setManualLink}
                        onDetectLocation={detectLocation}
                    />

                    <PaymentStep
                        step={step}
                        paymentMethod={paymentMethod}
                        onPaymentMethodChange={setPaymentMethod}
                        user={user}
                        useWallet={useWallet}
                        onUseWalletChange={setUseWallet}
                        referralCode={referralCode}
                        onReferralCodeChange={setReferralCode}
                        selectedAddressId={selectedAddressId}
                        saveAddressChecked={saveAddressChecked}
                        onSaveAddressCheckedChange={setSaveAddressChecked}
                        addressLabel={addressLabel}
                        onAddressLabelChange={setAddressLabel}
                        isProcessing={isProcessing}
                        finalTotal={finalTotal}
                        onPlaceOrder={handlePlaceOrder}
                    />
                </div>

                <OrderSummaryPanel
                    cart={cart}
                    subtotal={subtotal}
                    tax={tax}
                    couponDiscount={couponDiscount}
                    deliveryFee={deliveryFee}
                    walletDiscount={walletDiscount}
                    finalTotal={finalTotal}
                />
            </div>
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
            />
        </div>
    );
};

export default Checkout;
