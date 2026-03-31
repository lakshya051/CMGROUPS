import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPromptBanner() {
    const { showPrompt, install, dismiss } = useInstallPrompt();

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed left-4 right-4 z-[9999] mx-auto max-w-md"
                    style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
                >
                    <div className="bg-surface rounded-2xl shadow-glass border border-border-default p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Download className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-heading font-bold text-sm text-text-primary">
                                Install Shoptify App
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                                Quick access, offline browsing & push notifications
                            </p>
                        </div>
                        <button
                            onClick={install}
                            className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
                        >
                            Install
                        </button>
                        <button
                            onClick={dismiss}
                            className="p-2.5 rounded-lg hover:bg-page-bg text-text-muted transition-colors flex-shrink-0 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Dismiss install prompt"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
