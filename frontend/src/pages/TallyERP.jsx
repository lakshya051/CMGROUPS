import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import {
    CheckCircle, ChevronDown, ChevronUp, FileText, Package, Users,
    Building2, Receipt, BarChart3, CreditCard, Wrench, GraduationCap,
    ShoppingCart, Stethoscope, UtensilsCrossed, Factory, BookOpen,
    Calculator, Truck, Settings, Phone, MessageSquare, Star, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL;

// ── Config — change these two values ──────────────────────────────────
const CITY = 'Etah';
const WA_NUMBER = '919999999999'; // 91 + 10-digit number, no spaces/dashes
// ──────────────────────────────────────────────────────────────────────

const WA_MSG = encodeURIComponent('Hi, I am interested in Tally ERP software. Please share details and pricing.');
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;

const LICENSE_OPTIONS = [
    'Tally Prime Single User',
    'Tally Prime Multi User',
    'Tally Prime with GST',
    'Educational License',
    'Not Sure Yet'
];

// WhatsApp SVG icon (Lucide doesn't have it)
const WhatsAppIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
);

// FAQ data
const FAQS = [
    { q: 'Is this a genuine Tally license?', a: `Yes, we are an authorized Tally dealer. All licenses we sell are 100% genuine and registered directly with Tally Solutions Pvt. Ltd.` },
    { q: 'Do you provide installation support?', a: `Yes, our technician will install and configure Tally at your location completely free of charge with every license purchase.` },
    { q: 'Is training included?', a: `Basic training on how to use Tally for your business type is included free with every purchase. Advanced training is available separately.` },
    { q: 'Can I upgrade from Single User to Multi User later?', a: `Yes, Tally allows you to upgrade your license at any time. You only pay the difference in price.` },
    { q: 'Does it support GST filing?', a: `Yes, Tally Prime is fully GST compliant and supports GSTR-1, GSTR-3B, and e-invoicing.` },
    { q: 'What is the annual renewal cost?', a: `Tally requires an annual subscription called TallyNet. Contact us for current pricing as it may vary.` },
    { q: 'Do you provide support after purchase?', a: `Yes, we provide local support in ${CITY}. You can call, WhatsApp, or visit our store for any help.` },
    { q: 'Can I use Tally on multiple computers?', a: `Single User license works on one computer. For multiple computers you need the Multi User license.` },
];

const FEATURES = [
    { icon: <Receipt size={24} />, label: 'GST Ready & Filing' },
    { icon: <Package size={24} />, label: 'Inventory Management' },
    { icon: <Users size={24} />, label: 'Payroll Management' },
    { icon: <Building2 size={24} />, label: 'Multi-Company Support' },
    { icon: <CreditCard size={24} />, label: 'Banking & Reconciliation' },
    { icon: <BarChart3 size={24} />, label: 'Financial Reports' },
];

const WHY_US = [
    { icon: <Shield size={20} />, text: '100% Genuine Tally License' },
    { icon: <Wrench size={20} />, text: 'Free Installation at Your Location' },
    { icon: <GraduationCap size={20} />, text: 'Basic Training Included' },
    { icon: <FileText size={20} />, text: 'GST Setup Assistance' },
    { icon: <CheckCircle size={20} />, text: `Local Support in ${CITY}` },
    { icon: <Settings size={20} />, text: 'Annual Maintenance Available' },
];

const WHO_USES = [
    { icon: <ShoppingCart size={24} />, label: 'Retail Shops' },
    { icon: <Stethoscope size={24} />, label: 'Medical Stores' },
    { icon: <UtensilsCrossed size={24} />, label: 'Restaurants & Hotels' },
    { icon: <Factory size={24} />, label: 'Manufacturing' },
    { icon: <BookOpen size={24} />, label: 'Schools & Colleges' },
    { icon: <Calculator size={24} />, label: 'Chartered Accountants' },
    { icon: <Truck size={24} />, label: 'Distributors' },
    { icon: <Wrench size={24} />, label: 'Service Businesses' },
];

const LICENSES = [
    {
        title: 'Tally Prime Single User',
        badge: null,
        bestFor: 'Small shops, freelancers, solo businesses',
        features: ['Single computer use', 'Full accounting & ledgers', 'GST billing & invoicing', 'Inventory management'],
    },
    {
        title: 'Tally Prime Multi User',
        badge: null,
        bestFor: 'Offices, teams, multiple departments',
        features: ['Multiple computers on network', 'All Single User features', 'Concurrent access', 'Centralized data'],
    },
    {
        title: 'Tally Prime with GST',
        badge: 'Most Popular',
        bestFor: 'Any business filing GST returns',
        features: ['Automated GST calculation', 'e-Invoicing support', 'GSTR-1, GSTR-3B filing', 'Reconciliation & reports'],
    },
    {
        title: 'Educational License',
        badge: null,
        bestFor: 'Schools, colleges, computer institutes',
        features: ['Student use & training', 'Lab installation', 'Multiple stations', 'Discounted pricing'],
    },
];

