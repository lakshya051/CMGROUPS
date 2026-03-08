// Product Listing Logic
import { getProducts } from './products_data.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the products page container
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return; // Exit if not on products page

    let allProducts = getProducts();
    let currentCategory = 'All';
    let searchQuery = '';

    function renderProducts(products) {
        productGrid.innerHTML = '';

        if (products.length === 0) {
            productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No products found.</p>';
            return;
        }

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card glass-panel flex flex-col'; // flex-col helper assumed or added
            card.style.display = 'flex';
            card.style.flexDirection = 'column';

            card.innerHTML = `
                <div class="card-image">${p.image}</div>
                <h3 class="card-title">${p.title}</h3>
                <div class="card-price">₹${p.price.toLocaleString('en-IN')}</div>
                <p class="card-desc" style="flex-grow: 1;">${p.description.substring(0, 60)}...</p>
                <div class="flex gap-sm" style="margin-top: 1rem;">
                    <a href="product-detail.html?id=${p.id}" class="btn btn-outline" style="flex: 1; text-align: center;">View</a>
                    <button class="btn btn-primary" onclick="addToCart('${p.id}')" style="flex: 1;">Add</button>
                </div>
            `;
            productGrid.appendChild(card);
        });
    }

    // Filter Logic
    const categoryFilters = document.querySelectorAll('.category-filter');
    categoryFilters.forEach(filter => {
        filter.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            applyFilters();
        });
    });

    // Search Logic
    const searchInput = document.getElementById('search-products');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            applyFilters();
        });
    }

    function applyFilters() {
        let filtered = allProducts;

        if (currentCategory !== 'All') {
            filtered = filtered.filter(p => p.category === currentCategory);
        }

        if (searchQuery) {
            filtered = filtered.filter(p => p.title.toLowerCase().includes(searchQuery));
        }

        renderProducts(filtered);
    }

    // Initial Render
    renderProducts(allProducts);

    // Add to Cart Integration
    window.addToCart = async (id) => {
        // Dynamic import to ensure module loading
        const { addToCart } = await import('./cart.js');
        addToCart(id, 1);
    };
});

// --- Additional Features Logic ---

export function toggleWishlist(productId) {
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const index = wishlist.indexOf(productId);

    if (index === -1) {
        wishlist.push(productId);
        alert('Added to Wishlist');
    } else {
        wishlist.splice(index, 1);
        alert('Removed from Wishlist');
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    return index === -1; // true if added
}

export function getWishlist() {
    return JSON.parse(localStorage.getItem('wishlist')) || [];
}

export function addReview(productId, user, rating, comment) {
    let reviews = JSON.parse(localStorage.getItem('reviews')) || [];
    reviews.push({
        productId,
        user: user.name,
        rating,
        comment,
        date: new Date().toLocaleDateString()
    });
    localStorage.setItem('reviews', JSON.stringify(reviews));
}

export function getReviews(productId) {
    const reviews = JSON.parse(localStorage.getItem('reviews')) || [];
    return reviews.filter(r => r.productId === productId);
}
