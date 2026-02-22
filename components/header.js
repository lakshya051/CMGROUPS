export default function loadHeader() {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('currentUser'));

    const authButton = user
        ? `<div class="flex items-center gap-sm">
             <a href="/pages/dashboard.html" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Hi, ${user.name.split(' ')[0]}</a>
             <a href="#" onclick="window.auth.logout()" style="font-size: 0.8rem; color: var(--text-muted);">Logout</a>
           </div>`
        : `<a href="/pages/login.html" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Login</a>`;

    const headerHTML = `
        <header id="main-header">
            <div class="container flex justify-between items-center">
                <a href="/" class="logo" style="font-family: 'Outfit'; font-size: 1.5rem; font-weight: 800; color: var(--text-main);">
                    Tech<span style="color: var(--primary-color);">Nova</span>
                </a>
                
                <button id="mobile-menu-btn" style="display: none; background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">☰</button>
                    
                <nav id="main-nav">
                    <ul class="flex gap-sm">
                        <li><a href="/" style="padding: 0.5rem;">Home</a></li>
                        <li><a href="/pages/products.html" style="padding: 0.5rem;">Products</a></li>
                        <li><a href="/pages/services.html" style="padding: 0.5rem;">Services</a></li>
                        <li><a href="/pages/courses.html" style="padding: 0.5rem;">Courses</a></li>
                    </ul>
                </nav>

                <div class="header-actions flex gap-sm items-center">
                    <a href="/pages/wishlist.html" style="font-size: 1.2rem; color: var(--text-main); margin-right: 0.5rem;">♡</a>
                    <a href="/pages/cart.html" style="font-size: 1.2rem;"><i class="cart-icon">🛒</i></a>
                    ${authButton}
                </div>
            </div>
            
            <!-- Mobile Menu Dropdown -->
            <div id="mobile-menu" style="display: none; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); padding: 1rem; border-top: 1px solid var(--border-color);">
                <ul style="display: flex; flex-direction: column; gap: 1rem;">
                    <li><a href="/" style="display: block; padding: 0.5rem;">Home</a></li>
                    <li><a href="/pages/products.html" style="display: block; padding: 0.5rem;">Products</a></li>
                    <li><a href="/pages/services.html" style="display: block; padding: 0.5rem;">Services</a></li>
                     <li><a href="/pages/courses.html" style="display: block; padding: 0.5rem;">Courses</a></li>
                </ul>
            </div>
        </header>
    `;

    document.getElementById('header-container').innerHTML = headerHTML;

    // Mobile Menu Logic
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    if (btn) {
        btn.addEventListener('click', () => {
            const isHidden = menu.style.display === 'none';
            menu.style.display = isHidden ? 'block' : 'none';
        });
    }

    // Scroll effect
    window.addEventListener('scroll', () => {
        const header = document.getElementById('main-header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}
