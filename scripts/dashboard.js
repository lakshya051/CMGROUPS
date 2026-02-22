// Dashboard Logic

import { getProductById } from './products_data.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check Auth
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = '/pages/login.html';
        return;
    }

    // Set User Name
    document.getElementById('user-name-display').textContent = user.name;
    document.getElementById('user-email-display').textContent = user.email;

    // Navigation Logic
    const navItems = document.querySelectorAll('.dashboard-nav-item');
    const sections = document.querySelectorAll('.dashboard-section');

    function switchSection(sectionId) {
        // Update Nav
        navItems.forEach(item => {
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Content
        sections.forEach(section => {
            if (section.id === sectionId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            switchSection(item.dataset.section);
        });
    });

    // --- Profile Section ---
    document.getElementById('profile-name').value = user.name;
    document.getElementById('profile-email').value = user.email;
    document.getElementById('profile-phone').value = user.phone || '';

    // --- Orders Section (Mock Data for now) ---
    const ordersList = document.getElementById('orders-list');

    // In a real app, fetch from API/DB
    const mockOrders = [
        { id: 'ORD-X9J2K1', date: '2023-10-15', total: 185000, status: 'Delivered' },
        { id: 'ORD-M5N6B2', date: '2023-11-02', total: 65000, status: 'Processing' }
    ];

    if (mockOrders.length > 0) {
        ordersList.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${mockOrders.map(order => `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.date}</td>
                            <td>₹${order.total.toLocaleString()}</td>
                            <td><span class="status-badge ${getStatusClass(order.status)}">${order.status}</span></td>
                            <td><button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">View</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        ordersList.innerHTML = '<p class="text-muted">No orders found.</p>';
    }

    function getStatusClass(status) {
        switch (status.toLowerCase()) {
            case 'delivered': return 'status-success';
            case 'processing': return 'status-pending';
            case 'cancelled': return 'status-cancelled';
            default: return '';
        }
    }

    // --- Loyalty Section ---
    renderLoyalty();

    function renderLoyalty() {
        const points = user.points || 0;
        const history = user.pointHistory || [];

        // Dynamic Import for Tier Logic (or duplicate simple logic)
        // For simplicity, let's just define getTier here or import if we were using modules fully
        // Since dashboard.js is loaded as module in HTML, we can import
        import('../scripts/loyalty.js').then(({ getTier }) => {
            const tier = getTier(points);

            const cardContainer = document.getElementById('loyalty-card-container');
            if (cardContainer) {
                cardContainer.innerHTML = `
                    <div class="loyalty-card ${tier.name.toLowerCase()}">
                        <div class="tier-badge">${tier.icon}</div>
                        <span>Current Balance</span>
                        <div class="loyalty-points-big">${points} pts</div>
                        <div class="flex justify-between items-center">
                            <span>${tier.name} Member</span>
                            <small>Earn 1 pt per ₹100</small>
                        </div>
                    </div>
                `;
            }

            const historyList = document.getElementById('points-history-list');
            if (historyList && history.length > 0) {
                historyList.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Points</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.map(h => `
                                <tr>
                                    <td>${h.date}</td>
                                    <td>${h.description}</td>
                                    <td style="font-weight: bold; color: ${h.type === 'Credit' ? '#4ade80' : '#f87171'}">
                                        ${h.type === 'Credit' ? '+' : '-'}${h.amount}
                                    </td>
                                    <td>${h.type}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        });
    }

    // --- Referral Section ---
    renderReferrals();

    function renderReferrals() {
        import('../scripts/referral.js').then(({ getReferralStats }) => {
            const stats = getReferralStats(user.id);

            document.getElementById('my-referral-code').textContent = user.referralCode || 'Generate One';
            document.getElementById('ref-count').textContent = stats.count;
            document.getElementById('ref-earned').textContent = `${stats.earned} pts`;

            // Expose copy function
            window.copyReferralCode = () => {
                const code = document.getElementById('my-referral-code').textContent;
                navigator.clipboard.writeText(code).then(() => {
                    alert('Referral Code Copied!');
                });
            };
        });
    }

    // --- Courses Section ---
    renderCourses();

    function renderCourses() {
        // Import both course data and logic (if needed)
        // We need course DETAILS so we import data
        import('../scripts/courses_data.js').then(({ getCourseById }) => {
            const enrolled = user.enrolledCourses || [];
            const container = document.getElementById('my-courses-grid');

            if (enrolled.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-color);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🎓</div>
                        <h3>No courses yet</h3>
                        <p class="text-muted" style="margin-bottom: 1.5rem;">Start learning new skills today.</p>
                        <a href="/pages/courses.html" class="btn btn-primary">Browse Catalog</a>
                    </div>
                `;
                return;
            }

            container.innerHTML = enrolled.map(item => {
                const course = getCourseById(item.courseId);
                if (!course) return '';

                return `
                    <div class="card glass-panel">
                         <div style="height: 120px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin-bottom: 1rem;">
                            ${course.image}
                         </div>
                         <h4 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">${course.title}</h4>
                         <div class="flex justify-between" style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                            <span>Progress</span>
                            <span>${item.progress}%</span>
                         </div>
                         <div class="course-card-progress">
                            <div class="course-progress-bar" style="width: ${item.progress}%"></div>
                         </div>
                         <a href="/pages/course-detail.html?id=${course.id}" class="btn btn-outline" style="width: 100%; margin-top: 1rem; text-align: center;">Continue</a>
                    </div>
                `;
            }).join('');
        });
    }

    // --- Services Section ---
    renderServices();

    function renderServices() {
        import('../scripts/services.js').then(({ getUserBookings, cancelBooking }) => {
            const bookings = getUserBookings(user.id);
            const container = document.getElementById('services-list');

            if (bookings.length === 0) {
                container.innerHTML = '<p class="text-muted">No service requests found.</p>';
                return;
            }

            container.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Service</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.map(b => `
                            <tr>
                                <td>${b.id}</td>
                                <td style="text-transform: capitalize;">${b.serviceType}</td>
                                <td>${b.date}</td>
                                <td><span class="status-badge ${getStatusClass(b.status)}">${b.status}</span></td>
                                <td>
                                    ${b.status === 'Pending' ? `<button class="btn btn-outline" style="font-size: 0.8rem; padding: 0.2rem 0.5rem; border-color: #f87171; color: #f87171;" onclick="window.cancelSrv('${b.id}')">Cancel</button>` : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            window.cancelSrv = (id) => {
                if (confirm('Cancel this request?')) {
                    cancelBooking(id);
                    renderServices();
                }
            };
        });
    }

    // Default Section
    switchSection('profile');
});
