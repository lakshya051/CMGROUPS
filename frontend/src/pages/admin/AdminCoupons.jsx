import React, { useEffect, useState } from 'react';
import { Ticket, Plus, Trash2, ToggleLeft, ToggleRight, X, Save, Pencil } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Button from '../../components/ui/Button';
import { couponsAPI } from '../../lib/api';

const EMPTY_FORM_VALUES = {
    code: '',
    discountType: 'percent',
    value: '',
    minOrderAmount: '',
    maxUses: '',
    expiresAt: '',
};
const getEmptyFormValues = () => ({ ...EMPTY_FORM_VALUES });

const transformOptionalNumber = (value, originalValue) => (originalValue === '' ? null : value);
const transformOptionalDate = (value, originalValue) => (originalValue === '' ? null : value);

const formatDateTimeLocal = (value) => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const getFormValues = (coupon = null) => {
    if (!coupon) return getEmptyFormValues();

    return {
        code: coupon.code || '',
        discountType: coupon.discountType || 'percent',
        value: coupon.value ?? '',
        minOrderAmount: coupon.minOrderAmount ?? '',
        maxUses: coupon.maxUses ?? '',
        expiresAt: formatDateTimeLocal(coupon.expiresAt),
    };
};

const buildCouponPayload = (values) => ({
    code: values.code.trim().toUpperCase(),
    discountType: values.discountType,
    value: Number(values.value),
    minOrderAmount: values.minOrderAmount === '' ? null : Number(values.minOrderAmount),
    maxUses: values.maxUses === '' ? null : Number(values.maxUses),
    expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
});

