import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Trash2, X, Monitor, Cpu, Printer, HardDrive, Settings, CheckCircle, Edit2, ChevronDown, ChevronUp, ListPlus } from 'lucide-react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
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

const PRESET_FIELDS = [
    { name: 'deviceType', label: 'Device Type', type: 'select', required: false, options: ['Laptop', 'Desktop', 'Printer', 'Monitor', 'Other'] },
    { name: 'deviceBrand', label: 'Brand', type: 'select', required: false, options: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Apple', 'Samsung', 'MSI', 'Other'] },
    { name: 'modelNumber', label: 'Model Number', type: 'text', required: false, options: [] },
    { name: 'serialNumber', label: 'Serial Number', type: 'text', required: false, options: [] },
    { name: 'issueDescription', label: 'Describe Your Issue', type: 'textarea', required: false, options: [] },
    { name: 'quantity', label: 'Quantity', type: 'number', required: false, options: [] },
];

const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Dropdown' },
];

const FormFieldBuilder = ({ fields, onChange }) => {
    const [showPresets, setShowPresets] = useState(false);

    const addField = (field) => {
        const existing = fields.find(f => f.name === field.name);
        if (existing) return;
        onChange([...fields, { ...field }]);
    };

    const addCustomField = () => {
        const id = `custom_${Date.now()}`;
        onChange([...fields, { name: id, label: '', type: 'text', required: false, options: [] }]);
    };

    const updateField = (index, updates) => {
        const updated = fields.map((f, i) => i === index ? { ...f, ...updates } : f);
        onChange(updated);
    };

    const removeField = (index) => {
        onChange(fields.filter((_, i) => i !== index));
    };

    const moveField = (index, dir) => {
        const newFields = [...fields];
        const target = index + dir;
        if (target < 0 || target >= newFields.length) return;
        [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
        onChange(newFields);
    };

    const usedNames = new Set(fields.map(f => f.name));
    const availablePresets = PRESET_FIELDS.filter(p => !usedNames.has(p.name));

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <p className="text-sm font-bold text-text-primary">Booking form fields</p>
                <p className="text-xs text-text-muted leading-relaxed">
                    Choose what customers must fill for this service (besides name, phone, address, and time slot).
                </p>
            </div>

            {fields.length === 0 && (
                <div className="bg-page-bg border border-dashed border-border-default rounded-xl p-4 text-center">
                    <p className="text-sm text-text-muted mb-1">No extra fields yet.</p>
                    <p className="text-xs text-text-muted">Customers will only see booking basics until you add fields below.</p>
                </div>
            )}

            {fields.map((field, idx) => (
                <div key={field.name} className="bg-surface border border-border-default rounded-xl p-4 shadow-sm">
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center justify-start gap-0.5 shrink-0 pt-1 border-r border-border-default pr-2">
                            <button type="button" aria-label="Move up" onClick={() => moveField(idx, -1)} disabled={idx === 0} className="rounded-md p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary disabled:opacity-25 disabled:pointer-events-none">
                                <ChevronUp size={16} />
                            </button>
                            <button type="button" aria-label="Move down" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="rounded-md p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary disabled:opacity-25 disabled:pointer-events-none">
                                <ChevronDown size={16} />
                            </button>
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Label shown to customer</label>
                                <input
                                    type="text"
                                    className="input-field text-sm bg-page-bg w-full"
                                    placeholder="e.g. Printer model, Wi‑Fi issue"
                                    value={field.label}
                                    onChange={e => updateField(idx, { label: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Field type</label>
                                    <select
                                        className="input-field text-sm bg-page-bg w-full"
                                        value={field.type}
                                        onChange={e => updateField(idx, { type: e.target.value })}
                                    >
                                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <label className="flex items-center gap-2.5 pb-2.5 sm:pb-0 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={e => updateField(idx, { required: e.target.checked })}
                                        className="w-4 h-4 shrink-0 rounded border-border-default text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-text-secondary">Required field</span>
                                </label>
                            </div>
                            {field.type === 'select' && (
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Dropdown options</label>
                                    <input
                                        type="text"
                                        className="input-field text-sm bg-page-bg w-full"
                                        placeholder="Comma-separated, e.g. HP, Canon, Epson, Other"
                                        value={(field.options || []).join(', ')}
                                        onChange={e => updateField(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                    />
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            aria-label="Remove"
                            onClick={() => removeField(idx)}
                            className="shrink-0 self-start rounded-lg p-2 text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={addCustomField} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-trust border border-trust/30 hover:bg-trust/10 rounded-lg transition-colors">
                    <Plus size={14} />Add custom field
                </button>
                {availablePresets.length > 0 && (
                    <div className="relative">
                        <button type="button" onClick={() => setShowPresets(!showPresets)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-text-secondary border border-border-default hover:bg-surface-hover rounded-lg transition-colors">
                            <ListPlus size={14} />Add preset field
                            <ChevronDown size={14} className="opacity-60" />
                        </button>
                        {showPresets && (
                            <div className="absolute top-full left-0 z-30 mt-1 max-h-56 overflow-y-auto bg-surface border border-border-default rounded-xl shadow-xl min-w-[min(100vw-2rem,240px)] py-1">
                                {availablePresets.map(preset => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => { addField({ ...preset }); setShowPresets(false); }}
                                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-surface-hover transition-colors flex items-center justify-between gap-2"
                                    >
                                        <span className="font-medium">{preset.label}</span>
                                        <span className="text-[10px] uppercase tracking-wide text-text-muted shrink-0">{preset.type}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminServiceTypes = () => {
    const [serviceTypes, setServiceTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [form, setForm] = useState({
        title: '',
        description: '',
        icon: 'Wrench',
        price: '',
        features: '',
        formFields: [],
        enableReferral: false,
        referrerPoints: '',
        refereePoints: '',
        sellerName: ''
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
        setForm({ title: '', description: '', icon: 'Wrench', price: '', features: '', formFields: [], enableReferral: false, referrerPoints: '', refereePoints: '', sellerName: '', active: true });
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
            formFields: Array.isArray(st.formFields) ? st.formFields : [],
            enableReferral: !!(st.referrerPoints || st.refereePoints),
            referrerPoints: st.referrerPoints || '',
            refereePoints: st.refereePoints || '',
            sellerName: st.sellerName || '',
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

            const cleanedFields = (form.formFields || [])
                .filter(f => f.label && f.label.trim())
                .map(f => ({
                    name: f.name || `field_${f.label.trim().toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).slice(2, 7)}`,
                    label: f.label.trim(),
                    type: f.type || 'text',
                    required: !!f.required,
                    options: f.type === 'select' ? (f.options || []) : []
                }));

            const payload = {
                title: form.title,
                description: form.description || null,
                icon: form.icon,
                price: form.price || null,
                features: featuresArray,
                formFields: cleanedFields,
                referrerPoints: form.enableReferral && form.referrerPoints ? parseFloat(form.referrerPoints) : null,
                refereePoints: form.enableReferral && form.refereePoints ? parseFloat(form.refereePoints) : null,
                sellerName: form.sellerName?.trim() || null,
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

    const handleDelete = (id) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete service type?',
            message: 'Delete this service type?',
            onConfirm: async () => {
                setConfirmState(prev => ({ ...prev, isOpen: false }));
                try {
                    await serviceTypesAPI.delete(id);
                    setServiceTypes(prev => prev.filter(s => s.id !== id));
                } catch (err) {
                    console.error('Failed to delete:', err);
                }
            },
        });
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

                        <div className="mt-4 pt-3 border-t border-border-default flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded ${st.active ? 'bg-success/10 text-success' : 'bg-page-bg text-text-muted border border-border-default'}`}>
                                {st.active ? 'Active' : 'Inactive'}
                            </span>
                            {Array.isArray(st.formFields) && st.formFields.length > 0 && (
                                <span className="text-xs px-2 py-1 rounded bg-trust/10 text-trust border border-trust/20">
                                    {st.formFields.length} custom field{st.formFields.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {serviceTypes.length === 0 && (
                    <div className="col-span-full glass-panel p-12 text-center">
                        <Wrench size={48} className="mx-auto text-text-muted/50 mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Service Types</h3>
                        <p className="text-text-muted mb-4">Add your first service type to get started.</p>
                        <Button onClick={handleOpenCreate}>Add Service Type</Button>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 overflow-y-auto">
                    <div className="glass-panel w-full max-w-lg max-h-[min(90vh,900px)] min-h-0 flex flex-col overflow-hidden my-auto relative animate-in zoom-in duration-300 shadow-2xl">
                        <div className="p-5 sm:p-6 border-b border-border-default flex items-center justify-between gap-3 shrink-0">
                            <h2 className="text-xl font-bold pr-2">{editingId ? 'Edit Service Type' : 'Create Service Type'}</h2>
                            <button type="button" onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-surface-hover shrink-0" aria-label="Close"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 space-y-4 flex-1 min-h-0">
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

                            <div className="bg-page-bg p-4 rounded-lg border border-border-default mt-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <input
                                        type="checkbox"
                                        id="enableReferral"
                                        name="enableReferral"
                                        checked={form.enableReferral}
                                        onChange={e => setForm({ ...form, enableReferral: e.target.checked })}
                                        className="w-5 h-5 text-primary bg-surface border-border-default rounded focus:ring-primary focus:ring-2"
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
                                                className="input-field bg-surface"
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
                                                className="input-field bg-surface"
                                                placeholder="e.g. 250"
                                                value={form.refereePoints}
                                                onChange={e => setForm({ ...form, refereePoints: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Seller Name</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Manav Infocom"
                                    value={form.sellerName}
                                    onChange={e => setForm({ ...form, sellerName: e.target.value })}
                                />
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

                            <div className="border-t border-border-default pt-5 mt-1">
                                <FormFieldBuilder
                                    fields={form.formFields || []}
                                    onChange={(fields) => setForm({ ...form, formFields: fields })}
                                />
                            </div>
                            </div>

                            <div className="shrink-0 border-t border-border-default bg-surface/80 backdrop-blur-sm px-5 sm:px-6 py-4 rounded-b-xl">
                                <Button type="submit" className="w-full" disabled={saving}>
                                    {saving ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save Changes' : 'Create Service Type')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
            />
        </div>
    );
};

export default AdminServiceTypes;
