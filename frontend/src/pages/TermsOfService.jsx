import { useEffect } from 'react';

export default function TermsOfService() {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    return (
        <div className="min-h-screen bg-page-bg py-12 px-4">
            <article className="max-w-3xl mx-auto bg-surface rounded-2xl shadow-card p-8 md:p-12">
                <h1 className="text-3xl font-heading font-bold text-text-primary mb-2">Terms of Service</h1>
                <p className="text-sm text-text-muted mb-8">Last updated: March 8, 2026</p>

                <div className="prose prose-sm max-w-none text-text-primary space-y-6">
                    <section>
                        <h2 className="text-xl font-heading font-bold mt-0">1. Acceptance of Terms</h2>
                        <p className="text-text-secondary leading-relaxed">
                            By accessing or using the CMGROUPS application and website (the "Service"),
                            you agree to be bound by these Terms of Service. If you do not agree to
                            these terms, do not use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">2. Services Offered</h2>
                        <p className="text-text-secondary leading-relaxed">CMGROUPS provides:</p>
                        <ul className="list-disc pl-5 text-text-secondary space-y-1">
                            <li><strong>E-Commerce:</strong> Purchase of computers, components, and accessories.</li>
                            <li><strong>Repair & Maintenance:</strong> Booking of computer repair, AMC, and installation services.</li>
                            <li><strong>Education:</strong> Enrollment in Tally ERP, computer courses, and other educational programs.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">3. User Accounts</h2>
                        <p className="text-text-secondary leading-relaxed">
                            You must create an account to place orders, book services, or enroll in courses.
                            You are responsible for maintaining the confidentiality of your account credentials.
                            You agree to provide accurate and current information during registration.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">4. Orders & Payments</h2>
                        <ul className="list-disc pl-5 text-text-secondary space-y-1">
                            <li>All prices are listed in Indian Rupees (INR) and include applicable taxes unless stated otherwise.</li>
                            <li>We reserve the right to cancel orders due to pricing errors, stock unavailability, or suspected fraud.</li>
                            <li>Payment must be completed at the time of order placement through the provided payment methods.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">5. Cancellations & Refunds</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Order cancellations are subject to our cancellation policy. Refunds, when
                            applicable, will be processed to the original payment method within 7-14
                            business days. Return requests must be submitted through your account dashboard.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">6. Service Bookings</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Service appointments are subject to technician availability. OTP verification
                            is required to confirm service completion. CMGROUPS is not liable for damage
                            caused by third-party technicians beyond the scope of the booked service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">7. Intellectual Property</h2>
                        <p className="text-text-secondary leading-relaxed">
                            All content, logos, and materials on the Service are the property of CMGROUPS
                            or its licensors and are protected by intellectual property laws. You may not
                            reproduce, distribute, or create derivative works without written permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">8. Limitation of Liability</h2>
                        <p className="text-text-secondary leading-relaxed">
                            CMGROUPS shall not be liable for any indirect, incidental, special, or
                            consequential damages arising from use of the Service. Our total liability
                            shall not exceed the amount paid by you for the specific product or service
                            giving rise to the claim.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">9. Changes to Terms</h2>
                        <p className="text-text-secondary leading-relaxed">
                            We reserve the right to modify these terms at any time. Material changes will
                            be communicated via the Service or email. Continued use after changes
                            constitutes acceptance of the updated terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">10. Governing Law</h2>
                        <p className="text-text-secondary leading-relaxed">
                            These terms shall be governed by and construed in accordance with the laws
                            of India. Any disputes shall be subject to the exclusive jurisdiction of
                            the courts in New Delhi.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-heading font-bold">11. Contact</h2>
                        <p className="text-text-secondary leading-relaxed">
                            For questions regarding these Terms of Service, contact us at:
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
