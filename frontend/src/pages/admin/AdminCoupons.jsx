import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Trash2, ToggleLeft, ToggleRight, X, Save, Percent, DollarSign } from 'lucide-react';
import Button from '../../components/ui/Button';
import { couponsAPI } from '../../lib/api';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const couponSchema = Yup.object({
        code: Yup.string().min(3, 'Code must be at least 3 characters').required('Coupon code is required'),
        discountType: Yup.string().oneOf(['percent', 'fixed']).required(),
        value: Yup.number().typeError('Must be a number').positive('Must be > 0').required('Value is required'),
    });

    const formik = useFormik({
        initialValues: { code: '', discountType: 'percent', value: '' },
        validationSchema: couponSchema,
        validateOnBlur: true,
        validateOnChange: false,
        onSubmit: async (values, { setSubmitting, setErrors, resetForm }) => {
            try {
                const coupon = await couponsAPI.create({
                    code: values.code.toUpperCase(),
                    discountType: values.discountType,
                    value: parseFloat(values.value),
                });
                setCoupons(prev => [coupon, ...prev]);
                setShowModal(false);
                resetForm();
            } catch (err) {
                setErrors({ submit: err.message || 'Failed to create coupon' });
            } finally {
                setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        couponsAPI.getAll()
            .then(data => setCoupons(data))
            .catch(err => console.error('Failed to fetch coupons:', err))
            .finally(() => setLoading(false));
    }, []);



    const handleToggle = async (coupon) => {
        try {
            const updated = await couponsAPI.update(coupon.id, { active: !coupon.active });
            setCoupons(prev => prev.map(c => c.id === coupon.id ? updated : c));
        } catch (err) {
            console.error('Failed to toggle coupon:', err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this coupon?')) {
            try {
                await couponsAPI.delete(id);
                setCoupons(prev => prev.filter(c => c.id !== id));
            } catch (err) {
                console.error('Failed to delete coupon:', err);
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading coupons...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold mb-1">Coupon Management</h1>
                    <p className="text-text-muted">Create and manage discount coupons.</p>
                </div>
                <Button onClick={() => { formik.resetForm(); setShowModal(true); }}><Plus size={18} className="mr-2" /> Create Coupon</Button>
            </div>

            {/* Coupons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map(coupon => (
                    <div key={coupon.id} className={`glass-panel p-6 transition-all ${!coupon.active ? 'opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Ticket size={20} className="text-primary" />
                                <span className="font-mono text-lg font-bold text-primary">{coupon.code}</span>
                            </div>
                            <button
                                onClick={() => handleToggle(coupon)}
                                className={`transition-colors ${coupon.active ? 'text-success' : 'text-text-muted'}`}
                                title={coupon.active ? 'Deactivate' : 'Activate'}
                            >
                                {coupon.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                            </button>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`px-3 py-1 rounded-lg text-sm font-bold ${coupon.discountType === 'percent'
                                ? 'bg-blue-400/10 text-blue-400'
                                : 'bg-green-400/10 text-green-400'
                                }`}>
                                {coupon.discountType === 'percent' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded border ${coupon.active
                                ? 'text-success bg-success/10 border-success/20'
                                : 'text-text-muted bg-gray-100 border-gray-200'
                                }`}>
                                {coupon.active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <button
                            onClick={() => handleDelete(coupon.id)}
                            className="text-xs text-text-muted hover:text-error transition-colors flex items-center gap-1"
                        >
                            <Trash2 size={12} /> Delete
                        </button>
                    </div>
                ))}
                {coupons.length === 0 && (
                    <div className="col-span-full glass-panel p-12 text-center text-text-muted">
                        <Ticket size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No coupons yet. Create your first coupon!</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
                    <div className="glass-panel w-full max-w-md relative animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-heading font-bold">Create Coupon</h2>
                            <button onClick={() => { setShowModal(false); formik.resetForm(); }} className="text-text-muted hover:text-text-main">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={formik.handleSubmit} className="p-6 space-y-4">
                            {formik.errors.submit && (
                                <div className="bg-error/10 border border-error/20 text-error p-3 rounded-lg text-sm">{formik.errors.submit}</div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Coupon Code *</label>
                                <input name="code" type="text" className={`input-field uppercase ${formik.touched.code && formik.errors.code ? 'border-red-500' : ''}`} placeholder="e.g. SAVE20" value={formik.values.code} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                                {formik.touched.code && formik.errors.code && <p className="text-red-400 text-sm mt-1">{formik.errors.code}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">Type</label>
                                    <select name="discountType" className="input-field" value={formik.values.discountType} onChange={formik.handleChange} onBlur={formik.handleBlur}>
                                        <option value="percent">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">Value *</label>
                                    <input name="value" type="number" className={`input-field ${formik.touched.value && formik.errors.value ? 'border-red-500' : ''}`} placeholder={formik.values.discountType === 'percent' ? '20' : '500'} value={formik.values.value} onChange={formik.handleChange} onBlur={formik.handleBlur} min="0" />
                                    {formik.touched.value && formik.errors.value && <p className="text-red-400 text-sm mt-1">{formik.errors.value}</p>}
                                </div>
                            </div>
                            <Button type="submit" className="w-full gap-2" disabled={formik.isSubmitting}>
                                <Save size={18} /> {formik.isSubmitting ? 'Creating...' : 'Create Coupon'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCoupons;
