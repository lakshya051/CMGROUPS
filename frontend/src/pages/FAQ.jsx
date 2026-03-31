import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

const FAQ_DATA = [
    {
        category: 'Orders & Delivery',
        questions: [
            { q: 'How long does delivery take?', a: 'We offer 24-hour express delivery within Etah city. For other areas in UP, delivery typically takes 2–3 business days.' },
            { q: 'How can I track my order?', a: 'Go to Dashboard → My Orders to see real-time status updates for all your orders.' },
            { q: 'Is Cash on Delivery available?', a: 'Yes, we support Pay at Store and Cash on Delivery. You will receive a payment OTP that must be shared with our delivery person.' },
            { q: 'Do you charge for delivery?', a: 'Delivery is free on orders above ₹499. Below that, a nominal delivery fee may apply.' },
        ],
    },
    {
        category: 'Returns & Refunds',
        questions: [
            { q: 'How do I return a product?', a: 'Go to Dashboard → My Orders, select the order, and click "Request Return". Our team will review it within 24–48 hours.' },
            { q: 'Where do I get my refund?', a: 'Refunds are credited to your Shoptify Wallet, which can be used for future purchases.' },
            { q: 'Can I return opened products?', a: 'Products must be in original packaging and unused condition. Defective items are exceptions.' },
        ],
    },
    {
        category: 'Services',
        questions: [
            { q: 'What repair services do you offer?', a: 'We offer laptop, desktop, printer, and mobile repairs. You can also book CCTV installation and networking services.' },
            { q: 'How does service booking work?', a: 'Book a service through our Services page. Choose a date, time slot, and provide your device details. A technician will be assigned to you.' },
            { q: 'How is the service OTP system used?', a: 'When a technician arrives, they share a pickup OTP with you. Enter it in the app to confirm device handover. A delivery OTP works the same way when you receive your device back.' },
        ],
    },
    {
        category: 'Courses & Academy',
        questions: [
            { q: 'What courses do you offer?', a: 'We offer professional computer courses including Tally Prime, DCA, PGDCA, and more through AICT Computer Education (est. 1998).' },
            { q: 'How do I enroll in a course?', a: 'Visit the Courses page, select a course, and fill out the application form. Our team will contact you regarding fees and schedule.' },
            { q: 'Do I get a certificate?', a: 'Yes, certificates are issued upon successful completion. You can download them from Dashboard → My Courses.' },
        ],
    },
    {
        category: 'Account & Wallet',
        questions: [
            { q: 'What is Shoptify Wallet?', a: 'Shoptify Wallet is your in-app balance. You earn wallet points through referrals and refunds, and can use them for purchases.' },
            { q: 'How does the referral program work?', a: 'Share your unique referral code. When someone uses it for a purchase, both you and the buyer earn wallet points.' },
            { q: 'How do I change my password?', a: 'Go to Dashboard → Settings. You can update your name, phone number, and password there.' },
        ],
    },
];

function AccordionItem({ question, answer }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-b border-border-default last:border-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-4 py-4 text-left"
            >
                <span className="font-semibold text-text-primary text-sm">{question}</span>
                <ChevronDown size={18} className={`text-text-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <p className="pb-4 text-sm text-text-secondary leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                    {answer}
                </p>
            )}
        </div>
    );
}

export default function FAQ() {
    useSEO({ title: 'Help Center / FAQ — Shoptify', description: 'Find answers to common questions about orders, returns, services, courses, and your account.' });

    return (
        <div className="container mx-auto px-4 py-6 sm:py-12 max-w-3xl animate-in fade-in duration-500">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-2">Help Center</h1>
            <p className="text-text-muted text-sm sm:text-base mb-6 sm:mb-8">Find quick answers to common questions.</p>

            <div className="space-y-8">
                {FAQ_DATA.map(section => (
                    <div key={section.category}>
                        <h2 className="text-lg font-bold text-text-primary mb-3">{section.category}</h2>
                        <div className="bg-surface rounded-xl border border-border-default px-5">
                            {section.questions.map(faq => (
                                <AccordionItem key={faq.q} question={faq.q} answer={faq.a} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 bg-surface border border-border-default rounded-xl p-6 text-center">
                <h3 className="font-bold text-text-primary mb-2">Still have questions?</h3>
                <p className="text-sm text-text-muted mb-4">Our team is here to help.</p>
                <a
                    href="tel:+918171838388"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-105 transition-all"
                >
                    Call Us: +91 81718 38388
                </a>
            </div>
        </div>
    );
}
