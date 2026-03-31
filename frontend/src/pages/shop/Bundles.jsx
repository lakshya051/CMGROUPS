import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { bundlesAPI } from '../../lib/api';
import { useSEO } from '../../hooks/useSEO';
import BundleCard from '../../components/shop/BundleCard';
import { EmptyState } from '../../components/ui/index';
import {
    Layers, Package, Wrench, GraduationCap, Gift,
    SlidersHorizontal, SearchX,
} from 'lucide-react';

const FILTER_CHIPS = [
    { key: 'all', label: 'All Bundles', icon: Package },
    { key: 'service', label: 'With Services', icon: Wrench },
    { key: 'course', label: 'With Courses', icon: GraduationCap },
    { key: 'gift', label: 'Gift Ready', icon: Gift },
];

const SORT_OPTIONS = [
    { value: 'savings', label: 'Most Savings' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest' },
];

const Bundles = () => {
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [sortBy, setSortBy] = useState('savings');

    useSEO({
        title: 'Bundle Deals — Save More When You Buy Together',
        description: 'Explore curated bundles of products, services, and courses. Save big when you buy together.',
    });

    useEffect(() => {
        bundlesAPI.getAll()
            .then(setBundles)
            .catch(() => setBundles([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let result = [...bundles];

        if (activeFilter === 'service') {
            result = result.filter(b => b.items?.some(bi => bi.itemType === 'service'));
        } else if (activeFilter === 'course') {
            result = result.filter(b => b.items?.some(bi => bi.itemType === 'course'));
        } else if (activeFilter === 'gift') {
            result = result.filter(b => b.isGiftable);
        }

        if (sortBy === 'savings') {
            result.sort((a, b) => (b.savingsPercent || 0) - (a.savingsPercent || 0));
        } else if (sortBy === 'price-low') {
            result.sort((a, b) => a.bundlePrice - b.bundlePrice);
        } else if (sortBy === 'price-high') {
            result.sort((a, b) => b.bundlePrice - a.bundlePrice);
        } else if (sortBy === 'newest') {
            result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        return result;
    }, [bundles, activeFilter, sortBy]);

    return (
        <div className="container mx-auto px-4 py-6 pb-8">
            {/* Hero */}
            <div className="bg-gradient-to-br from-trust/10 via-primary/5 to-success/10 rounded-2xl p-6 sm:p-10 mb-8 border border-trust/20 relative overflow-hidden">
                <div className="absolute top-4 right-4 opacity-10">
                    <Layers size={120} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Layers size={20} className="text-trust" />
                        <span className="text-xs font-bold uppercase tracking-wider text-trust">Bundle Deals</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-2">
                        Save More When You Buy Together
                    </h1>
                    <p className="text-text-secondary text-sm sm:text-base max-w-xl">
                        Handpicked combinations of products, services, and courses at special bundle prices. 
                        Get everything you need in one go and save big.
                    </p>
                    {!loading && bundles.length > 0 && (
                        <p className="text-sm text-text-muted mt-3">
                            {bundles.length} bundle{bundles.length !== 1 ? 's' : ''} available
                        </p>
                    )}
                </div>
            </div>

            {/* Filters + Sort */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex flex-wrap gap-2">
                    {FILTER_CHIPS.map(chip => {
                        const Icon = chip.icon;
                        const isActive = activeFilter === chip.key;
                        return (
                            <button
                                key={chip.key}
                                onClick={() => setActiveFilter(chip.key)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                                    isActive
                                        ? 'bg-trust/10 border-trust/30 text-trust'
                                        : 'bg-surface border-border-default text-text-secondary hover:border-trust/20 hover:text-text-primary'
                                }`}
                            >
                                <Icon size={14} />
                                {chip.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-text-muted" />
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="bg-surface border border-border-default text-text-primary px-3 py-2 rounded-lg text-xs font-medium focus:outline-none focus:border-trust cursor-pointer transition-colors"
                    >
                        {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-[380px] bg-surface rounded-xl border border-border-default animate-pulse" />
                    ))}
                </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <EmptyState
                    icon={SearchX}
                    title="No bundles found"
                    subtitle={activeFilter !== 'all' ? 'Try a different filter to find bundles.' : 'No bundle deals are available right now. Check back soon!'}
                    ctaLabel={activeFilter !== 'all' ? 'Show All' : undefined}
                    onCta={activeFilter !== 'all' ? () => setActiveFilter('all') : undefined}
                />
            )}

            {/* Grid */}
            {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(bundle => (
                        <div key={bundle.id} className="flex justify-center">
                            <BundleCard bundle={bundle} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Bundles;
