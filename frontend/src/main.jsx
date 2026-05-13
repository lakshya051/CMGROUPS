import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ErrorBoundary>
    </React.StrictMode>,
);

// Register the service worker AFTER the first paint, not before. Registering
// at module-eval time competes with the initial bundle download / hydration
// and hurts LCP measurably (often 100-300 ms on a cold mobile load).
//
// `requestIdleCallback` fires when the main thread is genuinely idle —
// usually right after the first paint completes — and falls back to a
// 1 s timer for browsers without it (Safari < 16, Firefox < 79).
const registerSWLater = () => {
    import('virtual:pwa-register')
        .then(({ registerSW }) => registerSW({ immediate: true }))
        .catch(() => { /* ignore: SW unsupported in some sandboxes / private modes */ });
};

if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(registerSWLater, { timeout: 3000 });
    } else {
        window.setTimeout(registerSWLater, 1000);
    }
}
