import { useState, useEffect, useCallback } from 'react';
import { RECENTLY_VIEWED_KEY } from '../constants';

const MAX_RECENTLY_VIEWED = 10;

export function useRecentlyViewed(excludeId = null) {
    const [items, setItems] = useState([]);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
            const filtered = excludeId != null
                ? stored.filter(p => String(p.id) !== String(excludeId))
                : stored;
            setItems(filtered);
        } catch { /* ignore */ }
    }, [excludeId]);

    const save = useCallback((product) => {
        try {
            const existing = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
            const snapshot = {
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.images?.[0] || product.image,
                category: product.category,
                brand: product.brand,
                rating: product.rating,
                stock: product.stock,
                variants: product.variants || [],
            };
            const filtered = existing.filter(p => p.id !== product.id);
            const updated = [snapshot, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
            localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
            setItems(updated.filter(p => String(p.id) !== String(excludeId)));
        } catch { /* ignore */ }
    }, [excludeId]);

    return { items, save };
}
