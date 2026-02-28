import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoriesAPI } from '../../lib/api';
import {
    Cpu, HardDrive, MemoryStick, Monitor, CircuitBoard,
    Keyboard, Headphones, Gamepad2, Package, Server
} from 'lucide-react';

// Map category names (case-insensitive) to lucide icons
const ICON_MAP = {
    gpu: Cpu,
    cpu: Cpu,
    processor: Cpu,
    motherboard: CircuitBoard,
    ram: MemoryStick,
    memory: MemoryStick,
    storage: HardDrive,
    ssd: HardDrive,
    monitor: Monitor,
    display: Monitor,
    keyboard: Keyboard,
    peripheral: Keyboard,
    peripherals: Keyboard,
    headphone: Headphones,
    headphones: Headphones,
    audio: Headphones,
    gaming: Gamepad2,
    server: Server,
    networking: Server,
};

const getIcon = (name) => {
    const key = name.toLowerCase().trim();
    return ICON_MAP[key] || Package;
};

const CategoryGrid = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        categoriesAPI.getAll()
            .then(setCategories)
            .catch(err => console.error('Failed to fetch categories:', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <section className="py-xl sm:py-2xl bg-page-bg">
                <div className="container mx-auto px-4">
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (categories.length === 0) return null;

    return (
        <section className="py-xl sm:py-2xl bg-page-bg">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-text-primary">
                        Shop by Category
                    </h2>
                    <Link
                        to="/products"
                        className="text-sm font-semibold text-trust hover:underline flex-shrink-0"
                    >
                        View All →
                    </Link>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {categories.map((cat) => {
                        const Icon = getIcon(cat.name);
                        return (
                            <Link
                                key={cat.id}
                                to={`/products?category=${encodeURIComponent(cat.name)}`}
                                className="group flex flex-col items-center justify-center gap-3 p-5 sm:p-6 rounded-xl bg-surface border border-border-default hover:border-trust/40 hover:shadow-card-hover transition-all duration-smooth"
                            >
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-trust/10 text-trust flex items-center justify-center group-hover:scale-110 transition-transform duration-smooth">
                                    <Icon size={26} />
                                </div>
                                <h3 className="font-bold text-sm sm:text-base text-text-primary text-center group-hover:text-trust transition-colors">
                                    {cat.name}
                                </h3>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default CategoryGrid;
