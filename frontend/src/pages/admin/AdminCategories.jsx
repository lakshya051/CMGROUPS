import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Trash2, Edit, X, Save, Image, Folder } from 'lucide-react';
import Button from '../../components/ui/Button';
import { categoriesAPI } from '../../lib/api';
import { useFormik } from 'formik';
import { addCategorySchema } from '../../utils/validationSchemas';

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const formik = useFormik({
        initialValues: { name: '', image: '', description: '' },
        validationSchema: addCategorySchema,
        validateOnBlur: true,
        validateOnChange: false,
        onSubmit: async (values, { setSubmitting, setErrors, resetForm }) => {
            try {
                const newCategory = await categoriesAPI.create(values);
                setCategories(prev => [...prev, newCategory]);
                setShowModal(false);
                resetForm();
            } catch (err) {
                setErrors({ submit: err.message || 'Failed to create category' });
            } finally {
                setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await categoriesAPI.getAll();
            setCategories(data);
        } catch (err) {
            console.error('Failed to load categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure? This cannot be undone.')) return;
        try {
            await categoriesAPI.delete(id);
            setCategories(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Failed to delete category:', err);
        }
    };

    const openModal = () => { formik.resetForm(); setShowModal(true); };
    const closeModal = () => { setShowModal(false); formik.resetForm(); };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-text-muted">Loading Categories...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold mb-1">Categories</h1>
                    <p className="text-text-muted">Manage product categories.</p>
                </div>
                <Button onClick={openModal}>
                    <Plus size={18} className="mr-2" /> Add Category
                </Button>
            </div>

            {/* Search */}
            <div className="glass-panel p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Search categories..."
                        className="input-field pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map(category => (
                    <div key={category.id} className="glass-panel p-4 flex items-center justify-between hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                {category.image ? (
                                    <img src={category.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Folder className="text-gray-400" size={24} />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{category.name}</h3>
                                <p className="text-xs text-text-muted font-mono">{category.slug}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(category.id)}
                            className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-md relative animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold">Add Category</h2>
                            <button onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={formik.handleSubmit} className="p-6 space-y-4">
                            {formik.errors.submit && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{formik.errors.submit}</div>}

                            <div>
                                <label className="block text-sm font-medium mb-1">Name *</label>
                                <input name="name" className={`input-field ${formik.touched.name && formik.errors.name ? 'border-red-500' : ''}`} value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                                {formik.touched.name && formik.errors.name && <p className="text-red-400 text-sm mt-1">{formik.errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Image URL (Optional)</label>
                                <input name="image" className="input-field" value={formik.values.image} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                <textarea name="description" className="input-field" value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                            </div>

                            <Button type="submit" className="w-full" disabled={formik.isSubmitting}>
                                {formik.isSubmitting ? 'Creating...' : 'Create Category'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCategories;
