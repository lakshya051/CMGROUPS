import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Wrench, GraduationCap, Building2 } from 'lucide-react';

const OFFERINGS = [
    {
        icon: ShoppingBag,
        title: 'Shop Electronics',
        desc: 'Laptops, desktops, printers & accessories with local warranty',
        path: '/products',
        color: 'bg-primary/10 text-primary',
        border: 'hover:border-primary/40',
    },
    {
        icon: Wrench,
        title: 'Book Repairs',
        desc: 'Doorstep laptop, desktop, printer & mobile repair in Etah',
        path: '/services',
        color: 'bg-trust/10 text-trust',
        border: 'hover:border-trust/40',
    },
    {
        icon: GraduationCap,
        title: 'Learn Courses',
        desc: 'Tally, computer basics, web development — with certificate',
        path: '/courses',
        color: 'bg-secondary/10 text-secondary',
        border: 'hover:border-secondary/40',
    },
    {
        icon: Building2,
        title: 'Business Solutions',
        desc: 'Tally ERP setup & CCTV installation for shops and offices',
        path: '/tally-erp',
        color: 'bg-accent/10 text-accent',
        border: 'hover:border-accent/40',
    },
];

const WhatWeOffer = () => (
    <section className="py-xl sm:py-2xl bg-page-bg">
        <div className="container mx-auto px-4">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary mb-6 sm:mb-8 text-center">
                Everything You Need, One Place
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {OFFERINGS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.title}
                            to={item.path}
                            className={`group flex flex-col items-center text-center gap-3 p-5 sm:p-6 rounded-xl bg-surface border border-border-default ${item.border} hover:shadow-card-hover transition-all duration-smooth`}
                        >
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-smooth`}>
                                <Icon size={28} className="sm:w-8 sm:h-8" />
                            </div>
                            <h3 className="font-bold text-sm sm:text-base text-text-primary leading-tight">
                                {item.title}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-text-secondary leading-snug line-clamp-2">
                                {item.desc}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </div>
    </section>
);

export default WhatWeOffer;
