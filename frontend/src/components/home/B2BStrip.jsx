import React from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Camera, Building2 } from 'lucide-react';

const B2BStrip = () => (
    <section className="bg-text-primary py-xl sm:py-2xl">
        <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Building2 size={20} className="text-buy-primary" />
                        <span className="text-xs font-bold text-buy-primary uppercase tracking-wider">For Business</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
                        Are you a Business?
                    </h2>
                    <p className="text-sm sm:text-base text-gray-400 max-w-lg">
                        Get Tally Prime setup and CCTV installation for your office. Local support in Etah with same-day service.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/tally-erp"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white text-white font-bold text-sm rounded-lg hover:bg-white hover:text-text-primary transition-colors duration-base"
                    >
                        <Calculator size={18} />
                        Get Tally Quote
                    </Link>
                    <Link
                        to="/cctv"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white text-white font-bold text-sm rounded-lg hover:bg-white hover:text-text-primary transition-colors duration-base"
                    >
                        <Camera size={18} />
                        Get CCTV Quote
                    </Link>
                </div>
            </div>
        </div>
    </section>
);

export default B2BStrip;
