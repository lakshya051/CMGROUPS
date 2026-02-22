export default function loadFooter() {
    const footerHTML = `
        <footer style="background: #0b1120; padding: 4rem 0; margin-top: 4rem; border-top: 1px solid var(--border-color);">
            <div class="container grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem;">
                <div>
                    <h3 style="margin-bottom: 1rem;">TechNova</h3>
                    <p style="color: var(--text-muted);">Empowering your digital life with premium hardware and expert support.</p>
                </div>
                <div>
                    <h4 style="margin-bottom: 1rem;">Shop</h4>
                    <ul style="color: var(--text-muted);">
                        <li style="margin-bottom: 0.5rem;"><a href="#">Laptops</a></li>
                        <li style="margin-bottom: 0.5rem;"><a href="#">Desktops</a></li>
                        <li style="margin-bottom: 0.5rem;"><a href="#">Components</a></li>
                        <li style="margin-bottom: 0.5rem;"><a href="#">Accessories</a></li>
                    </ul>
                </div>
                <div>
                    <h4 style="margin-bottom: 1rem;">Support</h4>
                    <ul style="color: var(--text-muted);">
                        <li style="margin-bottom: 0.5rem;"><a href="#">Contact Us</a></li>
                        <li style="margin-bottom: 0.5rem;"><a href="#">Repairs</a></li>
                        <li style="margin-bottom: 0.5rem;"><a href="#">Warranty</a></li>
                        <li style="margin-bottom: 0.5rem;"><a href="#">FAQs</a></li>
                    </ul>
                </div>
                <div>
                    <h4 style="margin-bottom: 1rem;">Stay Connected</h4>
                    <div class="flex gap-sm">
                        <!-- Social Icons Placeholders -->
                        <span>🐦</span>
                        <span>📷</span>
                        <span>📘</span>
                    </div>
                </div>
            </div>
            <div class="container" style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; color: var(--text-muted);">
                <p>&copy; 2026 TechNova. All rights reserved.</p>
            </div>
        </footer>
    `;

    document.getElementById('footer-container').innerHTML = footerHTML;
}
