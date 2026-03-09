import React, { useEffect, useRef, useState } from 'react';
import {
    BellRing, Camera, CheckCircle, ChevronDown, ChevronUp, Factory, Home, MapPin,
    MessageCircle, MonitorSmartphone, MoonStar, Phone, School, ShieldCheck, Store, Video, Wifi, Wrench
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { StarRating } from '../components/ui';

const API_BASE = import.meta.env.VITE_API_URL;
const CITY = 'Etah';
const WA_NUMBER = '919999999999';
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi, I need CCTV installation in Etah. Please share package details and site visit timings.')}`;
const PROPERTY_OPTIONS = ['Home', 'Shop', 'Medical Store', 'School', 'Factory or Godown', 'Other'];
const CAMERA_OPTIONS = ['1-2', '3-4', '5-8', 'More than 8', 'Not Sure'];
const TRUST_POINTS = [
    { icon: <CheckCircle size={18} />, label: 'Free Site Survey' },
    { icon: <ShieldCheck size={18} />, label: '1-Year Local Warranty' },
    { icon: <Phone size={18} />, label: 'Same-Day Support' }
];
const BENEFITS = [
    { icon: <MonitorSmartphone size={24} />, title: 'Mobile live view from anywhere', description: 'Watch your property in real time on your phone when you are away.' },
    { icon: <MoonStar size={24} />, title: 'HD night vision recording', description: 'Clear footage after dark for gates, counters, and outer areas.' },
    { icon: <Video size={24} />, title: '30-day recording backup', description: 'Review recent footage whenever you need it for safety checks or follow-up.' },
    { icon: <BellRing size={24} />, title: 'Theft prevention and staff monitoring', description: 'Reduce blind spots and keep day-to-day operations accountable.' }
];
const PACKAGES = [
    { title: 'Smart Home', badge: null, bestFor: 'Houses and apartments', propertyType: 'Home', camerasNeeded: '1-2', features: ['2 cameras', '4-channel DVR', 'Power supply', 'App setup', '50m wire', '1-year warranty'] },
    { title: 'Vyapar Setup', badge: 'Most Popular', bestFor: 'Retail shops and offices', propertyType: 'Shop', camerasNeeded: '3-4', features: ['4 cameras indoor/outdoor mix', 'DVR', '1TB HDD', '90m wire', 'Voice recording', 'Mobile app on 3 devices', '1-year warranty + 24hr support'] },
    { title: 'Factory / Campus', badge: null, bestFor: 'Large premises and multi-gate sites', propertyType: 'Factory or Godown', camerasNeeded: 'More than 8', features: ['8-16+ cameras', 'PTZ options', 'Long-range night vision', 'NVR setup', 'Multi-site monitoring', 'Priority support'] }
];
const DIFFERENTIATORS = [
    { icon: <Wrench size={20} />, text: 'Neat hidden wiring using conduit pipes' },
    { icon: <MapPin size={20} />, text: `Local same-day support based in ${CITY}` },
    { icon: <MonitorSmartphone size={20} />, text: 'Free mobile app training on the day of installation' },
    { icon: <ShieldCheck size={20} />, text: 'Only genuine brands: CP Plus, Hikvision, Dahua' }
];
const TESTIMONIALS = [
    { name: 'Vikas Gupta', role: 'Medical Store Owner, Etah', quote: 'CMGROUPS installed 4 cameras at our store with very clean wiring. I can check the counter and entrance anytime on my phone.', icon: <Store size={20} /> },
    { name: 'Anita Sharma', role: 'School Principal, Jalesar', quote: 'They handled our 8-camera setup professionally and trained our staff the same day. The app is simple and reliable.', icon: <School size={20} /> },
    { name: 'Saurabh Singh', role: 'Home Owner, Etah', quote: 'The conduit installation looks neat and professional. We wanted a clean finish and that is exactly what we got.', icon: <Home size={20} /> }
];
const PROCESS_STEPS = [
    { title: 'We call within 2 hours to confirm', description: 'A local team member confirms your location, camera goals, and preferred visit time.' },
    { title: 'Our technician visits your property for free', description: 'We inspect entry points, cable routes, recording needs, and app requirements.' },
    { title: 'You receive a detailed quote with no hidden charges', description: 'You get a clear package recommendation with brand and installation scope.' },
    { title: 'We install at your convenient time', description: 'Installation is scheduled when it suits your home, shop, or office.' }
];
const FAQS = [
    { q: 'Do I need Wi-Fi for the cameras?', a: 'No. Recording works without Wi-Fi through the DVR or NVR. Internet is only needed for remote viewing on your phone.' },
    { q: 'Are installation and wiring charges included?', a: 'Yes, our package quote includes installation and standard wiring. Extra civil work is explained before installation.' },
    { q: 'What happens if a camera stops working?', a: `You can contact our ${CITY} team directly. We provide local support and warranty help based on the installed setup.` },
    { q: 'Can I expand the system later?', a: 'Yes. We can plan the recorder and wiring so more cameras can be added later.' },
    { q: 'Which brands do you install?', a: 'We install genuine equipment such as CP Plus, Hikvision, and Dahua based on your site and budget.' },
    { q: 'How long does installation take?', a: 'Most small home and shop installations are completed the same day. Larger factory or campus projects may take longer.' }
];
const CAMERA_FEEDS = [
    { icon: <Home size={18} />, label: 'Main Gate', meta: 'Live - Home' },
    { icon: <Store size={18} />, label: 'Cash Counter', meta: 'Live - Shop' },
    { icon: <School size={18} />, label: 'School Hall', meta: 'Live - School' },
    { icon: <Factory size={18} />, label: 'Factory Yard', meta: 'Live - Factory' }
];

const FAQItem = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className={`border border-border-default rounded-lg overflow-hidden transition-all duration-base ${open ? 'bg-surface-hover' : 'bg-surface'}`}>
            <button type="button" className="w-full text-left px-md py-sm flex items-center justify-between gap-sm font-semibold text-base text-text-primary" onClick={() => setOpen(prev => !prev)}>
                <span className={open ? 'text-trust' : ''}>{q}</span>
                {open ? <ChevronUp size={18} className="text-trust flex-shrink-0" /> : <ChevronDown size={18} className="text-text-secondary flex-shrink-0" />}
            </button>
            {open && <div className="px-lg pb-md pt-sm border-t border-border-default text-sm text-text-secondary leading-relaxed">{a}</div>}
        </div>
    );
};

