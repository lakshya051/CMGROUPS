import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Trash2, Edit, X, Save, Image } from 'lucide-react';
import Button from '../../components/ui/Button';
import { productsAPI } from '../../lib/api';
import { useFormik } from 'formik';
import { addProductSchema } from '../../utils/validationSchemas';

const emptyProductValues = {
    title: '',
    price: '',
    stock: '',
    category: '',
    brand: '',
    image: '',
    description: '',
    condition: 'New',
    isSecondHand: false
};

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [specs, setSpecs] = useState({});

    // Specs state (key-value pairs)
    const [specKey, setSpecKey] = useState('');
    const [specValue, setSpecValue] = useState('');

    const formik = useFormik({
        initialValues: emptyProductValues,
        validationSchema: addProductSchema,
        validateOnBlur: true,
        validateOnChange: false,
        enableReinitialize: true,
        onSubmit: async (values, { setSubmitting, setErrors }) => {
            const productData = {
                title: values.title,
                price: parseFloat(values.price),
                stock: parseInt(values.stock),
                category: values.category,
                brand: values.brand || null,
                image: values.image,
                description: values.description || null,
                specs: Object.keys(specs).length > 0 ? specs : null,
                condition: values.condition,
                isSecondHand: values.isSecondHand,
            };
            try {
                if (editingProduct) {
                    const updated = await productsAPI.update(editingProduct.id, productData);
                    setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
                } else {
                    const created = await productsAPI.create(productData);
                    setProducts(prev => [created, ...prev]);
                }
                closeModal();
            } catch (err) {
                setErrors({ submit: err.message || 'Failed to save product.' });
            } finally {
                setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        productsAPI.getAll()
            .then(data => {
                setProducts(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch products:', err);
                setLoading(false);
            });
    }, []);

    // Open modal for Adding
    const openAddModal = () => {
        setEditingProduct(null);
        setSpecs({});
        formik.resetForm();
        setShowModal(true);
    };

    // Open modal for Editing
    const openEditModal = (product) => {
        setEditingProduct(product);
        setSpecs(product.specs || {});
        formik.resetForm({
            values: {
                title: product.title || '',
                price: product.price || '',
                stock: product.stock || '',
                category: product.category || '',
                brand: product.brand || '',
                image: product.image || '',
                description: product.description || '',
                condition: product.condition || 'New',
                isSecondHand: product.isSecondHand || false,
            }
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingProduct(null);
        setSpecs({});
        setSpecKey('');
        setSpecValue('');
        formik.resetForm();
    };

    const addSpec = () => {
        if (specKey.trim() && specValue.trim()) {
            setSpecs(prev => ({ ...prev, [specKey.trim()]: specValue.trim() }));
            setSpecKey('');
            setSpecValue('');
        }
    };

    const removeSpec = (key) => {
        setSpecs(prev => { const s = { ...prev }; delete s[key]; return s; });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await productsAPI.delete(id);
                setProducts(prev => prev.filter(p => p.id !== id));
            } catch (err) {
                console.error('Failed to delete product:', err);
            }
        }
    };

    const filteredProducts = products.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-text-muted">Loading Inventory...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold mb-1">Product Management</h1>
                    <p className="text-text-muted">Manage your catalog, stock, and pricing.</p>
                </div>
                <Button onClick={openAddModal}><Plus size={18} className="mr-2" /> Add Product</Button>
            </div>

            {/* Search */}
            <div className="glass-panel p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="input-field pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Products Table */}
            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-text-muted text-xs uppercase tracking-wider border-b border-gray-200">
                                <th className="p-4">Product</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Price</th>
                                <th className="p-4">Stock</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100">
                            {filteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-gray-50 transition-colors text-text-main">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-white p-1 flex-shrink-0">
                                                <img src={product.image} alt="" className="w-full h-full object-contain" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{product.title}</span>
                                                    {product.isSecondHand && (
                                                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-100 text-amber-700 rounded-full">
                                                            Pre-Owned ({product.condition})
                                                        </span>
                                                    )}
                                                </div>
                                                {product.brand && <p className="text-xs text-text-muted">{product.brand}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-text-muted">{product.category}</td>
                                    <td className="p-4 font-bold">₹{product.price.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${product.stock > 10 ? 'bg-success/10 text-success' :
                                            product.stock > 0 ? 'bg-orange-500/10 text-orange-500' :
                                                'bg-error/10 text-error'}`}>
                                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(product)}
                                                className="p-2 hover:text-primary transition-colors hover:bg-gray-50 rounded"
                                                title="Edit Product"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 hover:text-error transition-colors hover:bg-gray-50 rounded"
                                                title="Delete Product"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-text-muted">
                                        No products found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Product Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
                    <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in duration-300">
                        {/* Header */}
                        <div className="sticky top-0 bg-surface border-b border-gray-200 p-6 flex items-center justify-between z-10">
                            <h2 className="text-2xl font-heading font-bold">
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            <button onClick={closeModal} className="text-text-muted hover:text-text-main transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={formik.handleSubmit} className="p-6 space-y-6">
                            {formik.errors.submit && (
                                <div className="bg-error/10 border border-error/20 text-error p-3 rounded-lg text-sm">
                                    {formik.errors.submit}
                                </div>
                            )}

                            {/* Title & Brand */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">
                                        Product Title <span className="text-error">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        className={`input-field ${formik.touched.title && formik.errors.title ? 'border-red-500' : ''}`}
                                        placeholder="e.g. NVIDIA RTX 4090"
                                        value={formik.values.title}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                    {formik.touched.title && formik.errors.title && <p className="text-red-400 text-sm mt-1">{formik.errors.title}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">Brand</label>
                                    <input
                                        type="text"
                                        name="brand"
                                        className="input-field"
                                        placeholder="e.g. NVIDIA"
                                        value={formik.values.brand}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </div>
                            </div>

                            {/* Price, Stock, Category */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">
                                        Price (₹) <span className="text-error">*</span>
                                    </label>
                                    <input type="number" name="price" className={`input-field ${formik.touched.price && formik.errors.price ? 'border-red-500' : ''}`} placeholder="245000" value={formik.values.price} onChange={formik.handleChange} onBlur={formik.handleBlur} min="0" step="0.01" />
                                    {formik.touched.price && formik.errors.price && <p className="text-red-400 text-sm mt-1">{formik.errors.price}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">
                                        Stock <span className="text-error">*</span>
                                    </label>
                                    <input type="number" name="stock" className={`input-field ${formik.touched.stock && formik.errors.stock ? 'border-red-500' : ''}`} placeholder="15" value={formik.values.stock} onChange={formik.handleChange} onBlur={formik.handleBlur} min="0" />
                                    {formik.touched.stock && formik.errors.stock && <p className="text-red-400 text-sm mt-1">{formik.errors.stock}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">
                                        Category <span className="text-error">*</span>
                                    </label>
                                    <select name="category" className={`input-field ${formik.touched.category && formik.errors.category ? 'border-red-500' : ''}`} value={formik.values.category} onChange={formik.handleChange} onBlur={formik.handleBlur}>
                                        <option value="">Select category</option>
                                        <option value="GPU">GPU</option>
                                        <option value="CPU">CPU</option>
                                        <option value="RAM">RAM</option>
                                        <option value="Storage">Storage</option>
                                        <option value="Motherboard">Motherboard</option>
                                        <option value="PSU">PSU</option>
                                        <option value="Case">Case</option>
                                        <option value="Cooling">Cooling</option>
                                        <option value="Monitor">Monitor</option>
                                        <option value="Peripherals">Peripherals</option>
                                        <option value="Accessories">Accessories</option>
                                    </select>
                                    {formik.touched.category && formik.errors.category && <p className="text-red-400 text-sm mt-1">{formik.errors.category}</p>}
                                </div>
                            </div>

                            {/* Condition and Second Hand */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">
                                        Condition <span className="text-error">*</span>
                                    </label>
                                    <select name="condition" className="input-field" value={formik.values.condition} onChange={formik.handleChange} onBlur={formik.handleBlur}>
                                        <option value="New">New</option>
                                        <option value="Like New">Like New</option>
                                        <option value="Good">Good</option>
                                        <option value="Fair">Fair</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="isSecondHand"
                                        name="isSecondHand"
                                        checked={formik.values.isSecondHand}
                                        onChange={formik.handleChange}
                                        className="w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                                    />
                                    <label htmlFor="isSecondHand" className="text-sm font-medium text-text-main cursor-pointer select-none">
                                        Item is Pre-Owned / Second Hand
                                    </label>
                                </div>
                            </div>

                            {/* Image URL */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">
                                    Image URL <span className="text-error">*</span>
                                </label>
                                <div>
                                    <div className="flex gap-3">
                                        <input type="url" name="image" className={`input-field flex-1 ${formik.touched.image && formik.errors.image ? 'border-red-500' : ''}`} placeholder="https://example.com/product.png" value={formik.values.image} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                                        {formik.values.image && (
                                            <div className="w-12 h-12 rounded bg-white p-1 flex-shrink-0 border border-gray-200">
                                                <img src={formik.values.image} alt="Preview" className="w-full h-full object-contain" onError={(e) => e.target.style.display = 'none'} />
                                            </div>
                                        )}
                                    </div>
                                    {formik.touched.image && formik.errors.image && <p className="text-red-400 text-sm mt-1">{formik.errors.image}</p>}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
                                <textarea name="description" className="input-field min-h-[80px]" placeholder="Product description..." value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                            </div>

                            {/* Specs (key-value pairs) */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-2">Technical Specifications</label>

                                {/* Existing specs */}
                                {Object.keys(specs).length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {Object.entries(specs).map(([key, value]) => (
                                            <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                                                <span className="text-text-muted font-medium min-w-[80px]">{key}</span>
                                                <span className="text-text-main flex-1">{value}</span>
                                                <button type="button" onClick={() => removeSpec(key)} className="text-text-muted hover:text-error transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add spec */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="input-field flex-1"
                                        placeholder="Spec name (e.g. Memory)"
                                        value={specKey}
                                        onChange={(e) => setSpecKey(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="input-field flex-1"
                                        placeholder="Value (e.g. 24GB GDDR6X)"
                                        value={specValue}
                                        onChange={(e) => setSpecValue(e.target.value)}
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={addSpec}>
                                        <Plus size={16} />
                                    </Button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <Button type="submit" className="flex-1 gap-2" disabled={formik.isSubmitting}>
                                    <Save size={18} />
                                    {formik.isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                                </Button>
                                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;
