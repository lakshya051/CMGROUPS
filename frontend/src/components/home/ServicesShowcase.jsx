import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Monitor, Cpu, Printer, HardDrive, Settings, Wifi, Smartphone, PcCase, Zap } from 'lucide-react';
import { serviceTypesAPI } from '../../lib/api';

const ICON_MAP = {
    Wrench, Monitor, Cpu, Printer, HardDrive, Settings, Wifi, Smartphone, PcCase, Zap,
};

const FALLBACK_SERVICES = [
    { id: 'repair', title: 'Laptop Repair', icon: 'Wrench', price: '₹499' },
    { id: 'desktop', title: 'Desktop Repair', icon: 'PcCase', price: '₹499' },
    { id: 'printer', title: 'Printer Service', icon: 'Printer', price: '₹299' },
    { id: 'mobile', title: 'Mobile Repair', icon: 'Smartphone', price: '₹299' },
];

const ServicesShowcase = ({ initialServiceTypes }) => {
    const hasInitial = Array.isArray(initialServiceTypes);
    const [services, setServices] = useState(() => {
        if (!hasInitial) return [];
        return initialServiceTypes.length > 0 ? initialServiceTypes.slice(0, 6) : FALLBACK_SERVICES;
    });
    const [loading, setLoading] = useState(!hasInitial);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (hasInitial) return;
        serviceTypesAPI.getAll()
            .then(data => {
                if (data && data.length > 0) {
                    setServices(data.slice(0, 6));
                } else {
                    setServices(FALLBACK_SERVICES);
                }
            })
            .catch(() => setServices(FALLBACK_SERVICES))
            .finally(() => setLoading(false));
    }, [hasInitial]);

    const scroll = (dir) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
    };

    if (!loading && services.length === 0) return null;

    return (
        <section className="py-xl sm:py-2xl bg-surface">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">
                        Our Services
                    </h2>
                    <Link
                        to="/services"
                        className="text-sm font-semibold text-trust hover:underline flex-shrink-0"
                    >
                        Book Now →
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-40 bg-page-bg rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Desktop: grid */}
                        <div className="hidden md:grid md:grid-cols-4 gap-4">
                            {services.map((svc) => {
                                const Icon = ICON_MAP[svc.icon] || Wrench;
                                return (
                                    <Link
                                        key={svc.id}
                                        to="/services"
                                        className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-trust/5 border border-border-default hover:border-trust/40 hover:shadow-card-hover transition-all duration-smooth"
                                    >
                                        <div className="w-14 h-14 rounded-xl bg-trust/10 text-trust flex items-center justify-center group-hover:scale-110 transition-transform duration-smooth">
                                            <Icon size={28} />
                                        </div>
                                        <h3 className="font-bold text-sm text-text-primary text-center group-hover:text-trust transition-colors">
                                            {svc.title}
                                        </h3>
                                        <p className="text-xs text-text-secondary text-center">
                                            Starting {typeof svc.price === 'number' ? `₹${svc.price}` : svc.price}
                                        </p>
                                        <span className="mt-auto text-xs font-bold text-white bg-trust px-4 py-1.5 rounded-lg group-hover:bg-trust/90 transition-colors">
                                            Book Now
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Mobile: horizontal scroll */}
                        <div className="md:hidden relative group/row">
                            <div
                                ref={scrollRef}
                                className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
                            >
                                {services.map((svc) => {
                                    const Icon = ICON_MAP[svc.icon] || Wrench;
                                    return (
                                        <Link
                                            key={svc.id}
                                            to="/services"
                                            className="flex-shrink-0 w-[160px] flex flex-col items-center gap-2 p-4 rounded-xl bg-trust/5 border border-border-default snap-start"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-trust/10 text-trust flex items-center justify-center">
                                                <Icon size={24} />
                                            </div>
                                            <h3 className="font-bold text-sm text-text-primary text-center">
                                                {svc.title}
                                            </h3>
                                            <p className="text-xs text-text-secondary">
                                                Starting {typeof svc.price === 'number' ? `₹${svc.price}` : svc.price}
                                            </p>
                                            <span className="mt-auto text-xs font-bold text-white bg-trust px-3 py-1 rounded-lg">
                                                Book
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default ServicesShowcase;
