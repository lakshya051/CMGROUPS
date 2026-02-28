import React, { useState, useEffect, useCallback } from 'react';
import { ordersAPI, wishlistAPI, cartAPI } from '../lib/api';
import { useAuth } from './AuthContext';
import { ShopContext } from './ShopContext';
import toast from 'react-hot-toast';

export const ShopProvider = ({ children }) => {
    const { user, refreshUser } = useAuth();
    const [cart, setCart] = useState([]);
    const [cartLoading, setCartLoading] = useState(false);

    const [coupon, setCoupon] = useState(() => {
        try {
            const saved = localStorage.getItem('appliedCoupon');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [wishlist, setWishlist] = useState(() => {
        try {
            const saved = localStorage.getItem('wishlist');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [compareList, setCompareList] = useState(() => {
        try {
            const saved = localStorage.getItem('compareList');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Fetch cart from DB when user logs in, clear when logged out
    useEffect(() => {
        if (!user) {
            setCart([]);
            return;
        }

        let cancelled = false;
        setCartLoading(true);

        // Migrate any leftover localStorage cart items to DB, then fetch
        const initCart = async () => {
            try {
                let localItems = [];
                try {
                    localItems = JSON.parse(localStorage.getItem('cart') || '[]');
                } catch { /* ignore */ }

                if (localItems.length > 0) {
                    const res = await cartAPI.sync(localItems);
                    if (!cancelled && res.success && res.cart) {
                        setCart(res.cart);
                    }
                    localStorage.removeItem('cart');
                } else {
                    const dbCart = await cartAPI.get();
                    if (!cancelled) {
                        setCart(dbCart);
                    }
                }
            } catch (err) {
                console.error('Failed to load cart:', err);
            } finally {
                if (!cancelled) setCartLoading(false);
            }
        };

        initCart();
        return () => { cancelled = true; };
    }, [user?.id]);

    // Fetch wishlist from backend if logged in
    useEffect(() => {
        if (user) {
            wishlistAPI.get()
                .then(items => {
                    const ids = items.map(i => i.id);
                    setWishlist(ids);
                    localStorage.setItem('wishlist', JSON.stringify(ids));
                })
                .catch(err => console.error('Failed to fetch wishlist from server:', err));
        }
    }, [user]);

    useEffect(() => {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    useEffect(() => {
        if (coupon) {
            localStorage.setItem('appliedCoupon', JSON.stringify(coupon));
        } else {
            localStorage.removeItem('appliedCoupon');
        }
    }, [coupon]);

    useEffect(() => {
        localStorage.setItem('compareList', JSON.stringify(compareList));
    }, [compareList]);

    const addToCart = useCallback(async (productObj, quantity = 1, variant = null) => {
        if (!user) {
            toast.error('Please sign in to add items to your cart');
            return;
        }

        const isIdOnly = typeof productObj === 'string' || typeof productObj === 'number';
        let productId, variantId;

        if (isIdOnly) {
            // Incrementing quantity of an existing item
            const searchId = String(productObj);
            const existing = cart.find(item => item.uniqueId === searchId || String(item.id) === searchId);
            if (!existing) {
                console.error('Product not in cart and full object not provided to addToCart');
                return;
            }
            productId = existing.id;
            variantId = existing.variantId || null;
        } else {
            productId = productObj.id;
            variantId = variant ? variant.id : null;
        }

        // Optimistic update
        setCart(prev => {
            const uid = variantId ? `${productId}-${variantId}` : `${productId}`;
            const existing = prev.find(item => item.uniqueId === uid);
            if (existing) {
                return prev.map(item =>
                    item.uniqueId === uid ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            if (isIdOnly) return prev;
            return [...prev, {
                ...productObj,
                uniqueId: uid,
                variantId,
                variantName: variant ? variant.name : null,
                price: variant ? variant.price : productObj.price,
                stock: variant ? variant.stock : productObj.stock,
                quantity,
            }];
        });

        try {
            const res = await cartAPI.addItem(productId, variantId, quantity);
            if (res.success && res.cart) {
                setCart(res.cart);
            }
        } catch (err) {
            console.error('Failed to add item to cart:', err);
            toast.error('Failed to add to cart');
            // Revert by re-fetching
            try { setCart(await cartAPI.get()); } catch { /* ignore */ }
        }
    }, [user, cart]);

    const removeFromCart = useCallback(async (uniqueId) => {
        const searchId = typeof uniqueId === 'number' ? `${uniqueId}` : uniqueId;
        const item = cart.find(i => (i.uniqueId || `${i.id}`) === searchId);
        if (!item) return;

        // Optimistic update
        setCart(prev => prev.filter(i => (i.uniqueId || `${i.id}`) !== searchId));

        try {
            const res = await cartAPI.removeItem(item.id, item.variantId || null);
            if (res.success && res.cart) {
                setCart(res.cart);
            }
        } catch (err) {
            console.error('Failed to remove item from cart:', err);
            toast.error('Failed to remove from cart');
            try { setCart(await cartAPI.get()); } catch { /* ignore */ }
        }
    }, [cart]);

    const updateCartQuantity = useCallback(async (uniqueId, newQuantity) => {
        const searchId = typeof uniqueId === 'number' ? `${uniqueId}` : uniqueId;
        const item = cart.find(i => (i.uniqueId || `${i.id}`) === searchId);
        if (!item) return;

        if (newQuantity <= 0) {
            return removeFromCart(uniqueId);
        }

        // Optimistic update
        setCart(prev => prev.map(i =>
            (i.uniqueId || `${i.id}`) === searchId ? { ...i, quantity: newQuantity } : i
        ));

        try {
            const res = await cartAPI.updateItem(item.id, item.variantId || null, newQuantity);
            if (res.success && res.cart) {
                setCart(res.cart);
            }
        } catch (err) {
            console.error('Failed to update cart quantity:', err);
            toast.error('Failed to update quantity');
            try { setCart(await cartAPI.get()); } catch { /* ignore */ }
        }
    }, [cart, removeFromCart]);

    const clearCart = useCallback(() => {
        setCart([]);
        setCoupon(null);
    }, []);

    const applyCoupon = (couponData) => setCoupon(couponData);
    const removeCoupon = () => setCoupon(null);

    const placeOrder = async (orderData) => {
        const items = cart.map(item => ({
            productId: item.id,
            variantId: item.variantId || null,
            quantity: item.quantity,
            price: item.price,
        }));
        const order = await ordersAPI.place(
            items,
            orderData.total,
            orderData.paymentMethod,
            orderData.shippingAddress || null,
            orderData.referralCode || null,
            orderData.useWallet || false,
            orderData.walletUsed || 0,
            coupon?.code || null,
            coupon?.discount || 0
        );
        clearCart();
        try { await cartAPI.clear(); } catch { /* ignore */ }
        if (orderData.useWallet && refreshUser) {
            await refreshUser();
        }
        return order;
    };

    const toggleWishlist = async (productId) => {
        const numId = typeof productId === 'string' ? parseInt(productId) : productId;
        const isCurrentlyInWishlist = wishlist.includes(numId);

        setWishlist(prev => {
            if (isCurrentlyInWishlist) return prev.filter(id => id !== numId);
            return [...prev, numId];
        });

        if (user) {
            try {
                if (isCurrentlyInWishlist) {
                    await wishlistAPI.remove(numId);
                } else {
                    await wishlistAPI.add(numId);
                }
            } catch (error) {
                setWishlist(prev => {
                    if (!isCurrentlyInWishlist) return prev.filter(id => id !== numId);
                    return [...prev, numId];
                });
                console.error('Wishlist sync error:', error);
            }
        }
    };

    const addToCompare = (productId) => {
        const numId = typeof productId === 'string' ? parseInt(productId) : productId;
        setCompareList(prev => {
            if (prev.includes(numId)) return prev;
            if (prev.length >= 4) return prev;
            return [...prev, numId];
        });
    };

    const removeFromCompare = (productId) => {
        const numId = typeof productId === 'string' ? parseInt(productId) : productId;
        setCompareList(prev => prev.filter(id => id !== numId));
    };

    const clearCompare = () => setCompareList([]);

    return (
        <ShopContext.Provider value={{
            cart,
            cartLoading,
            addToCart,
            removeFromCart,
            updateCartQuantity,
            clearCart,
            placeOrder,
            wishlist,
            toggleWishlist,
            compareList,
            addToCompare,
            removeFromCompare,
            clearCompare,
            coupon,
            applyCoupon,
            removeCoupon,
        }}>
            {children}
        </ShopContext.Provider>
    );
};
