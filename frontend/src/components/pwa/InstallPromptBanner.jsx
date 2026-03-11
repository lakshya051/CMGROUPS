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
                    className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-md"
                >
                    <div className="bg-surface rounded-2xl shadow-glass border border-border-default p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Download className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-heading font-bold text-sm text-text-primary">
                                Install CMGROUPS App
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                                Quick access, offline browsing, and more
                            </p>
                        </div>
                        <button
                            onClick={install}
                            className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex-shrink-0"
                        >
                            Install
                        </button>
                        <button
                            onClick={dismiss}
                            className="p-1.5 rounded-lg hover:bg-page-bg text-text-muted transition-colors flex-shrink-0"
                            aria-label="Dismiss"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
