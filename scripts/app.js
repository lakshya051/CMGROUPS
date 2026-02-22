// Main Application Script

import loadHeader from '../components/header.js';
import loadFooter from '../components/footer.js';
import loadHero from '../components/hero.js';
import loadFeaturedProducts from '../components/featured_products.js';
import loadServicesOverview from '../components/services_overview.js';
import loadCoursesHighlight from '../components/courses_highlight.js';

document.addEventListener('DOMContentLoaded', () => {
    // Load Shell
    loadHeader();

    // Router-like check: If we are on the homepage (index.html or /), load homepage components
    const mainContent = document.getElementById('main-content');
    if (mainContent && (window.location.pathname === '/' || window.location.pathname.endsWith('index.html'))) {
        let homeHTML = '';
        homeHTML += loadHero();
        homeHTML += loadFeaturedProducts();
        homeHTML += loadServicesOverview();
        homeHTML += loadCoursesHighlight();
        mainContent.innerHTML = homeHTML;
    }

    loadFooter();

    console.log('TechNova App Initialized');
});
