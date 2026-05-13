import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { Trash2, X, ShoppingCart, Star, Zap } from 'lucide-react';
import Button from '../../components/ui/Button';
import SectionLoader from '../../components/ui/SectionLoader';
import { productsAPI } from '../../lib/api';
import { getProductImageUrl, handleImageError } from '../../utils/image';
import { MAX_COMPARE_ITEMS } from '../../constants';

const Compare = () => {
    const { compareList, removeFromCompare, addToCart, clearCompare, initBuyNow } = useShop();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (compareList.length === 0) {
            setProducts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        Promise.all(compareList.map(id => productsAPI.getById(id).catch(() => null)))
            .then(results => setProducts(results.filter(Boolean)))
            .finally(() => setLoading(false));
    }, [compareList]);

    if (loading) return <div className="container mx-auto py-20"><SectionLoader message="Loading comparison..." /></div>;

    if (products.length === 0) {
        return (
            <div className="container mx-auto px-4 py-20 text-center max-w-lg">
                <div className="w-20 h-20 bg-surface border border-border-default rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={32} className="text-text-muted" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold mb-4 text-text-primary">Compare List is Empty</h1>
                <p className="text-text-secondary mb-8">Add up to {MAX_COMPARE_ITEMS} products to compare their specifications side by side.</p>
                <Link to="/products">
                    <Button size="lg">Browse Products</Button>
                </Link>
            </div>
        );
    }

    // Collect all unique spec keys
    const allSpecKeys = [...new Set(products.flatMap(p => Object.keys(p.specs || {})))].sort();

    return (
        <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-xl sm:text-3xl font-heading font-bold mb-1 sm:mb-2 text-text-primary">Product Comparison</h1>
                    <p className="text-text-secondary text-sm sm:text-base">Compare features and specs.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={clearCompare} className="text-error border-error/50 hover:bg-error/10">
                        Clear All
                    </Button>
                    <Link to="/products">
                        <Button variant="ghost" className="text-text-primary">Add more products</Button>
                    </Link>
                </div>
            </div>

            <div className="overflow-x-auto pb-8">
                <table className="w-full min-w-[800px] border-collapse bg-transparent table-fixed">
                    <thead>
                        <tr>
                            <th className="w-48 p-4 text-left align-top bg-surface sticky left-0 z-10 border-b border-border-default shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                <span className="text-xl font-bold text-text-primary">Features</span>
                            </th>
                            {products.map(p => (
                                <th key={p.id} className="w-64 p-4 align-top border-l border-b border-border-default relative">
                                    <button
                                        onClick={() => removeFromCompare(p.id)}
                                        className="absolute top-1 right-1 min-touch bg-page-bg hover:bg-error hover:text-white rounded-full transition-colors z-20 border border-border-default"
                                        aria-label={`Remove ${p.title}`}
                                    >
                                        <X size={16} />
                                    </button>
                                    <div className="flex flex-col items-center">
                                        <div className="w-32 h-32 bg-surface rounded-lg p-2 shadow-sm mb-4 border border-border-default">
                                            <img
                                                src={getProductImageUrl(p)}
                                                alt={p.title}
                                                loading="lazy"
                                                width={128}
                                                height={128}
                                                onError={handleImageError}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <Link to={`/products/${p.id}`} className="text-sm font-bold text-center text-text-primary hover:text-trust transition-colors line-clamp-2 mb-2 h-10">
                                            {p.title}
                                        </Link>
                                        <div className="text-xl font-bold text-text-primary mb-4">
                                            ₹{(p.displayPrice || p.price).toLocaleString()}
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full gap-2"
                                            disabled={(p.totalStock ?? p.stock) === 0 || (p.hasVariants && p.variants?.length > 1)}
                                            onClick={() => {
                                                if (p.hasVariants && p.variants?.length === 1) {
                                                    addToCart(p, 1, p.variants[0]);
                                                } else if (!p.hasVariants) {
                                                    addToCart(p);
                                                }
                                            }}
                                        >
                                            <ShoppingCart size={16} />
                                            {(p.totalStock ?? p.stock) === 0
                                                ? 'Out of Stock'
                                                : p.hasVariants && p.variants?.length > 1
                                                    ? 'View Options'
                                                    : 'Add to Cart'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full gap-2 mt-2 border-primary text-primary hover:bg-primary hover:text-white"
                                            disabled={(p.totalStock ?? p.stock) === 0 || (p.hasVariants && p.variants?.length > 1)}
                                            onClick={() => {
                                                const variant = p.hasVariants && p.variants?.length === 1 ? p.variants[0] : null;
                                                if (initBuyNow(p, 1, variant)) {
                                                    navigate('/checkout', { state: { buyNow: true } });
                                                }
                                            }}
                                        >
                                            <Zap size={16} />
                                            {(p.totalStock ?? p.stock) === 0
                                                ? 'Out of Stock'
                                                : p.hasVariants && p.variants?.length > 1
                                                    ? 'View Options'
                                                    : 'Buy Now'}
                                        </Button>
                                    </div>
                                </th>
                            ))}
                            {/* Fill empty slots up to MAX_COMPARE_ITEMS */}
                            {[...Array(Math.max(0, MAX_COMPARE_ITEMS - products.length))].map((_, i) => (
                                <th key={`empty-${i}`} className="w-64 p-4 align-middle border-l border-b border-border-default bg-page-bg">
                                    <Link to="/products" className="flex flex-col items-center justify-center text-text-muted hover:text-trust transition-colors py-10">
                                        <div className="w-12 h-12 rounded-full border bg-surface border-dashed border-border-default flex items-center justify-center mb-2 font-bold text-xl">
                                            +
                                        </div>
                                        <span className="text-sm font-medium">Add Product</span>
                                    </Link>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {/* Basic Info */}
                        <tr className="hover:bg-surface-hover">
                            <td className="p-4 font-bold text-text-muted bg-surface sticky left-0 z-10 border-b border-border-default shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">Brand</td>
                            {products.map(p => (
                                <td key={p.id} className="p-4 text-center border-l border-b border-border-default font-medium text-text-primary">{p.brand || '-'}</td>
                            ))}
                            {[...Array(Math.max(0, MAX_COMPARE_ITEMS - products.length))].map((_, i) => <td key={`empty-brand-${i}`} className="border-l border-b border-border-default bg-page-bg"></td>)}
                        </tr>
                        <tr className="hover:bg-surface-hover">
                            <td className="p-4 font-bold text-text-muted bg-surface sticky left-0 z-10 border-b border-border-default shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">Category</td>
                            {products.map(p => (
                                <td key={p.id} className="p-4 text-center border-l border-b border-border-default text-text-primary">{p.category}</td>
                            ))}
                            {[...Array(Math.max(0, MAX_COMPARE_ITEMS - products.length))].map((_, i) => <td key={`empty-category-${i}`} className="border-l border-b border-border-default bg-page-bg"></td>)}
                        </tr>
                        <tr className="hover:bg-surface-hover">
                            <td className="p-4 font-bold text-text-muted bg-surface sticky left-0 z-10 border-b border-border-default shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">Condition</td>
                            {products.map(p => (
                                <td key={p.id} className="p-4 text-center border-l border-b border-border-default">
                                    {p.isSecondHand ? (
                                        <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full text-xs uppercase tracking-wider">
                                            Pre-Owned ({p.condition})
                                        </span>
                                    ) : (
                                        <span className="text-success font-bold bg-success/20 px-2 py-0.5 rounded-full text-xs uppercase tracking-wider">
                                            Brand New
                                        </span>
                                    )}
                                </td>
                            ))}
                            {[...Array(Math.max(0, MAX_COMPARE_ITEMS - products.length))].map((_, i) => <td key={`empty-condition-${i}`} className="border-l border-b border-border-default bg-page-bg"></td>)}
                        </tr>
                        <tr className="hover:bg-surface-hover">
                            <td className="p-4 font-bold text-text-muted bg-surface sticky left-0 z-10 border-b border-border-default shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">Rating</td>
                            {products.map(p => (
                                <td key={p.id} className="p-4 text-center border-l border-b border-border-default">
                                    <div className="flex items-center justify-center gap-1 font-bold text-text-primary">
                                        {p.rating} <Star size={14} className="text-warning fill-warning" />
                                        <span className="text-xs text-text-secondary font-normal">({p.reviews})</span>
                                    </div>
                                </td>
                            ))}
                            {[...Array(Math.max(0, MAX_COMPARE_ITEMS - products.length))].map((_, i) => <td key={`empty-rating-${i}`} className="border-l border-b border-border-default bg-page-bg"></td>)}
                        </tr>

                        {/* Specs section */}
                        <tr>
                            <td colSpan={MAX_COMPARE_ITEMS + 1} className="bg-page-bg p-3 font-bold text-sm tracking-widest uppercase text-text-muted border-b border-border-default text-center">
                                Technical Specifications
                            </td>
                        </tr>
                        {allSpecKeys.map(key => (
                            <tr key={key} className="hover:bg-surface-hover">
                                <td className="p-4 font-bold text-text-muted bg-surface sticky left-0 z-10 border-b border-border-default shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">{key}</td>
                                {products.map(p => (
                                    <td key={p.id} className="p-4 text-center border-l border-b border-border-default">
                                        {p.specs && p.specs[key] ? (
                                            <span className="font-medium text-text-primary">{p.specs[key]}</span>
                                        ) : (
                                            <span className="text-text-muted">-</span>
                                        )}
                                    </td>
                                ))}
                                {[...Array(Math.max(0, MAX_COMPARE_ITEMS - products.length))].map((_, i) => <td key={`empty-spec-${key}-${i}`} className="border-l border-b border-border-default bg-page-bg"></td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Compare;
