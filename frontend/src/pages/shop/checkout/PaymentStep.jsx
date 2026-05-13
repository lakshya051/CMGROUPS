import React from 'react';
import {
    CheckCircle, CreditCard, Truck, Store, Shield, Gift, Zap, Layers, Wrench, Tag,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { getProductImageUrl, handleImageError } from '../../../utils/image';

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
    hasGiftableBundle,
    giftWrap,
    onGiftWrapChange,
    giftMessage,
    onGiftMessageChange,
    servicesScheduled = true,
    hasBundleServices = false,
    couponCode = '',
    onCouponCodeChange = () => {},
    onApplyCoupon = () => {},
    onRemoveCoupon = () => {},
    couponLoading = false,
    couponError = '',
    appliedCouponCode = null,
    referrerRewardAmount = 200,
}) => (
    <div className={`bg-surface border rounded-lg shadow-sm p-4 sm:p-lg transition-all duration-300 ${step === 2 ? 'border-trust ring-1 ring-trust/50' : 'border-border-default opacity-50'}`}>
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <CreditCard className={step === 2 ? 'text-trust' : 'text-text-muted'} size={20} />
            <h2 className={`text-lg sm:text-xl font-bold ${step === 2 ? 'text-text-primary' : 'text-text-secondary'}`}>Payment Method</h2>
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
                        <Tag size={18} />
                        <h4 className="font-bold text-sm">Promo / coupon code</h4>
                        <span className="text-xs text-text-muted">(optional)</span>
                    </div>
                    {appliedCouponCode ? (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-success uppercase tracking-wide">{appliedCouponCode}</span>
                            <button
                                type="button"
                                onClick={onRemoveCoupon}
                                className="text-xs font-medium text-error hover:underline"
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="input-field uppercase flex-1"
                                    placeholder="Enter coupon code"
                                    value={couponCode}
                                    onChange={(e) => onCouponCodeChange(e.target.value)}
                                    disabled={couponLoading}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="shrink-0"
                                    onClick={onApplyCoupon}
                                    disabled={couponLoading || !String(couponCode).trim()}
                                >
                                    {couponLoading ? '…' : 'Apply'}
                                </Button>
                            </div>
                            {couponError ? <p className="text-xs text-error">{couponError}</p> : null}
                        </>
                    )}
                </div>

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
                    <p className="text-xs text-text-secondary">Enter a friend's referral code to give them ₹{referrerRewardAmount.toLocaleString('en-IN')} store credit!</p>
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

                {hasGiftableBundle && (
                    <div className="border border-border-default rounded-xl p-4 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded accent-trust cursor-pointer"
                                checked={giftWrap}
                                onChange={(e) => onGiftWrapChange(e.target.checked)}
                            />
                            <div className="flex items-center gap-2">
                                <Gift size={16} className="text-primary" />
                                <div>
                                    <span className="font-semibold text-sm text-text-primary">Gift Wrap this order</span>
                                    <p className="text-xs text-text-muted">Add a personal message for the recipient</p>
                                </div>
                            </div>
                        </label>
                        {giftWrap && (
                            <textarea
                                placeholder="Write a gift message (optional)"
                                className="w-full border border-border-default rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-trust resize-none"
                                rows={3}
                                maxLength={300}
                                value={giftMessage}
                                onChange={(e) => onGiftMessageChange(e.target.value)}
                            />
                        )}
                    </div>
                )}

                {hasBundleServices && !servicesScheduled && (
                    <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning font-medium">
                        <Wrench size={14} className="shrink-0" />
                        Please schedule all bundle services above before placing your order.
                    </div>
                )}

                <Button
                    type="button"
                    className="w-full"
                    onClick={onPlaceOrder}
                    disabled={isProcessing || (hasBundleServices && !servicesScheduled)}
                >
                    {isProcessing ? 'Placing Order…' : `Place Order — ₹${finalTotal.toLocaleString()}`}
                </Button>
            </div>
        )}
    </div>
);

