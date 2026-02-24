import React, { useEffect, useState } from 'react';
import Button from '../components/ui/Button';
import { ArrowRight, Cpu, ShieldCheck, Zap, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productsAPI, categoriesAPI } from '../lib/api';

const Home = () => {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        productsAPI.getAll({ limit: 4 })
            .then(res => setFeaturedProducts(res.data))
            .catch(err => console.error('Failed to fetch products:', err));

        categoriesAPI.getAll()
            .then(data => setCategories(data))
            .catch(err => console.error('Failed to fetch categories:', err));
    }, []);

    return (
        <div>
            {/* Hero Section */}
            <section className="relative min-h-[85vh] flex items-center pt-20 pb-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

                <div className="container mx-auto px-4 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    <div className="space-y-5 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            New RTX 50 Series Stock Available
                        </div>

                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight">
                            Welcome to <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">CMGROUPS</span>
                        </h1>

                        <p className="text-base sm:text-lg text-text-muted max-w-xl mx-auto lg:mx-0">
                            A conglomerate of excellence in Technology, Services, and Education. Powering your digital future through our specialized divisions.
                        </p>

                        <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                            <a href="#divisions">
                                <Button size="lg" className="gap-2">
                                    Explore Divisions <ArrowRight size={20} />
                                </Button>
                            </a>
                        </div>

                        <div className="pt-4 flex items-center gap-6 text-text-muted justify-center lg:justify-start flex-wrap">
                            <div>
                                <p className="text-2xl font-bold text-text-main">3</p>
                                <p className="text-sm">Specialized Units</p>
                            </div>
                            <div className="w-px h-10 bg-gray-100" />
                            <div>
                                <p className="text-2xl font-bold text-text-main">15+</p>
                                <p className="text-sm">Years Experience</p>
                            </div>
                            <div className="w-px h-10 bg-gray-100" />
                            <div>
                                <p className="text-2xl font-bold text-text-main">10k+</p>
                                <p className="text-sm">Happy Clients</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative hidden lg:block">
                        <div className="relative z-10 animate-float">
                            <img
                                src="https://assets.nvidia.partners/images/png/RTX-4090-FE-3QTR-Back-Left.png"
                                alt="Gaming GPU"
                                loading="eager"
                                decoding="async"
                                fetchpriority="high"
                                className="w-full max-w-lg mx-auto drop-shadow-[0_0_50px_rgba(233,30,99,0.2)]"
                            />
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-gray-100 rounded-full animate-spin-slow" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border border-gray-200 rounded-full animate-spin-reverse-slow" />
                    </div>
                </div>
            </section>

            {/* Business Divisions Section */}
            <section id="divisions" className="py-24 bg-surface/50">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold mb-4">Our Business Divisions</h2>
                        <p className="text-text-muted">Three pillars of excellence working together to provide comprehensive technology solutions.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* 1. Advance Computer Empire */}
                        <div className="p-8 rounded-2xl bg-white border border-gray-100 hover:border-primary/50 hover:shadow-card-hover transition-all group">
                            <div className="w-14 h-14 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Cpu size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">ADVANCE COMPUTER EMPIRE</h3>
                            <p className="text-text-muted mb-6">Your premium destination for high-performance hardware, custom PC builds, and enterprise networking solutions.</p>
                            <Link to="/products">
                                <Button variant="outline" className="w-full group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500">Visit Store</Button>
                            </Link>
                        </div>

                        {/* 2. Manav Infocom */}
                        <div className="p-8 rounded-2xl bg-white border border-gray-100 hover:border-primary/50 hover:shadow-card-hover transition-all group">
                            <div className="w-14 h-14 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">MANAV INFOCOM</h3>
                            <p className="text-text-muted mb-6">Expert repair services, IT consultancy, and infrastructure management for businesses and individuals.</p>
                            <Link to="/services">
                                <Button variant="outline" className="w-full group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500">Book Service</Button>
                            </Link>
                        </div>

                        {/* 3. AICT Computer Education */}
                        <div className="p-8 rounded-2xl bg-white border border-gray-100 hover:border-primary/50 hover:shadow-card-hover transition-all group">
                            <div className="w-14 h-14 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Zap size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">AICT COMPUTER EDUCATION</h3>
                            <p className="text-text-muted mb-6">Empowering the next generation with professional computer courses, coding bootcamps, and skill development.</p>
                            <Link to="/courses">
                                <Button variant="outline" className="w-full group-hover:bg-pink-500 group-hover:text-white group-hover:border-pink-500">Explore Courses</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Products Section */}
            {
                featuredProducts.length > 0 && (
                    <section className="py-24">
                        <div className="container mx-auto px-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-10">
                                <div>
                                    <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-1">Featured Products</h2>
                                    <p className="text-text-muted">Top picks from our catalog</p>
                                </div>
                                <Link to="/products" className="flex-shrink-0">
                                    <Button variant="outline" className="gap-2">
                                        View All <ArrowRight size={16} />
                                    </Button>
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {featuredProducts.map(product => (
                                    <Link
                                        key={product.id}
                                        to={`/products/${product.id}`}
                                        className="group glass-panel overflow-hidden hover:border-primary/30 transition-all duration-300"
                                    >
                                        <div className="aspect-square bg-gray-50 p-6 flex items-center justify-center">
                                            <img
                                                src={product.image}
                                                alt={product.title}
                                                loading="lazy"
                                                decoding="async"
                                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                        <div className="p-5">
                                            <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">{product.category}</p>
                                            <h3 className="font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors">{product.title}</h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xl font-bold">₹{product.price.toLocaleString()}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${product.stock > 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                                    }`}>
                                                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )
            }

            {/* Categories Section */}
            <section className="py-24 bg-surface/50">
                <div className="container mx-auto px-4">
                    <h2 className="text-4xl font-heading font-bold mb-12 text-center">Shop by Category</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {categories.map((cat) => (
                            <Link
                                key={cat.id}
                                to={`/products?category=${cat.name}`}
                                className="p-6 rounded-xl bg-white border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group"
                            >
                                {cat.image ? (
                                    <div className="w-16 h-16 mx-auto mb-3 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 group-hover:scale-110 transition-transform">
                                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">📦</span>
                                )}
                                <h3 className="font-bold group-hover:text-primary transition-colors">{cat.name}</h3>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div >
    );
};

export default Home;
