import React from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Cpu, GraduationCap, MapPin, ArrowRight } from 'lucide-react';

const BUSINESSES = [
    {
        name: 'Manav Infocom',
        desc: 'Laptops, TVs, printers, desktops & accessories — retail & wholesale. Plus expert repair services.',
        location: 'Thandi Sadak, Near SBI Bank',
        icon: Monitor,
        color: 'bg-trust/10 text-trust',
        border: 'hover:border-trust/40',
    },
    {
        name: 'Advance Computer Empire',
        desc: 'Laptops, PCs, CCTV, speakers & every computer accessory — retail & wholesale with service support.',
        location: 'Kamla Nagar, GT Road',
        icon: Cpu,
        color: 'bg-primary/10 text-primary',
        border: 'hover:border-primary/40',
    },
    {
        name: 'AICT Computer Education',
        desc: 'Professional computer training — DCA, ADCA, Tally, CCC & more. RGCSM Kota affiliated since 1998.',
        location: 'Kamla Nagar, GT Road',
        icon: GraduationCap,
        color: 'bg-secondary/10 text-secondary',
        border: 'hover:border-secondary/40',
    },
];

const OurBusinesses = () => (
    <section className="py-xl sm:py-2xl bg-surface border-t border-border-default">
        <div className="container mx-auto px-4">
            <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">
                    A Group of Trusted Businesses in Etah
                </h2>
                <p className="text-sm text-text-secondary mt-2 max-w-xl mx-auto">
                    CMGroups brings together three established businesses under one platform.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {BUSINESSES.map((biz) => {
                    const Icon = biz.icon;
                    return (
                        <div
                            key={biz.name}
                            className={`group flex flex-col gap-4 p-5 sm:p-6 rounded-xl bg-surface border border-border-default ${biz.border} hover:shadow-card-hover transition-all duration-smooth`}
                        >
                            <div className={`w-14 h-14 rounded-2xl ${biz.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-smooth`}>
                                <Icon size={28} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-base text-text-primary mb-1">{biz.name}</h3>
                                <p className="text-xs text-text-secondary leading-snug">{biz.desc}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-text-muted">
                                <MapPin size={12} className="flex-shrink-0" />
                                <span>{biz.location}, Etah</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-center mt-6">
                <Link
                    to="/our-companies"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-trust hover:underline"
                >
                    Learn more about our companies <ArrowRight size={16} />
                </Link>
            </div>
        </div>
    </section>
);

export default OurBusinesses;
