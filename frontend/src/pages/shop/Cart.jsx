import React, { useMemo, useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { Minus, Plus, Trash2, ArrowRight, Tag } from 'lucide-react';
import { couponsAPI } from '../../lib/api';

const Cart = () => {
    const { cart, addToCart, removeFromCart } = useShop(); // addToCart handles +1 quantity logic too
    const navigate = useNavigate();

    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    const subtotal = useMemo(() => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }, [cart]);

    const handleApplyCoupon = async () => {
        try {
            const data = await couponsAPI.validate(couponCode);
            if (data.valid) {
                if (data.discountType === 'percent') {
                    setDiscount(subtotal * (data.value / 100));
                } else {
                    setDiscount(data.value);
                }
                setAppliedCoupon(data.code);
                setCouponCode('');
            }
        } catch (err) {
            alert('Invalid coupon code');
            setDiscount(0);
            setAppliedCoupon(null);
        }
    };

    const handleQuantityChange = (uniqueId, currentQty, change) => {
        if (currentQty + change < 1) return;
        addToCart(uniqueId, change); // Re-using addToCart which adds to existing qty (with our updated ShopContext it accepts uniqueId for string parses)
    };

    if (cart.length === 0) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
                <p className="text-text-muted mb-8">Looks like you haven't added any gear yet.</p>
                <Link to="/products">
                    <Button size="lg">Start Shopping</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold mb-6 sm:mb-8">Shopping Cart</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {cart.map(item => (
                        <div key={item.uniqueId} className="glass-panel p-4 flex flex-wrap sm:flex-nowrap gap-4 items-center">
                            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-50 rounded-lg flex items-center justify-center p-2 flex-shrink-0">
                                <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                            </div>

                            <div className="flex-grow min-w-0">
                                <Link to={`/products/${item.id}`} className="font-bold hover:text-primary transition-colors text-base line-clamp-2">
                                    {item.title}
                                </Link>
                                {item.variantName && item.variantName !== 'Standard' && (
                                    <p className="text-sm font-medium text-text-muted mt-0.5">Variant: <span className="text-text-main">{item.variantName}</span></p>
                                )}
                                <p className="text-text-muted text-sm mt-0.5">{item.category}</p>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end gap-3 ml-auto">
                                <span className="font-bold text-base sm:text-lg">₹{(item.price * item.quantity).toLocaleString()}</span>

                                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => handleQuantityChange(item.uniqueId, item.quantity, -1)}
                                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => handleQuantityChange(item.uniqueId, item.quantity, 1)}
                                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                <button
                                    onClick={() => removeFromCart(item.uniqueId)}
                                    className="text-text-muted hover:text-error transition-colors p-1"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                <div className="h-fit glass-panel p-6 space-y-6">
                    <h2 className="text-xl font-bold border-b border-gray-200 pb-4">Order Summary</h2>

                    {/* Coupon Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Promo Code"
                            className="input-field text-sm"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                        />
                        <Button variant="outline" size="sm" onClick={handleApplyCoupon}>Apply</Button>
                    </div>
                    {appliedCoupon && (
                        <div className="text-xs text-success flex items-center gap-1">
                            <Tag size={12} /> Coupon {appliedCoupon} applied!
                        </div>
                    )}

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-text-muted">Subtotal</span>
                            <span>₹{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-text-muted">Shipping</span>
                            <span className="text-success">Free</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-success">
                                <span>Discount</span>
                                <span>-₹{discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-text-muted">Tax (18% GST)</span>
                            <span>₹{((subtotal - discount) * 0.18).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 flex justify-between items-center text-lg font-bold">
                        <span>Total</span>
                        <span>₹{((subtotal - discount) * 1.18).toLocaleString()}</span>
                    </div>

                    <Button className="w-full gap-2" size="lg" onClick={() => navigate('/checkout')}>
                        Proceed to Checkout <ArrowRight size={18} />
                    </Button>

                    <p className="text-xs text-center text-text-muted">
                        Secure Checkout powered by TechNova
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Cart;
