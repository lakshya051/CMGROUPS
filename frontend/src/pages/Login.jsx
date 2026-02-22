import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import Button from '../components/ui/Button';
import { Lock, Mail, Phone } from 'lucide-react';
import { loginSchema, loginPhoneSchema } from '../utils/validationSchemas';

const Login = () => {
    const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname;

    const formik = useFormik({
        initialValues: { identifier: '', password: '' },
        validationSchema: loginMethod === 'email' ? loginSchema : loginPhoneSchema,
        validateOnBlur: true,
        validateOnChange: false,
        onSubmit: async (values, { setSubmitting, setErrors }) => {
            const result = await login(values.identifier, values.password);
            setSubmitting(false);
            if (result.success) {
                let destination = from || '/dashboard';
                if (!from) {
                    destination = result.role === 'admin' ? '/admin' : '/';
                }
                navigate(destination, { replace: true });
            } else {
                setErrors({ submit: result.message });
            }
        },
    });

    const handleMethodSwitch = (method) => {
        setLoginMethod(method);
        formik.resetForm();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md p-8 glass-panel animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-heading font-bold text-text-main mb-2">Welcome Back</h1>
                    <p className="text-text-muted">Sign in to access your account</p>
                </div>

                {formik.errors.submit && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
                        {formik.errors.submit}
                    </div>
                )}

                {/* Login Method Toggle */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                    <button
                        type="button"
                        onClick={() => handleMethodSwitch('email')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loginMethod === 'email'
                            ? 'bg-primary text-white shadow-lg'
                            : 'text-text-muted hover:text-text-main'
                            }`}
                    >
                        <Mail size={16} />
                        Email
                    </button>
                    <button
                        type="button"
                        onClick={() => handleMethodSwitch('phone')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loginMethod === 'phone'
                            ? 'bg-primary text-white shadow-lg'
                            : 'text-text-muted hover:text-text-main'
                            }`}
                    >
                        <Phone size={16} />
                        Phone
                    </button>
                </div>

                <form onSubmit={formik.handleSubmit} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted">
                            {loginMethod === 'email' ? 'Email Address' : 'Phone Number'}
                        </label>
                        <div className="relative">
                            {loginMethod === 'email' ? (
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            ) : (
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            )}
                            <input
                                type={loginMethod === 'email' ? 'email' : 'tel'}
                                name="identifier"
                                className={`input-field pl-10 ${formik.touched.identifier && formik.errors.identifier ? 'border-red-500' : ''}`}
                                placeholder={loginMethod === 'email' ? 'name@example.com' : '9876543210'}
                                value={formik.values.identifier}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                disabled={formik.isSubmitting}
                            />
                        </div>
                        {formik.touched.identifier && formik.errors.identifier && (
                            <p className="text-red-400 text-sm mt-1">{formik.errors.identifier}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="password"
                                name="password"
                                className={`input-field pl-10 ${formik.touched.password && formik.errors.password ? 'border-red-500' : ''}`}
                                placeholder="••••••••"
                                value={formik.values.password}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                disabled={formik.isSubmitting}
                            />
                        </div>
                        {formik.touched.password && formik.errors.password && (
                            <p className="text-red-400 text-sm mt-1">{formik.errors.password}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={formik.isSubmitting}>
                        {formik.isSubmitting ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-text-muted">
                    Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
