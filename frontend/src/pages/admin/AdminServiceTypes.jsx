import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Trash2, X, Monitor, Cpu, Printer, HardDrive, Settings, CheckCircle, Edit2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import { serviceTypesAPI } from '../../lib/api';

const ICON_OPTIONS = [
    { value: 'Wrench', label: 'Wrench (Repair)' },
    { value: 'Monitor', label: 'Monitor (Display)' },
    { value: 'Cpu', label: 'CPU (Build)' },
    { value: 'Printer', label: 'Printer' },
    { value: 'HardDrive', label: 'Storage' },
    { value: 'Settings', label: 'General' },
];

const iconMap = {
    Wrench: <Wrench size={28} />,
    Monitor: <Monitor size={28} />,
    Cpu: <Cpu size={28} />,
    Printer: <Printer size={28} />,
    HardDrive: <HardDrive size={28} />,
    Settings: <Settings size={28} />,
};

const AdminServiceTypes = () => {
    const [serviceTypes, setServiceTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        title: '',
        description: '',
        icon: 'Wrench',
        price: '',
        features: '',
        enableReferral: false,
        referrerPoints: '',
        refereePoints: ''
    });

    useEffect(() => {
        loadServiceTypes();
    }, []);

    const loadServiceTypes = async () => {
        try {
            const data = await serviceTypesAPI.getAllAdmin();
            setServiceTypes(data);
        } catch (err) {
            console.error('Failed to load service types:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setForm({ title: '', description: '', icon: 'Wrench', price: '', features: '', enableReferral: false, referrerPoints: '', refereePoints: '', active: true });
        setEditingId(null);
        setError('');
        setShowModal(true);
    };

    const handleOpenEdit = (st) => {
        setForm({
            title: st.title || '',
            description: st.description || '',
            icon: st.icon || 'Wrench',
            price: st.price || '',
            features: st.features ? st.features.join('\n') : '',
            enableReferral: !!(st.referrerPoints || st.refereePoints),
            referrerPoints: st.referrerPoints || '',
            refereePoints: st.refereePoints || '',
            active: st.active
        });
        setEditingId(st.id);
        setError('');
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const featuresArray = form.features
                .split('\n')
                .map(f => f.trim())
                .filter(f => f.length > 0);

            const payload = {
                title: form.title,
                description: form.description || null,
                icon: form.icon,
                price: form.price || null,
                features: featuresArray,
                referrerPoints: form.enableReferral && form.referrerPoints ? parseFloat(form.referrerPoints) : null,
                refereePoints: form.enableReferral && form.refereePoints ? parseFloat(form.refereePoints) : null,
                active: form.active !== undefined ? form.active : true
            };

            if (editingId) {
                const updatedType = await serviceTypesAPI.update(editingId, payload);
                setServiceTypes(prev => prev.map(s => s.id === editingId ? updatedType : s));
            } else {
                const newType = await serviceTypesAPI.create(payload);
                setServiceTypes(prev => [newType, ...prev]);
            }
            setShowModal(false);
        } catch (err) {
            setError(err.message || (editingId ? 'Failed to update service type' : 'Failed to create service type'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this service type?')) return;
        try {
            await serviceTypesAPI.delete(id);
            setServiceTypes(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading Service Types...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold mb-1">Service Types</h1>
                    <p className="text-text-muted">Define the services customers can book.</p>
                </div>
                <Button onClick={handleOpenCreate}>
                    <Plus size={18} className="mr-2" /> Add Service
                </Button>
            </div>

            {/* Service Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {serviceTypes.map(st => (
                    <div key={st.id} className="glass-panel p-6 hover:border-primary/30 transition-colors relative group">
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleOpenEdit(st)}
                                className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(st.id)}
                                className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="text-primary mb-4">
                            {iconMap[st.icon] || <Wrench size={28} />}
                        </div>
                        <h3 className="text-xl font-bold mb-1">{st.title}</h3>
                        <p className="text-sm text-text-muted mb-4">{st.description || 'No description'}</p>

                        {st.price && (
                            <p className="text-lg font-bold text-primary mb-3">Starting {st.price}</p>
                        )}

                        {st.features && Array.isArray(st.features) && st.features.length > 0 && (
                            <ul className="space-y-1">
                                {st.features.map((f, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-text-muted">
                                        <CheckCircle size={14} className="text-success flex-shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-4 pt-3 border-t border-gray-100">
                            <span className={`text-xs px-2 py-1 rounded ${st.active ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-400'}`}>
                                {st.active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                ))}

                {serviceTypes.length === 0 && (
                    <div className="col-span-full glass-panel p-12 text-center">
                        <Wrench size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Service Types</h3>
                        <p className="text-text-muted mb-4">Add your first service type to get started.</p>
                        <Button onClick={handleOpenCreate}>Add Service Type</Button>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-lg relative animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold">{editingId ? 'Edit Service Type' : 'Create Service Type'}</h2>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}

                            <div>
                                <label className="block text-sm font-medium mb-1">Service Title *</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Expert PC Repair"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    className="input-field h-20"
                                    placeholder="What does this service include?"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Icon</label>
                                    <select
                                        className="input-field"
                                        value={form.icon}
                                        onChange={e => setForm({ ...form, icon: e.target.value })}
                                    >
                                        {ICON_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Starting Price</label>
                                    <input
                                        className="input-field"
                                        placeholder="e.g. ₹499"
                                        value={form.price}
                                        onChange={e => setForm({ ...form, price: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <input
                                        type="checkbox"
                                        id="enableReferral"
                                        name="enableReferral"
                                        checked={form.enableReferral}
                                        onChange={e => setForm({ ...form, enableReferral: e.target.checked })}
                                        className="w-5 h-5 text-primary bg-white border-gray-300 rounded focus:ring-primary focus:ring-2"
                                    />
                                    <label htmlFor="enableReferral" className="font-medium text-text-main cursor-pointer select-none">
                                        Enable Referral Rewards for this service?
                                    </label>
                                </div>

                                {form.enableReferral && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1">
                                                Referrer Points <span className="text-error">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                required={form.enableReferral}
                                                className="input-field bg-white"
                                                placeholder="e.g. 500"
                                                value={form.referrerPoints}
                                                onChange={e => setForm({ ...form, referrerPoints: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1">
                                                Referee Points <span className="text-error">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                required={form.enableReferral}
                                                className="input-field bg-white"
                                                placeholder="e.g. 250"
                                                value={form.refereePoints}
                                                onChange={e => setForm({ ...form, refereePoints: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Features (one per line)</label>
                                <textarea
                                    className="input-field h-24"
                                    placeholder="Free Diagnostics&#10;No Fix, No Fee&#10;Original Parts"
                                    value={form.features}
                                    onChange={e => setForm({ ...form, features: e.target.value })}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? 'Creating...' : 'Create Service Type'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminServiceTypes;
