import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import Button from '../../components/ui/Button';
import { CheckCircle, CreditCard, Truck, Store, Copy, Shield, AlertCircle, Gift } from 'lucide-react';
import { checkoutSchema } from '../../utils/validationSchemas';

const Checkout = () => {
    const { cart, placeOrder } = useShop();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [paymentOtp, setPaymentOtp] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('pay_at_store');
    const [otpCopied, setOtpCopied] = useState(false);
    const [orderError, setOrderError] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [useWallet, setUseWallet] = useState(false);

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * 0.18;
    const computedTotal = subtotal + tax;
    const maxWalletUse = Math.min(Math.round(computedTotal), user?.walletBalance || 0);
    const discount = useWallet ? maxWalletUse : 0;
    const finalTotal = Math.max(0, Math.round(computedTotal) - discount);

    const formik = useFormik({
        initialValues: {
            fullName: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            addressLine: '',
            city: '',
            state: '',
            postalCode: '',
        },
        validationSchema: checkoutSchema,
        validateOnBlur: true,
        validateOnChange: true,
        onSubmit: () => {
            setStep(2);
        },
    });

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
            const method = finalTotal === 0 ? 'wallet' : paymentMethod;
            const order = await placeOrder({
                total: finalTotal,
                paymentMethod: method,
                shippingAddress,
                referralCode: referralCode.trim() || null,
                useWallet,
                walletUsed: discount,
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
                    {/* Shipping */}
                    <div className={`bg-surface border rounded-lg shadow-sm p-lg transition-all duration-300 ${step === 1 ? 'border-trust ring-1 ring-trust/50' : 'border-border-default opacity-70'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <Truck className={step === 1 ? "text-trust" : "text-text-muted"} />
                            <h2 className={`text-xl font-bold ${step === 1 ? 'text-text-primary' : 'text-text-secondary'}`}>Shipping Information</h2>
                            {step > 1 && <span className="text-success font-bold text-sm ml-auto flex items-center gap-1"><CheckCircle size={14} /> Done</span>}
                        </div>
                        <form onSubmit={formik.handleSubmit} className="space-y-3">
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
                                    placeholder="Phone Number"
                                    className="input-field"
                                    value={formik.values.phone}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    readOnly={step !== 1}
                                />
                            </div>
                            {/* Address */}
                            <div>
                                <input
                                    type="text"
                                    name="addressLine"
                                    placeholder="Address Line *"
                                    className={`input-field ${formik.touched.addressLine && formik.errors.addressLine ? 'border-red-500' : ''}`}
                                    value={formik.values.addressLine}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    readOnly={step !== 1}
                                />
                                {formik.touched.addressLine && formik.errors.addressLine && (
                                    <p className="text-red-400 text-sm mt-1">{formik.errors.addressLine}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {/* City */}
                                <div>
                                    <input
                                        type="text"
                                        name="city"
                                        placeholder="City *"
                                        className={`input-field ${formik.touched.city && formik.errors.city ? 'border-red-500' : ''}`}
                                        value={formik.values.city}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        readOnly={step !== 1}
                                    />
                                    {formik.touched.city && formik.errors.city && (
                                        <p className="text-red-400 text-sm mt-1">{formik.errors.city}</p>
                                    )}
                                </div>
                                {/* State */}
                                <input
                                    type="text"
                                    name="state"
                                    placeholder="State"
                                    className="input-field"
                                    value={formik.values.state}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    readOnly={step !== 1}
                                />
                                {/* PIN */}
                                <div>
                                    <input
                                        type="text"
                                        name="postalCode"
                                        placeholder="PIN Code *"
                                        className={`input-field ${formik.touched.postalCode && formik.errors.postalCode ? 'border-red-500' : ''}`}
                                        value={formik.values.postalCode}
                                        onChange={formik.handleChange}
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

                    {/* Payment Method Selection */}
                    <div className={`bg-surface border rounded-lg shadow-sm p-lg transition-all duration-300 ${step === 2 ? 'border-trust ring-1 ring-trust/50' : 'border-border-default opacity-50'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <CreditCard className={step === 2 ? "text-trust" : "text-text-muted"} />
                            <h2 className={`text-xl font-bold ${step === 2 ? 'text-text-primary' : 'text-text-secondary'}`}>Payment Method</h2>
                        </div>
                        {step === 2 && (
                            <div className="space-y-4">
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

                                {/* Wallet Use */}
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

                                <Button
                                    type="button"
                                    className="w-full"
                                    onClick={handlePlaceOrder}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Placing Order...' : `Place Order — ₹${finalTotal.toLocaleString()}`}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Order Summary Side */}
                <div className="bg-surface border border-border-default rounded-lg shadow-sm p-lg h-fit sticky top-24">
                    <h3 className="font-bold mb-4 text-lg text-text-primary">Your Order</h3>
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                        {cart.map(item => (
                            <div key={item.id} className="flex gap-3 text-sm">
                                <img src={item.image} alt="" className="w-12 h-12 rounded bg-surface object-contain" />
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
