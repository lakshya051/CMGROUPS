import { useEffect } from 'react';

export default function PrivacyPolicy() {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    return (
        <div className="min-h-screen bg-page-bg py-12 px-4">
            <article className="max-w-3xl mx-auto bg-surface rounded-2xl shadow-card p-8 md:p-12">
                <h1 className="text-3xl font-heading font-bold text-text-primary mb-2">Privacy Policy</h1>
                <p className="text-sm text-text-muted mb-8">Last updated: March 8, 2026</p>

                <div className="prose prose-sm max-w-none text-text-primary space-y-6">
                    <section>
                        <h2 className="text-xl font-heading font-bold mt-0">1. Introduction</h2>
                        <p className="text-text-secondary leading-relaxed">
                            CMGROUPS ("we", "our", or "us") operates the CMGROUPS application and website
                            (collectively, the "Service"). This Privacy Policy explains how we collect, use,
                            disclose, and safeguard your information when you use our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">2. Information We Collect</h2>
                        <p className="text-text-secondary leading-relaxed">We may collect the following types of information:</p>
                        <ul className="list-disc pl-5 text-text-secondary space-y-1">
                            <li><strong>Account Information:</strong> Name, email address, and phone number provided during sign-up via our authentication provider (Clerk).</li>
                            <li><strong>Order Data:</strong> Shipping address, order history, and payment transaction references.</li>
                            <li><strong>Service Bookings:</strong> Details of repair and maintenance service requests you submit.</li>
                            <li><strong>Course Enrollment:</strong> Course selections, progress, and certificate data.</li>
                            <li><strong>Device Information:</strong> Device type, operating system, browser type, and push notification tokens when you grant permission.</li>
                            <li><strong>Usage Data:</strong> Pages visited, features used, and interaction timestamps to improve our Service.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">3. How We Use Your Information</h2>
                        <ul className="list-disc pl-5 text-text-secondary space-y-1">
                            <li>To process and fulfill your orders and service bookings.</li>
                            <li>To manage your account, referral program, and course enrollments.</li>
                            <li>To send order updates, service reminders, and promotional notifications (with your consent).</li>
                            <li>To improve our products, services, and user experience.</li>
                            <li>To detect and prevent fraud or unauthorized access.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">4. Data Sharing</h2>
                        <p className="text-text-secondary leading-relaxed">
                            We do not sell your personal information. We may share data with:
                        </p>
                        <ul className="list-disc pl-5 text-text-secondary space-y-1">
                            <li><strong>Service providers:</strong> Payment processors, delivery partners, and our authentication provider (Clerk) to operate the Service.</li>
                            <li><strong>Technicians:</strong> Limited contact and service details shared with assigned technicians for repair bookings.</li>
                            <li><strong>Legal requirements:</strong> When required by law, regulation, or legal process.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">5. Push Notifications</h2>
                        <p className="text-text-secondary leading-relaxed">
                            With your explicit permission, we send push notifications for order updates,
                            service status changes, and promotional offers. You can disable notifications
                            at any time through your device settings or your account preferences.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">6. Data Storage & Security</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Your data is stored on secure servers and transmitted via HTTPS encryption.
                            We implement industry-standard security measures to protect your information,
                            but no method of transmission over the internet is 100% secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">7. Cookies & Local Storage</h2>
                        <p className="text-text-secondary leading-relaxed">
                            We use cookies and browser local storage to maintain your session,
                            remember preferences, and enable offline functionality through our
                            Progressive Web App (PWA) service worker.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">8. Your Rights</h2>
                        <p className="text-text-secondary leading-relaxed">You have the right to:</p>
                        <ul className="list-disc pl-5 text-text-secondary space-y-1">
                            <li>Access, correct, or delete your personal information.</li>
                            <li>Opt out of promotional communications.</li>
                            <li>Request a copy of the data we hold about you.</li>
                            <li>Withdraw consent for push notifications at any time.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">9. Changes to This Policy</h2>
                        <p className="text-text-secondary leading-relaxed">
                            We may update this Privacy Policy from time to time. Changes will be posted
                            on this page with an updated revision date. Continued use of the Service
                            after changes constitutes acceptance of the revised policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">10. Contact Us</h2>
                        <p className="text-text-secondary leading-relaxed">
                            If you have questions about this Privacy Policy, please contact us at:
                        </p>
                        <p className="text-text-secondary">
                            <strong>Email:</strong> support@technova.in<br />
                            <strong>Address:</strong> 123 Tech Street, Nehru Place, New Delhi, 110019
                        </p>
                    </section>
                </div>
            </article>
        </div>
    );
}
