import React, { useState, useEffect, useRef } from 'react';
import {
    Image, Plus, Trash2, Pencil, X, Save, ToggleLeft, ToggleRight,
    ChevronUp, ChevronDown, Eye, EyeOff, Upload
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { bannersAPI } from '../../lib/api';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';

const bannerSchema = Yup.object({
    title: Yup.string().required('Title is required'),
    subtitle: Yup.string(),
    ctaLabel: Yup.string(),
    ctaLink: Yup.string(),
    image: Yup.string(),
    gradient: Yup.string(),
    displayOrder: Yup.number().integer().min(0),
    active: Yup.boolean(),
});

const EMPTY_FORM = {
    title: '',
    subtitle: '',
    ctaLabel: 'Shop Now',
    ctaLink: '/products',
    image: '',
    gradient: '',
    displayOrder: 0,
    active: true,
};

const AdminBanners = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const fileInputRef = useRef(null);

    const formik = useFormik({
        initialValues: EMPTY_FORM,
        validationSchema: bannerSchema,
        validateOnBlur: true,
        validateOnChange: false,
        onSubmit: async (values, { setSubmitting, setErrors }) => {
            try {
                const payload = { ...values };
                if (!payload.subtitle) payload.subtitle = null;
                if (!payload.gradient) payload.gradient = null;

                if (editingId) {
                    const updated = await bannersAPI.update(editingId, payload);
                    setBanners(prev => prev.map(b => b.id === editingId ? updated : b));
                    toast.success('Banner updated');
                } else {
                    const created = await bannersAPI.create(payload);
                    setBanners(prev => [...prev, created].sort((a, b) => a.displayOrder - b.displayOrder));
                    toast.success('Banner created');
                }
                closeModal();
            } catch (err) {
                setErrors({ submit: err.message || 'Failed to save banner' });
            } finally {
                setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        bannersAPI.getAll()
            .then(data => setBanners(data))
            .catch(() => toast.error('Failed to load banners'))
            .finally(() => setLoading(false));
    }, []);

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setImagePreview('');
        formik.resetForm();
    };

    const openCreate = () => {
        formik.resetForm();
        formik.setValues({ ...EMPTY_FORM, displayOrder: banners.length });
        setEditingId(null);
        setImagePreview('');
        setShowModal(true);
    };

    const openEdit = (banner) => {
        formik.resetForm();
        formik.setValues({
            title: banner.title || '',
            subtitle: banner.subtitle || '',
            ctaLabel: banner.ctaLabel || 'Shop Now',
            ctaLink: banner.ctaLink || '/products',
            image: banner.image || '',
            gradient: banner.gradient || '',
            displayOrder: banner.displayOrder ?? 0,
            active: banner.active,
        });
        setEditingId(banner.id);
        setImagePreview(banner.image || '');
        setShowModal(true);
    };

    const handleToggle = async (banner) => {
        try {
            const updated = await bannersAPI.toggle(banner.id);
            setBanners(prev => prev.map(b => b.id === banner.id ? updated : b));
            toast.success(updated.active ? 'Banner activated' : 'Banner deactivated');
        } catch {
            toast.error('Failed to toggle banner');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('This will permanently delete the banner and its image. Continue?')) return;
        try {
            await bannersAPI.delete(id);
            setBanners(prev => prev.filter(b => b.id !== id));
            toast.success('Banner deleted');
        } catch {
            toast.error('Failed to delete banner');
        }
    };

    const handleMove = async (index, direction) => {
        const newBanners = [...banners];
        const swapIndex = index + direction;
        if (swapIndex < 0 || swapIndex >= newBanners.length) return;

        [newBanners[index], newBanners[swapIndex]] = [newBanners[swapIndex], newBanners[index]];
        setBanners(newBanners);

        try {
            const orderedIds = newBanners.map(b => b.id);
            const updated = await bannersAPI.reorder(orderedIds);
            setBanners(updated);
        } catch {
            toast.error('Failed to reorder');
            bannersAPI.getAll().then(setBanners);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            setImagePreview(dataUrl);
            formik.setFieldValue('image', dataUrl);
        };
        reader.readAsDataURL(file);
    };

    if (loading) {
        return <div className="p-8 text-center text-text-muted">Loading banners...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold mb-1">Banner Management</h1>
                    <p className="text-text-muted">Manage homepage banners — upload images, set text, control order and visibility.</p>
                </div>
                <Button onClick={openCreate}><Plus size={18} className="mr-2" /> Add Banner</Button>
            </div>

            {/* Banner List */}
            <div className="space-y-4">
                {banners.map((banner, index) => (
                    <div
                        key={banner.id}
                        className={`glass-panel p-4 sm:p-6 transition-all ${!banner.active ? 'opacity-50' : ''}`}
                    >
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Thumbnail */}
                            <div className="w-full sm:w-48 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-page-bg border border-border-default">
                                {banner.image ? (
                                    <img
                                        src={banner.image}
                                        alt={banner.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : banner.gradient ? (
                                    <div className={`w-full h-full bg-gradient-to-r ${banner.gradient}`} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                                        <Image size={32} className="opacity-30" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <h3 className="text-lg font-bold truncate">{banner.title}</h3>
                                        {banner.subtitle && (
                                            <p className="text-sm text-text-muted line-clamp-1">{banner.subtitle}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-xs px-2 py-0.5 rounded border ${
                                            banner.active
                                                ? 'text-success bg-success/10 border-success/20'
                                                : 'text-text-muted bg-page-bg border-border-default'
                                        }`}>
                                            {banner.active ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className="text-xs text-text-muted bg-page-bg border border-border-default px-2 py-0.5 rounded">
                                            #{banner.displayOrder + 1}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted mb-3">
                                    <span className="bg-page-bg px-2 py-1 rounded border border-border-default">
                                        CTA: {banner.ctaLabel || '—'}
                                    </span>
                                    <span className="bg-page-bg px-2 py-1 rounded border border-border-default truncate max-w-[200px]">
                                        Link: {banner.ctaLink || '—'}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => openEdit(banner)}
                                        className="text-xs flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
                                    >
                                        <Pencil size={14} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleToggle(banner)}
                                        className={`text-xs flex items-center gap-1 transition-colors ${
                                            banner.active
                                                ? 'text-success hover:text-text-muted'
                                                : 'text-text-muted hover:text-success'
                                        }`}
                                    >
                                        {banner.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                        {banner.active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => handleMove(index, -1)}
                                        disabled={index === 0}
                                        className="text-xs flex items-center gap-1 text-text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                    >
                                        <ChevronUp size={14} /> Up
                                    </button>
                                    <button
                                        onClick={() => handleMove(index, 1)}
                                        disabled={index === banners.length - 1}
                                        className="text-xs flex items-center gap-1 text-text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                    >
                                        <ChevronDown size={14} /> Down
                                    </button>
                                    <button
                                        onClick={() => handleDelete(banner.id)}
                                        className="text-xs flex items-center gap-1 text-text-muted hover:text-error transition-colors ml-auto"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {banners.length === 0 && (
                    <div className="glass-panel p-12 text-center text-text-muted">
                        <Image size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No banners yet. Add your first banner to the homepage!</p>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
                    <div className="glass-panel w-full max-w-lg relative animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border-default flex items-center justify-between flex-shrink-0">
                            <h2 className="text-xl font-heading font-bold">
                                {editingId ? 'Edit Banner' : 'Add New Banner'}
                            </h2>
                            <button onClick={closeModal} className="text-text-muted hover:text-text-main">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={formik.handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            {formik.errors.submit && (
                                <div className="bg-error/10 border border-error/20 text-error p-3 rounded-lg text-sm">
                                    {formik.errors.submit}
                                </div>
                            )}

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Banner Image</label>
                                <div
                                    className="border-2 border-dashed border-border-default rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {imagePreview ? (
                                        <div className="relative">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="max-h-40 mx-auto rounded-lg object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setImagePreview('');
                                                    formik.setFieldValue('image', '');
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="py-4">
                                            <Upload size={32} className="mx-auto mb-2 text-text-muted opacity-50" />
                                            <p className="text-sm text-text-muted">Click to upload an image</p>
                                            <p className="text-xs text-text-muted mt-1">Max 5MB — PNG, JPG, WebP</p>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                                <p className="text-xs text-text-muted mt-1">Or paste a URL below:</p>
                                <input
                                    name="image"
                                    type="text"
                                    className="input-field mt-1"
                                    placeholder="https://example.com/banner.jpg"
                                    value={formik.values.image}
                                    onChange={(e) => {
                                        formik.handleChange(e);
                                        setImagePreview(e.target.value);
                                    }}
                                    onBlur={formik.handleBlur}
                                />
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Title *</label>
                                <input
                                    name="title"
                                    type="text"
                                    className={`input-field ${formik.touched.title && formik.errors.title ? 'border-red-500' : ''}`}
                                    placeholder="Gaming Week — Up to 40% Off"
                                    value={formik.values.title}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                                {formik.touched.title && formik.errors.title && (
                                    <p className="text-red-400 text-sm mt-1">{formik.errors.title}</p>
                                )}
                            </div>

                            {/* Subtitle */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Subtitle</label>
                                <input
                                    name="subtitle"
                                    type="text"
                                    className="input-field"
                                    placeholder="Limited stock available. Shop before it's gone."
                                    value={formik.values.subtitle}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </div>

                            {/* CTA Label & Link */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">CTA Label</label>
                                    <input
                                        name="ctaLabel"
                                        type="text"
                                        className="input-field"
                                        placeholder="Shop Now"
                                        value={formik.values.ctaLabel}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">CTA Link</label>
                                    <input
                                        name="ctaLink"
                                        type="text"
                                        className="input-field"
                                        placeholder="/products"
                                        value={formik.values.ctaLink}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </div>
                            </div>

                            {/* Gradient (optional fallback) */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">
                                    Gradient <span className="text-xs opacity-60">(fallback if no image)</span>
                                </label>
                                <input
                                    name="gradient"
                                    type="text"
                                    className="input-field"
                                    placeholder="from-[#1a1a2e] via-[#16213e] to-[#0f3460]"
                                    value={formik.values.gradient}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-text-muted">Active on homepage</label>
                                <button
                                    type="button"
                                    onClick={() => formik.setFieldValue('active', !formik.values.active)}
                                    className={`transition-colors ${formik.values.active ? 'text-success' : 'text-text-muted'}`}
                                >
                                    {formik.values.active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                </button>
                            </div>

                            {/* Submit */}
                            <Button type="submit" className="w-full gap-2" disabled={formik.isSubmitting}>
                                <Save size={18} />
                                {formik.isSubmitting
                                    ? 'Saving...'
                                    : editingId ? 'Update Banner' : 'Create Banner'
                                }
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBanners;
