import { useSEO } from '../hooks/useSEO';

export default function RefundPolicy() {
    useSEO({ title: 'Refund & Return Policy — Shoptify', description: 'Learn about our return, refund, and exchange policies for products and services.' });

    const sections = [
        {
            title: 'Eligibility for Returns',
            items: [
                'Products must be returned within the return window specified on the product page (typically 3–7 days from delivery).',
                'Items must be unused, in original packaging, and in the same condition as received.',
                'Certain items like custom-built PCs, opened software, and consumables are non-returnable.',
                'Defective or damaged items can be returned regardless of the return window.',
            ],
        },
        {
            title: 'How to Request a Return',
            items: [
                'Go to Dashboard → My Orders and select the order you want to return.',
                'Click "Request Return" and provide a reason.',
                'Our team will review your request within 24–48 hours.',
                'Once approved, you will receive instructions for returning the item.',
            ],
        },
        {
            title: 'Refund Process & Timelines',
            items: [
                'Approved refunds are credited to your Shoptify Wallet within 2–3 business days.',
                'Wallet balance can be used for future purchases on Shoptify.',
                'For orders paid via Cash on Delivery, refunds are processed only to the wallet.',
                'If a coupon was used, the coupon discount is not refunded.',
            ],
        },
        {
            title: 'Service Bookings',
            items: [
                'Service bookings can be cancelled before the technician is dispatched at no charge.',
                'Once a technician has been assigned or has picked up the device, cancellations may incur charges.',
                'Refunds for services are evaluated on a case-by-case basis.',
            ],
        },
        {
            title: 'Exceptions',
            items: [
                'Products marked as "Non-Returnable" on the product page cannot be returned.',
                'Items damaged due to misuse, unauthorized modification, or normal wear are not eligible.',
                'Returns requested after the return window has expired will not be accepted.',
            ],
        },
    ];

    return (
        <div className="container mx-auto px-4 py-12 max-w-3xl animate-in fade-in duration-500">
            <h1 className="text-3xl font-heading font-bold text-text-primary mb-2">Refund & Return Policy</h1>
            <p className="text-text-muted mb-8">Last updated: March 2026</p>

            <div className="space-y-8">
                {sections.map(section => (
                    <div key={section.title}>
                        <h2 className="text-xl font-bold text-text-primary mb-3">{section.title}</h2>
                        <ul className="space-y-2">
                            {section.items.map((item, i) => (
                                <li key={i} className="flex gap-3 text-text-secondary text-sm leading-relaxed">
                                    <span className="text-primary font-bold mt-0.5">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-12 bg-surface border border-border-default rounded-xl p-6">
                <h3 className="font-bold text-text-primary mb-2">Need Help?</h3>
                <p className="text-sm text-text-muted">
                    If you have questions about returns or refunds, contact us at{' '}
                    <a href="tel:+918171838388" className="text-primary font-semibold">+91 81718 38388</a>{' '}
                    or visit us at our store in Etah.
                </p>
            </div>
        </div>
    );
}
