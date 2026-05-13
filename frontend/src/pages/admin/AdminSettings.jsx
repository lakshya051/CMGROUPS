import React, { useEffect, useState } from 'react';
import { Settings, Save, AlertCircle, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { featureFlagsAPI } from '../../lib/api';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import Button from '../../components/ui/Button';
import SectionLoader from '../../components/ui/SectionLoader';

const AdminSettings = () => {
    const { applyUpdate } = useFeatureFlags();
    const [flags, setFlags] = useState({ bundlesEnabled: false });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        featureFlagsAPI.getAdmin()
            .then((data) => {
                if (cancelled) return;
                setFlags({ bundlesEnabled: Boolean(data?.bundlesEnabled) });
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.message || 'Failed to load settings');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const toggleBundles = (next) => {
        setFlags((prev) => ({ ...prev, bundlesEnabled: next }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const updated = await featureFlagsAPI.update({
                bundlesEnabled: Boolean(flags.bundlesEnabled),
            });
            const next = { bundlesEnabled: Boolean(updated?.bundlesEnabled) };
            setFlags(next);
            // Push to provider so the rest of the app re-renders without a reload.
            applyUpdate(next);
            toast.success('Settings saved');
        } catch (err) {
            const msg = err?.message || 'Failed to save settings';
            setError(msg);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8"><SectionLoader message="Loading settings..." /></div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Settings size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-heading font-bold">Site Settings</h1>
                    <p className="text-text-muted">Toggle entire customer-facing modules on or off.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-error p-4 rounded-xl flex items-center gap-3 mb-4">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

            <div className="glass-panel p-6 space-y-8">
                <section>
                    <h2 className="text-xl font-bold mb-4 border-b border-border-default pb-2">
                        Modules
                    </h2>

                    <div className="flex items-start justify-between gap-4 bg-page-bg p-4 rounded-xl border border-border-default">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-trust/10 text-trust flex items-center justify-center shrink-0">
                                <Layers size={20} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-text-primary">Bundles &amp; BYOB</h3>
                                <p className="text-sm text-text-muted mt-1">
                                    Show fixed bundles and the &ldquo;Build Your Own Bundle&rdquo; section across the
                                    site (home, product pages, navigation, footer, cart suggestions). When off,
                                    every bundle surface is hidden and bundle URLs redirect to the products page.
                                    Existing bundle data and admin pages are preserved so you can flip this back
                                    on at any time.
                                </p>
                                <p className="text-xs text-text-muted mt-2">
                                    Status:&nbsp;
                                    <span className={flags.bundlesEnabled ? 'text-success font-semibold' : 'text-text-muted font-semibold'}>
                                        {flags.bundlesEnabled ? 'Enabled — visible to customers' : 'Disabled — hidden from customers'}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={flags.bundlesEnabled}
                                onChange={(e) => toggleBundles(e.target.checked)}
                                aria-label="Enable bundles"
                            />
                            <div className="w-11 h-6 bg-border-default peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-default after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                </section>

                <div className="pt-4 flex justify-end">
                    <Button onClick={handleSave} disabled={saving} size="lg" className="flex items-center gap-2">
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
