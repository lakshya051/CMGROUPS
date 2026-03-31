import React, { useState, useEffect, useCallback } from 'react';
import { ordersAPI, wishlistAPI, cartAPI } from '../lib/api';
import { useAuth } from './AuthContext';
import { ShopContext } from './ShopContext';
import { MAX_COMPARE_ITEMS } from '../constants';
import toast from 'react-hot-toast';

const getErrorMessage = (err, fallback) => (err instanceof Error && err.message ? err.message : fallback);

export const ShopProvider = ({ children }) => {
    const { user, refreshUser } = useAuth();
    const [cart, setCart] = useState([]);
    const [cartLoading, setCartLoading] = useState(false);
    const [buyNowItems, setBuyNowItems] = useState(() => {
        try {
            const saved = sessionStorage.getItem('buyNowItems');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

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
            setWishlist([]);
            localStorage.removeItem('wishlist');
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
    const wishlistFetchedRef = React.useRef(false);
    useEffect(() => {
        if (user) {
            wishlistFetchedRef.current = false;
            wishlistAPI.get()
                .then(items => {
                    const ids = items.map(i => i.id);
                    setWishlist(ids);
                    localStorage.setItem('wishlist', JSON.stringify(ids));
                    wishlistFetchedRef.current = true;
                })
                .catch(err => console.error('Failed to fetch wishlist from server:', err));
        }
    }, [user]);

    useEffect(() => {
        if (!user || wishlistFetchedRef.current) {
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
        }
    }, [wishlist]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const cartGen = React.useRef(0);

    const enqueueCartAction = useCallback((action) => {
        const gen = cartGen.current;
        cartQueue.current = cartQueue.current.then(() => {
            if (cartGen.current !== gen) return;
            return action();
        }).catch((err) => {
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

        let variantCombination = null;

        if (isIdOnly) {
            const searchId = String(productObj);
            const existing = cart.find(item => item.uniqueId === searchId || String(item.id) === searchId);
            if (!existing) {
                console.error('Product not in cart and full object not provided to addToCart');
                return;
            }
            productId = existing.id;
            variantId = existing.variantId || null;
            variantName = existing.variantName || null;
            variantCombination = existing.variantCombination || null;
            price = existing.price || 0;
            stock = existing.stock ?? 0;
        } else {
            productId = productObj.id || productObj.productId;
            variantId = variant ? variant.id : (productObj.variantId || null);
            variantName = variant ? variant.name : (productObj.variantName || null);
            variantCombination = variant ? (variant.combination || null) : (productObj.variantCombination || null);
            price = variant ? variant.price : (productObj.price || 0);
            stock = variant ? variant.stock : (productObj.stock || 0);
        }

        const bundleInstId = (!isIdOnly && productObj.bundleInfo?.bundleInstanceId) || '';
        const uid = bundleInstId
            ? (variantId ? `${productId}-${variantId}-${bundleInstId}` : `${productId}-${bundleInstId}`)
            : (variantId ? `${productId}-${variantId}` : `${productId}`);
        const newQtyNumber = Number(quantity);
        const existingQuantity = cart.find(item => item.uniqueId === uid)?.quantity || 0;

        if (!Number.isInteger(newQtyNumber) || newQtyNumber <= 0) {
            return;
        }

        const availableStock = Number(stock) || 0;
        if (availableStock <= 0) {
            toast.error('This item is out of stock');
            return;
        }

        if (existingQuantity + newQtyNumber > availableStock) {
            toast.error(`Only ${availableStock} item${availableStock === 1 ? '' : 's'} available in stock`);
            return;
        }

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
                variantCombination,
                price,
                stock: availableStock,
                quantity: newQtyNumber,
            }];
        });

        const bundleId = (!isIdOnly && productObj.bundleInfo?.bundleId) || null;
        const bundleInstanceId = (!isIdOnly && productObj.bundleInfo?.bundleInstanceId) || '';

        enqueueCartAction(async () => {
            try {
                await cartAPI.addItem(productId, variantId, newQtyNumber, bundleId ? String(bundleId) : null, bundleInstanceId);
            } catch (err) {
                console.error('Failed to add item to cart:', err);
                toast.error(getErrorMessage(err, 'Failed to add to cart'));
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
                await cartAPI.removeItem(item.productId || item.id, item.variantId || null, item.bundleInfo?.bundleInstanceId || '');
            } catch (err) {
                console.error('Failed to remove item from cart:', err);
                toast.error(getErrorMessage(err, 'Failed to remove from cart'));
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
                await cartAPI.updateItem(item.productId || item.id, item.variantId || null, boundedQty, item.bundleInfo?.bundleInstanceId || '');
            } catch (err) {
                console.error('Failed to update cart quantity:', err);
                toast.error(getErrorMessage(err, 'Failed to update quantity'));
                try { setCart(await cartAPI.get()); } catch { /* ignore */ }
            }
        });
    }, [cart, enqueueCartAction, removeFromCart]);

    const removeBundleFromCart = useCallback((bundleInstanceId) => {
        if (!bundleInstanceId) return;
        const isServiceOnly = cart.some(
            item => item.bundleInfo?.bundleInstanceId === bundleInstanceId && item.isServiceBundle
        );
        setCart(prev => prev.filter(item => item.bundleInfo?.bundleInstanceId !== bundleInstanceId));

        if (!isServiceOnly) {
            enqueueCartAction(async () => {
                try {
                    await cartAPI.removeBundle(bundleInstanceId);
                } catch (err) {
                    console.error('Failed to remove bundle from cart:', err);
                    toast.error(getErrorMessage(err, 'Failed to remove bundle'));
                    try { setCart(await cartAPI.get()); } catch { /* ignore */ }
                }
            });
        }
    }, [cart, enqueueCartAction]);

    const clearCart = useCallback(() => {
        setCart([]);
        setCoupon(null);
        if (user) {
            cartAPI.clear().catch((err) => console.error('Failed to clear cart on server:', err));
        }
    }, [user]);

    const applyCoupon = (couponData) => setCoupon(couponData);
    const removeCoupon = () => setCoupon(null);

    const setBuyNow = useCallback((items) => {
        setBuyNowItems(items);
        try {
            if (items.length > 0) {
                sessionStorage.setItem('buyNowItems', JSON.stringify(items));
            } else {
                sessionStorage.removeItem('buyNowItems');
            }
        } catch { /* ignore */ }
    }, []);

    const initBuyNow = useCallback((productObj, quantity = 1, variant = null) => {
        if (!user) {
            toast.error('Please sign in to continue');
            return false;
        }
        const productId = productObj.id;
        const variantId = variant?.id || null;
        const price = variant?.price ?? productObj.price;
        const stock = variant?.stock ?? productObj.stock;
        if (stock <= 0) {
            toast.error('This item is out of stock');
            return false;
        }
        if (quantity > stock) {
            toast.error(`Only ${stock} items available`);
            return false;
        }
        setBuyNow([{
            ...productObj,
            uniqueId: variantId ? `${productId}-${variantId}` : `${productId}`,
            productId,
            variantId,
            variantName: variant?.name || null,
            variantCombination: variant?.combination || null,
            price,
            stock,
            quantity,
        }]);
        return true;
    }, [user, setBuyNow]);

    const initBuyNowMultiple = useCallback((itemEntries) => {
        if (!user) {
            toast.error('Please sign in to continue');
            return false;
        }
        const built = [];
        for (const entry of itemEntries) {
            if (entry.isServiceBundle) {
                built.push(entry);
                continue;
            }
            const { product, quantity, variant, bundleInfo } = entry;
            const productId = product.id;
            const variantId = variant?.id || null;
            const price = variant?.price ?? product.price;
            const stock = variant?.stock ?? product.stock;
            if (stock <= 0) continue;
            built.push({
                ...product,
                ...(bundleInfo ? { bundleInfo } : {}),
                uniqueId: variantId ? `${productId}-${variantId}` : `${productId}`,
                productId,
                variantId,
                variantName: variant?.name || null,
                variantCombination: variant?.combination || null,
                price,
                stock,
                quantity: Math.min(quantity, stock),
            });
        }
        if (built.length === 0) {
            toast.error('No in-stock items available');
            return false;
        }
        setBuyNow(built);
        return true;
    }, [user, setBuyNow]);

    const clearBuyNow = useCallback(() => setBuyNow([]), [setBuyNow]);

    const placeOrder = async (orderData) => {
        try {
            cartGen.current += 1;

            const isBuyNow = orderData.isBuyNow && buyNowItems.length > 0;
            const sourceItems = isBuyNow ? buyNowItems : cart;

            const productEntries = sourceItems.filter(item => !item.isServiceBundle);
            const serviceOnlyEntries = sourceItems.filter(item => item.isServiceBundle);

            const items = productEntries.map(item => ({
                productId: item.productId || item.id,
                variantId: item.variantId || null,
                quantity: item.quantity,
                price: item.price,
                bundleId: item.bundleInfo?.bundleId || null,
                bundleInstanceId: item.bundleInfo?.bundleInstanceId || null,
            }));

            const serviceOnlyBundles = serviceOnlyEntries.map(item => ({
                bundleId: item.bundleInfo.bundleId,
                bundleInstanceId: item.bundleInfo.bundleInstanceId,
                bundleName: item.bundleInfo.bundleName,
                bundlePrice: item.bundleInfo.bundlePrice,
                serviceNames: item.bundleInfo.serviceNames || [],
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
                coupon?.discount || 0,
                orderData.latitude || null,
                orderData.longitude || null,
                orderData.googleMapLink || null,
                orderData.giftWrap || false,
                orderData.giftMessage || null,
                orderData.bundleServiceSchedules || null,
                serviceOnlyBundles.length > 0 ? serviceOnlyBundles : null
            );

            if (isBuyNow) {
                clearBuyNow();
            } else {
                clearCart();
                try { await cartAPI.clear(); } catch { /* ignore */ }
            }
            if (orderData.useWallet && refreshUser) {
                await refreshUser();
            }
            return order;
        } catch (err) {
            toast.error(getErrorMessage(err, 'Order failed'));
            throw err;
        }
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
            if (prev.length >= MAX_COMPARE_ITEMS) return prev;
            return [...prev, numId];
        });
    };

    const removeFromCompare = (productId) => {
        const numId = typeof productId === 'string' ? parseInt(productId) : productId;
        setCompareList(prev => prev.filter(id => id !== numId));
    };

    const addBundleToCart = useCallback((bundle) => {
        if (!user) {
            toast.error('Please sign in to add items to your cart');
            return;
        }
        const bundleInstanceId = `bundle-${bundle.id}-${Date.now()}`;
        const productItems = (bundle.items || []).filter(bi => bi.itemType === 'product' && bi.product && bi.product.stock > 0);
        const serviceItems = (bundle.items || []).filter(bi => bi.itemType === 'service' && bi.serviceType);

        if (productItems.length === 0 && serviceItems.length === 0) {
            toast.error('No items in this bundle');
            return;
        }

        const bundleInfo = {
            bundleId: bundle.id,
            bundleInstanceId,
            bundleName: bundle.name,
            bundlePrice: bundle.bundlePrice,
            hasService: serviceItems.length > 0,
            isGiftable: bundle.isGiftable || false,
            serviceNames: serviceItems.map(bi => bi.serviceType.title),
            isServiceOnly: productItems.length === 0 && serviceItems.length > 0,
        };

        if (productItems.length === 0 && serviceItems.length > 0) {
            const entry = {
                id: `svc-bundle-${bundle.id}`,
                uniqueId: `svc-${bundleInstanceId}`,
                title: bundle.name,
                images: bundle.image ? [bundle.image] : [],
                price: bundle.bundlePrice,
                quantity: 1,
                stock: 999,
                isServiceBundle: true,
                productId: null,
                variantId: null,
                bundleInfo,
            };
            setCart(prev => [...prev, entry]);
            toast.success(`Added "${bundle.name}" service bundle to cart`);
            return;
        }

        const newEntries = productItems.map(bi => {
            const prod = bi.product;
            const variant = prod.hasVariants && prod.variants?.length > 0
                ? (bi.variantId ? prod.variants.find(v => v.id === bi.variantId) : prod.variants[0])
                : null;
            const variantId = variant?.id || null;
            const uid = variantId
                ? `${prod.id}-${variantId}-${bundleInstanceId}`
                : `${prod.id}-${bundleInstanceId}`;
            return {
                ...prod,
                bundleInfo,
                uniqueId: uid,
                productId: prod.id,
                variantId,
                variantName: variant?.name || null,
                variantCombination: variant?.combination || null,
                price: variant?.price ?? prod.price,
                stock: variant?.stock ?? prod.stock,
                quantity: bi.quantity,
            };
        });

        setCart(prev => [...prev, ...newEntries]);

        enqueueCartAction(async () => {
            try {
                for (const entry of newEntries) {
                    await cartAPI.addItem(
                        entry.productId, entry.variantId, entry.quantity,
                        String(bundle.id), bundleInstanceId
                    );
                }
            } catch (err) {
                console.error('Failed to add bundle to cart:', err);
                toast.error(getErrorMessage(err, 'Failed to add bundle to cart'));
                try { setCart(await cartAPI.get()); } catch { /* ignore */ }
            }
        });

        toast.success(`Added "${bundle.name}" bundle to cart`);
    }, [user, enqueueCartAction]);

    const clearCompare = () => setCompareList([]);

    return (
        <ShopContext.Provider value={{
            cart,
            cartLoading,
            addToCart,
            addBundleToCart,
            removeBundleFromCart,
            removeFromCart,
            updateCartQuantity,
            clearCart,
            placeOrder,
            buyNowItems,
            initBuyNow,
            initBuyNowMultiple,
            clearBuyNow,
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