const formatDisplayDate = (value) => {
    if (!value) return 'No expiry';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';

    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);

    const couponSchema = Yup.object({
        code: Yup.string().min(3, 'Code must be at least 3 characters').required('Coupon code is required'),
        discountType: Yup.string().oneOf(['percent', 'fixed']).required(),
        value: Yup.number().typeError('Must be a number').positive('Must be > 0').required('Value is required'),
        minOrderAmount: Yup.number()
            .transform(transformOptionalNumber)
            .nullable()
            .typeError('Must be a number')
            .min(0, 'Must be 0 or more'),
        maxUses: Yup.number()
            .transform(transformOptionalNumber)
            .nullable()
            .typeError('Must be a number')
            .integer('Must be a whole number')
            .min(1, 'Must be at least 1'),
        expiresAt: Yup.date()
            .transform(transformOptionalDate)
            .nullable()
            .typeError('Must be a valid date'),
    });

    const formik = useFormik({
        initialValues: getEmptyFormValues(),
        validationSchema: couponSchema,
        validateOnBlur: true,
        validateOnChange: false,
        onSubmit: async (values, { setSubmitting, setErrors, resetForm }) => {
            try {
                const payload = buildCouponPayload(values);
                const savedCoupon = editingCoupon
                    ? await couponsAPI.update(editingCoupon.id, payload)
                    : await couponsAPI.create(payload);

                setCoupons(prev => (
                    editingCoupon
                        ? prev.map(coupon => (coupon.id === savedCoupon.id ? savedCoupon : coupon))
                        : [savedCoupon, ...prev]
                ));

                setEditingCoupon(null);
                setShowModal(false);
                resetForm({ values: getEmptyFormValues() });
            } catch (err) {
                setErrors({ submit: err.message || `Failed to ${editingCoupon ? 'update' : 'create'} coupon` });
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

    const closeModal = () => {
        setShowModal(false);
        setEditingCoupon(null);
        formik.resetForm({ values: getEmptyFormValues() });
    };

    const openCreateModal = () => {
        setEditingCoupon(null);
        formik.resetForm({ values: getEmptyFormValues() });
        setShowModal(true);
    };

    const openEditModal = (coupon) => {
        setEditingCoupon(coupon);
        formik.resetForm({ values: getFormValues(coupon) });
        setShowModal(true);
    };

    const handleToggle = async (coupon) => {
        try {
            const updated = await couponsAPI.update(coupon.id, { active: !coupon.active });
            setCoupons(prev => prev.map(item => (item.id === coupon.id ? updated : item)));
        } catch (err) {
            console.error('Failed to toggle coupon:', err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this coupon?')) {
            try {
                await couponsAPI.delete(id);
                setCoupons(prev => prev.filter(coupon => coupon.id !== id));
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
                <Button onClick={openCreateModal}><Plus size={18} className="mr-2" /> Create Coupon</Button>
            </div>

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

                        <div className="flex items-center gap-3 mb-4">
                            <div className={`px-3 py-1 rounded-lg text-sm font-bold ${coupon.discountType === 'percent'
                                ? 'bg-blue-400/10 text-blue-400'
                                : 'bg-green-400/10 text-green-400'
                                }`}>
                                {coupon.discountType === 'percent' ? `${coupon.value}% OFF` : `Rs. ${coupon.value} OFF`}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded border ${coupon.active
                                ? 'text-success bg-success/10 border-success/20'
                                : 'text-text-muted bg-page-bg border-border-default'
                                }`}>
                                {coupon.active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="space-y-2 mb-4 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-text-muted">Minimum order</span>
                                <span className="text-text-main">{coupon.minOrderAmount != null ? `Rs. ${coupon.minOrderAmount}` : 'None'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-text-muted">Max uses</span>
                                <span className="text-text-main">{coupon.maxUses != null ? coupon.maxUses : 'Unlimited'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-text-muted">Used</span>
                                <span className="text-text-main">
                                    {coupon.maxUses != null ? `${coupon.usedCount}/${coupon.maxUses}` : coupon.usedCount}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-text-muted">Expiry</span>
                                <span className="text-right text-text-main">{formatDisplayDate(coupon.expiresAt)}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                            <button
                                onClick={() => openEditModal(coupon)}
                                className="text-text-muted hover:text-primary transition-colors flex items-center gap-1"
                            >
                                <Pencil size={12} /> Edit
                            </button>
                            <button
                                onClick={() => handleDelete(coupon.id)}
                                className="text-text-muted hover:text-error transition-colors flex items-center gap-1"
                            >
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                    </div>
                ))}

                {coupons.length === 0 && (
                    <div className="col-span-full glass-panel p-12 text-center text-text-muted">
                        <Ticket size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No coupons yet. Create your first coupon!</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
                    <div className="glass-panel w-full max-w-lg relative animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-border-default flex items-center justify-between">
                            <h2 className="text-xl font-heading font-bold">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
                            <button onClick={closeModal} className="text-text-muted hover:text-text-main">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={formik.handleSubmit} className="p-6 space-y-4">
                            {formik.errors.submit && (
                                <div className="bg-error/10 border border-error/20 text-error p-3 rounded-lg text-sm">{formik.errors.submit}</div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Coupon Code *</label>
                                <input
                                    name="code"
                                    type="text"
                                    className={`input-field uppercase ${formik.touched.code && formik.errors.code ? 'border-red-500' : ''}`}
                                    placeholder="e.g. SAVE20"
                                    value={formik.values.code}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                                {formik.touched.code && formik.errors.code && <p className="text-red-400 text-sm mt-1">{formik.errors.code}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">Type</label>
                                    <select
                                        name="discountType"
                                        className="input-field"
                                        value={formik.values.discountType}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    >
                                        <option value="percent">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (Rs.)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">Value *</label>
                                    <input
                                        name="value"
                                        type="number"
                                        className={`input-field ${formik.touched.value && formik.errors.value ? 'border-red-500' : ''}`}
                                        placeholder={formik.values.discountType === 'percent' ? '20' : '500'}
                                        value={formik.values.value}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        min="0"
                                    />
                                    {formik.touched.value && formik.errors.value && <p className="text-red-400 text-sm mt-1">{formik.errors.value}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">Minimum Order Amount</label>
                                    <input
                                        name="minOrderAmount"
                                        type="number"
                                        className={`input-field ${formik.touched.minOrderAmount && formik.errors.minOrderAmount ? 'border-red-500' : ''}`}
                                        placeholder="Optional"
                                        value={formik.values.minOrderAmount}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        min="0"
                                        step="0.01"
                                    />
                                    {formik.touched.minOrderAmount && formik.errors.minOrderAmount && <p className="text-red-400 text-sm mt-1">{formik.errors.minOrderAmount}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">Max Uses</label>
                                    <input
                                        name="maxUses"
                                        type="number"
                                        className={`input-field ${formik.touched.maxUses && formik.errors.maxUses ? 'border-red-500' : ''}`}
                                        placeholder="Optional"
                                        value={formik.values.maxUses}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        min="1"
                                        step="1"
                                    />
                                    {formik.touched.maxUses && formik.errors.maxUses && <p className="text-red-400 text-sm mt-1">{formik.errors.maxUses}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Expiry Date</label>
                                <input
                                    name="expiresAt"
                                    type="datetime-local"
                                    className={`input-field ${formik.touched.expiresAt && formik.errors.expiresAt ? 'border-red-500' : ''}`}
                                    value={formik.values.expiresAt}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                                {formik.touched.expiresAt && formik.errors.expiresAt && <p className="text-red-400 text-sm mt-1">{formik.errors.expiresAt}</p>}
                            </div>

                            <Button type="submit" className="w-full gap-2" disabled={formik.isSubmitting}>
                                <Save size={18} /> {formik.isSubmitting ? (editingCoupon ? 'Saving...' : 'Creating...') : (editingCoupon ? 'Save Changes' : 'Create Coupon')}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCoupons;
