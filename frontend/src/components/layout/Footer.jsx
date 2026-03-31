import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const SOCIAL_LINKS = [
    { Icon: Facebook, url: 'https://facebook.com/cmgroups', label: 'Facebook' },
    { Icon: Twitter, url: 'https://twitter.com/cmgroups', label: 'Twitter' },
    { Icon: Instagram, url: 'https://instagram.com/cmgroups', label: 'Instagram' },
    { Icon: Youtube, url: 'https://youtube.com/@cmgroups', label: 'YouTube' },
];

const Footer = () => {
    return (
        <footer className="bg-surface border-t border-border-default mt-auto">
            {/* Mobile condensed footer */}
            <div className="md:hidden px-4 py-6 space-y-4">
                <div className="flex justify-center gap-3">
                    {SOCIAL_LINKS.map(({ Icon, url, label }) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-9 h-9 rounded-lg bg-page-bg border border-border-default hover:bg-primary/20 hover:text-primary hover:border-transparent flex items-center justify-center text-text-muted transition-colors">
                            <Icon size={16} />
                        </a>
                    ))}
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-text-muted">
                    <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
                    <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms</Link>
                    <Link to="/refund-policy" className="hover:text-primary transition-colors">Refunds</Link>
                    <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
                    <Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link>
                </div>
                <p className="text-center text-[11px] text-text-muted">&copy; 2026 Shoptify by CMGroups</p>
            </div>

            {/* Desktop full footer */}
            <div className="hidden md:block">
                <div className="container mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Brand */}
                        <div className="space-y-4">
                            <h3 className="text-2xl font-heading font-bold">
                                CM<span className="text-primary">GROUPS</span>
                            </h3>
                            <p className="text-text-muted text-sm leading-relaxed">
                                A conglomerate of excellence in Technology, Services, and Education. Powering your digital future.
                            </p>
                            <div className="flex gap-3">
                                {SOCIAL_LINKS.map(({ Icon, url, label }) => (
                                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-9 h-9 rounded-lg bg-page-bg border border-border-default hover:bg-primary/20 hover:text-primary hover:border-transparent flex items-center justify-center text-text-muted transition-colors">
                                        <Icon size={16} />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Divisions */}
                        <div>
                            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-text-muted">Our Companies</h4>
                            <ul className="space-y-2 text-sm">
                                {[
                                    { name: 'Manav Infocom', desc: 'Electronics & Services' },
                                    { name: 'Advance Computer Empire', desc: 'IT Solutions & CCTV' },
                                    { name: 'AICT Computer Education', desc: 'Training since 1998' },
                                ].map(item => (
                                    <li key={item.name}>
                                        <Link to="/our-companies" className="text-text-muted hover:text-primary transition-colors">
                                            <span className="block">{item.name}</span>
                                            <span className="text-xs text-text-muted/60">{item.desc}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-text-muted">Support</h4>
                            <ul className="space-y-2 text-sm">
                                {[
                                    { name: 'Help Center / FAQ', path: '/faq' },
                                    { name: 'Contact Us', path: '/contact' },
                                    { name: 'Bundle Deals', path: '/bundles' },
                                    { name: 'Repair Services', path: '/services' },
                                    { name: 'CCTV Security', path: '/cctv' },
                                    { name: 'Academy', path: '/courses' },
                                    { name: 'Track Order', path: '/dashboard/orders' },
                                    { name: 'My Account', path: '/dashboard' },
                                ].map(link => (
                                    <li key={link.path}>
                                        <Link to={link.path} className="text-text-muted hover:text-primary transition-colors">
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-text-muted">Contact</h4>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-start gap-2 text-text-muted">
                                    <MapPin size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                                    <div>
                                        <span className="block">Laxmi Plaza, Thandi Sadak, Near SBI Bank</span>
                                        <span className="block">Etah, UP — 207001</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-2 text-text-muted">
                                    <MapPin size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                                    <div>
                                        <span className="block">Kamla Nagar, GT Road</span>
                                        <span className="block">Etah, UP — 207001</span>
                                    </div>
                                </li>
                                <li className="flex items-center gap-2 text-text-muted">
                                    <Phone size={16} className="flex-shrink-0 text-primary" />
                                    <span>+91 81718 38388</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-border-default mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-muted">
                        <p>&copy; 2026 Shoptify by CMGroups. All rights reserved.</p>
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                            <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
                            <Link to="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
                            <Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
