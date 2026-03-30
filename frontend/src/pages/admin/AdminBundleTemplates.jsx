import React, { useState, useEffect } from 'react';
import { bundleTemplatesAPI, categoriesAPI, uploadAPI } from '../../lib/api';
import { Plus, Edit2, Trash2, X, Layers, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminBundleTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [categories, setCategories] = useState([]);

    const [form, setForm] = useState({
        name: '', description: '', image: '', discount: 10, slots: [],
    });

    const fetchTemplates = () => {
        setLoading(true);
        bundleTemplatesAPI.getAllAdmin()
            .then(setTemplates)
            .catch(() => toast.error('Failed to load templates'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTemplates(); }, []);

    useEffect(() => {
        if (showModal) {
            categoriesAPI.getAll().then(setCategories).catch(() => {});
        }
    }, [showModal]);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', description: '', image: '', discount: 10, slots: [] });
        setShowModal(true);
    };

    const openEdit = (tmpl) => {
        setEditing(tmpl);
        setForm({
            name: tmpl.name,
            description: tmpl.description || '',
            image: tmpl.image || '',
            discount: tmpl.discount,
            slots: tmpl.slots?.map(s => ({ label: s.label, category: s.category, minQty: s.minQty, maxQty: s.maxQty, required: s.required })) || [],
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this template?')) return;
        try {
            await bundleTemplatesAPI.delete(id);
            toast.success('Template deleted');
            fetchTemplates();
        } catch { toast.error('Failed to delete'); }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const res = await uploadAPI.upload(reader.result, 'bundles');
                setForm(prev => ({ ...prev, image: res.url }));
                toast.success('Image uploaded');
            } catch { toast.error('Upload failed'); }
        };
        reader.readAsDataURL(file);
    };

    const addSlot = () => {
        setForm(prev => ({
            ...prev,
            slots: [...prev.slots, { label: '', category: '', minQty: 1, maxQty: 1, required: true }],
        }));
    };

    const updateSlot = (idx, field, value) => {
        setForm(prev => ({
            ...prev,
            slots: prev.slots.map((s, i) => i === idx ? { ...s, [field]: value } : s),
        }));
    };

    const removeSlot = (idx) => {
        setForm(prev => ({ ...prev, slots: prev.slots.filter((_, i) => i !== idx) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                name: form.name,
                description: form.description || null,
                image: form.image || null,
                discount: parseFloat(form.discount),
                slots: form.slots.map(s => ({
                    label: s.label,
                    category: s.category,
                    minQty: parseInt(s.minQty) || 1,
                    maxQty: parseInt(s.maxQty) || 1,
                    required: s.required,
                })),
            };

            if (editing) {
                await bundleTemplatesAPI.update(editing.id, data);
                toast.success('Template updated');
            } else {
                await bundleTemplatesAPI.create(data);
                toast.success('Template created');
            }
            setShowModal(false);
            fetchTemplates();
        } catch (err) {
            toast.error(err.message || 'Failed to save');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-heading font-bold">Bundle Templates (BYOB)</h1>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    <Plus size={18} /> Create Template
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-text-muted">Loading templates...</div>
            ) : templates.length === 0 ? (
                <div className="text-center py-12 text-text-muted">No templates found. Create one to allow customers to build their own bundles.</div>
            ) : (
                <div className="space-y-3">
                    {templates.map(tmpl => (
                        <div key={tmpl.id} className={`bg-surface border rounded-lg p-4 flex items-center gap-4 ${tmpl.isActive ? 'border-border-default' : 'border-error/30 opacity-60'}`}>
                            <div className="w-12 h-12 bg-trust/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Layers size={20} className="text-trust" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-text-primary">{tmpl.name}</h3>
                                <p className="text-sm text-text-muted">{tmpl.slots?.length || 0} slots · {tmpl.discount}% discount</p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => openEdit(tmpl)} className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-trust">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(tmpl.id)} className="p-2 hover:bg-error/10 rounded-lg transition-colors text-text-muted hover:text-error">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-surface border border-border-default rounded-xl w-full max-w-2xl my-8 shadow-xl">
                        <div className="flex items-center justify-between p-4 border-b border-border-default">
                            <h2 className="text-lg font-bold">{editing ? 'Edit Template' : 'Create Template'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-hover rounded"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-1">Template Name *</label>
                                    <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1">Discount %</label>
                                    <input type="number" min={0} max={100} value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">Description</label>
                                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust resize-none" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">Image</label>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
                                {form.image && <img src={form.image} alt="" className="w-20 h-20 object-contain mt-2 rounded border border-border-default" />}
                            </div>

                            {/* Slots */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium">Slots</label>
                                    <button type="button" onClick={addSlot} className="text-xs text-trust font-medium hover:underline flex items-center gap-1">
                                        <Plus size={14} /> Add Slot
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {form.slots.map((slot, idx) => (
                                        <div key={idx} className="bg-page-bg border border-border-default rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <GripVertical size={14} className="text-text-muted" />
                                                <span className="text-xs font-bold text-text-muted">Slot {idx + 1}</span>
                                                <button type="button" onClick={() => removeSlot(idx)} className="ml-auto text-error hover:bg-error/10 p-1 rounded"><X size={14} /></button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="text" placeholder="Label (e.g. Choose a Processor)" value={slot.label} onChange={e => updateSlot(idx, 'label', e.target.value)} className="border border-border-default rounded px-2 py-1 text-sm" />
                                                <select value={slot.category} onChange={e => updateSlot(idx, 'category', e.target.value)} className="border border-border-default rounded px-2 py-1 text-sm">
                                                    <option value="">Select category...</option>
                                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                </select>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-text-muted">Min:</label>
                                                    <input type="number" min={1} value={slot.minQty} onChange={e => updateSlot(idx, 'minQty', e.target.value)} className="w-16 border border-border-default rounded px-2 py-1 text-sm" />
                                                    <label className="text-xs text-text-muted">Max:</label>
                                                    <input type="number" min={1} value={slot.maxQty} onChange={e => updateSlot(idx, 'maxQty', e.target.value)} className="w-16 border border-border-default rounded px-2 py-1 text-sm" />
                                                </div>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input type="checkbox" checked={slot.required} onChange={e => updateSlot(idx, 'required', e.target.checked)} />
                                                    Required
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
                                    {editing ? 'Update Template' : 'Create Template'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 border border-border-default rounded-lg text-text-muted hover:bg-surface-hover">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBundleTemplates;