const CCTVSecurity = () => {
    const formRef = useRef(null);
    const [preset, setPreset] = useState({ propertyType: '', camerasNeeded: '' });
    const [form, setForm] = useState({ name: '', phone: '', city: '', propertyType: '', camerasNeeded: '', message: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const scrollToForm = (nextPreset = { propertyType: '', camerasNeeded: '' }) => {
        setPreset(nextPreset);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        if (!preset.propertyType && !preset.camerasNeeded) return;
        setForm(prev => ({ ...prev, propertyType: preset.propertyType || prev.propertyType, camerasNeeded: preset.camerasNeeded || prev.camerasNeeded }));
    }, [preset]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/cctv/enquiry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');
            setSubmitted(true);
            setForm({ name: '', phone: '', city: '', propertyType: '', camerasNeeded: '', message: '' });
            setPreset({ propertyType: '', camerasNeeded: '' });
            toast.success('Enquiry sent! We will call you shortly for the free site inspection.');
        } catch (err) {
            const message = err.message || 'Something went wrong. Please try again or contact us on WhatsApp.';
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <title>{`CCTV Installation in ${CITY} | CMGROUPS CCTV Security`}</title>
            <div className="min-h-screen bg-page-bg">
                <section className="relative overflow-hidden bg-page-bg py-xl sm:py-2xl px-lg">
                    <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-xl items-center">
                        <div className="space-y-lg">
                            <span className="inline-flex items-center gap-xs bg-trust/10 text-trust text-xs font-bold px-3 py-1 rounded tracking-wider uppercase"><MapPin size={14} />Serving Etah & Nearby Areas</span>
                            <div>
                                <h1 className="text-2xl md:text-4xl font-bold leading-tight text-text-primary">Professional CCTV Installation<br /><span className="text-trust">in {CITY}</span></h1>
                                <p className="text-sm md:text-base text-text-secondary leading-relaxed mt-md max-w-2xl">Protect your property with 24/7 CCTV coverage, mobile live view, hidden wiring, and dependable local warranty support from CMGROUPS.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-sm">
                                <Button size="lg" onClick={() => scrollToForm()}>Request Free Site Inspection</Button>
                                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-xs px-lg py-sm border border-border-default text-text-primary bg-surface hover:bg-surface-hover rounded font-bold transition-colors duration-base"><MessageCircle size={18} />Chat on WhatsApp</a>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
                                {TRUST_POINTS.map(item => <div key={item.label} className="glass-panel p-md flex items-center gap-sm"><div className="text-success flex-shrink-0">{item.icon}</div><span className="text-sm font-semibold text-text-primary">{item.label}</span></div>)}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="glass-panel p-lg">
                                <div className="flex items-center justify-between mb-md">
                                    <div><p className="text-xs font-bold uppercase tracking-wider text-trust">Live Monitoring</p><h2 className="text-lg font-bold text-text-primary">4-Camera Split View</h2></div>
                                    <span className="inline-flex items-center gap-xs text-xs font-semibold text-success"><Wifi size={14} />Connected</span>
                                </div>
                                <div className="grid grid-cols-2 gap-sm">
                                    {CAMERA_FEEDS.map(feed => (
                                        <div key={feed.label} className="rounded-lg border border-border-default bg-page-bg p-md space-y-sm min-h-32">
                                            <div className="flex items-center justify-between text-xs text-text-secondary"><span className="inline-flex items-center gap-xs text-success font-semibold"><Camera size={12} />REC</span><span>{feed.meta}</span></div>
                                            <div className="rounded-lg bg-surface border border-border-default p-md flex flex-col items-center justify-center gap-sm text-center">
                                                <div className="w-10 h-10 rounded-full bg-trust/10 text-trust flex items-center justify-center">{feed.icon}</div>
                                                <div><p className="text-sm font-semibold text-text-primary">{feed.label}</p><p className="text-xs text-text-secondary">Motion ready</p></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-lg ml-auto w-64 max-w-full rounded-3xl border border-border-default bg-surface shadow-sm p-sm animate-in slide-in-from-bottom-5 duration-500">
                                <div className="rounded-3xl border border-border-default bg-page-bg p-md">
                                    <div className="flex items-center justify-between mb-sm"><span className="text-xs font-bold text-text-primary">CMGROUPS Live</span><span className="inline-flex items-center gap-xs text-xs text-success font-semibold"><MonitorSmartphone size={12} />Online</span></div>
                                    <div className="rounded-2xl border border-border-default bg-surface p-md space-y-sm">
                                        <div className="flex items-center justify-between rounded-lg bg-surface-hover px-sm py-xs"><span className="text-xs font-medium text-text-secondary">Main gate</span><span className="text-xs font-semibold text-success">Live</span></div>
                                        <div className="grid grid-cols-2 gap-sm">
                                            <div className="rounded-lg bg-trust/10 p-sm text-center"><Camera size={16} className="mx-auto text-trust mb-xs" /><span className="text-xs font-semibold text-text-primary">Front</span></div>
                                            <div className="rounded-lg bg-success/10 p-sm text-center"><ShieldCheck size={16} className="mx-auto text-success mb-xs" /><span className="text-xs font-semibold text-text-primary">Secure</span></div>
                                        </div>
                                        <div className="rounded-lg bg-page-bg border border-border-default p-sm flex items-center justify-between"><span className="text-xs text-text-secondary">Playback ready</span><span className="text-xs font-semibold text-trust">30 days</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="py-xl px-lg bg-surface">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-xl"><h2 className="text-xl font-bold text-text-primary mb-xs">Benefits That Matter Daily</h2><p className="text-sm text-text-secondary max-w-2xl mx-auto">CCTV should make daily life calmer, safer, and easier to manage.</p></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                            {BENEFITS.map(item => <div key={item.title} className="glass-panel p-lg h-full"><div className="w-12 h-12 rounded-lg bg-trust/10 text-trust flex items-center justify-center mb-md">{item.icon}</div><h3 className="text-base font-semibold text-text-primary mb-sm">{item.title}</h3><p className="text-sm text-text-secondary leading-relaxed">{item.description}</p></div>)}
                        </div>
                    </div>
                </section>
                <section className="py-xl px-lg bg-page-bg">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-xl"><h2 className="text-xl font-bold text-text-primary mb-xs">Choose Your CCTV Package</h2><p className="text-sm text-text-secondary">Shortlist the setup that fits your property. We confirm the final quote after a free site visit.</p></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-md items-stretch">
                            {PACKAGES.map(pkg => {
                                const popular = pkg.badge === 'Most Popular';
                                return (
                                    <div key={pkg.title} className={`relative flex flex-col bg-surface border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-base ${popular ? 'border-trust md:-translate-y-2' : 'border-border-default'}`}>
                                        {popular && <div className="bg-trust text-white text-xs font-bold text-center py-xs tracking-wider">MOST POPULAR</div>}
                                        <div className={`p-lg flex flex-col flex-1 ${popular ? 'bg-surface-hover' : ''}`}>
                                            <h3 className={`font-semibold text-lg mb-xs ${popular ? 'text-trust' : 'text-text-primary'}`}>{pkg.title}</h3>
                                            <p className="text-sm text-text-secondary mb-md">Best for: {pkg.bestFor}</p>
                                            <ul className="space-y-sm mb-lg flex-1">{pkg.features.map(feature => <li key={feature} className="flex items-start gap-sm text-sm text-text-primary"><CheckCircle size={16} className="text-success flex-shrink-0 mt-0.5" /><span>{feature}</span></li>)}</ul>
                                            <Button className="w-full" onClick={() => scrollToForm({ propertyType: pkg.propertyType, camerasNeeded: pkg.camerasNeeded })}>Get Package Quote</Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
                <section className="py-xl px-lg bg-surface">
                    <div className="container mx-auto max-w-5xl">
                        <div className="text-center mb-xl"><h2 className="text-xl font-bold text-text-primary mb-xs">Why Choose CMGROUPS</h2><p className="text-sm text-text-secondary">Local installation quality and after-sales support built for homes and businesses around Etah.</p></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">{DIFFERENTIATORS.map(item => <div key={item.text} className="glass-panel p-md flex items-start gap-sm"><div className="text-success flex-shrink-0 mt-0.5">{item.icon}</div><span className="font-semibold text-sm text-text-primary leading-relaxed">{item.text}</span></div>)}</div>
                    </div>
                </section>
                <section className="py-xl px-lg bg-page-bg">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-xl"><h2 className="text-xl font-bold text-text-primary mb-xs">What Local Customers Say</h2><p className="text-sm text-text-secondary">Real use cases from nearby homes, schools, and businesses.</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">{TESTIMONIALS.map(item => <div key={item.name} className="glass-panel p-lg h-full"><div className="flex items-center justify-between mb-md"><div className="w-10 h-10 rounded-full bg-trust/10 text-trust flex items-center justify-center">{item.icon}</div><StarRating rating={5} /></div><p className="text-sm text-text-secondary leading-relaxed mb-md">"{item.quote}"</p><div><p className="font-semibold text-text-primary">{item.name}</p><p className="text-xs text-text-secondary">{item.role}</p></div></div>)}</div>
                    </div>
                </section>
                <section id="cctv-enquiry-form" ref={formRef} className="scroll-mt-24 py-xl px-lg bg-surface">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-xl"><h2 className="text-xl font-bold text-text-primary mb-xs">Request a Free Site Inspection</h2><p className="text-sm text-text-secondary">Tell us about your property and we will guide you to the right CCTV setup.</p></div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg items-start">
                            <div className="glass-panel p-lg">
                                <h3 className="text-lg font-bold text-text-primary mb-md">What happens after you submit</h3>
                                <div className="space-y-md">{PROCESS_STEPS.map((step, index) => <div key={step.title} className="flex items-start gap-md"><div className="w-10 h-10 rounded-full bg-trust/10 text-trust flex items-center justify-center font-bold flex-shrink-0">{index + 1}</div><div><p className="font-semibold text-text-primary">{step.title}</p><p className="text-sm text-text-secondary mt-xs">{step.description}</p></div></div>)}</div>
                            </div>
                            {submitted ? (
                                <div className="bg-surface border border-border-default rounded-lg shadow-sm p-lg text-center">
                                    <CheckCircle size={48} className="mx-auto text-success mb-sm" />
                                    <h3 className="text-lg font-bold text-text-primary mb-xs">Thank you!</h3>
                                    <p className="text-sm text-text-secondary mb-md">We will call you shortly to arrange your free site inspection.</p>
                                    <button type="button" className="text-trust hover:underline font-medium text-sm" onClick={() => setSubmitted(false)}>Submit another enquiry</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="glass-panel p-lg space-y-md">
                                    <div><label className="text-sm font-medium text-text-primary block mb-xs">Full Name *</label><input type="text" required value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className="input-field" placeholder="Ramesh Kumar" /></div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                                        <div><label className="text-sm font-medium text-text-primary block mb-xs">Phone Number *</label><input type="tel" required pattern="[0-9]{10}" maxLength={10} value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))} className="input-field" placeholder="9876543210" /><p className="text-xs text-text-secondary mt-xs">10-digit mobile number</p></div>
                                        <div><label className="text-sm font-medium text-text-primary block mb-xs">City or Area *</label><input type="text" required value={form.city} onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))} className="input-field" placeholder={CITY} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                                        <div><label className="text-sm font-medium text-text-primary block mb-xs">Property Type *</label><select required value={form.propertyType} onChange={(e) => setForm(prev => ({ ...prev, propertyType: e.target.value }))} className="input-field"><option value="">Select property type...</option>{PROPERTY_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div><label className="text-sm font-medium text-text-primary block mb-xs">Cameras Needed *</label><select required value={form.camerasNeeded} onChange={(e) => setForm(prev => ({ ...prev, camerasNeeded: e.target.value }))} className="input-field"><option value="">Select camera count...</option>{CAMERA_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
                                    </div>
                                    <div><label className="text-sm font-medium text-text-primary block mb-xs">Message <span className="text-text-secondary font-normal">(optional)</span></label><textarea rows={4} value={form.message} onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))} className="input-field resize-none" placeholder="Tell us if you need outdoor cameras, mobile viewing on multiple phones, hidden wiring, or coverage for a specific area." /></div>
                                    {error && <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg p-sm">{error}</div>}
                                    <Button type="submit" className="w-full" size="lg" disabled={submitting}>{submitting ? 'Sending...' : 'Request Free Site Inspection'}</Button>
                                    <p className="text-xs text-text-secondary text-center">No spam. Your number is not shared.</p>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
                <section className="py-xl px-lg bg-page-bg">
                    <div className="container mx-auto max-w-3xl">
                        <div className="text-center mb-xl"><h2 className="text-xl font-bold text-text-primary mb-xs">Frequently Asked Questions</h2><p className="text-sm text-text-secondary">Clear answers before your site visit or installation day.</p></div>
                        <div className="space-y-sm">{FAQS.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}</div>
                    </div>
                </section>
                <section className="bg-trust py-xl px-lg">
                    <div className="container mx-auto max-w-5xl text-center">
                        <h2 className="text-2xl font-bold text-white mb-sm">Need a clean, reliable CCTV setup in Etah?</h2>
                        <p className="text-sm text-white/90 max-w-2xl mx-auto mb-lg">Book your free site inspection today and get a local installation plan with genuine equipment and proper after-sales support.</p>
                        <div className="flex flex-col sm:flex-row gap-sm justify-center">
                            <Button size="lg" onClick={() => scrollToForm()}>Get Free Site Visit</Button>
                            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-xs px-lg py-sm rounded border border-surface text-white hover:bg-surface hover:text-trust font-bold transition-colors duration-base"><MessageCircle size={18} />WhatsApp Now</a>
                        </div>
                    </div>
                </section>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-4 right-4 z-50 safe-bottom inline-flex items-center gap-xs rounded-full bg-success text-white px-md py-sm shadow-sm border border-success animate-in slide-in-from-bottom-5"><MessageCircle size={18} /><span className="text-sm font-bold">WhatsApp</span></a>
            </div>
        </>
    );
};

export default CCTVSecurity;
