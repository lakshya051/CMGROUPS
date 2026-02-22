import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import Button from '../../components/ui/Button';
import { Settings, Save, AlertCircle } from 'lucide-react';

const AdminReferralSettings = () => {
    const [settings, setSettings] = useState({
        pointsPerProductPurchase: 200,
        pointsPerServiceBooking: 100,
        pointsPerCourseEnrollment: 300,
        pointToRupeeRate: 100,
        pointExpiryDays: 0,
        tierSystemEnabled: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await adminAPI.getReferralSettings();
                setSettings({
                    ...data,
                    pointExpiryDays: data.pointExpiryDays || 0
                });
            } catch (err) {
                setError('Failed to load referral settings');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : Number(value)
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        setError('');
        try {
            const dataToSave = {
                ...settings,
                pointExpiryDays: settings.pointExpiryDays > 0 ? settings.pointExpiryDays : null
            };
            const updated = await adminAPI.updateReferralSettings(dataToSave);
            setSettings({
                ...updated,
                pointExpiryDays: updated.pointExpiryDays || 0
            });
            setMessage('Settings saved successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading settings...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Settings size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-heading font-bold">Referral & Rewards</h1>
                    <p className="text-text-muted">Configure points, conversion rates, and tier systems.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-4">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

            {message && (
                <div className="bg-success/10 border border-success/20 text-success p-4 rounded-xl flex items-center gap-3 mb-4">
                    <Save size={20} />
                    <p>{message}</p>
                </div>
            )}

            <div className="glass-panel p-6 space-y-8">
                {/* Reward Values Section */}
                <section>
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-100 pb-2">Reward Values</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">Points per Product Purchase</label>
                            <input
                                type="number"
                                name="pointsPerProductPurchase"
                                className="input-field"
                                value={settings.pointsPerProductPurchase}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">Points per Service Booking</label>
                            <input
                                type="number"
                                name="pointsPerServiceBooking"
                                className="input-field"
                                value={settings.pointsPerServiceBooking}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">Points per Course Enrollment</label>
                            <input
                                type="number"
                                name="pointsPerCourseEnrollment"
                                className="input-field"
                                value={settings.pointsPerCourseEnrollment}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </section>

                {/* Economic Rules Section */}
                <section>
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-100 pb-2">Economic Rules</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">Point to Rupee Rate (Points = ₹10)</label>
                            <input
                                type="number"
                                name="pointToRupeeRate"
                                className="input-field"
                                value={settings.pointToRupeeRate}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-text-muted">E.g., 100 means 100 points = ₹10</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">Point Expiry Time (Days)</label>
                            <input
                                type="number"
                                name="pointExpiryDays"
                                className="input-field"
                                value={settings.pointExpiryDays}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-text-muted">Use 0 for no expiration</p>
                        </div>
                    </div>
                </section>

                {/* Feature Toggles */}
                <section>
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-100 pb-2">Features</h2>
                    <div className="flex items-center justify-between bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        <div>
                            <h3 className="font-bold">Tier System</h3>
                            <p className="text-sm text-text-muted">Enable Bronze, Silver, Gold tiers based on user points</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="tierSystemEnabled"
                                className="sr-only peer"
                                checked={settings.tierSystemEnabled}
                                onChange={handleChange}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
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

export default AdminReferralSettings;
