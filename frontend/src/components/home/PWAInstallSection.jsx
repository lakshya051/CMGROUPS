import React from 'react';
import { Download, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

const PWAInstallSection = () => {
    const { showPrompt, isInstalled, install, dismiss, canInstall } = useInstallPrompt();

    if (isInstalled || !canInstall) return null;

    return (
        <section className="py-xl sm:py-2xl bg-surface">
            <div className="container mx-auto px-4">
                <div className="border border-border-default rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Smartphone size={28} className="text-primary" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-lg font-heading font-bold text-text-primary mb-1">
                            Get the Shoptify App
                        </h3>
                        <p className="text-sm text-text-secondary">
                            Install for faster access, offline browsing & notifications
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={install}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-lg transition-colors duration-base flex-1 sm:flex-none touch-manipulation"
                        >
                            <Download size={16} />
                            Install App
                        </button>
                        <button
                            onClick={dismiss}
                            className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                        >
                            Later
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PWAInstallSection;
