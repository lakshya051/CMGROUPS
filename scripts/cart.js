// Shopping Cart Logic

import { getProductById } from './products_data.js';

const CART_KEY = 'techNova_cart';

function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
}

export function addToCart(productId, quantity = 1) {
    const cart = getCart();
    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
        existingItem.quantity += parseInt(quantity);
    } else {
        cart.push({ productId, quantity: parseInt(quantity) });
    }

    saveCart(cart);
    // Visual feedback could be added here (toast)
    alert('Product added to cart!');
}

export function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.productId !== productId);
    saveCart(cart);
}

export function updateQuantity(productId, quantity) {
    const cart = getCart();
    const item = cart.find(i => i.productId === productId);
    if (item) {
        item.quantity = parseInt(quantity);
        if (item.quantity <= 0) {
            removeFromCart(productId);
            return;
        }
    }
    saveCart(cart);
}

export function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartCount();
}

export function getCartDetails() {
    const cart = getCart();
    return cart.map(item => {
        const product = getProductById(item.productId);
        return {
            ...item,
            product
        };
    }).filter(item => item.product); // Filter out if product not found
}

export function getCartTotal() {
    const items = getCartDetails();
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartIcons = document.querySelectorAll('.cart-count'); // Assuming we add this class to header icon
    if (cartIcons.length === 0) {
        // Try to update the icon in header directly if accessible
        const headerCartIcon = document.querySelector('.cart-icon');
        if (headerCartIcon) {
            // Check if badge exists
            let badge = headerCartIcon.parentNode.querySelector('.badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge';
                badge.style.cssText = 'background: var(--accent-color); color: white; border-radius: 50%; padding: 0.1rem 0.4rem; font-size: 0.7rem; position: relative; top: -10px; left: -5px;';
                headerCartIcon.parentNode.appendChild(badge);
            }
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }
}

// Initialize count on load
document.addEventListener('DOMContentLoaded', updateCartCount);

// Expose to window for inline calls if needed
window.cart = {
    add: addToCart,
    remove: removeFromCart,
    update: updateQuantity,
    clear: clearCart,
    getDetails: getCartDetails,
    getTotal: getCartTotal
};