export const OrderSummaryPanel = ({ cart, subtotal, bundleSavings = 0, tax, couponDiscount = 0, deliveryFee = 0, walletDiscount = 0, finalTotal }) => {
    const bundleGroups = {};
    const standaloneItems = [];

    for (const item of cart) {
        if (item.bundleInfo?.bundleInstanceId && item.bundleInfo?.bundleName) {
            const key = item.bundleInfo.bundleInstanceId;
            if (!bundleGroups[key]) {
                bundleGroups[key] = { name: item.bundleInfo.bundleName, price: item.bundleInfo.bundlePrice, items: [] };
            }
            bundleGroups[key].items.push(item);
        } else {
            standaloneItems.push(item);
        }
    }

    return (
        <div className="bg-surface md:border md:border-border-default rounded-lg md:shadow-sm md:p-4 md:sm:p-lg h-fit md:sticky md:top-24">
            <h3 className="font-bold mb-4 text-base sm:text-lg text-text-primary hidden md:block">Your Order</h3>
            <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-2">
                {Object.entries(bundleGroups).map(([instanceId, group]) => {
                    const isServiceOnlyGroup = group.items.every(i => i.isServiceBundle);
                    return (
                        <div key={instanceId} className="bg-trust/5 border border-trust/20 rounded-lg p-2.5 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-trust">
                                {isServiceOnlyGroup ? <Wrench size={12} /> : <Layers size={12} />}
                                <span className="line-clamp-1">{group.name}</span>
                                {isServiceOnlyGroup && <span className="text-[10px] text-text-muted font-normal ml-1">(Service Bundle)</span>}
                            </div>
                            {isServiceOnlyGroup ? (
                                <div className="space-y-1 pl-1">
                                    {(group.items[0]?.bundleInfo?.serviceNames || []).map((name, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-xs text-text-secondary">
                                            <Wrench size={10} className="text-trust shrink-0" />
                                            {name}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                group.items.map(item => (
                                    <div key={item.uniqueId || item.id} className="flex gap-2 text-xs text-text-secondary pl-1">
                                        <img
                                            src={getProductImageUrl(item)}
                                            alt=""
                                            loading="lazy"
                                            width={32}
                                            height={32}
                                            onError={handleImageError}
                                            className="w-8 h-8 rounded bg-surface object-contain flex-shrink-0"
                                        />
                                        <span className="line-clamp-1 flex-1">{item.title} x{item.quantity}</span>
                                    </div>
                                ))
                            )}
                            <div className="flex items-center justify-between pt-1 border-t border-trust/10">
                                {(() => {
                                    const catalogTotal = isServiceOnlyGroup
                                        ? group.price
                                        : group.items.reduce((s, i) => s + i.price * i.quantity, 0);
                                    const bundlePrice = group.price ?? catalogTotal;
                                    const hasSavings = !isServiceOnlyGroup && catalogTotal > bundlePrice;
                                    return (
                                        <div className="flex items-center gap-2 ml-auto">
                                            {hasSavings && <span className="text-[10px] text-text-muted line-through">₹{catalogTotal.toLocaleString()}</span>}
                                            <span className="font-bold text-sm text-text-primary">₹{bundlePrice.toLocaleString()}</span>
                                            {hasSavings && (
                                                <span className="text-[10px] font-semibold text-success bg-success/10 px-1 py-0.5 rounded">
                                                    Save ₹{(catalogTotal - bundlePrice).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    );
                })}
                {standaloneItems.map(item => (
                    <div key={item.uniqueId || item.id} className="flex gap-3 text-sm">
                        <img
                            src={getProductImageUrl(item)}
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
                {bundleSavings > 0 && (
                    <div className="flex justify-between text-success">
                        <span className="flex items-center gap-1"><Layers size={12} /> Bundle Discount</span>
                        <span className="font-bold">-₹{bundleSavings.toLocaleString()}</span>
                    </div>
                )}
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
};

export default PaymentStep;
