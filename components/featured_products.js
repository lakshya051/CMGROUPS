export default function loadFeaturedProducts() {
    // Mock Data
    const products = [
        { title: "RTX 4090 OC", price: "₹1,85,000", desc: "The ultimate GPU for 4K gaming and creating.", icon: "🎮" },
        { title: "Ryzen 9 7950X", price: "₹65,000", desc: "16-core powerhouse for rendering and multitasking.", icon: "💻" },
        { title: "Alienware 34\" QD-OLED", price: "₹1,10,000", desc: "Immersive curved display with infinite contrast.", icon: "🖥️" },
        { title: "Custom Water Loop Kit", price: "₹25,000", desc: "Keep your system cool and quiet under load.", icon: "❄️" }
    ];

    const productsHTML = products.map(p => `
        <div class="card glass-panel">
            <div class="card-image">${p.icon}</div>
            <h3 class="card-title">${p.title}</h3>
            <div class="card-price">${p.price}</div>
            <p class="card-desc">${p.desc}</p>
            <button class="btn btn-primary" style="width: 100%;">Add to Cart</button>
        </div>
    `).join('');

    return `
        <section class="container">
            <div class="section-header">
                <span class="section-subtitle">Trending Now</span>
                <h2 class="section-title">Featured Products</h2>
            </div>
            <div class="card-grid">
                ${productsHTML}
            </div>
        </section>
    `;
}
