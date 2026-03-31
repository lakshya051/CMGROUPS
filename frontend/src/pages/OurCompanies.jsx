import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import {
    MapPin, Phone, Monitor, Wrench, ShoppingBag, Tv, Printer,
    GraduationCap, Award, Building2, Cpu, Speaker, Camera,
    ArrowRight, Clock, Users, Shield, ChevronRight, Calculator
} from 'lucide-react';

const COMPANIES = [
    {
        name: 'Manav Infocom',
        tagline: 'Your Trusted Electronics Destination in Etah',
        address: 'Laxmi Plaza, Thandi Sadak, Near SBI Bank, Etah — 207001',
        description:
            'Manav Infocom is your one-stop electronics hub in Etah. We sell laptops, desktops, TVs, printers, and computer accessories from all major brands — both retail and wholesale. Our expert technicians also provide reliable repair and servicing for laptops, desktops, and peripherals.',
        highlights: [
            'All major laptop & desktop brands',
            'TVs, printers & accessories',
            'Retail & wholesale',
            'Expert repair & servicing',
        ],
        icons: [Monitor, Tv, Printer, Wrench],
        color: 'trust',
        links: [
            { label: 'Shop Products', path: '/products', icon: ShoppingBag },
            { label: 'Book a Service', path: '/services', icon: Wrench },
        ],
    },
    {
        name: 'Advance Computer Empire',
        tagline: 'Complete Computer & IT Solutions Hub',
        address: 'Kamla Nagar, GT Road, Etah — 207001',
        description:
            'Advance Computer Empire is a complete computer and IT solutions hub in Etah. We deal in laptops, PCs, printers, CCTV systems, speakers, and every computer accessory you need — retail and wholesale. We are also an authorized Tally Prime dealer and provide installation, setup, and service support for everything we sell.',
        highlights: [
            'Laptops, PCs & printers',
            'CCTV systems & installation',
            'Authorized Tally Prime dealer',
            'Retail & wholesale + services',
        ],
        icons: [Cpu, Camera, Calculator, Building2],
        color: 'primary',
        links: [
            { label: 'Shop Products', path: '/products', icon: ShoppingBag },
            { label: 'Tally Prime', path: '/tally-erp', icon: Calculator },
            { label: 'CCTV Solutions', path: '/cctv', icon: Camera },
        ],
    },
    {
        name: 'AICT Computer Education',
        tagline: 'Empowering Students in Etah Since 1998',
        address: 'Kamla Nagar, GT Road, Etah — 207001',
        description:
            'AICT (Advance Institute of Computer Technology) is a professional computer training centre in Etah, affiliated with RGCSM Kota (Rajeev Gandhi Computer Saksharta Mission). Established in 1998, we offer government-recognized courses including DCA, ADCA, Tally, CCC, Web Designing, and more — with proper certification. Over 25 years of empowering students with real computer skills.',
        highlights: [
            'Affiliated with RGCSM Kota',
            'DCA, ADCA, CCC, Tally & more',
            'Government-recognized certificates',
            'Serving Etah since 1998',
        ],
        icons: [GraduationCap, Award, Shield, Users],
        color: 'secondary',
        badges: ['Est. 1998', 'RGCSM Kota Affiliated'],
        links: [
            { label: 'Explore Courses', path: '/courses', icon: GraduationCap },
        ],
    },
];

const STATS = [
    { value: '25+', label: 'Years of Experience' },
    { value: '3', label: 'Business Divisions' },
    { value: '2', label: 'Locations in Etah' },
    { value: '1000+', label: 'Happy Customers' },
];

const colorMap = {
    trust: {
        bg: 'bg-trust/10',
        text: 'text-trust',
        border: 'border-trust/30',
        badge: 'bg-trust/10 text-trust',
        btn: 'bg-trust hover:bg-trust/90 text-white',
    },
    primary: {
        bg: 'bg-primary/10',
        text: 'text-primary',
        border: 'border-primary/30',
        badge: 'bg-primary/10 text-primary',
        btn: 'bg-primary hover:bg-primary/90 text-white',
    },
    secondary: {
        bg: 'bg-secondary/10',
        text: 'text-secondary',
        border: 'border-secondary/30',
        badge: 'bg-secondary/10 text-secondary',
        btn: 'bg-secondary hover:bg-secondary/90 text-white',
    },
};

