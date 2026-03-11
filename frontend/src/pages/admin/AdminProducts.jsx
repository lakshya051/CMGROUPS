import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Trash2, Edit, X, Save, Image, Upload } from 'lucide-react';
import Button from '../../components/ui/Button';
import { productsAPI, categoriesAPI, uploadAPI } from '../../lib/api';
import SectionLoader from '../../components/ui/SectionLoader';
import { useFormik } from 'formik';
import { addProductSchema } from '../../utils/validationSchemas';
import { handleImageError } from '../../utils/image';

const emptyProductValues = {
    title: '',
    price: '',
    stock: '',
    category: '',
    brand: '',
    image: '',
    condition: 'New',
    isSecondHand: false,
    isReturnable: true,
    returnWindowDays: 3,
    enableReferral: false,
    referrerPoints: '',
    refereePoints: '',
    sku: ''
};

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [categoriesList, setCategoriesList] = useState([]);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [specs, setSpecs] = useState({});

    // Variant state
    const [variants, setVariants] = useState([]);
    const [variantName, setVariantName] = useState('');
    const [variantPrice, setVariantPrice] = useState('');
    const [variantStock, setVariantStock] = useState('');
    const [variantSku, setVariantSku] = useState('');

    // Multi-image state
    const [productImages, setProductImages] = useState([]);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [uploadingImages, setUploadingImages] = useState(false);
    const fileInputRef = useRef(null);

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
            const finalImages = productImages.length > 0 ? productImages : (values.image ? [values.image] : []);
            if (finalImages.length === 0) {
                setErrors({ image: 'At least one image is required' });
                setSubmitting(false);
                return;
            }

            const productData = {
                title: values.title,
                price: parseFloat(values.price),
                stock: parseInt(values.stock),
                category: values.category,
                brand: values.brand || null,
                images: finalImages,
                description: values.description || null,
                specs: Object.keys(specs).length > 0 ? specs : null,
                isSecondHand: values.isSecondHand,
                isReturnable: values.isReturnable,
                returnWindowDays: parseInt(values.returnWindowDays || 3),
                referrerPoints: values.enableReferral && values.referrerPoints ? parseInt(values.referrerPoints) : null,
                refereePoints: values.enableReferral && values.refereePoints ? parseInt(values.refereePoints) : null,
                sku: values.sku || null
            };
            try {
                let savedProduct;
                if (editingProduct) {
                    savedProduct = await productsAPI.update(editingProduct.id, productData);
                    setProducts(prev => prev.map(p => p.id === editingProduct.id ? savedProduct : p));
                } else {
                    savedProduct = await productsAPI.create(productData);
                    setProducts(prev => [savedProduct, ...prev]);
                }

                // Handle Variants
                // For simplicity, if editing, we recreate variants based on the current state.
                let finalVariants = [...variants];

                // If no variants were defined by the admin, auto-generate one from the base details
                if (finalVariants.length === 0) {
                    finalVariants.push({
                        name: 'Standard',
                        price: parseFloat(values.price),
                        stock: parseInt(values.stock),
                        sku: values.sku || null
                    });
                }

                if (finalVariants.length > 0) {
                    // Delete existing variants if editing
                    if (editingProduct && editingProduct.variants) {
                        for (let v of editingProduct.variants) {
                            await productsAPI.deleteVariant(savedProduct.id, v.id);
                        }
                    }
                    // Create new variants
                    for (let variant of finalVariants) {
                        await productsAPI.addVariant(savedProduct.id, variant);
                    }
                    // Force refresh product list to get updated variants
                    const updatedRes = await productsAPI.getAll({ page, limit: 12, search: debouncedSearch || undefined });
                    if (updatedRes && updatedRes.data) {
                        setProducts(updatedRes.data);
                        setTotalPages(updatedRes.pagination?.totalPages || 1);
                        setTotalProducts(updatedRes.pagination?.total || updatedRes.data.length);
                    } else if (Array.isArray(updatedRes)) {
                        setProducts(updatedRes);
                        setTotalPages(1);
                        setTotalProducts(updatedRes.length);
                    }
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
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch categories independently
                categoriesAPI.getAll().then(setCategoriesList).catch(err => console.error('Categories load failed:', err));

                // Fetch Products
                const params = {
                    page,
                    limit: 12
                };
                if (debouncedSearch && debouncedSearch.trim()) {
                    params.search = debouncedSearch.trim();
                }

                const productsRes = await productsAPI.getAll(params);
                console.log('Admin Products API Response:', productsRes);

                if (productsRes && productsRes.data) {
                    setProducts(productsRes.data);
                    setTotalPages(productsRes.pagination?.totalPages || 1);
                    setTotalProducts(productsRes.pagination?.total || productsRes.data.length);
                } else if (Array.isArray(productsRes)) {
                    setProducts(productsRes);
                    setTotalPages(1);
                    setTotalProducts(productsRes.length);
                } else {
                    console.warn('Unexpected products API response structure:', productsRes);
                    setProducts([]);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('Failed to load products. Please check your connection.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [page, debouncedSearch]);

    // Open modal for Adding
    const openAddModal = () => {
        setEditingProduct(null);
        setSpecs({});
        setProductImages([]);
        setImageUrlInput('');
        formik.resetForm();
        setShowModal(true);
    };

    // Open modal for Editing
    const openEditModal = (product) => {
        setEditingProduct(product);
        setSpecs(product.specs || {});
        setVariants(product.variants || []);
        setProductImages(product.images || (product.image ? [product.image] : []));
        setImageUrlInput('');
        formik.resetForm({
            values: {
                title: product.title || '',
                price: product.price || '',
                stock: product.stock !== undefined ? product.stock : '',
                category: product.category || '',
                brand: product.brand || '',
                image: '',
                description: product.description || '',
                condition: product.condition || 'New',
                isSecondHand: product.isSecondHand || false,
                isReturnable: product.isReturnable !== undefined ? product.isReturnable : true,
                returnWindowDays: product.returnWindowDays !== undefined ? product.returnWindowDays : 3,
                enableReferral: product.referrerPoints !== null && product.referrerPoints !== undefined,
                referrerPoints: product.referrerPoints !== null ? product.referrerPoints : '',
                refereePoints: product.refereePoints !== null ? product.refereePoints : '',
                sku: product.sku || ''
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
        setVariants([]);
        setVariantName('');
        setVariantPrice('');
        setVariantStock('');
        setVariantSku('');
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

    const addVariant = () => {
        if (variantName.trim() && variantPrice !== '' && variantStock !== '') {
            setVariants(prev => [...prev, {
                id: Date.now(), // temp ID for UI list
                name: variantName.trim(),
                price: parseFloat(variantPrice),
                stock: parseInt(variantStock),
                sku: variantSku.trim() || null
            }]);
            setVariantName('');
            setVariantPrice('');
            setVariantStock('');
            setVariantSku('');
        }
    };

    const removeVariant = (id) => {
        setVariants(prev => prev.filter(v => v.id !== id));
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

    // Server-side filtering implemented above.
    const displayProducts = products;

    if (loading) return <SectionLoader message="Loading inventory..." />;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 glass-panel">
                <p className="text-error font-medium mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-1">Product Management</h1>
                    <p className="text-sm text-text-secondary">Manage your catalog, stock, and pricing.</p>
                </div>
                <Button variant="primary" onClick={openAddModal}><Plus size={18} className="mr-2" /> Add Product</Button>
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
                            <tr className="bg-page-bg text-text-secondary text-xs uppercase font-bold tracking-wider border-b border-border-default">
                                <th className="p-4">Product</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Price</th>
                                <th className="p-4">Stock</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-border-default">
                            {displayProducts.map(product => (
                                <tr key={product.id} className="hover:bg-surface-hover transition-colors text-text-main">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-surface p-1 flex-shrink-0">
                                                <img
                                                    src={product.images?.[0] || product.image}
                                                    alt=""
                                                    loading="lazy"
                                                    width={40}
                                                    height={40}
                                                    onError={handleImageError}
                                                    className="w-full h-full object-contain"
                                                />
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
                                                {product.brand && <p className="text-xs text-text-secondary">{product.brand}</p>}
                                                {product.variants && product.variants.length > 1 ? (
                                                    <span className="mt-1 inline-block px-2 py-0.5 text-[10px] bg-trust/10 text-trust rounded border border-trust font-bold tracking-wider">
                                                        {product.variants.length} Variants
                                                    </span>
                                                ) : (
                                                    <span className="mt-1 inline-block px-2 py-0.5 text-[10px] bg-page-bg text-text-secondary rounded-full border border-border-default font-bold tracking-wider">
                                                        Single
                                                    </span>
                                                )}
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
                                        <div className="flex items-center justify-end gap-xs">
                                            <button
                                                onClick={() => openEditModal(product)}
                                                className="p-xs hover:text-text-primary transition-colors hover:bg-surface-hover rounded text-text-secondary"
                                                title="Edit Product"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-xs hover:text-error transition-colors hover:bg-error/10 rounded text-text-secondary"
                                                title="Delete Product"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {displayProducts.length === 0 && (
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-sm bg-surface p-sm rounded-lg border border-border-default">
                    <button
                        className={`px-md py-xs rounded text-sm font-semibold transition-colors ${page === 1 ? 'bg-page-bg text-text-muted cursor-not-allowed border border-border-default' : 'bg-surface border border-border-default hover:bg-surface-hover text-text-primary'}`}
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span className="text-sm font-bold text-text-primary">
                        Page {page} of {totalPages} ({totalProducts} total)
                    </span>
                    <button
                        className={`px-md py-xs rounded text-sm font-semibold transition-colors ${page === totalPages ? 'bg-page-bg text-text-muted cursor-not-allowed border border-border-default' : 'bg-buy-primary text-text-primary hover:bg-buy-primary-hover border border-border-default'}`}
                        disabled={page === totalPages || loading}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Add/Edit Product Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-sm">
                    <div className="bg-surface border border-border-default rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in duration-300">
                        {/* Header */}
                        <div className="sticky top-0 bg-surface border-b border-border-default p-md flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-text-primary">
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            <button onClick={closeModal} className="text-text-muted hover:text-text-primary transition-colors p-xs rounded hover:bg-surface-hover">
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
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">SKU</label>
                                    <input
                                        type="text"
                                        name="sku"
                                        className="input-field"
                                        placeholder="e.g. RTX-4090-FE"
                                        value={formik.values.sku}
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
                                        {categoriesList.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
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
                                        className="w-5 h-5 text-primary bg-surface border-border-default rounded focus:ring-primary focus:ring-2"
                                    />
                                    <label htmlFor="isSecondHand" className="text-sm font-medium text-text-main cursor-pointer select-none">
                                        Item is Pre-Owned / Second Hand
                                    </label>
                                </div>
                            </div>

                            {/* Return Policy */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="isReturnable"
                                        name="isReturnable"
                                        checked={formik.values.isReturnable}
                                        onChange={formik.handleChange}
                                        className="w-5 h-5 text-primary bg-surface border-border-default rounded focus:ring-primary focus:ring-2"
                                    />
                                    <label htmlFor="isReturnable" className="text-sm font-medium text-text-main cursor-pointer select-none">
                                        Accept Returns for this item
                                    </label>
                                </div>
                                {formik.values.isReturnable && (
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">
                                            Return Window (Days)
                                        </label>
                                        <input type="number" name="returnWindowDays" className="input-field" value={formik.values.returnWindowDays} onChange={formik.handleChange} onBlur={formik.handleBlur} min="0" />
                                    </div>
                                )}
                            </div>

                            {/* Referral Points Overrides */}
                            <div className="bg-page-bg p-sm rounded-lg border border-border-default">
                                <div className="flex items-center gap-xs mb-sm">
                                    <input
                                        type="checkbox"
                                        id="enableReferral"
                                        name="enableReferral"
                                        checked={formik.values.enableReferral}
                                        onChange={formik.handleChange}
                                        className="w-4 h-4 accent-trust bg-surface border-border-default rounded"
                                    />
                                    <label htmlFor="enableReferral" className="font-semibold text-text-primary text-sm cursor-pointer select-none">
                                        Enable Referral Rewards for this item?
                                    </label>
                                </div>

                                {formik.values.enableReferral && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-sm animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                                                Referrer Points <span className="text-error">*</span>
                                            </label>
                                            <input type="number" required={formik.values.enableReferral} name="referrerPoints" className="input-field bg-surface" placeholder="e.g. 500" value={formik.values.referrerPoints} onChange={formik.handleChange} onBlur={formik.handleBlur} min="1" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                                                Referee Points <span className="text-error">*</span>
                                            </label>
                                            <input type="number" required={formik.values.enableReferral} name="refereePoints" className="input-field bg-surface" placeholder="e.g. 250" value={formik.values.refereePoints} onChange={formik.handleChange} onBlur={formik.handleBlur} min="0" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Product Images */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">
                                    Product Images <span className="text-error">*</span>
                                </label>

                                {/* Current images */}
                                {productImages.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {productImages.map((url, idx) => (
                                            <div key={idx} className="relative group w-16 h-16 rounded-lg border border-border-default overflow-hidden bg-page-bg">
                                                <img src={url} alt={`Product ${idx + 1}`} loading="lazy" width={64} height={64} onError={handleImageError} className="w-full h-full object-contain" />
                                                <button
                                                    type="button"
                                                    onClick={() => setProductImages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                                {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[9px] text-center">Main</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add by URL */}
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="url"
                                        className="input-field flex-1"
                                        placeholder="Paste image URL..."
                                        value={imageUrlInput}
                                        onChange={(e) => setImageUrlInput(e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={!imageUrlInput.trim()}
                                        onClick={() => {
                                            if (imageUrlInput.trim()) {
                                                setProductImages(prev => [...prev, imageUrlInput.trim()]);
                                                setImageUrlInput('');
                                            }
                                        }}
                                    >
                                        <Plus size={14} />
                                    </Button>
                                </div>

                                {/* Upload files */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;
                                        setUploadingImages(true);
                                        try {
                                            const base64Promises = files.map(file => new Promise((resolve) => {
                                                const reader = new FileReader();
                                                reader.onload = () => resolve(reader.result);
                                                reader.readAsDataURL(file);
                                            }));
                                            const base64Images = await Promise.all(base64Promises);
                                            const { urls } = await uploadAPI.uploadMultiple(base64Images);
                                            setProductImages(prev => [...prev, ...urls]);
                                        } catch (err) {
                                            console.error('Upload failed:', err);
                                        } finally {
                                            setUploadingImages(false);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingImages}
                                    className="w-full border-2 border-dashed border-border-default rounded-lg p-3 text-center text-sm text-text-muted hover:border-primary hover:text-primary transition-colors"
                                >
                                    {uploadingImages ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            Uploading...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <Upload size={16} /> Upload Images
                                        </span>
                                    )}
                                </button>

                                {productImages.length === 0 && formik.touched.image && (
                                    <p className="text-red-400 text-sm mt-1">At least one image is required</p>
                                )}
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
                                    <div className="space-y-sm mb-sm">
                                        {Object.entries(specs).map(([key, value]) => (
                                            <div key={key} className="flex items-center gap-sm bg-page-bg rounded border border-border-default px-sm py-xs text-sm">
                                                <span className="text-text-secondary font-semibold min-w-[80px]">{key}</span>
                                                <span className="text-text-primary flex-1">{value}</span>
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

                            {/* Variants Setup */}
                            <div className="pt-4 border-t border-border-default">
                                <label className="block text-sm font-medium text-text-muted mb-2">Product Variants</label>

                                {variants.length > 0 && (
                                    <div className="overflow-x-auto mb-4 border border-border-default rounded-lg">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-page-bg text-text-secondary">
                                                <tr>
                                                    <th className="p-3 font-medium">Variant Name</th>
                                                    <th className="p-3 font-medium">Price (₹)</th>
                                                    <th className="p-3 font-medium">Stock</th>
                                                    <th className="p-3 font-medium">SKU</th>
                                                    <th className="p-3 font-medium text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-default">
                                                {variants.map(variant => (
                                                    <tr key={variant.id} className="bg-surface">
                                                        <td className="p-3 font-medium">{variant.name}</td>
                                                        <td className="p-3 text-success">₹{variant.price}</td>
                                                        <td className="p-3">{variant.stock}</td>
                                                        <td className="p-3 font-mono text-xs text-text-muted">{variant.sku || '-'}</td>
                                                        <td className="p-3 text-right">
                                                            <button type="button" onClick={() => removeVariant(variant.id)} className="text-text-muted hover:text-error transition-colors p-1" title="Delete Variant">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                                    <div className="md:col-span-2">
                                        <input type="text" className="input-field" placeholder="Variant Name (e.g. 1TB SSD)" value={variantName} onChange={(e) => setVariantName(e.target.value)} />
                                    </div>
                                    <input type="number" className="input-field" placeholder="Price" value={variantPrice} onChange={(e) => setVariantPrice(e.target.value)} min="0" />
                                    <input type="number" className="input-field" placeholder="Stock" value={variantStock} onChange={(e) => setVariantStock(e.target.value)} min="0" />
                                    <div className="flex gap-2">
                                        <input type="text" className="input-field flex-1" placeholder="SKU" value={variantSku} onChange={(e) => setVariantSku(e.target.value)} />
                                        <Button type="button" variant="outline" className="px-3" onClick={addVariant}>
                                            <Plus size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-sm pt-md border-t border-border-default mt-md">
                                <Button type="submit" variant="primary" className="flex-1 gap-sm" disabled={formik.isSubmitting}>
                                    <Save size={18} />
                                    {formik.isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                                </Button>
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Cancel</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;
