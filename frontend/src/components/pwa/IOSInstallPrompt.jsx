import { useState, useEffect } from 'react';
import { X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISS_KEY = 'ios_install_dismissed_at';
const DISMISS_COUNT_KEY = 'ios_install_dismiss_count';
const DISMISS_DAYS = 14;
const MAX_DISMISSALS = 3;
const VISIT_COUNT_KEY = 'ios_install_visits';
const FIRST_VISIT_DELAY_MS = 45000;

function isIOSSafari() {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
    return isIOS && isSafari;
}

function isStandalone() {
    return window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
}

export default function IOSInstallPrompt() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isIOSSafari() || isStandalone()) return;

        const dismissCount = Number(localStorage.getItem(DISMISS_COUNT_KEY) || '0');
        if (dismissCount >= MAX_DISMISSALS) return;

        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt) {
            const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
            if (daysSince < DISMISS_DAYS) return;
        }

        const visits = Number(localStorage.getItem(VISIT_COUNT_KEY) || '0') + 1;
        localStorage.setItem(VISIT_COUNT_KEY, String(visits));

        if (visits >= 2) {
            setVisible(true);
        } else {
            const timer = setTimeout(() => setVisible(true), FIRST_VISIT_DELAY_MS);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismiss = () => {
        setVisible(false);
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        const count = Number(localStorage.getItem(DISMISS_COUNT_KEY) || '0') + 1;
        localStorage.setItem(DISMISS_COUNT_KEY, String(count));
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed inset-x-0 bottom-0 z-[9999] bg-surface rounded-t-2xl shadow-glass border-t border-border-default p-6 pb-8 max-w-md mx-auto"
                >
                    <button
                        onClick={dismiss}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-page-bg text-text-muted transition-colors"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>

                    <div className="text-center mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                            <img src="/icons/icon-96x96.png" alt="CMGROUPS" loading="lazy" width={40} height={40} className="w-10 h-10 rounded-lg" />
                        </div>
                        <h3 className="font-heading font-bold text-lg text-text-primary">
                            Add CMGROUPS to your Home Screen
                        </h3>
                        <p className="text-sm text-text-muted mt-1">
                            Install our app for quick access and offline browsing
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 bg-page-bg rounded-xl p-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">1</div>
                            <p className="text-sm text-text-primary">
                                Tap the <Share size={16} className="inline-block mx-1 text-primary" /> Share button in Safari
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-page-bg rounded-xl p-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">2</div>
                            <p className="text-sm text-text-primary">
                                Scroll down and tap <strong>"Add to Home Screen"</strong>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={dismiss}
                        className="mt-5 w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                        Got it
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
