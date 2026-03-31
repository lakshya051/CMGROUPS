import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import {
    Wrench, Monitor, Cpu,
    MousePointerClick, MessageSquare, CreditCard, Zap,
    BadgeCheck, Shield, Award, Star,
} from 'lucide-react';
import { serviceTypesAPI } from '../lib/api';
import ServiceCard from './services/ServiceCard';
import BookingModal from './services/BookingModal';

const defaultServices = [
    {
        id: 'repair', title: 'Expert PC Repair', icon: 'Wrench',
        description: 'Diagnose and fix hardware/software issues fast.',
        price: '₹499', estTime: '2–4 hours',
        features: ['Free Diagnostics', 'No Fix, No Fee', 'Original Parts']
    },
    {
        id: 'cleaning', title: 'Deep Cleaning', icon: 'Monitor',
        description: 'Professional dust removal and thermal repasting.',
        price: '₹999', estTime: '1–2 hours',
        features: ['Thermal Paste Replacement', 'Cable Management', 'Exterior Polish']
    },
    {
        id: 'build', title: 'Custom PC Build', icon: 'Cpu',
        description: 'We build your dream PC with neat cable management.',
        price: '₹2,499', estTime: '3–5 hours',
        features: ['Component Selection', 'Stress Testing', 'BIOS Optimization']
    },
];

const HOW_IT_WORKS = [
    { icon: MousePointerClick, step: '01', title: 'Book Online', desc: 'Choose your service, pick a slot, and fill in your details — takes 2 minutes.' },
    { icon: MessageSquare, step: '02', title: 'We Quote & Confirm', desc: 'Our admin reviews, sets a price, and sends you a confirmation with a pickup OTP.' },
    { icon: Wrench, step: '03', title: 'Tech Arrives', desc: 'Our certified technician arrives at your door at the scheduled time.' },
    { icon: CreditCard, step: '04', title: 'Pay on Delivery', desc: 'Device repaired. Pay the final amount when we return your device.' },
];

const TRUST_POINTS = [
    { icon: BadgeCheck, label: 'Certified Technicians' },
    { icon: Shield, label: '90-Day Warranty' },
    { icon: Award, label: 'Genuine Parts' },
    { icon: Star, label: '4.8★ Rated Service' },
];

const Services = () => {
    useSEO({ title: 'Doorstep Repair & Services — Shoptify Etah', description: 'Book computer repair, AMC, printer service and more at your doorstep in Etah.' });
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        serviceTypesAPI.getAll()
            .then(data => {
                if (data && data.length > 0) {
                    setServices(data.map(s => ({
                        ...s,
                        features: Array.isArray(s.features) ? s.features : [],
                        estTime: s.estTime || '1–3 hours'
                    })));
                } else {
                    setServices(defaultServices);
                }
            })
            .catch(() => setServices(defaultServices))
            .finally(() => setPageLoading(false));
    }, []);

    const searchQuery = (searchParams.get('q') || '').trim().toLowerCase();
    const filteredServices = useMemo(() => {
        return services.filter((service) => {
            const serviceName = (service.title || service.name || '').toLowerCase();
            return !searchQuery || serviceName.includes(searchQuery);
        });
    }, [searchQuery, services]);

    const openBooking = (service) => {
        setSelectedService(service);
    };

    const closeBooking = () => {
        setSelectedService(null);
    };

    return (
        <div className="min-h-screen">
            {/* ── Hero ──────────────────────────────────────────────── */}
            <div className="relative bg-gradient-to-br from-trust/10 via-surface to-page-bg border-b border-border-default overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, var(--tw-chart-blue, #3B82F6) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--tw-chart-purple, #8B5CF6) 0%, transparent 50%)'
                }} />
                <div className="container mx-auto px-4 py-8 sm:py-16 text-center relative">
                    <div className="inline-flex items-center gap-2 bg-trust/10 border border-trust/20 text-trust text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-full mb-3 sm:mb-4">
                        <Zap size={14} />
                        Doorstep Repair Service
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-heading font-bold mb-3 sm:mb-4 text-text-primary">
                        Expert Tech Repairs,<br />
                        <span className="text-trust">At Your Doorstep</span>
                    </h1>
                    <p className="text-text-muted max-w-xl mx-auto mb-4 sm:mb-6 text-sm sm:text-lg">
                        Certified technicians for laptops, desktops, printers, and more. Book in 2 minutes.
                    </p>
                    {/* Trust Strip */}
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-2">
                        {TRUST_POINTS.map(({ icon: Icon, label }) => (
                            <span key={label} className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                                <Icon size={14} className="text-trust" />
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 space-y-16">
                {/* ── Service Cards ──────────────────────────────────── */}
                {pageLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-surface border border-border-default rounded-xl p-6 animate-pulse">
                                <div className="w-12 h-12 bg-surface-hover rounded-lg mb-4" />
                                <div className="h-5 bg-surface-hover rounded w-2/3 mb-2" />
                                <div className="h-4 bg-surface-hover rounded w-full mb-1" />
                                <div className="h-4 bg-surface-hover rounded w-3/4 mb-6" />
                                <div className="h-10 bg-surface-hover rounded" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-text-primary mb-2">Our Services</h2>
                            <p className="text-text-muted">Pick a service and book your slot in seconds.</p>
                        </div>
                        {filteredServices.length === 0 ? (
                            <div className="bg-surface border border-dashed border-border-default rounded-xl p-10 text-center">
                                <Wrench size={40} className="mx-auto text-text-muted mb-3" />
                                <h3 className="text-lg font-bold text-text-primary">
                                    {searchQuery ? 'No matching services found' : 'No services available right now'}
                                </h3>
                                <p className="text-sm text-text-muted mt-2">
                                    {searchQuery ? 'Try a different search term.' : 'Please check back shortly.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredServices.map(service => (
                                    <ServiceCard key={service.id} service={service} onBook={openBooking} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── How It Works ────────────────────────────────────── */}
                <div>
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-text-primary mb-2">How It Works</h2>
                        <p className="text-text-muted">Simple, transparent, and hassle-free.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                        {/* Connector line */}
                        <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-trust/20 via-trust/50 to-trust/20" />
                        {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
                            <div key={step} className="relative flex flex-col items-center text-center group">
                                <div className="w-16 h-16 rounded-2xl bg-trust text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform duration-200 relative z-10">
                                    <Icon size={28} />
                                </div>
                                <span className="text-xs font-mono font-bold text-trust/60 mb-1">STEP {step}</span>
                                <h3 className="font-bold text-text-primary mb-2">{title}</h3>
                                <p className="text-text-muted text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Trust Banner ─────────────────────────────────────── */}
                <div className="bg-gradient-to-r from-trust/10 via-trust/5 to-trust/10 border border-trust/20 rounded-2xl p-8 text-center">
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        {TRUST_POINTS.map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-2 bg-surface border border-border-default px-4 py-2 rounded-full text-sm font-semibold text-text-secondary shadow-sm">
                                <Icon size={16} className="text-trust" />
                                {label}
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-text-muted">
                        Every repair is covered by our 90-day service warranty. Not satisfied? We fix it free.
                    </p>
                </div>
            </div>

            {selectedService && (
                <BookingModal
                    isOpen={!!selectedService}
                    onClose={closeBooking}
                    selectedService={selectedService}
                    serviceTypes={services}
                />
            )}
        </div>
    );
};

export default Services;
