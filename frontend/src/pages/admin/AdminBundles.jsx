import React, { useState, useEffect } from 'react';
import { bundlesAPI, productsAPI, serviceTypesAPI, uploadAPI } from '../../lib/api';
import { Plus, Edit2, Trash2, Search, X, Layers, Package, Wrench, BarChart3, Copy, TrendingUp, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProductImageUrl, handleImageError } from '../../utils/image';

const DISPLAY_OPTIONS = ['home', 'cctv', 'tally', 'pdp'];

const AdminBundles = () => {
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('bundles');
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [productSearch, setProductSearch] = useState('');

    const [form, setForm] = useState({
        name: '', description: '', image: '', bundlePrice: '', displayOn: ['home'],
        startDate: '', endDate: '', items: [],
    });

    const fetchBundles = () => {
        setLoading(true);
        bundlesAPI.getAllAdmin()
            .then(setBundles)
            .catch(() => toast.error('Failed to load bundles'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchBundles(); }, []);

    useEffect(() => {
        if (activeTab === 'analytics' && !analytics) {
            setAnalyticsLoading(true);
            bundlesAPI.getAnalytics()
                .then(setAnalytics)
                .catch(() => toast.error('Failed to load analytics'))
                .finally(() => setAnalyticsLoading(false));
        }
    }, [activeTab]);

    useEffect(() => {
        if (showModal) {
            productsAPI.getAll({ limit: 200 }).then(res => setAllProducts(res.data || [])).catch(() => {});
            serviceTypesAPI.getAllAdmin().then(setServiceTypes).catch(() => {});
        }
    }, [showModal]);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', description: '', image: '', bundlePrice: '', displayOn: ['home'], startDate: '', endDate: '', items: [] });
        setShowModal(true);
    };

    const openEdit = (bundle) => {
        setEditing(bundle);
        setForm({
            name: bundle.name,
            description: bundle.description || '',
            image: bundle.image || '',
            bundlePrice: bundle.bundlePrice,
            displayOn: bundle.displayOn || ['home'],
            startDate: bundle.startDate ? bundle.startDate.slice(0, 10) : '',
            endDate: bundle.endDate ? bundle.endDate.slice(0, 10) : '',
            items: bundle.items?.map(bi => ({
                productId: bi.productId, variantId: bi.variantId, quantity: bi.quantity,
                serviceTypeId: bi.serviceTypeId, courseId: bi.courseId, itemType: bi.itemType,
                _product: bi.product, _serviceType: bi.serviceType,
            })) || [],
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this bundle?')) return;
        try {
            const result = await bundlesAPI.delete(id);
            toast.success(result.message || 'Bundle deleted');
            fetchBundles();
        } catch { toast.error('Failed to delete'); }
    };

    const handleToggleActive = async (bundle) => {
        try {
            await bundlesAPI.update(bundle.id, { isActive: !bundle.isActive });
            toast.success(bundle.isActive ? 'Bundle deactivated' : 'Bundle activated');
            fetchBundles();
        } catch { toast.error('Failed to update bundle'); }
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

    const addProduct = (product) => {
        setForm(prev => ({
            ...prev,
            items: [...prev.items, { productId: product.id, quantity: 1, itemType: 'product', _product: product }],
        }));
        setProductSearch('');
    };

    const addService = (st) => {
        setForm(prev => ({
            ...prev,
            items: [...prev.items, { serviceTypeId: st.id, quantity: 1, itemType: 'service', _serviceType: st }],
        }));
    };

    const removeItem = (idx) => {
        setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
    };

    const updateItemQty = (idx, qty) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, parseInt(qty) || 1) } : it),
        }));
    };

    const toggleDisplayOn = (val) => {
        setForm(prev => ({
            ...prev,
            displayOn: prev.displayOn.includes(val)
                ? prev.displayOn.filter(v => v !== val)
                : [...prev.displayOn, val],
        }));
    };

    const itemTotal = form.items.reduce((s, it) => {
        if (it.itemType === 'product' && it._product) return s + it._product.price * it.quantity;
        return s;
    }, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const parsedPrice = parseFloat(form.bundlePrice);
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            toast.error('Please enter a valid bundle price');
            return;
        }
        if (form.items.length === 0) {
            toast.error('Please add at least one item to the bundle');
            return;
        }
        try {
            const data = {
                name: form.name,
                description: form.description || null,
                image: form.image || null,
                bundlePrice: parsedPrice,
                displayOn: form.displayOn,
                startDate: form.startDate || null,
                endDate: form.endDate || null,
                items: form.items.map(it => ({
                    productId: it.productId || null,
                    variantId: it.variantId || null,
                    quantity: it.quantity,
                    serviceTypeId: it.serviceTypeId || null,
                    courseId: it.courseId || null,
                    itemType: it.itemType,
                })),
            };

            if (editing) {
                await bundlesAPI.update(editing.id, data);
                toast.success('Bundle updated');
            } else {
                await bundlesAPI.create(data);
                toast.success('Bundle created');
            }
            setShowModal(false);
            fetchBundles();
        } catch (err) {
            toast.error(err.message || 'Failed to save bundle');
        }
    };

    const filteredProducts = allProducts.filter(p =>
        p.title.toLowerCase().includes(productSearch.toLowerCase()) &&
        !form.items.some(it => it.productId === p.id)
    ).slice(0, 8);

    const filtered = bundles.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleDuplicate = async (bundle) => {
        try {
            const data = {
                name: `${bundle.name} (Copy)`,
                description: bundle.description || null,
                image: bundle.image || null,
                bundlePrice: bundle.bundlePrice,
                displayOn: bundle.displayOn || ['home'],
                items: (bundle.items || []).map(it => ({
                    productId: it.productId || null,
                    variantId: it.variantId || null,
                    quantity: it.quantity,
                    serviceTypeId: it.serviceTypeId || null,
                    courseId: it.courseId || null,
                    itemType: it.itemType,
                })),
            };
            await bundlesAPI.create(data);
            toast.success('Bundle duplicated');
            fetchBundles();
        } catch { toast.error('Failed to duplicate'); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-heading font-bold">Product Bundles</h1>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    <Plus size={18} /> Create Bundle
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-page-bg rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab('bundles')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'bundles' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                    <Layers size={14} className="inline mr-1.5" />Bundles
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                    <BarChart3 size={14} className="inline mr-1.5" />Analytics
                </button>
            </div>

            {activeTab === 'analytics' ? (
                <BundleAnalyticsPanel analytics={analytics} loading={analyticsLoading} />
            ) : (
            <>
            <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    type="text" placeholder="Search bundles..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border-default rounded-lg text-sm focus:outline-none focus:border-trust"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-text-muted">Loading bundles...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-text-muted">No bundles found</div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(bundle => (
                        <div key={bundle.id} className={`bg-surface border rounded-lg p-4 flex items-center gap-4 ${bundle.isActive ? 'border-border-default' : 'border-error/30 opacity-60'}`}>
                            <div className="w-16 h-16 bg-page-bg border border-border-default rounded-lg flex items-center justify-center p-1 flex-shrink-0">
                                {bundle.image ? (
                                    <img src={bundle.image} alt="" onError={handleImageError} className="w-full h-full object-contain" />
                                ) : (
                                    <Layers size={24} className="text-trust" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-text-primary">{bundle.name}</h3>
                                    {!bundle.isActive && (
                                        <span className="text-[10px] font-semibold text-error bg-error/10 px-1.5 py-0.5 rounded">Inactive</span>
                                    )}
                                </div>
                                <p className="text-sm text-text-muted">{bundle.items?.length || 0} items · ₹{bundle.bundlePrice?.toLocaleString('en-IN')}</p>
                                {bundle.savings > 0 && <p className="text-xs text-success font-medium">Saves ₹{bundle.savings?.toLocaleString('en-IN')} ({bundle.savingsPercent}%)</p>}
                                <div className="flex gap-1 mt-1">
                                    {bundle.displayOn?.map(d => (
                                        <span key={d} className="text-[10px] bg-page-bg border border-border-default px-1.5 py-0.5 rounded text-text-muted">{d}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => handleToggleActive(bundle)} title={bundle.isActive ? 'Deactivate' : 'Activate'} className={`p-2 rounded-lg transition-colors ${bundle.isActive ? 'hover:bg-success/10 text-success' : 'hover:bg-trust/10 text-text-muted hover:text-trust'}`}>
                                    {bundle.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                </button>
                                <button onClick={() => handleDuplicate(bundle)} title="Duplicate" className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-primary">
                                    <Copy size={16} />
                                </button>
                                <button onClick={() => openEdit(bundle)} title="Edit" className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-trust">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(bundle.id)} title="Delete" className="p-2 hover:bg-error/10 rounded-lg transition-colors text-text-muted hover:text-error">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-surface border border-border-default rounded-xl w-full max-w-2xl my-8 shadow-xl">
                        <div className="flex items-center justify-between p-4 border-b border-border-default">
                            <h2 className="text-lg font-bold">{editing ? 'Edit Bundle' : 'Create Bundle'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-hover rounded"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-1">Bundle Name *</label>
                                    <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1">Bundle Price *</label>
                                    <input type="number" required step="0.01" value={form.bundlePrice} onChange={e => setForm(f => ({ ...f, bundlePrice: e.target.value }))} className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust" />
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-1">Start Date</label>
                                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1">End Date</label>
                                    <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">Display On</label>
                                <div className="flex gap-2 flex-wrap">
                                    {DISPLAY_OPTIONS.map(opt => (
                                        <button type="button" key={opt} onClick={() => toggleDisplayOn(opt)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.displayOn.includes(opt) ? 'bg-trust text-white border-trust' : 'bg-page-bg border-border-default text-text-muted'}`}
                                        >{opt}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <label className="text-sm font-medium block mb-2">Bundle Items</label>
                                <div className="space-y-2 mb-3">
                                    {form.items.map((it, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-page-bg border border-border-default rounded-lg p-2">
                                            {it.itemType === 'product' && it._product ? (
                                                <>
                                                    <Package size={14} className="text-primary flex-shrink-0" />
                                                    <span className="text-sm flex-1 truncate">{it._product.title}</span>
                                                    <span className="text-xs text-text-muted">₹{it._product.price?.toLocaleString('en-IN')}</span>
                                                </>
                                            ) : it.itemType === 'service' && it._serviceType ? (
                                                <>
                                                    <Wrench size={14} className="text-trust flex-shrink-0" />
                                                    <span className="text-sm flex-1 truncate">{it._serviceType.title}</span>
                                                </>
                                            ) : (
                                                <span className="text-sm text-text-muted flex-1">Unknown item</span>
                                            )}
                                            <input type="number" min={1} value={it.quantity} onChange={e => updateItemQty(idx, e.target.value)} className="w-14 border border-border-default rounded px-2 py-1 text-xs text-center" />
                                            <button type="button" onClick={() => removeItem(idx)} className="text-error hover:bg-error/10 p-1 rounded"><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>

                                <div className="relative mb-2">
                                    <input type="text" placeholder="Search products to add..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust" />
                                    {productSearch && filteredProducts.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-surface border border-border-default rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                                            {filteredProducts.map(p => (
                                                <button type="button" key={p.id} onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-sm flex items-center gap-2">
                                                    <img src={getProductImageUrl(p)} alt="" className="w-8 h-8 object-contain rounded" onError={handleImageError} />
                                                    <span className="flex-1 truncate">{p.title}</span>
                                                    <span className="text-xs text-text-muted">₹{p.price?.toLocaleString('en-IN')}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {serviceTypes.length > 0 && (
                                    <div>
                                        <p className="text-xs text-text-muted mb-1">Add a service:</p>
                                        <div className="flex gap-1 flex-wrap">
                                            {serviceTypes.filter(st => !form.items.some(it => it.serviceTypeId === st.id)).map(st => (
                                                <button type="button" key={st.id} onClick={() => addService(st)} className="text-xs px-2 py-1 border border-border-default rounded hover:bg-surface-hover">
                                                    <Wrench size={10} className="inline mr-1" />{st.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {form.items.length > 0 && (
                                    <div className="mt-3 p-3 bg-trust/5 border border-trust/20 rounded-lg">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-muted">Individual Total:</span>
                                            <span className="font-medium">₹{itemTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-muted">Bundle Price:</span>
                                            <span className="font-bold text-primary">₹{(parseFloat(form.bundlePrice) || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        {itemTotal > (parseFloat(form.bundlePrice) || 0) && (
                                            <div className="flex justify-between text-sm text-success font-medium">
                                                <span>Savings:</span>
                                                <span>₹{(itemTotal - parseFloat(form.bundlePrice)).toLocaleString('en-IN')} ({Math.round(((itemTotal - parseFloat(form.bundlePrice)) / itemTotal) * 100)}%)</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
                                    {editing ? 'Update Bundle' : 'Create Bundle'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 border border-border-default rounded-lg text-text-muted hover:bg-surface-hover">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
};

function BundleAnalyticsPanel({ analytics, loading }) {
    if (loading) return <div className="text-center py-12 text-text-muted">Loading analytics...</div>;
    if (!analytics) return <div className="text-center py-12 text-text-muted">No analytics data available</div>;

    const allStats = [
        ...(analytics.fixedBundles || []),
        ...(analytics.byobTemplates || []),
    ].sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = allStats.reduce((s, r) => s + r.revenue, 0);
    const totalUnitsSold = allStats.reduce((s, r) => s + r.unitsSold, 0);

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface border border-border-default rounded-lg p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide">Total Bundle Revenue</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-surface border border-border-default rounded-lg p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide">Total Units Sold</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{totalUnitsSold.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-surface border border-border-default rounded-lg p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide">Active Bundles</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{allStats.length}</p>
                </div>
            </div>

            {/* Per-bundle stats */}
            {allStats.length === 0 ? (
                <div className="text-center py-8 text-text-muted">No bundle order data yet</div>
            ) : (
                <div className="bg-surface border border-border-default rounded-lg overflow-hidden">
                    <div className="p-3 border-b border-border-default bg-page-bg">
                        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-trust" />
                            Bundle Performance
                        </h3>
                    </div>
                    <div className="divide-y divide-border-default">
                        {allStats.map((stat, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3">
                                <div className="w-10 h-10 bg-page-bg border border-border-default rounded-lg flex items-center justify-center shrink-0">
                                    {stat.image ? (
                                        <img src={stat.image} alt="" className="w-full h-full object-contain rounded-lg" />
                                    ) : (
                                        <Layers size={16} className="text-trust" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text-primary truncate">{stat.name}</p>
                                    <p className="text-xs text-text-muted">
                                        {stat.type === 'byob' ? 'BYOB Template' : 'Fixed Bundle'}
                                    </p>
                                </div>
                                <div className="text-right shrink-0 space-y-0.5">
                                    <p className="text-sm font-bold text-text-primary">₹{stat.revenue.toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-text-muted">{stat.unitsSold} units · {stat.lineItems} line items</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminBundles;
