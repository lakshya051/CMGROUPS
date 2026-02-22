import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-surface border-t border-gray-100 mt-auto">
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
                            {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-primary/20 hover:text-primary flex items-center justify-center text-text-muted transition-colors">
                                    <Icon size={16} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Divisions */}
                    <div>
                        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-text-muted">Our Divisions</h4>
                        <ul className="space-y-2 text-sm">
                            {[
                                { name: 'Advance Computer Empire', path: '/products' },
                                { name: 'Manav Infocom', path: '/services' },
                                { name: 'AICT Computer Education', path: '/courses' },
                            ].map(link => (
                                <li key={link.path}>
                                    <Link to={link.path} className="text-text-muted hover:text-primary transition-colors">
                                        {link.name}
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
                                { name: 'Repair Services', path: '/services' },
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
                                <span>123 Tech Street, Nehru Place, New Delhi, 110019</span>
                            </li>
                            <li className="flex items-center gap-2 text-text-muted">
                                <Phone size={16} className="flex-shrink-0 text-primary" />
                                <span>+91 98765 43210</span>
                            </li>
                            <li className="flex items-center gap-2 text-text-muted">
                                <Mail size={16} className="flex-shrink-0 text-primary" />
                                <span>support@technova.in</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-muted">
                    <p>&copy; 2026 CMGROUPS. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-primary transition-colors">Refund Policy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
