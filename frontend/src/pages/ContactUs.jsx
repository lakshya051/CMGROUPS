import { useState } from 'react';
import { Send, MapPin, Phone, Mail } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DEPARTMENTS = ['Sales', 'Support', 'Services', 'Courses'];

export default function ContactUs() {
    useSEO({ title: 'Contact Us — Shoptify', description: 'Get in touch with Shoptify — Sales, Support, Services, or Courses.' });

    const [form, setForm] = useState({ name: '', email: '', phone: '', department: 'Support', subject: '', message: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to send message');
            toast.success('Message sent! We\'ll get back to you soon.');
            setForm({ name: '', email: '', phone: '', department: 'Support', subject: '', message: '' });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = 'w-full rounded-xl border border-border-default bg-surface px-4 py-3 text-base sm:text-sm text-text-primary focus:border-trust focus:ring-2 focus:ring-trust/20 outline-none transition-colors';

    return (
        <div className="container mx-auto px-4 py-6 sm:py-12 max-w-5xl animate-in fade-in duration-500">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-2">Contact Us</h1>
            <p className="text-text-muted text-sm sm:text-base mb-6 sm:mb-10">Have a question or need assistance? Reach out to the right team.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Contact Info */}
                <div className="space-y-6">
                    <div className="bg-surface rounded-xl border border-border-default p-5 space-y-4">
                        <div className="flex gap-3">
                            <MapPin size={18} className="text-primary mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-text-secondary">
                                <p className="font-semibold text-text-primary mb-1">Our Office</p>
                                <p>Laxmi Plaza, Thandi Sadak,<br />Near SBI Bank, Etah, UP — 207001</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Phone size={18} className="text-primary mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-text-secondary">
                                <p className="font-semibold text-text-primary mb-1">Phone</p>
                                <a href="tel:+918171838388" className="text-trust hover:underline">+91 81718 38388</a>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Mail size={18} className="text-primary mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-text-secondary">
                                <p className="font-semibold text-text-primary mb-1">Email</p>
                                <p className="text-text-muted">support@shoptify.in</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-trust/5 border border-trust/20 rounded-xl p-5">
                        <p className="text-sm font-semibold text-trust mb-1">Business Hours</p>
                        <p className="text-sm text-text-secondary">Mon – Sat: 10:00 AM – 7:00 PM</p>
                        <p className="text-sm text-text-muted">Sunday: Closed</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="md:col-span-2 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" required className={inputClass} />
                        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email Address" required className={inputClass} />
                        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number" className={inputClass} />
                        <select name="department" value={form.department} onChange={handleChange} className={inputClass}>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" required className={inputClass} />
                    <textarea name="message" value={form.message} onChange={handleChange} placeholder="Your message..." required rows={5} className={`${inputClass} resize-none`} />
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:brightness-105 transition-all disabled:opacity-50"
                    >
                        <Send size={16} /> {loading ? 'Sending...' : 'Send Message'}
                    </button>
                </form>
            </div>
        </div>
    );
}
