export default function loadHero() {
    // We'll inject this into main-content at the top
    const heroHTML = `
        <section class="hero-section container">
            <div class="hero-content">
                <span class="section-subtitle">Premium Tech Store</span>
                <h1 class="hero-title">Upgrade Your <br>Digital Reality</h1>
                <p class="hero-subtitle">
                    Discover high-performance rigs, latest components, and expert services tailored for enthusiasts and professionals.
                </p>
                <div class="flex gap-sm">
                    <a href="/pages/products.html" class="btn btn-primary">Shop Products</a>
                    <a href="/pages/services.html" class="btn btn-outline">Book Service</a>
                </div>
            </div>
            <!-- Decorative Element (Could be an image in real app) -->
            <div style="position: absolute; right: -100px; top: 50%; transform: translateY(-50%); width: 600px; height: 600px; background: radial-gradient(circle, var(--secondary-color) 0%, transparent 70%); opacity: 0.2; filter: blur(50px); pointer-events: none;"></div>
        </section>
    `;

    return heroHTML;
}
