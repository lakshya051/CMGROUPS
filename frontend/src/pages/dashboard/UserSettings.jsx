import React, { useState } from 'react';
import { User, Mail, Lock, Phone, Save, CheckCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../lib/api';
import { useFormik } from 'formik';
import { profileUpdateSchema } from '../../utils/validationSchemas';

const UserSettings = () => {
    const { user, setUser } = useAuth();
    const [message, setMessage] = useState('');

    const formik = useFormik({
        initialValues: {
            name: user?.name || '',
            phone: user?.phone || '',
            currentPassword: '',
            newPassword: '',
        },
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
                setMessage('Profile updated successfully!');
                if (result.user && setUser) {
                    setUser(result.user);
                }
                resetForm({
                    values: {
                        name: result.user?.name || values.name,
                        phone: result.user?.phone || values.phone,
                        currentPassword: '',
                        newPassword: '',
                    },
                });
            } catch (err) {
                setErrors({ submit: err.message || 'Failed to update profile' });
            } finally {
                setSubmitting(false);
            }
        },
    });

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h1 className="text-3xl font-heading font-bold mb-1">Account Settings</h1>
                <p className="text-text-muted">Manage your profile and preferences.</p>
            </div>

            {message && (
                <div className="bg-success/10 border border-success/20 text-success p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                    <CheckCircle size={16} /> {message}
                </div>
            )}
            {formik.errors.submit && (
                <div className="bg-error/10 border border-error/20 text-error p-3 rounded-lg mb-6 text-sm">
                    {formik.errors.submit}
                </div>
            )}

            <form onSubmit={formik.handleSubmit} className="space-y-8">
                {/* Profile Section */}
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <User size={20} className="text-primary" /> Profile Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="text"
                                    name="name"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    className={`input-field pl-9 ${formik.touched.name && formik.errors.name ? 'border-red-500' : ''}`}
                                />
                            </div>
                            {formik.touched.name && formik.errors.name && (
                                <p className="text-red-400 text-sm mt-1">{formik.errors.name}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    className="input-field pl-9 opacity-50"
                                    disabled
                                />
                            </div>
                            <p className="text-xs text-text-muted">Email cannot be changed.</p>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-text-muted">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formik.values.phone}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    className={`input-field pl-9 ${formik.touched.phone && formik.errors.phone ? 'border-red-500' : ''}`}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            {formik.touched.phone && formik.errors.phone && (
                                <p className="text-red-400 text-sm mt-1">{formik.errors.phone}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Lock size={20} className="text-primary" /> Change Password
                    </h2>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted">Current Password</label>
                            <input
                                type="password"
                                name="currentPassword"
                                value={formik.values.currentPassword}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className={`input-field ${formik.touched.currentPassword && formik.errors.currentPassword ? 'border-red-500' : ''}`}
                                placeholder="••••••••"
                            />
                            {formik.touched.currentPassword && formik.errors.currentPassword && (
                                <p className="text-red-400 text-sm mt-1">{formik.errors.currentPassword}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted">New Password</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={formik.values.newPassword}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className={`input-field ${formik.touched.newPassword && formik.errors.newPassword ? 'border-red-500' : ''}`}
                                placeholder="Leave blank to keep current"
                            />
                            {formik.touched.newPassword && formik.errors.newPassword && (
                                <p className="text-red-400 text-sm mt-1">{formik.errors.newPassword}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={formik.isSubmitting}>
                        <Save size={18} className="mr-2" /> {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default UserSettings;
