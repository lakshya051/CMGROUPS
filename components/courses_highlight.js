export default function loadCoursesHighlight() {
    return `
        <section class="container">
            <div class="glass-panel flex items-center justify-between" style="padding: 4rem; overflow: hidden; position: relative;">
                <div style="position: relative; z-index: 10; max-width: 500px;">
                    <span class="section-subtitle">Learn with Us</span>
                    <h2 class="section-title">Master Computer Hardware</h2>
                    <p class="hero-subtitle">Join our Chip Level Repair Course and start your career in tech service. Certified instructors, hands-on labs.</p>
                    <a href="/pages/courses.html" class="btn btn-primary">View Curriculum</a>
                </div>
                <div style="font-size: 10rem; opacity: 0.1; position: absolute; right: 2rem;">
                    🎓
                </div>
            </div>
        </section>
    `;
}
