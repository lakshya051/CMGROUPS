import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Trash2, Edit, X, Save, Image, Upload, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import { productsAPI, categoriesAPI, uploadAPI } from '../../lib/api';
import SectionLoader from '../../components/ui/SectionLoader';
import { useFormik } from 'formik';
import { addProductSchema } from '../../utils/validationSchemas';
import { handleImageError } from '../../utils/image';
import toast from 'react-hot-toast';

const emptyProductValues = {
    title: '',
    price: '',
    originalPrice: '',
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
    sku: '',
    sellerName: ''
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
    const [isVariableProduct, setIsVariableProduct] = useState(false);
    const [variantOptions, setVariantOptions] = useState([]);
    const [generatingVariants, setGeneratingVariants] = useState(false);
    const [savingVariants, setSavingVariants] = useState(false);
    const [bulkMrp, setBulkMrp] = useState('');
    const [bulkPrice, setBulkPrice] = useState('');

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
                price: isVariableProduct ? 0 : parseFloat(values.price),
                originalPrice: isVariableProduct ? null : (values.originalPrice ? parseFloat(values.originalPrice) : null),
                stock: isVariableProduct ? 0 : parseInt(values.stock),
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
                sku: values.sku || null,
                hasVariants: isVariableProduct,
                sellerName: values.sellerName?.trim() || null
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

                if (isVariableProduct) {
                    // Save variant options
                    if (editingProduct) {
                        const existingOpts = editingProduct.variantOptions || [];
                        for (const opt of existingOpts) {
                            await productsAPI.deleteOption(savedProduct.id, opt.id);
                        }
                    }
                    for (const opt of variantOptions) {
                        if (opt.name.trim() && opt.values.length > 0) {
                            await productsAPI.addOption(savedProduct.id, {
                                name: opt.name.trim(),
                                values: opt.values.filter(v => v.trim())
                            });
                        }
                    }

                    // Save variants via bulk
                    const variantsToSave = variants
                        .filter(v => v.price !== '' && v.price !== undefined)
                        .map(v => ({
                            id: typeof v.id === 'number' ? v.id : undefined,
                            name: v.name || null,
                            combination: v.combination || null,
                            price: parseFloat(v.price),
                            originalPrice: v.originalPrice != null && v.originalPrice !== '' ? parseFloat(v.originalPrice) : null,
                            stock: parseInt(v.stock || 0),
                            sku: v.sku || null,
                            isActive: v.isActive !== undefined ? v.isActive : true,
                            image: v.image || null
                        }));

                    if (variantsToSave.length > 0) {
                        if (editingProduct && editingProduct.variants) {
                            const existingIds = new Set(variantsToSave.filter(v => v.id).map(v => v.id));
                            for (const v of editingProduct.variants) {
                                if (!existingIds.has(v.id)) {
                                    await productsAPI.deleteVariant(savedProduct.id, v.id);
                                }
                            }
                        }
                        await productsAPI.bulkSaveVariants(savedProduct.id, variantsToSave);
                    }
                } else {
                    // Simple product — handle flat variants like before
                    const completeVariants = variants
                        .filter(v => String(v.name || '').trim() && v.price !== '' && v.stock !== '')
                        .map(v => ({
                            name: String(v.name).trim(),
                            price: parseFloat(v.price),
                            originalPrice: v.originalPrice != null && v.originalPrice !== '' && !isNaN(parseFloat(v.originalPrice)) ? parseFloat(v.originalPrice) : null,
                            stock: parseInt(v.stock, 10),
                            sku: String(v.sku || '').trim() || null
                        }));

                    const finalVariants = completeVariants.length > 0 ? completeVariants : [{
                        name: 'Standard',
                        price: parseFloat(values.price),
                        stock: parseInt(values.stock),
                        sku: values.sku || null
                    }];

                    if (editingProduct && editingProduct.variants) {
                        for (let v of editingProduct.variants) {
                            await productsAPI.deleteVariant(savedProduct.id, v.id);
                        }
                    }
                    for (let variant of finalVariants) {
                        await productsAPI.addVariant(savedProduct.id, variant);
                    }
                }

                // Force refresh product list
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
        setIsVariableProduct(false);
        setVariantOptions([]);
        setVariants([]);
        setBulkMrp('');
        setBulkPrice('');
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
        setIsVariableProduct(product.hasVariants || false);
        setBulkMrp('');
        setBulkPrice('');

        if (product.variantOptions && product.variantOptions.length > 0) {
            setVariantOptions(product.variantOptions.map(opt => ({
                id: opt.id,
                name: opt.name,
                values: opt.values.map(v => v.value)
            })));
        } else {
            setVariantOptions([]);
        }

        const isVar = product.hasVariants || false;
        formik.resetForm({
            values: {
                title: product.title || '',
                price: isVar ? '1' : (product.price || ''),
                originalPrice: product.originalPrice != null ? product.originalPrice : '',
                stock: isVar ? '0' : (product.stock !== undefined ? product.stock : ''),
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
                sku: product.sku || '',
                sellerName: product.sellerName || ''
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
        setIsVariableProduct(false);
        setVariantOptions([]);
        setBulkMrp('');
        setBulkPrice('');
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
        setVariants(prev => [...prev, {
            id: `new-${Date.now()}`,
            name: '',
            price: '',
            originalPrice: '',
            stock: '',
            sku: ''
        }]);
    };

    const updateVariant = (index, field, value) => {
        setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
    };

    const removeVariant = (id) => {
        setVariants(prev => prev.filter(v => v.id !== id));
    };

    // Variant Options Builder
    const addVariantOption = () => {
        if (variantOptions.length >= 3) {
            toast.error('Maximum 3 options allowed');
            return;
        }
        setVariantOptions(prev => [...prev, { id: `new-${Date.now()}`, name: '', values: [] }]);
    };

    const updateVariantOption = (index, field, value) => {
        setVariantOptions(prev => prev.map((opt, i) => i === index ? { ...opt, [field]: value } : opt));
    };

    const removeVariantOption = (index) => {
        setVariantOptions(prev => prev.filter((_, i) => i !== index));
    };

    const addOptionValue = (optIndex, value) => {
        if (!value.trim()) return;
        setVariantOptions(prev => prev.map((opt, i) =>
            i === optIndex ? { ...opt, values: [...opt.values, value.trim()] } : opt
        ));
    };

    const removeOptionValue = (optIndex, valIndex) => {
        setVariantOptions(prev => prev.map((opt, i) =>
            i === optIndex ? { ...opt, values: opt.values.filter((_, vi) => vi !== valIndex) } : opt
        ));
    };

    const handleGenerateVariants = () => {
        const validOpts = variantOptions.filter(o => o.name.trim() && o.values.length > 0);
        if (validOpts.length === 0) { toast.error('Add at least one option with values first'); return; }

        const cartesian = (arrays) => arrays.reduce((acc, curr) => {
            const result = [];
            for (const a of acc) for (const b of curr) result.push([...a, b]);
            return result;
        }, [[]]);

        const arrays = validOpts.map(opt => opt.values.map(v => ({ optName: opt.name, value: v })));
        const combos = cartesian(arrays);

        const existingByKey = new Map();
        for (const v of variants) {
            if (v.combination) {
                const key = JSON.stringify(
                    Object.fromEntries(Object.entries(v.combination).sort((a, b) => a[0].localeCompare(b[0])))
                );
                existingByKey.set(key, v);
            }
        }

        const merged = [];
        let created = 0;
        for (const combo of combos) {
            const combination = Object.fromEntries(combo.map(c => [c.optName, c.value]));
            const key = JSON.stringify(
                Object.fromEntries(Object.entries(combination).sort((a, b) => a[0].localeCompare(b[0])))
            );
            const existing = existingByKey.get(key);
            if (existing) {
                merged.push(existing);
            } else {
                created++;
                merged.push({
                    id: `gen-${Date.now()}-${created}`,
                    name: combo.map(c => c.value).join(' / '),
                    combination,
                    price: formik.values.price || '',
                    originalPrice: formik.values.originalPrice || '',
                    stock: '0',
                    sku: '',
                    isActive: true
                });
            }
        }

        setVariants(merged);
        toast.success(`${created} new combination${created !== 1 ? 's' : ''} generated (${merged.length} total)`);
    };

    const handleBulkFill = () => {
        setVariants(prev => prev.map(v => ({
            ...v,
            originalPrice: bulkMrp && (v.originalPrice === '' || v.originalPrice == null) ? bulkMrp : v.originalPrice,
            price: bulkPrice && (v.price === '' || v.price == null) ? bulkPrice : v.price,
        })));
        toast.success('Applied to empty cells');
    };

    const handleToggleProductType = () => {
        if (isVariableProduct && editingProduct) {
            if (!window.confirm('This will hide all variant prices. Product will use the MRP and Selling Price fields instead. Variants are not deleted.')) return;
        }
        const next = !isVariableProduct;
        setIsVariableProduct(next);
        if (next) {
            formik.setFieldValue('price', '1');
            formik.setFieldValue('stock', '0');
        }
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
                                                {product.hasVariants ? (
                                                    <span className="mt-1 inline-block px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded border border-primary/30 font-bold tracking-wider">
                                                        Variable · {product.variants?.length || 0} combinations
                                                    </span>
                                                ) : product.variants && product.variants.length > 1 ? (
                                                    <span className="mt-1 inline-block px-2 py-0.5 text-[10px] bg-trust/10 text-trust rounded border border-trust font-bold tracking-wider">
                                                        {product.variants.length} Variants
                                                    </span>
                                                ) : (
                                                    <span className="mt-1 inline-block px-2 py-0.5 text-[10px] bg-page-bg text-text-secondary rounded-full border border-border-default font-bold tracking-wider">
                                                        Simple
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-text-muted">{product.category}</td>
                                    <td className="p-4 font-bold">
                                        {product.hasVariants && product.variants?.length > 0
                                            ? `From ₹${Math.min(...product.variants.map(v => v.price)).toLocaleString()}`
                                            : `₹${product.price.toLocaleString()}`}
                                    </td>
                                    <td className="p-4">
                                        {(() => {
                                            const totalStock = product.hasVariants && product.variants?.length > 0
                                                ? product.variants.reduce((sum, v) => sum + v.stock, 0)
                                                : product.stock;
                                            return (
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${totalStock > 10 ? 'bg-success/10 text-success' :
                                                    totalStock > 0 ? 'bg-orange-500/10 text-orange-500' :
                                                        'bg-error/10 text-error'}`}>
                                                    {totalStock > 0 ? `${totalStock} in stock` : 'Out of stock'}
                                                </span>
                                            );
                                        })()}
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
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">Seller Name</label>
                                    <input
                                        type="text"
                                        name="sellerName"
                                        className="input-field"
                                        placeholder="e.g. Advance Computer Empire"
                                        value={formik.values.sellerName}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </div>
                            </div>

                            {/* Product Type Toggle */}
                            <div className="bg-page-bg rounded-lg border border-border-default p-4">
                                <label className="block text-sm font-bold text-text-primary mb-3">Product Type</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => { if (isVariableProduct) handleToggleProductType(); }}
                                        className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${!isVariableProduct ? 'border-primary bg-primary/10 text-primary' : 'border-border-default text-text-secondary hover:border-primary/50'}`}
                                    >
                                        <span className="block font-bold">Simple Product</span>
                                        <span className="text-xs opacity-75">One price, no options</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { if (!isVariableProduct) handleToggleProductType(); }}
                                        className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${isVariableProduct ? 'border-primary bg-primary/10 text-primary' : 'border-border-default text-text-secondary hover:border-primary/50'}`}
                                    >
                                        <span className="block font-bold">Variable Product</span>
                                        <span className="text-xs opacity-75">Multiple sizes, colors, etc.</span>
                                    </button>
                                </div>
                            </div>

                            {/* Price, Original Price, Stock — only for Simple products */}
                            {!isVariableProduct && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1">
                                                Selling Price (₹) <span className="text-error">*</span>
                                            </label>
                                            <input type="number" name="price" className={`input-field ${formik.touched.price && formik.errors.price ? 'border-red-500' : ''}`} placeholder="32000" value={formik.values.price} onChange={formik.handleChange} onBlur={formik.handleBlur} min="0" step="0.01" />
                                            {formik.touched.price && formik.errors.price && <p className="text-red-400 text-sm mt-1">{formik.errors.price}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1">
                                                Original / MRP Price (₹)
                                            </label>
                                            <input type="number" name="originalPrice" className="input-field" placeholder="45000 (leave empty if no discount)" value={formik.values.originalPrice} onChange={formik.handleChange} onBlur={formik.handleBlur} min="0" step="0.01" />
                                            <p className="text-xs text-text-muted mt-1">If set higher than selling price, a strikethrough + discount badge will appear</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                </>
                            )}

                            {/* Category — for Variable product (price/stock hidden) */}
                            {isVariableProduct && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            )}

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

                            {/* Variable Product: Options Builder + Variants Table */}
                            {isVariableProduct && (
                                <div className="pt-4 border-t border-border-default space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-text-primary mb-1">Product Options</label>
                                        <p className="text-xs text-text-muted mb-3">
                                            Define option types (e.g. Storage, Material) and their values. Then generate all combinations.
                                        </p>
                                    </div>

                                    {variantOptions.map((opt, optIdx) => (
                                        <div key={opt.id || optIdx} className="bg-page-bg rounded-lg border border-border-default p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-text-muted uppercase">Option {optIdx + 1}</span>
                                                <input
                                                    type="text"
                                                    className="input-field py-1.5 text-sm flex-1"
                                                    placeholder="e.g. Storage, Material, Color"
                                                    value={opt.name}
                                                    onChange={(e) => updateVariantOption(optIdx, 'name', e.target.value)}
                                                />
                                                <button type="button" onClick={() => removeVariantOption(optIdx)} className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {opt.values.map((val, valIdx) => (
                                                    <span key={valIdx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface border border-border-default rounded-full text-sm text-text-primary">
                                                        {val}
                                                        <button type="button" onClick={() => removeOptionValue(optIdx, valIdx)} className="text-text-muted hover:text-error">
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                                <OptionValueInput onAdd={(val) => addOptionValue(optIdx, val)} />
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex gap-2">
                                        {variantOptions.length < 3 && (
                                            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addVariantOption}>
                                                <Plus size={14} /> Add Another Option
                                            </Button>
                                        )}
                                        {variantOptions.some(o => o.name.trim() && o.values.length > 0) && (
                                            <Button
                                                type="button"
                                                variant="primary"
                                                size="sm"
                                                className="gap-1"
                                                onClick={handleGenerateVariants}
                                                disabled={generatingVariants}
                                            >
                                                <Zap size={14} /> {generatingVariants ? 'Generating...' : 'Generate All Combinations'}
                                            </Button>
                                        )}
                                    </div>

                                    {/* Variants Table */}
                                    {variants.length > 0 && (
                                        <div className="space-y-3">
                                            <label className="block text-sm font-bold text-text-primary">
                                                Variants ({variants.length})
                                            </label>

                                            {/* Bulk fill */}
                                            <div className="flex flex-wrap items-center gap-2 bg-surface border border-border-default rounded-lg p-2">
                                                <span className="text-xs font-medium text-text-muted">Fill all:</span>
                                                <input type="number" className="input-field py-1 text-xs w-24" placeholder="MRP" value={bulkMrp} onChange={e => setBulkMrp(e.target.value)} min="0" step="0.01" />
                                                <input type="number" className="input-field py-1 text-xs w-24" placeholder="Price" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} min="0" step="0.01" />
                                                <Button type="button" variant="outline" size="sm" className="text-xs py-1" onClick={handleBulkFill}>
                                                    Apply to empty
                                                </Button>
                                            </div>

                                            <div className="overflow-x-auto border border-border-default rounded-lg">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-page-bg text-text-secondary">
                                                        <tr>
                                                            <th className="p-2 font-medium">Combination</th>
                                                            <th className="p-2 font-medium w-24">SKU</th>
                                                            <th className="p-2 font-medium w-24">MRP (₹)</th>
                                                            <th className="p-2 font-medium w-24">Price (₹)</th>
                                                            <th className="p-2 font-medium w-20">Stock</th>
                                                            <th className="p-2 font-medium w-16 text-center">Active</th>
                                                            <th className="p-2 w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border-default">
                                                        {variants.map((variant, index) => (
                                                            <tr key={variant.id} className="bg-surface">
                                                                <td className="p-2">
                                                                    <span className="text-sm text-text-primary font-medium">
                                                                        {variant.combination
                                                                            ? Object.values(variant.combination).join(' / ')
                                                                            : variant.name || `Variant ${index + 1}`}
                                                                    </span>
                                                                </td>
                                                                <td className="p-2">
                                                                    <input type="text" className="input-field py-1.5 text-xs w-full font-mono" placeholder="Optional" value={variant.sku ?? ''} onChange={(e) => updateVariant(index, 'sku', e.target.value)} />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input type="number" className="input-field py-1.5 text-xs w-full" placeholder="0" min="0" step="0.01" value={variant.originalPrice ?? ''} onChange={(e) => updateVariant(index, 'originalPrice', e.target.value)} />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input type="number" className="input-field py-1.5 text-xs w-full" placeholder="0" min="0" step="0.01" value={variant.price ?? ''} onChange={(e) => updateVariant(index, 'price', e.target.value)} />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input type="number" className="input-field py-1.5 text-xs w-full" placeholder="0" min="0" value={variant.stock ?? ''} onChange={(e) => updateVariant(index, 'stock', e.target.value)} />
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={variant.isActive !== false}
                                                                        onChange={(e) => updateVariant(index, 'isActive', e.target.checked)}
                                                                        className="w-4 h-4 accent-primary"
                                                                    />
                                                                </td>
                                                                <td className="p-2 text-right">
                                                                    <button type="button" onClick={() => removeVariant(variant.id)} className="p-1 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Simple Product: flat variants table */}
                            {!isVariableProduct && (
                                <div className="pt-4 border-t border-border-default">
                                    <label className="block text-sm font-medium text-text-muted mb-1">Product options (variants)</label>
                                    <p className="text-xs text-text-muted mb-3">
                                        Add options like Size, Storage, or Color. Each row = one option with its own price and stock. Leave all rows empty to use a single &quot;Standard&quot; option.
                                    </p>
                                    <div className="overflow-x-auto border border-border-default rounded-lg">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-page-bg text-text-secondary">
                                                <tr>
                                                    <th className="p-2 font-medium">Option name</th>
                                                    <th className="p-2 font-medium w-24">Price (₹)</th>
                                                    <th className="p-2 font-medium w-20">Stock</th>
                                                    <th className="p-2 font-medium w-24">SKU</th>
                                                    <th className="p-2 w-10 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-default">
                                                {variants.map((variant, index) => (
                                                    <tr key={variant.id} className="bg-surface">
                                                        <td className="p-2">
                                                            <input type="text" className="input-field py-1.5 text-sm" placeholder="e.g. 128GB, Red, Large" value={variant.name ?? ''} onChange={(e) => updateVariant(index, 'name', e.target.value)} />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="number" className="input-field py-1.5 text-sm w-full" placeholder="0" min="0" step="0.01" value={variant.price ?? ''} onChange={(e) => updateVariant(index, 'price', e.target.value)} />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="number" className="input-field py-1.5 text-sm w-full" placeholder="0" min="0" value={variant.stock ?? ''} onChange={(e) => updateVariant(index, 'stock', e.target.value)} />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="text" className="input-field py-1.5 text-sm w-full font-mono" placeholder="Optional" value={variant.sku ?? ''} onChange={(e) => updateVariant(index, 'sku', e.target.value)} />
                                                        </td>
                                                        <td className="p-2 text-right">
                                                            <button type="button" onClick={() => removeVariant(variant.id)} className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" className="mt-2 gap-1" onClick={addVariant}>
                                        <Plus size={14} /> Add another option
                                    </Button>
                                </div>
                            )}

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

function OptionValueInput({ onAdd }) {
    const [value, setValue] = useState('');
    const handleAdd = () => {
        if (value.trim()) {
            onAdd(value.trim());
            setValue('');
        }
    };
    return (
        <div className="inline-flex items-center gap-1">
            <input
                type="text"
                className="input-field py-1 px-2 text-sm w-24"
                placeholder="Add value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <button type="button" onClick={handleAdd} className="p-1 text-primary hover:bg-primary/10 rounded transition-colors" disabled={!value.trim()}>
                <Plus size={14} />
            </button>
        </div>
    );
}

export default AdminProducts;
