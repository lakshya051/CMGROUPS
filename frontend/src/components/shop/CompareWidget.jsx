import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { X, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

const CompareWidget = () => {
    const { compareList, removeFromCompare, clearCompare, getProduct } = useShop();
    const navigate = useNavigate();

    if (compareList.length === 0) return null;

    const products = compareList.map(id => getProduct(id)).filter(Boolean);

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
            <div className="glass-panel p-4 shadow-2xl border border-gray-200 w-80 max-w-[calc(100vw-2rem)] bg-surface/95 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <h3 className="font-bold text-sm">Compare Products ({compareList.length}/4)</h3>
                    <button onClick={clearCompare} className="text-xs text-text-muted hover:text-error underline">
                        Clear all
                    </button>
                </div>
                <div className="space-y-2 mb-4">
                    {products.map(p => (
                        <div key={p.id} className="flex items-center gap-2 bg-gray-50/80 p-2 rounded border border-gray-100">
                            <img src={p.image} alt={p.title} className="w-8 h-8 object-contain bg-white rounded flex-shrink-0" />
                            <span className="text-xs font-medium truncate flex-1">{p.title}</span>
                            <button onClick={() => removeFromCompare(p.id)} className="text-text-muted hover:text-error p-1">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    {products.length < 2 && (
                        <p className="text-xs text-text-muted text-center py-2 border border-dashed border-gray-200 rounded bg-gray-50/50">
                            Add at least {2 - products.length} more to compare
                        </p>
                    )}
                </div>
                <Button
                    className="w-full gap-2 text-sm py-2"
                    disabled={products.length < 2}
                    onClick={() => navigate('/compare')}
                >
                    Compare Now <ArrowRight size={16} />
                </Button>
            </div>
        </div>
    );
};

export default CompareWidget;
