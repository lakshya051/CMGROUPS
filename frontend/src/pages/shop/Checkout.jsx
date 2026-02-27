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
        validateOnChange: false,
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

                <div className="max-w-md mx-auto glass-panel p-6 mb-8 space-y-4">
                    <div className="flex items-center gap-2 justify-center text-warning">
                        <Shield size={20} />
                        <h3 className="font-bold text-lg">Payment Verification OTP</h3>
                    </div>
                    <p className="text-text-muted text-sm">
                        {paymentMethod === 'pay_at_store'
                            ? 'Show this OTP at the store when you pay to confirm your order.'
                            : paymentMethod === 'wallet'
                                ? 'Your order is fully paid using wallet balance.'
                                : 'Show this OTP to the delivery agent upon receiving your order.'}
                    </p>
                    {paymentOtp ? (
                        <>
                            <div className="flex items-center justify-center gap-3">
                                <div className="bg-gray-100 border-2 border-primary/50 rounded-xl px-8 py-4 font-mono text-4xl font-bold text-primary tracking-[0.3em] select-all">
                                    {paymentOtp}
                                </div>
                                <button
                                    onClick={copyOtp}
                                    className="p-3 bg-gray-100 hover:bg-slate-700 rounded-lg transition-colors text-text-muted hover:text-text-main"
                                    title="Copy OTP"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                            {otpCopied && <p className="text-success text-sm">✓ OTP copied to clipboard!</p>}
                            <p className="text-xs text-text-muted">⚠️ Keep this OTP safe. It's required to verify your payment.</p>
                        </>
                    ) : (
                        <div className="bg-success/10 text-success p-4 rounded-xl border border-success/20 font-bold">
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
                    <div className={`glass-panel p-6 ${step === 1 ? 'border-primary ring-1 ring-primary/50' : 'opacity-70'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <Truck className="text-primary" />
                            <h2 className="text-xl font-bold">Shipping Information</h2>
                            {step > 1 && <span className="text-success text-sm ml-auto">✓ Done</span>}
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
                    <div className={`glass-panel p-6 ${step === 2 ? 'border-primary ring-1 ring-primary/50' : 'opacity-50'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <CreditCard className="text-primary" />
                            <h2 className="text-xl font-bold">Payment Method</h2>
                        </div>
                        {step === 2 && (
                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('pay_at_store')}
                                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${paymentMethod === 'pay_at_store'
                                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                        : 'border-gray-200 bg-gray-50 hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`p-3 rounded-lg ${paymentMethod === 'pay_at_store' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-text-muted'}`}>
                                        <Store size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Pay at Store</h3>
                                        <p className="text-sm text-text-muted">Visit our store and pay in person. You'll receive an OTP to verify your payment.</p>
                                    </div>
                                    {paymentMethod === 'pay_at_store' && <CheckCircle className="ml-auto text-primary" size={24} />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('cod')}
                                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${paymentMethod === 'cod'
                                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                        : 'border-gray-200 bg-gray-50 hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`p-3 rounded-lg ${paymentMethod === 'cod' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-text-muted'}`}>
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Cash on Delivery</h3>
                                        <p className="text-sm text-text-muted">Pay when you receive your order. Show the OTP to the delivery agent.</p>
                                    </div>
                                    {paymentMethod === 'cod' && <CheckCircle className="ml-auto text-primary" size={24} />}
                                </button>

                                <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-3 text-sm text-blue-400 flex items-start gap-2">
                                    <Shield size={16} className="mt-0.5 flex-shrink-0" />
                                    <span>A 6-digit OTP will be generated when you place your order. Show it when making payment to verify your order.</span>
                                </div>

                                {/* Wallet Use */}
                                {(user?.walletBalance > 0) && (
                                    <div className="border border-primary/20 bg-primary/5 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/20 text-primary rounded-lg">
                                                <Gift size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold">Use Wallet Balance</h4>
                                                <p className="text-sm text-text-muted">Available: ₹{user.walletBalance.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={useWallet}
                                                onChange={() => setUseWallet(!useWallet)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                )}

                                {/* Referral Code */}
                                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-primary">
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
                                    <p className="text-xs text-text-muted">Enter a friend's referral code to give them ₹200 store credit!</p>
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
                <div className="glass-panel p-6 h-fit sticky top-24">
                    <h3 className="font-bold mb-4 text-lg">Your Order</h3>
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                        {cart.map(item => (
                            <div key={item.id} className="flex gap-3 text-sm">
                                <img src={item.image} alt="" className="w-12 h-12 rounded bg-gray-100 object-contain" />
                                <div className="flex-grow">
                                    <p className="font-medium line-clamp-1">{item.title}</p>
                                    <p className="text-text-muted">x{item.quantity}</p>
                                </div>
                                <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
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
                                <span>-₹{discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-200">
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
