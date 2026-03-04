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

    const fetchCart = useCallback(async () => {
        if (!user) return;
        try {
            const dbCart = await cartAPI.get();
            setCart(dbCart);
        } catch (err) {
            console.error('Failed to fetch cart:', err);
        }
    }, [user]);

    // Fetch cart from DB when user logs in, clear when logged out
    useEffect(() => {
        if (!user) {
            setCart([]);
            return;
        }

        let cancelled = false;
        setCartLoading(true);

        const initCart = async () => {
            try {
                // One-time migration: push any leftover localStorage items to DB
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

    // Re-fetch cart from DB when the user switches back to this tab/window
    // so changes made on another device show up without a full page reload
    useEffect(() => {
        if (!user) return;

        const onFocus = () => { fetchCart(); };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [user, fetchCart]);

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

    const cartQueue = React.useRef(Promise.resolve());

    const enqueueCartAction = useCallback((action) => {
        cartQueue.current = cartQueue.current.then(action).catch((err) => {
            console.error('Cart Queue Error:', err);
        });
        return cartQueue.current;
    }, []);

    const addToCart = useCallback((productObj, quantity = 1, variant = null) => {
        if (!user) {
            toast.error('Please sign in to add items to your cart');
            return;
        }

        const isIdOnly = typeof productObj === 'string' || typeof productObj === 'number';
        let productId;
        let variantId;

        let variantName = null;
        let price = 0;
        let stock = 0;

        if (isIdOnly) {
            const searchId = String(productObj);
            const existing = cart.find(item => item.uniqueId === searchId || String(item.id) === searchId);
            if (!existing) {
                console.error('Product not in cart and full object not provided to addToCart');
                return;
            }
            productId = existing.id;
            variantId = existing.variantId || null;
        } else {
            productId = productObj.id || productObj.productId;
            variantId = variant ? variant.id : (productObj.variantId || null);
            variantName = variant ? variant.name : (productObj.variantName || null);
            price = variant ? variant.price : (productObj.price || 0);
            stock = variant ? variant.stock : (productObj.stock || 0);
        }

        const uid = variantId ? `${productId}-${variantId}` : `${productId}`;
        const newQtyNumber = Number(quantity);

        // Optimistic update
        setCart(prev => {
            const existing = prev.find(item => item.uniqueId === uid);
            if (existing) {
                return prev.map(item =>
                    item.uniqueId === uid ? { ...item, quantity: item.quantity + newQtyNumber } : item
                );
            }
            if (isIdOnly) return prev;
            return [...prev, {
                ...productObj,
                uniqueId: uid,
                variantId,
                variantName,
                price,
                stock,
                quantity: newQtyNumber,
            }];
        });

        enqueueCartAction(async () => {
            try {
                await cartAPI.addItem(productId, variantId, newQtyNumber);
                // Don't overwrite optimistic state with DB response on success —
                // this avoids clobbering rapid-click increments.
            } catch (err) {
                console.error('Failed to add item to cart:', err);
                toast.error('Failed to add to cart');
                // On error, revert to the real DB state
                try { setCart(await cartAPI.get()); } catch { /* ignore */ }
            }
        });
    }, [user, cart, enqueueCartAction]);

    const removeFromCart = useCallback((uniqueId) => {
        const searchId = typeof uniqueId === 'number' ? `${uniqueId}` : uniqueId;
        const item = cart.find(i => (i.uniqueId || `${i.id}`) === searchId);
        if (!item) return;

        // Optimistic update
        setCart(prev => prev.filter(i => (i.uniqueId || `${i.id}`) !== searchId));

        enqueueCartAction(async () => {
            try {
                await cartAPI.removeItem(item.productId || item.id, item.variantId || null);
                // Trust optimistic update; don't overwrite state on success
            } catch (err) {
                console.error('Failed to remove item from cart:', err);
                toast.error('Failed to remove from cart');
                try { setCart(await cartAPI.get()); } catch { /* ignore */ }
            }
        });
    }, [cart, enqueueCartAction]);

    const updateCartQuantity = useCallback((uniqueId, newQuantity) => {
        const searchId = typeof uniqueId === 'number' ? `${uniqueId}` : uniqueId;
        const item = cart.find(i => (i.uniqueId || `${i.id}`) === searchId);
        if (!item) return;

        if (newQuantity <= 0) {
            return removeFromCart(uniqueId);
        }

        const maxStock = item.stock != null ? item.stock : Number.POSITIVE_INFINITY;
        const boundedQty = Math.max(1, Math.min(newQuantity, maxStock));

        // Optimistic update
        setCart(prev => prev.map(i =>
            (i.uniqueId || `${i.id}`) === searchId ? { ...i, quantity: boundedQty } : i
        ));

        enqueueCartAction(async () => {
            try {
                await cartAPI.updateItem(item.productId || item.id, item.variantId || null, boundedQty);
                // Don't overwrite optimistic state on success — avoids quantity jitter
                // when clicking +/- rapidly (each queued action already has the right boundedQty).
            } catch (err) {
                console.error('Failed to update cart quantity:', err);
                toast.error('Failed to update quantity');
                try { setCart(await cartAPI.get()); } catch { /* ignore */ }
            }
        });
    }, [cart, enqueueCartAction, removeFromCart]);

    const clearCart = useCallback(() => {
        setCart([]);
        setCoupon(null);
    }, []);

    const applyCoupon = (couponData) => setCoupon(couponData);
    const removeCoupon = () => setCoupon(null);

    const placeOrder = async (orderData) => {
        const items = cart.map(item => ({
            productId: item.productId || item.id,
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
