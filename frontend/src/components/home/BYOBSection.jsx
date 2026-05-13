import React, { useEffect, useState } from 'react';
import { bundleTemplatesAPI } from '../../lib/api';
import BundleBuilder from '../shop/BundleBuilder';
import { Puzzle } from 'lucide-react';

const BYOBSection = ({ initialTemplates }) => {
    const hasInitial = Array.isArray(initialTemplates);
    const [templates, setTemplates] = useState(() => hasInitial ? initialTemplates : []);
    const [activeTemplate, setActiveTemplate] = useState(() =>
        hasInitial && initialTemplates.length > 0 ? initialTemplates[0] : null,
    );
    const [loading, setLoading] = useState(!hasInitial);

    useEffect(() => {
        if (hasInitial) return;
        bundleTemplatesAPI.getAll()
            .then(data => {
                setTemplates(data);
                if (data.length > 0) setActiveTemplate(data[0]);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [hasInitial]);

    if (loading || templates.length === 0) return null;

    return (
        <section className="py-xl sm:py-2xl bg-surface border-t border-border-default">
            <div className="container mx-auto px-4">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                    <div className="w-10 h-10 rounded-lg bg-trust/10 flex items-center justify-center">
                        <Puzzle size={20} className="text-trust" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">Build Your Own Bundle</h2>
                        <p className="text-sm text-text-muted">Pick your components and save with automatic discounts</p>
                    </div>
                </div>

                {templates.length > 1 && (
                    <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
                        {templates.map(tmpl => (
                            <button
                                key={tmpl.id}
                                onClick={() => setActiveTemplate(tmpl)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                                    activeTemplate?.id === tmpl.id
                                        ? 'bg-trust text-white border-trust'
                                        : 'bg-surface border-border-default text-text-primary hover:border-trust/40'
                                }`}
                            >
                                {tmpl.name}
                            </button>
                        ))}
                    </div>
                )}

                {activeTemplate && <BundleBuilder key={activeTemplate.id} template={activeTemplate} />}
            </div>
        </section>
    );
};

export default BYOBSection;
