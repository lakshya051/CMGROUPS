import React, { useState, useMemo } from 'react';
import { User, Mail, Lock, Phone, Save, CheckCircle, Eye, EyeOff, Shield, AlertCircle, Bell, BellOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../lib/api';
import { useFormik } from 'formik';
import { profileUpdateSchema } from '../../utils/validationSchemas';
import { usePushNotifications } from '../../hooks/usePushNotifications';

function PasswordStrength({ password }) {
    const { score, label, color, segments } = useMemo(() => {
        if (!password) return { score: 0, label: '', color: '', segments: [false, false, false, false] };
        let s = 0;
        if (password.length >= 6) s++;
        if (password.length >= 10) s++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
        if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) s++;
        const levels = [
            { label: 'Weak', color: 'bg-red-500' },
            { label: 'Fair', color: 'bg-orange-500' },
            { label: 'Good', color: 'bg-yellow-500' },
            { label: 'Strong', color: 'bg-green-500' },
        ];
        const level = levels[Math.max(0, s - 1)] || levels[0];
        return { score: s, ...level, segments: [s >= 1, s >= 2, s >= 3, s >= 4] };
    }, [password]);

    if (!password) return null;

    return (
        <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
                {segments.map((active, i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${active ? color : 'bg-border-default'}`}
                    />
                ))}
            </div>
            <p className="text-xs text-text-muted">
                Strength: <span className="font-medium">{label}</span>
            </p>
        </div>
    );
}

function PasswordInput({ name, value, onChange, onBlur, error, touched, placeholder, label }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-text-secondary">{label}</label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input
                    type={visible ? 'text' : 'password'}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={`input-field pl-9 pr-10 ${touched && error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder={placeholder}
                    autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
                />
                <button
                    type="button"
                    onClick={() => setVisible(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    tabIndex={-1}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                >
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {touched && error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
        </div>
    );
}

const UserSettings = () => {
    const { user, setUser } = useAuth();
    const [message, setMessage] = useState('');
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe, permission: pushPermission } = usePushNotifications();
    const [pushLoading, setPushLoading] = useState(false);

    const formik = useFormik({
        initialValues: {
            name: user?.name || '',
            phone: user?.phone || '',
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: '',
        },
        enableReinitialize: true,
        validationSchema: profileUpdateSchema,
        validateOnBlur: true,
        validateOnChange: false,
        onSubmit: async (values, { setSubmitting, setErrors, resetForm }) => {
            setMessage('');
            try {
                const updateData = {};
                if (values.name !== user?.name) updateData.name = values.name;
                if (values.phone !== (user?.phone || '')) updateData.phone = values.phone;
                if (values.newPassword) {
                    updateData.currentPassword = values.currentPassword;
                    updateData.newPassword = values.newPassword;
                }

                if (Object.keys(updateData).length === 0) {
                    setErrors({ submit: 'No changes to save.' });
                    return;
                }

                const result = await authAPI.updateProfile(updateData);
                setMessage(updateData.newPassword ? 'Profile and password updated successfully!' : 'Profile updated successfully!');
                if (result.user && setUser) {
                    setUser(result.user);
                }
                resetForm({
                    values: {
                        name: result.user?.name || values.name,
                        phone: result.user?.phone || values.phone,
                        currentPassword: '',
                        newPassword: '',
                        confirmNewPassword: '',
                    },
                });
                if (updateData.newPassword) setShowPasswordSection(false);
            } catch (err) {
                setErrors({ submit: err.message || 'Failed to update profile' });
            } finally {
                setSubmitting(false);
            }
        },
    });

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-surface rounded-xl border border-border-default p-6 flex flex-col sm:flex-row items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <User size={30} />
                </div>
                <div className="text-center sm:text-left flex-1 min-w-0">
                    <h1 className="text-xl font-heading font-bold text-text-primary truncate">{user?.name || 'Your Account'}</h1>
                    <p className="text-sm text-text-muted truncate">{user?.email}</p>
                </div>
            </div>

            {/* Alerts */}
            {message && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 p-3.5 rounded-xl text-sm flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-300">
                    <CheckCircle size={18} className="shrink-0" />
                    <span>{message}</span>
                </div>
            )}
            {formik.errors.submit && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-300">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{formik.errors.submit}</span>
                </div>
            )}

            <form onSubmit={formik.handleSubmit} className="space-y-6">
                {/* Profile Section */}
                <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
                    <div className="px-5 py-4 border-b border-border-default">
                        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                            <User size={18} className="text-trust" /> Profile Information
                        </h2>
                        <p className="text-xs text-text-muted mt-0.5">Update your personal details</p>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-text-secondary">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                    <input
                                        type="text"
                                        name="name"
                                        value={formik.values.name}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        className={`input-field pl-9 ${formik.touched.name && formik.errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                        placeholder="John Doe"
                                    />
                                </div>
                                {formik.touched.name && formik.errors.name && (
                                    <p className="text-red-500 text-xs mt-0.5">{formik.errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-text-secondary">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        className="input-field pl-9 opacity-60 cursor-not-allowed"
                                        disabled
                                    />
                                </div>
                                <p className="text-xs text-text-muted">Email cannot be changed</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-secondary">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formik.values.phone}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    className={`input-field pl-9 ${formik.touched.phone && formik.errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                    placeholder="9876543210"
                                />
                            </div>
                            {formik.touched.phone && formik.errors.phone && (
                                <p className="text-red-500 text-xs mt-0.5">{formik.errors.phone}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Push Notifications Section */}
                {pushSupported && (
                    <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
                        <div className="px-5 py-4 border-b border-border-default">
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Bell size={18} className="text-trust" /> Push Notifications
                            </h2>
                            <p className="text-xs text-text-muted mt-0.5">Get notified about orders, services & updates</p>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text-primary">
                                        {pushSubscribed ? 'Notifications are enabled' : 'Enable push notifications'}
                                    </p>
                                    <p className="text-xs text-text-muted mt-0.5">
                                        {pushPermission === 'denied'
                                            ? 'Notifications are blocked in your browser settings. Please allow them and try again.'
                                            : pushSubscribed
                                                ? 'You\'ll receive alerts for order updates, service bookings, and promotions.'
                                                : 'Stay updated with order status, delivery alerts, and special offers.'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled={pushLoading || pushPermission === 'denied'}
                                    onClick={async () => {
                                        setPushLoading(true);
                                        try {
                                            if (pushSubscribed) {
                                                await pushUnsubscribe();
                                            } else {
                                                await pushSubscribe();
                                            }
                                        } catch (err) {
                                            console.error('Push toggle failed:', err);
                                        } finally {
                                            setPushLoading(false);
                                        }
                                    }}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 flex-shrink-0 touch-manipulation ${
                                        pushSubscribed ? 'bg-trust' : 'bg-border-default'
                                    } ${pushLoading || pushPermission === 'denied' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    role="switch"
                                    aria-checked={pushSubscribed}
                                    aria-label={pushSubscribed ? 'Disable push notifications' : 'Enable push notifications'}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                        pushSubscribed ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            {pushPermission === 'denied' && (
                                <div className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-start gap-2">
                                    <BellOff size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-orange-600">
                                        Notifications are blocked. Open your browser settings and allow notifications for this site, then reload the page.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Password Section */}
                <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
                    <button
                        type="button"
                        onClick={() => {
                            setShowPasswordSection(v => !v);
                            if (showPasswordSection) {
                                formik.setFieldValue('currentPassword', '');
                                formik.setFieldValue('newPassword', '');
                                formik.setFieldValue('confirmNewPassword', '');
                            }
                        }}
                        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-hover transition-colors"
                    >
                        <div>
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Shield size={18} className="text-trust" /> Change Password
                            </h2>
                            <p className="text-xs text-text-muted mt-0.5">
                                {showPasswordSection ? 'Fill in the fields below' : 'Tap to update your password'}
                            </p>
                        </div>
                        <div className={`text-text-muted transition-transform duration-200 ${showPasswordSection ? 'rotate-180' : ''}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                    </button>

                    <div
                        className={`grid transition-all duration-300 ease-in-out ${showPasswordSection ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                    >
                        <div className="overflow-hidden">
                            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border-default">
                                <PasswordInput
                                    name="currentPassword"
                                    label="Current Password"
                                    value={formik.values.currentPassword}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.errors.currentPassword}
                                    touched={formik.touched.currentPassword}
                                    placeholder="Enter your current password"
                                />

                                <PasswordInput
                                    name="newPassword"
                                    label="New Password"
                                    value={formik.values.newPassword}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.errors.newPassword}
                                    touched={formik.touched.newPassword}
                                    placeholder="At least 6 characters"
                                />
                                <PasswordStrength password={formik.values.newPassword} />

                                <PasswordInput
                                    name="confirmNewPassword"
                                    label="Confirm New Password"
                                    value={formik.values.confirmNewPassword}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.errors.confirmNewPassword}
                                    touched={formik.touched.confirmNewPassword}
                                    placeholder="Re-enter your new password"
                                />

                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-xs text-text-muted space-y-1">
                                    <p className="font-medium text-text-secondary">Password requirements:</p>
                                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                                        <li>Minimum 6 characters</li>
                                        <li>Mix of uppercase & lowercase letters recommended</li>
                                        <li>Include numbers & special characters for best security</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1">
                    <Button type="submit" size="lg" disabled={formik.isSubmitting} className="w-full sm:w-auto">
                        <Save size={18} className="mr-2" />
                        {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default UserSettings;
