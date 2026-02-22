export default function loadServicesOverview() {
    const services = [
        { title: "PC Repairs", desc: "Expert diagnostics and board-level repairs for laptops and desktops.", icon: "🔧" },
        { title: "Custom Builds", desc: "We build your dream PC sourced with the best components.", icon: "🛠️" },
        { title: "Annual Maintenance", desc: "Keep your business systems running smoothly with our AMC plans.", icon: "🛡️" }
    ];

    const servicesHTML = services.map(s => `
        <div class="card glass-panel" style="text-align: center;">
            <div class="feature-icon" style="margin: 0 auto 1.5rem;">${s.icon}</div>
            <h3 class="card-title" style="margin-bottom: 1rem;">${s.title}</h3>
            <p class="card-desc">${s.desc}</p>
            <a href="#" style="color: var(--primary-color); font-weight: 600;">Learn More &rarr;</a>
        </div>
    `).join('');

    return `
        <section style="background: rgba(15, 23, 42, 0.5);">
            <div class="container">
                <div class="section-header">
                    <span class="section-subtitle">Expert Support</span>
                    <h2 class="section-title">Our Services</h2>
                </div>
                <div class="card-grid">
                    ${servicesHTML}
                </div>
            </div>
        </section>
    `;
}
