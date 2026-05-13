import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { X, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import { productsAPI } from '../../lib/api';
import { getProductImageUrl, handleImageError } from '../../utils/image';
import { MAX_COMPARE_ITEMS } from '../../constants';

const CompareWidget = () => {
    const { compareList, removeFromCompare, clearCompare } = useShop();
    const [products, setProducts] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (compareList.length === 0) {
            setProducts([]);
            return;
        }
        let cancelled = false;
        Promise.all(compareList.map(id => productsAPI.getById(id).catch(() => null)))
            .then(results => {
                if (!cancelled) setProducts(results.filter(Boolean));
            });
        return () => { cancelled = true; };
    }, [compareList]);

    if (compareList.length === 0) return null;

    return (
        <div
            className="fixed right-4 z-40 animate-in slide-in-from-bottom-5"
            style={{ bottom: 'calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
            <div className="glass-panel p-4 shadow-sm border border-border-default w-80 max-w-[calc(100vw-2rem)] bg-surface/95 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-default">
                    <h3 className="font-bold text-sm">Compare Products ({compareList.length}/{MAX_COMPARE_ITEMS})</h3>
                    <button onClick={clearCompare} className="min-h-11 px-3 text-xs text-text-muted hover:text-error underline">
                        Clear all
                    </button>
                </div>
                <div className="space-y-2 mb-4">
                    {products.map(p => (
                        <div key={p.id} className="flex items-center gap-2 bg-page-bg/80 p-2 rounded border border-border-default">
                            <img
                                src={getProductImageUrl(p)}
                                alt={p.title}
                                loading="lazy"
                                width={32}
                                height={32}
                                onError={handleImageError}
                                className="w-8 h-8 object-contain bg-surface rounded flex-shrink-0"
                            />
                            <span className="text-xs font-medium truncate flex-1">{p.title}</span>
                            <button onClick={() => removeFromCompare(p.id)} className="min-touch text-text-muted hover:text-error rounded-full" aria-label={`Remove ${p.title}`}>
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                    {products.length < 2 && (
                        <p className="text-xs text-text-muted text-center py-2 border border-dashed border-border-default rounded bg-page-bg/50">
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
