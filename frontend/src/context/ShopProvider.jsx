import React, { useState, useEffect } from 'react';
import { ordersAPI, wishlistAPI } from '../lib/api';
import { useAuth } from './AuthContext';
import { ShopContext } from './ShopContext';

export const ShopProvider = ({ children }) => {
    const { user, refreshUser } = useAuth();
    const [cart, setCart] = useState([]);
    const [wishlist, setWishlist] = useState(() => {
        try {
            const saved = localStorage.getItem('wishlist');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Failed to parse wishlist", error);
            return [];
        }
    });

    const [compareList, setCompareList] = useState(() => {
        try {
            const saved = localStorage.getItem('compareList');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            return [];
        }
    });

    // Removed global products fetch to improve performance.
    // Components must fetch their own products via productsAPI

    // Fetch wishlist from backend if logged in
    useEffect(() => {
        if (user) {
            wishlistAPI.get()
                .then(items => {
                    const ids = items.map(i => i.id);
                    setWishlist(ids);
                    localStorage.setItem('wishlist', JSON.stringify(ids)); // sync local as well
                })
                .catch(err => console.error('Failed to fetch wishlist from server:', err));
        }
    }, [user]);

    // Persist wishlist locally (for guests)
    useEffect(() => {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    // Persist compare list locally
    useEffect(() => {
        localStorage.setItem('compareList', JSON.stringify(compareList));
    }, [compareList]);

    const addToCart = (productObj, quantity = 1, variant = null) => {
        setCart(prev => {
            const isIdOnly = typeof productObj === 'string' || typeof productObj === 'number';

            if (isIdOnly) {
                const searchId = String(productObj);
                const existing = prev.find(item => item.uniqueId === searchId || String(item.id) === searchId);
                if (existing) {
                    return prev.map(item =>
                        (item.uniqueId === searchId || String(item.id) === searchId) ? { ...item, quantity: item.quantity + quantity } : item
                    );
                }
                console.error("Product not in cart and full object not provided to addToCart");
                return prev;
            }

            const baseProduct = productObj;
            if (!baseProduct) return prev;

            const variantId = variant ? variant.id : null;
            const uniqueId = variantId ? `${baseProduct.id}-${variantId}` : `${baseProduct.id}`;

            const existing = prev.find(item => item.uniqueId === uniqueId);
            if (existing) {
                return prev.map(item =>
                    item.uniqueId === uniqueId ? { ...item, quantity: item.quantity + quantity } : item
                );
            }

            const cartItem = {
                ...baseProduct,
                uniqueId,
                variantId,
                variantName: variant ? variant.name : null,
                price: variant ? variant.price : baseProduct.price,
                stock: variant ? variant.stock : baseProduct.stock, // important for validations later
                quantity
            };

            return [...prev, cartItem];
        });
    };

    const clearCart = () => setCart([]);

    const placeOrder = async (orderData) => {
        try {
            const items = cart.map(item => ({
                productId: item.id, // the base product ID
                variantId: item.variantId || null,
                quantity: item.quantity,
                price: item.price
            }));
            const order = await ordersAPI.place(
                items,
                orderData.total,
                orderData.paymentMethod,
                orderData.shippingAddress || null,
                orderData.referralCode || null,
                orderData.useWallet || false,
                orderData.walletUsed || 0
            );
            clearCart();
            // Refresh user so wallet balance is up-to-date in the UI
            if (orderData.useWallet && refreshUser) {
                await refreshUser();
            }
            return order;
        } catch (error) {
            throw error;
        }
    };

    const removeFromCart = (uniqueId) => {
        // Handle backward compatibility if someone passes a number (old productId)
        const searchId = typeof uniqueId === 'number' ? `${uniqueId}` : uniqueId;
        setCart(prev => prev.filter(item => (item.uniqueId || `${item.id}`) !== searchId));
    };

    const toggleWishlist = async (productId) => {
        const numId = typeof productId === 'string' ? parseInt(productId) : productId;
        const isCurrentlyInWishlist = wishlist.includes(numId);

        // Optimistic UI state update
        setWishlist(prev => {
            if (isCurrentlyInWishlist) return prev.filter(id => id !== numId);
            return [...prev, numId];
        });

        // Sync with backend if logged in
        if (user) {
            try {
                if (isCurrentlyInWishlist) {
                    await wishlistAPI.remove(numId);
                } else {
                    await wishlistAPI.add(numId);
                }
            } catch (error) {
                // Revert on error
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
            addToCart,
            removeFromCart,
            clearCart,
            placeOrder,
            wishlist,
            toggleWishlist,
            compareList,
            addToCompare,
            removeFromCompare,
            clearCompare
        }}>
            {children}
        </ShopContext.Provider>
    );
};
