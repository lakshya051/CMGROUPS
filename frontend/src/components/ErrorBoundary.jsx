import React from 'react';
import { RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        if (import.meta.env.DEV) {
            this.setState({ error, errorInfo });
            console.error("Uncaught error:", error, errorInfo);
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-page-bg flex items-center justify-center p-6">
                    <div className="max-w-lg w-full text-center">
                        <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary mb-2">Something went wrong</h1>
                        <p className="text-text-secondary mb-8 text-sm">
                            An unexpected error occurred. Please try reloading the page or go back to the home page.
                        </p>

                        {import.meta.env.DEV && this.state.error && (
                            <div className="bg-black/50 p-4 rounded-lg border border-error/30 mb-6 text-left">
                                <h2 className="text-sm font-bold text-error mb-2 font-mono">{this.state.error.toString()}</h2>
                                <details className="whitespace-pre-wrap text-xs text-text-secondary font-mono">
                                    <summary className="cursor-pointer text-text-muted hover:text-text-primary">Stack trace</summary>
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </details>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold rounded-lg transition-colors text-sm"
                            >
                                <RefreshCw size={16} />
                                Reload Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface border border-border-default hover:bg-surface-hover text-text-primary font-medium rounded-lg transition-colors text-sm"
                            >
                                <Home size={16} />
                                Go to Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