// ─────────────────────────────────────────────
// FAQ Item (accordion)
// ─────────────────────────────────────────────
const FAQItem = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className={`border border-border-default rounded-lg overflow-hidden transition-all duration-base ${open ? 'bg-surface-hover' : 'bg-surface'}`}>
            <button
                className="w-full text-left px-md py-sm flex items-center justify-between gap-sm font-semibold text-base text-text-primary"
                onClick={() => setOpen(o => !o)}
            >
                <span className={open ? 'text-trust' : ''}>{q}</span>
                {open ? <ChevronUp size={18} className="text-trust flex-shrink-0" /> : <ChevronDown size={18} className="text-text-secondary flex-shrink-0" />}
            </button>
            {open && (
                <div className="px-6 pb-5 text-sm text-text-secondary leading-relaxed border-t border-border-default pt-3">
                    {a}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
const TallyERP = () => {
    useSEO({ title: 'Tally ERP Solutions in Etah — CMGROUPS', description: 'Tally Prime, Tally ERP 9 licensing, training and support in Etah.' });
    const formRef = useRef(null);
    const [licensePreset, setLicensePreset] = useState('');
    const [form, setForm] = useState({ name: '', businessName: '', phone: '', city: '', licenseType: '', message: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const scrollToForm = (license = '') => {
        if (license) setLicensePreset(license);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Sync licensePreset → form.licenseType
    React.useEffect(() => {
        if (licensePreset) setForm(f => ({ ...f, licenseType: licensePreset }));
    }, [licensePreset]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/tally/enquiry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');
            setSubmitted(true);
            setForm({ name: '', businessName: '', phone: '', city: '', licenseType: '', message: '' });
            toast.success('Enquiry sent! We will contact you within 24 hours.');
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again or reach us on WhatsApp.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* SEO meta (basic head injection) */}
            <title>{`Tally ERP Software Dealer in ${CITY} | Genuine License with Free Installation`}</title>

            <div className="min-h-screen">

                {/* ── SECTION 1: Hero ──────────────────────────────── */}
                <section className="relative overflow-hidden bg-page-bg py-xl sm:py-2xl px-lg">
                    <div className="container mx-auto max-w-4xl text-center relative z-10">
                        <span className="inline-block bg-trust/10 text-trust text-xs font-bold px-3 py-1 rounded mb-4 tracking-wider uppercase">Authorized Tally Dealer</span>
                        <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-4 text-text-primary">
                            Authorized Tally ERP Dealer<br />
                            <span className="text-trust">in {CITY}</span>
                        </h1>
                        <p className="text-sm text-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed">
                            We sell, install, train and support Tally ERP for businesses of all sizes — with free installation and local support.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => scrollToForm()}
                                className="px-md py-sm bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold rounded"
                            >
                                Request Free Demo
                            </button>
                            <a
                                href={WA_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-md py-sm border border-border-default text-text-primary bg-surface hover:bg-surface-hover rounded flex items-center justify-center gap-xs font-bold"
                            >
                                <WhatsAppIcon size={20} /> Chat on WhatsApp
                            </a>
                        </div>
                    </div>
                </section>

                {/* ── SECTION 2: What is Tally ERP ─────────────────── */}
                <section className="py-xl px-lg bg-surface">
                    <div className="container mx-auto max-w-5xl">
                        <div className="text-center mb-lg">
                            <h2 className="text-xl font-bold text-text-primary mb-2">What is Tally ERP?</h2>
                            <p className="text-text-secondary max-w-2xl mx-auto text-sm leading-relaxed">
                                Tally ERP (now Tally Prime) is India's most trusted business accounting software, used by millions of businesses. It simplifies GST filing, inventory tracking, payroll, invoicing, and financial reporting — all in one place. No prior accounting knowledge needed.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-md">
                            {FEATURES.map((f, i) => (
                                <div key={i} className="bg-surface border border-border-default rounded-lg shadow-sm p-md flex flex-col items-center text-center gap-sm hover:shadow-md transition-shadow">
                                    <div className="text-trust">
                                        {f.icon}
                                    </div>
                                    <span className="font-semibold text-sm text-text-primary">{f.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── SECTION 3: License Pricing Cards ─────────────── */}
                <section className="py-xl px-lg bg-page-bg">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-xl">
                            <h2 className="text-xl font-bold text-text-primary mb-2">Choose Your Tally License</h2>
                            <p className="text-sm text-text-secondary">All licenses are 100% genuine. Contact us for exact pricing and offers.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
                            {LICENSES.map((lic, i) => {
                                const popular = lic.badge === 'Most Popular';
                                return (
                                    <div key={i} className={`relative flex flex-col bg-surface border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-base ${popular ? 'border-trust' : 'border-border-default'}`}>
                                        {popular && (
                                            <div className="bg-trust text-white text-xs font-bold text-center py-xs tracking-wider">⭐ MOST POPULAR</div>
                                        )}
                                        <div className={`p-md flex flex-col flex-1 ${popular ? 'bg-surface-hover' : ''}`}>
                                            <h3 className={`font-semibold text-base mb-xs ${popular ? 'text-trust' : 'text-text-primary'}`}>{lic.title}</h3>
                                            <p className="text-xs text-text-secondary mb-md leading-relaxed">Best for: {lic.bestFor}</p>
                                            <ul className="space-y-2 mb-6 flex-1">
                                                {lic.features.map((feat, j) => (
                                                    <li key={j} className="flex items-start gap-2 text-sm">
                                                        <CheckCircle size={14} className="text-success flex-shrink-0 mt-0.5" />
                                                        <span>{feat}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <button
                                                onClick={() => scrollToForm(lic.title)}
                                                className={`w-full text-center px-md py-sm rounded tracking-wide font-bold transition-colors duration-base ${popular ? 'bg-buy-primary text-text-primary hover:bg-buy-primary-hover' : 'border border-border-default text-text-primary bg-surface hover:bg-surface-hover'}`}
                                            >
                                                Get Quote
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ── SECTION 4: Why Buy From Us ───────────────────── */}
                <section className="py-xl px-lg bg-surface">
                    <div className="container mx-auto max-w-5xl">
                        <div className="text-center mb-xl">
                            <h2 className="text-xl font-bold text-text-primary mb-2">Why Buy From Us?</h2>
                            <p className="text-sm text-text-secondary">Your trusted authorized Tally dealer in {CITY}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
                            {WHY_US.map((item, i) => (
                                <div key={i} className="bg-surface border border-border-default rounded-lg shadow-sm p-md hover:shadow-md transition-shadow flex items-start gap-sm">
                                    <div className="text-success flex-shrink-0 mt-0.5">
                                        {item.icon}
                                    </div>
                                    <span className="font-semibold text-sm text-text-primary leading-relaxed">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── SECTION 5: Who Uses Tally ────────────────────── */}
                <section className="py-xl px-lg bg-page-bg">
                    <div className="container mx-auto max-w-5xl">
                        <div className="text-center mb-xl">
                            <h2 className="text-xl font-bold text-text-primary mb-2">Who Uses Tally?</h2>
                            <p className="text-sm text-text-secondary">Tally works for businesses of every kind and size</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
                            {WHO_USES.map((item, i) => (
                                <div key={i} className="bg-surface border border-border-default rounded-lg shadow-sm p-md flex flex-col items-center text-center gap-sm hover:shadow-md transition-shadow">
                                    <div className="text-trust">
                                        {item.icon}
                                    </div>
                                    <span className="font-semibold text-sm text-text-primary">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── SECTION 6: Enquiry Form ───────────────────────── */}
                <section id="tally-enquiry-form" ref={formRef} className="py-xl px-lg bg-surface">
                    <div className="container mx-auto max-w-xl">
                        <div className="text-center mb-xl">
                            <h2 className="text-xl font-bold text-text-primary mb-xs">Request a Free Demo</h2>
                            <p className="text-sm text-text-secondary">Fill in your details and we'll get back to you within 24 hours.</p>
                        </div>

                        {submitted ? (
                            <div className="bg-surface border border-border-default rounded-lg shadow-sm p-lg text-center">
                                <CheckCircle size={48} className="mx-auto text-success mb-sm" />
                                <h3 className="text-lg font-bold text-text-primary mb-xs">Thank you!</h3>
                                <p className="text-sm text-text-secondary mb-md">We will contact you within 24 hours.</p>
                                <button
                                    className="text-trust hover:underline font-medium text-sm"
                                    onClick={() => setSubmitted(false)}
                                >
                                    Submit another enquiry
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="bg-surface border border-border-default rounded-lg shadow-sm p-lg space-y-md">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                                    <div>
                                        <label className="text-sm font-medium text-text-primary block mb-xs">Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            className="w-full border border-border-default rounded px-sm py-xs text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:border-trust transition-colors duration-base"
                                            placeholder="Ramesh Kumar"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-text-primary block mb-xs">Business Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.businessName}
                                            onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                                            className="w-full border border-border-default rounded px-sm py-xs text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:border-trust transition-colors duration-base"
                                            placeholder="Kumar Traders"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                                    <div>
                                        <label className="text-sm font-medium text-text-primary block mb-xs">Phone Number *</label>
                                        <input
                                            type="tel"
                                            required
                                            pattern="[0-9]{10}"
                                            maxLength={10}
                                            value={form.phone}
                                            onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                                            className="w-full border border-border-default rounded px-sm py-xs text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:border-trust transition-colors duration-base"
                                            placeholder="9876543210"
                                        />
                                        <p className="text-xs text-text-secondary mt-xs">10-digit mobile number</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-text-primary block mb-xs">City *</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.city}
                                            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                                            className="w-full border border-border-default rounded px-sm py-xs text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:border-trust transition-colors duration-base"
                                            placeholder={CITY}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-primary block mb-xs">License Type *</label>
                                    <select
                                        required
                                        value={form.licenseType}
                                        onChange={e => setForm(f => ({ ...f, licenseType: e.target.value }))}
                                        className="w-full border border-border-default rounded px-sm py-xs text-sm text-text-primary focus-visible:outline-none focus-visible:border-trust transition-colors duration-base"
                                    >
                                        <option value="">Select license type...</option>
                                        {LICENSE_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-primary block mb-xs">Message <span className="text-text-secondary font-normal">(optional)</span></label>
                                    <textarea
                                        rows={3}
                                        value={form.message}
                                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                        className="w-full border border-border-default rounded px-sm py-xs text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:border-trust transition-colors duration-base resize-none"
                                        placeholder="Any specific requirements or questions..."
                                    />
                                </div>

                                {error && (
                                    <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg p-sm mt-xs">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-sm px-md bg-buy-primary hover:bg-buy-primary-hover text-text-primary rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Sending...' : 'Send Enquiry'}
                                </button>

                                <p className="text-xs text-text-secondary text-center mt-sm">
                                    We'll contact you within 24 hours. No spam, ever.
                                </p>
                            </form>
                        )}
                    </div>
                </section>

                {/* ── SECTION 7: WhatsApp Quick Contact ────────────── */}
                <section className="py-xl px-lg bg-page-bg">
                    <div className="container mx-auto max-w-2xl">
                        <div className="bg-surface border border-border-default rounded-lg shadow-sm p-lg text-center hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-md text-white" style={{ backgroundColor: '#25D366' }}>
                                <WhatsAppIcon size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-text-primary mb-xs">Prefer to Talk Directly?</h2>
                            <p className="text-sm text-text-secondary mb-md">Chat with us on WhatsApp — quick replies, real support.</p>
                            <a
                                href={WA_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-sm px-md py-sm border border-border-default text-text-primary bg-surface hover:bg-surface-hover rounded font-bold"
                            >
                                <WhatsAppIcon size={20} /> Chat on WhatsApp
                            </a>
                            <p className="text-text-secondary text-sm mt-md">
                                <Phone size={14} className="inline mr-1" />
                                +{WA_NUMBER.slice(0, 2)} {WA_NUMBER.slice(2, 7)} {WA_NUMBER.slice(7)}
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── SECTION 8: FAQ ───────────────────────────────── */}
                <section className="py-xl px-lg bg-surface">
                    <div className="container mx-auto max-w-3xl">
                        <div className="text-center mb-xl">
                            <h2 className="text-xl font-bold text-text-primary mb-xs">Frequently Asked Questions</h2>
                            <p className="text-sm text-text-secondary">Everything you need to know before buying Tally</p>
                        </div>
                        <div className="space-y-sm">
                            {FAQS.map((faq, i) => (
                                <FAQItem key={i} q={faq.q} a={faq.a} />
                            ))}
                        </div>
                        <div className="text-center mt-xl">
                            <p className="text-sm text-text-secondary mb-md">Still have questions?</p>
                            <div className="flex flex-col sm:flex-row gap-sm justify-center">
                                <button
                                    onClick={() => scrollToForm()}
                                    className="px-md py-sm bg-buy-primary hover:bg-buy-primary-hover text-text-primary rounded font-bold transition-colors"
                                >
                                    Send an Enquiry
                                </button>
                                <a
                                    href={WA_LINK}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-md py-sm border border-border-default text-text-primary bg-surface hover:bg-surface-hover rounded font-bold inline-flex items-center justify-center gap-xs"
                                >
                                    <WhatsAppIcon size={18} /> Ask on WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </>
    );
};

export default TallyERP;
