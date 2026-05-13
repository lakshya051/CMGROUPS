import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { categoriesAPI, productsAPI, bundlesAPI } from '../../lib/api';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import ProductCard from '../../components/shop/ProductCard';
import BundleCard from '../../components/shop/BundleCard';
import { ArrowLeft, Layers } from 'lucide-react';

export default function CategoryPage() {
    const { slug } = useParams();
    const { bundlesEnabled } = useFeatureFlags();
    const [category, setCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allBundles, setAllBundles] = useState([]);

    useSEO({
        title: category ? `${category.name} — Shoptify` : 'Category — Shoptify',
        description: category?.description || `Shop ${category?.name || ''} products at Shoptify.`,
    });

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        categoriesAPI.getBySlug(slug)
            .then(cat => {
                if (cancelled) return;
                setCategory(cat);
                return productsAPI.getAll({ category: cat.name, limit: 40 });
            })
            .then(res => { if (!cancelled && res) setProducts(res.data || []); })
            .catch(() => { if (!cancelled) setError('Category not found'); })
            .finally(() => { if (!cancelled) setLoading(false); });

        if (bundlesEnabled) {
            bundlesAPI.getAll()
                .then(b => { if (!cancelled) setAllBundles(b || []); })
                .catch(() => { if (!cancelled) setAllBundles([]); });
        } else {
            setAllBundles([]);
        }

        return () => { cancelled = true; };
    }, [slug, bundlesEnabled]);

    const categoryBundles = useMemo(() => {
        if (!category || !allBundles.length) return [];
        return allBundles.filter(b =>
            b.items?.some(bi =>
                bi.itemType === 'product' && bi.product?.category === category.name
            )
        ).slice(0, 4);
    }, [category, allBundles]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="h-40 bg-surface rounded-xl animate-pulse mb-8" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-64 bg-surface rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error || !category) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <p className="text-text-muted mb-4">{error || 'Category not found'}</p>
                <Link to="/products" className="text-primary font-semibold underline">Browse All Products</Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
            <Link to="/products" className="inline-flex items-center gap-2 text-text-muted hover:text-primary mb-6 transition-colors text-sm">
                <ArrowLeft size={16} /> All Products
            </Link>

            {/* Category Hero */}
            <div className="bg-surface rounded-xl border border-border-default p-6 sm:p-8 mb-8 relative overflow-hidden">
                {category.image && (
                    <img
                        src={category.image}
                        alt={category.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-10"
                    />
                )}
                <div className="relative z-10">
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-2">{category.name}</h1>
                    {category.description && (
                        <p className="text-text-secondary max-w-2xl">{category.description}</p>
                    )}
                    <p className="text-sm text-text-muted mt-2">{products.length} product{products.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Category Bundles — gated behind admin toggle */}
            {bundlesEnabled && categoryBundles.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                            <Layers size={16} className="text-trust" />
                            Bundles in {category.name}
                        </h2>
                        <Link to="/bundles" className="text-xs text-trust font-semibold hover:underline">
                            View All Bundles
                        </Link>
                    </div>
                    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide -mx-1 px-1">
                        {categoryBundles.map(bundle => (
                            <div key={bundle.id} className="snap-start flex-shrink-0">
                                <BundleCard bundle={bundle} compact />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Products Grid */}
            {products.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-text-muted">No products in this category yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
}
