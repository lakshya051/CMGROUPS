import React from 'react';
import { Zap, Wrench, GraduationCap, Star } from 'lucide-react';

const TRUST_ITEMS = [
    { icon: Zap, label: '1-Day Delivery', desc: 'Fast & free above ₹499' },
    { icon: Wrench, label: 'Expert Technicians', desc: 'Certified repairs in Etah' },
    { icon: GraduationCap, label: 'Certified Courses', desc: 'Learn with certificate' },
    { icon: Star, label: '500+ Customers', desc: 'Trusted across Etah' },
];

const TrustStrip = () => (
    <section className="bg-surface border-y border-border-default py-4 sm:py-6">
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {TRUST_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="flex items-center gap-3 justify-center md:justify-start">
                            <div className="w-10 h-10 rounded-full bg-trust/10 flex items-center justify-center flex-shrink-0">
                                <Icon size={20} className="text-trust" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-text-primary leading-tight">{item.label}</p>
                                <p className="text-xs text-text-secondary leading-tight">{item.desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </section>
);

export default TrustStrip;
