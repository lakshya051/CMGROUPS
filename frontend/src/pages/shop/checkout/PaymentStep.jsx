import React from 'react';
import {
    CheckCircle, CreditCard, Truck, Store, Shield, Gift, Zap,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { handleImageError } from '../../../utils/image';

const PaymentStep = ({
    step,
    paymentMethod,
    onPaymentMethodChange,
    user,
    useWallet,
    onUseWalletChange,
    referralCode,
    onReferralCodeChange,
    selectedAddressId,
    saveAddressChecked,
    onSaveAddressCheckedChange,
    addressLabel,
    onAddressLabelChange,
    isProcessing,
    finalTotal,
    onPlaceOrder,
}) => (
    <div className={`bg-surface border rounded-lg shadow-sm p-lg transition-all duration-300 ${step === 2 ? 'border-trust ring-1 ring-trust/50' : 'border-border-default opacity-50'}`}>
        <div className="flex items-center gap-4 mb-4">
            <CreditCard className={step === 2 ? 'text-trust' : 'text-text-muted'} />
            <h2 className={`text-xl font-bold ${step === 2 ? 'text-text-primary' : 'text-text-secondary'}`}>Payment Method</h2>
        </div>
        {step === 2 && (
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => onPaymentMethodChange('pay_at_store')}
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
                    onClick={() => onPaymentMethodChange('cod')}
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

                <div className="bg-blue-700/10 border border-blue-700/20 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2">
                    <Shield size={16} className="mt-0.5 flex-shrink-0" />
                    <span>A 6-digit OTP will be generated when you place your order. Show it when making payment to verify your order.</span>
                </div>

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
                                onChange={() => onUseWalletChange(!useWallet)}
                            />
                            <div className="w-11 h-6 bg-border-default peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-trust/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-default after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-trust"></div>
                        </label>
                    </div>
                )}

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
                        onChange={(e) => onReferralCodeChange(e.target.value)}
                    />
                    <p className="text-xs text-text-secondary">Enter a friend's referral code to give them ₹200 store credit!</p>
                </div>

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
                                        onChange={(e) => onSaveAddressCheckedChange(e.target.checked)}
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
                                        onChange={(e) => onAddressLabelChange(e.target.value)}
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
                    onClick={onPlaceOrder}
                    disabled={isProcessing}
                >
                    {isProcessing ? 'Placing Order…' : `Place Order — ₹${finalTotal.toLocaleString()}`}
                </Button>
            </div>
        )}
    </div>
);

export const OrderSummaryPanel = ({ cart, subtotal, tax, couponDiscount = 0, deliveryFee = 0, walletDiscount = 0, finalTotal }) => (
    <div className="bg-surface border border-border-default rounded-lg shadow-sm p-lg h-fit sticky top-24">
        <h3 className="font-bold mb-4 text-lg text-text-primary">Your Order</h3>
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
            {cart.map(item => (
                <div key={item.uniqueId || item.id} className="flex gap-3 text-sm">
                    <img
                        src={item.images?.[0] || item.image}
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
            {couponDiscount > 0 && (
                <div className="flex justify-between text-success">
                    <span>Coupon Discount</span>
                    <span className="font-bold">-₹{couponDiscount.toLocaleString()}</span>
                </div>
            )}
            <div className="flex justify-between text-text-muted">
                <div className="flex items-center gap-1">
                    <span>Delivery</span>
                    <span className="text-[10px] text-trust font-semibold bg-trust/10 px-1.5 py-0.5 rounded">24-HR</span>
                </div>
                <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
            </div>
            <div className="flex justify-between text-text-muted">
                <span>GST (18%)</span>
                <span>₹{Math.round(tax).toLocaleString()}</span>
            </div>
            {walletDiscount > 0 && (
                <div className="flex justify-between text-success">
                    <span>Wallet Discount</span>
                    <span className="font-bold">-₹{walletDiscount.toLocaleString()}</span>
                </div>
            )}
            <div className="flex justify-between font-bold text-xl pt-2 border-t border-border-default text-text-primary">
                <span>Total</span>
                <span>₹{finalTotal.toLocaleString()}</span>
            </div>
        </div>
    </div>
);

export default PaymentStep;
