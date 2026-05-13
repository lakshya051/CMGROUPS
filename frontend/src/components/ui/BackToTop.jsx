import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Floating "Back to top" button that appears once the viewport has scrolled past 400px.
 * Positioned above the bottom tab bar + safe area on mobile; bottom-right on desktop.
 */
export default function BackToTop({ threshold = 400 }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > threshold);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);

    const handleClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!visible) return null;

    return (
        <button
            onClick={handleClick}
            aria-label="Back to top"
            className="fixed right-4 z-40 min-touch rounded-full bg-text-primary/90 text-surface shadow-lg hover:bg-text-primary transition-opacity backdrop-blur-sm animate-in fade-in duration-200"
            style={{
                bottom:
                    'calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px) + 1rem)',
            }}
        >
            <ArrowUp size={20} />
        </button>
    );
}