const OurCompanies = () => {
    useSEO({
        title: 'Our Companies — Shoptify by CMGroups | Manav Infocom, Advance Computer Empire, AICT Computer Education',
        description: 'CMGroups unites three trusted businesses in Etah — Manav Infocom (electronics & services), Advance Computer Empire (IT solutions), and AICT Computer Education (training since 1998).',
    });

    return (
        <div className="min-h-screen bg-page-bg">
            {/* Hero */}
            <section className="relative overflow-hidden bg-page-bg py-xl sm:py-2xl px-lg">
                <div className="container mx-auto max-w-4xl text-center relative z-10">
                    <span className="inline-flex items-center gap-xs bg-trust/10 text-trust text-xs font-bold px-3 py-1 rounded tracking-wider uppercase mb-4">
                        <Building2 size={14} /> Our Group of Companies
                    </span>
                    <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4 text-text-primary">
                        The Group Behind{' '}
                        <span className="text-trust">Shoptify</span>
                    </h1>
                    <p className="text-sm md:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
                        Three trusted businesses in Etah, united under one platform — covering electronics sales, IT services, and professional computer education.
                    </p>
                </div>
            </section>

            {/* Stats Strip */}
            <section className="bg-surface border-y border-border-default">
                <div className="container mx-auto max-w-5xl px-4 py-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {STATS.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <p className="text-2xl md:text-3xl font-bold text-trust">{stat.value}</p>
                                <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Company Cards */}
            <section className="py-xl sm:py-2xl px-lg">
                <div className="container mx-auto max-w-5xl space-y-8">
                    {COMPANIES.map((company, idx) => {
                        const colors = colorMap[company.color];
                        return (
                            <div
                                key={company.name}
                                className={`bg-surface border border-border-default rounded-xl overflow-hidden hover:shadow-card-hover transition-shadow duration-smooth`}
                            >
                                {/* Header bar */}
                                <div className={`${colors.bg} border-b ${colors.border} px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`}>
                                    <div>
                                        <h2 className={`text-xl md:text-2xl font-bold ${colors.text}`}>
                                            {company.name}
                                        </h2>
                                        <p className="text-sm text-text-secondary mt-0.5">{company.tagline}</p>
                                    </div>
                                    {company.badges && (
                                        <div className="flex flex-wrap gap-2">
                                            {company.badges.map((badge) => (
                                                <span
                                                    key={badge}
                                                    className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${colors.badge}`}
                                                >
                                                    <Award size={12} /> {badge}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Description */}
                                    <p className="text-sm text-text-secondary leading-relaxed">
                                        {company.description}
                                    </p>

                                    {/* Highlights Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {company.highlights.map((highlight, i) => {
                                            const Icon = company.icons[i];
                                            return (
                                                <div
                                                    key={highlight}
                                                    className="flex items-start gap-2 p-3 rounded-lg bg-page-bg border border-border-default"
                                                >
                                                    <Icon size={16} className={`${colors.text} flex-shrink-0 mt-0.5`} />
                                                    <span className="text-xs font-medium text-text-primary leading-snug">
                                                        {highlight}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Address + CTA */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-border-default">
                                        <div className="flex items-start gap-2 text-sm text-text-secondary">
                                            <MapPin size={16} className={`${colors.text} flex-shrink-0 mt-0.5`} />
                                            <span>{company.address}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {company.links.map((link) => {
                                                const LinkIcon = link.icon;
                                                return (
                                                    <Link
                                                        key={link.path}
                                                        to={link.path}
                                                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors touch-manipulation ${colors.btn}`}
                                                    >
                                                        <LinkIcon size={16} />
                                                        {link.label}
                                                        <ArrowRight size={14} />
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Visit Us */}
            <section className="py-xl px-lg bg-surface border-t border-border-default">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-bold text-text-primary mb-2">Visit Us in Etah</h2>
                        <p className="text-sm text-text-secondary">Two convenient locations to serve you</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-page-bg border border-border-default rounded-xl p-6 space-y-3">
                            <h3 className="font-bold text-text-primary">Manav Infocom</h3>
                            <div className="flex items-start gap-2 text-sm text-text-secondary">
                                <MapPin size={16} className="text-trust flex-shrink-0 mt-0.5" />
                                <span>Laxmi Plaza, Thandi Sadak, Near SBI Bank, Etah — 207001</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Clock size={16} className="text-trust flex-shrink-0" />
                                <span>Mon — Sat, 10:00 AM — 8:00 PM</span>
                            </div>
                        </div>
                        <div className="bg-page-bg border border-border-default rounded-xl p-6 space-y-3">
                            <h3 className="font-bold text-text-primary">Advance Computer Empire & AICT Education</h3>
                            <div className="flex items-start gap-2 text-sm text-text-secondary">
                                <MapPin size={16} className="text-primary flex-shrink-0 mt-0.5" />
                                <span>Kamla Nagar, GT Road, Etah — 207001</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Clock size={16} className="text-primary flex-shrink-0" />
                                <span>Mon — Sat, 10:00 AM — 8:00 PM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-trust py-xl px-lg">
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Ready to explore what Shoptify has to offer?
                    </h2>
                    <p className="text-sm text-white/90 max-w-2xl mx-auto mb-6">
                        Whether you need electronics, IT services, or professional computer training — we have got you covered.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            to="/products"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-trust rounded-lg font-bold hover:bg-white/90 transition-colors"
                        >
                            <ShoppingBag size={18} /> Browse Products
                        </Link>
                        <Link
                            to="/courses"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white text-white rounded-lg font-bold hover:bg-white/10 transition-colors"
                        >
                            <GraduationCap size={18} /> Explore Courses
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default OurCompanies;
