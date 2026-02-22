import React, { createContext, useContext, useState, useEffect } from 'react';
import { productsAPI, ordersAPI, wishlistAPI } from '../lib/api';
import { useAuth } from './AuthContext';

const ShopContext = createContext(null);

export const useShop = () => useContext(ShopContext);

export const ShopProvider = ({ children }) => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
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

    // Fetch products from backend
    useEffect(() => {
        productsAPI.getAll()
            .then(data => {
                setProducts(data);
                setProductsLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch products:', err);
                setProductsLoading(false);
            });
    }, []);

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

    const getProduct = (id) => products.find(p => p.id === parseInt(id) || p.id === id);

    const addToCart = (productId, quantity = 1) => {
        setCart(prev => {
            const numId = typeof productId === 'string' ? parseInt(productId) : productId;
            const existing = prev.find(item => item.id === numId);
            if (existing) {
                return prev.map(item =>
                    item.id === numId ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            const product = getProduct(numId);
            if (!product) return prev;
            return [...prev, { ...product, quantity }];
        });
    };

    const clearCart = () => setCart([]);

    const placeOrder = async (orderData) => {
        try {
            const items = cart.map(item => ({
                productId: item.id,
                quantity: item.quantity,
                price: item.price
            }));
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const order = await ordersAPI.place(items, total, orderData.paymentMethod, orderData.shippingAddress || null, orderData.referralCode || null);
            clearCart();
            return order;
        } catch (error) {
            throw error;
        }
    };

    const removeFromCart = (productId) => {
        const numId = typeof productId === 'string' ? parseInt(productId) : productId;
        setCart(prev => prev.filter(item => item.id !== numId));
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
            products,
            productsLoading,
            getProduct,
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
