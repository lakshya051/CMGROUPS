import React from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { Trash2, X, ShoppingCart, Star } from 'lucide-react';
import Button from '../../components/ui/Button';

const Compare = () => {
    const { compareList, removeFromCompare, getProduct, addToCart, clearCompare } = useShop();
    const products = compareList.map(id => getProduct(id)).filter(Boolean);

    if (products.length === 0) {
        return (
            <div className="container mx-auto px-4 py-20 text-center max-w-lg">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={32} className="text-text-muted" />
                </div>
                <h1 className="text-3xl font-heading font-bold mb-4">Compare List is Empty</h1>
                <p className="text-text-muted mb-8">Add up to 4 products to compare their specifications side by side.</p>
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
                    <h1 className="text-3xl font-heading font-bold mb-2">Product Comparison</h1>
                    <p className="text-text-muted">Compare features and specifications.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={clearCompare} className="text-error border-error/50 hover:bg-error/10">
                        Clear All
                    </Button>
                    <Link to="/products">
                        <Button variant="ghost">Add more products</Button>
                    </Link>
                </div>
            </div>

            <div className="overflow-x-auto pb-8">
                <table className="w-full min-w-[800px] border-collapse bg-transparent table-fixed">
                    <thead>
                        <tr>
                            <th className="w-48 p-4 text-left align-top bg-surface sticky left-0 z-10 border-b border-gray-200">
                                <span className="text-xl font-bold">Features</span>
                            </th>
                            {products.map(p => (
                                <th key={p.id} className="w-64 p-4 align-top border-l border-b border-gray-200 relative">
                                    <button
                                        onClick={() => removeFromCompare(p.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-error hover:text-error rounded-full transition-colors z-20"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div className="flex flex-col items-center">
                                        <div className="w-32 h-32 bg-white rounded-xl p-2 shadow-sm mb-4 border border-gray-100">
                                            <img src={p.image} alt={p.title} className="w-full h-full object-contain" />
                                        </div>
                                        <Link to={`/products/${p.id}`} className="text-sm font-bold text-center hover:text-primary transition-colors line-clamp-2 mb-2 h-10">
                                            {p.title}
                                        </Link>
                                        <div className="text-xl font-bold text-text-main mb-4">
                                            ₹{p.price.toLocaleString()}
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full gap-2"
                                            disabled={p.stock === 0}
                                            onClick={() => addToCart(p.id)}
                                        >
                                            <ShoppingCart size={16} />
                                            {p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                                        </Button>
                                    </div>
                                </th>
                            ))}
                            {/* Fill empty slots up to 4 */}
                            {[...Array(4 - products.length)].map((_, i) => (
                                <th key={`empty-${i}`} className="w-64 p-4 align-middle border-l border-b border-gray-200 bg-gray-50/50">
                                    <Link to="/products" className="flex flex-col items-center justify-center text-text-muted hover:text-primary transition-colors py-10">
                                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-2 font-bold text-xl">
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
                        <tr className="hover:bg-gray-50/50">
                            <td className="p-4 font-bold text-text-muted bg-surface sticky left-0 z-10 border-b border-gray-200">Brand</td>
                            {products.map(p => (
                                <td key={p.id} className="p-4 text-center border-l border-b border-gray-200 font-medium">{p.brand || '-'}</td>
                            ))}
                            {[...Array(4 - products.length)].map((_, i) => <td key={`empty-brand-${i}`} className="border-l border-b border-gray-200 bg-gray-50/50"></td>)}
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                            <td className="p-4 font-bold text-text-muted bg-surface sticky left-0 z-10 border-b border-gray-200">Category</td>
                            {products.map(p => (
                                <td key={p.id} className="p-4 text-center border-l border-b border-gray-200">{p.category}</td>
                            ))}
                            {[...Array(4 - products.length)].map((_, i) => <td key={`empty-category-${i}`} className="border-l border-b border-gray-200 bg-gray-50/50"></td>)}
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                            <td className="p-4 font-bold text-text-muted bg-surface sticky left-0 z-10 border-b border-gray-200">Condition</td>
                            {products.map(p => (
                                <td key={p.id} className="p-4 text-center border-l border-b border-gray-200">
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
                            {[...Array(4 - products.length)].map((_, i) => <td key={`empty-condition-${i}`} className="border-l border-b border-gray-200 bg-gray-50/50"></td>)}
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                            <td className="p-4 font-bold text-text-muted bg-surface sticky left-0 z-10 border-b border-gray-200">Rating</td>
                            {products.map(p => (
                                <td key={p.id} className="p-4 text-center border-l border-b border-gray-200">
                                    <div className="flex items-center justify-center gap-1 font-bold">
                                        {p.rating} <Star size={14} className="text-warning fill-warning" />
                                        <span className="text-xs text-text-muted font-normal">({p.reviews})</span>
                                    </div>
                                </td>
                            ))}
                            {[...Array(4 - products.length)].map((_, i) => <td key={`empty-rating-${i}`} className="border-l border-b border-gray-200 bg-gray-50/50"></td>)}
                        </tr>

                        {/* Specs section */}
                        <tr>
                            <td colSpan={5} className="bg-gray-100 p-3 font-bold text-sm tracking-widest uppercase text-text-muted border-b border-gray-200 text-center">
                                Technical Specifications
                            </td>
                        </tr>
                        {allSpecKeys.map(key => (
                            <tr key={key} className="hover:bg-gray-50/50">
                                <td className="p-4 font-bold text-text-muted bg-surface sticky left-0 z-10 border-b border-gray-200">{key}</td>
                                {products.map(p => (
                                    <td key={p.id} className="p-4 text-center border-l border-b border-gray-200">
                                        {p.specs && p.specs[key] ? (
                                            <span className="font-medium text-text-main">{p.specs[key]}</span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                ))}
                                {[...Array(4 - products.length)].map((_, i) => <td key={`empty-spec-${key}-${i}`} className="border-l border-b border-gray-200 bg-gray-50/50"></td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Compare;
