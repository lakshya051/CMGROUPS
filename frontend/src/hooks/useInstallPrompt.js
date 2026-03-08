import { useState, useEffect, useCallback } from 'react';

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 7;
const PAGES_BEFORE_PROMPT = 2;
const SECONDS_BEFORE_PROMPT = 30;
const PAGE_COUNT_KEY = 'pwa_page_views';

export function useInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsInstalled(true);
            return;
        }

        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt) {
            const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
            if (daysSince < DISMISS_DAYS) return;
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);

            const pageViews = Number(sessionStorage.getItem(PAGE_COUNT_KEY) || '0') + 1;
            sessionStorage.setItem(PAGE_COUNT_KEY, String(pageViews));

            if (pageViews >= PAGES_BEFORE_PROMPT) {
                setShowPrompt(true);
                return;
            }

            const timer = setTimeout(() => setShowPrompt(true), SECONDS_BEFORE_PROMPT * 1000);
            return () => clearTimeout(timer);
        };

        window.addEventListener('beforeinstallprompt', handler);

        const installedHandler = () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        };
        window.addEventListener('appinstalled', installedHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', installedHandler);
        };
    }, []);

    const install = useCallback(async () => {
        if (!deferredPrompt) return false;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setShowPrompt(false);
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        return outcome === 'accepted';
    }, [deferredPrompt]);

    const dismiss = useCallback(() => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setShowPrompt(false);
    }, []);

    return { showPrompt, isInstalled, install, dismiss, canInstall: !!deferredPrompt };
}
