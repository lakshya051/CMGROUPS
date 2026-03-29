import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

export default function NotFound() {
    useSEO({ title: '404 — Page Not Found | Shoptify', description: 'The page you are looking for does not exist.', noIndex: true });

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
            <p className="text-8xl font-heading font-bold text-primary/20 select-none">404</p>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mt-4">
                Page not found
            </h1>
            <p className="text-text-muted mt-3 max-w-md text-sm leading-relaxed">
                The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>
            <div className="flex flex-wrap gap-3 mt-8 justify-center">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold px-6 py-3 rounded-lg text-sm transition-colors"
                >
                    <Home size={16} />
                    Go Home
                </Link>
                <Link
                    to="/products"
                    className="inline-flex items-center gap-2 border border-border-default bg-surface hover:bg-surface-hover text-text-primary font-medium px-6 py-3 rounded-lg text-sm transition-colors"
                >
                    <Search size={16} />
                    Browse Products
                </Link>
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center gap-2 border border-border-default bg-surface hover:bg-surface-hover text-text-primary font-medium px-6 py-3 rounded-lg text-sm transition-colors"
                >
                    <ArrowLeft size={16} />
                    Go Back
                </button>
            </div>
        </div>
    );
}
