import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import Button from '../components/ui/Button';
import { User, Mail, Lock, Phone, Gift } from 'lucide-react';
import { authAPI } from '../lib/api';
import { signupSchema } from '../utils/validationSchemas';

const Signup = () => {
    const { setUser } = useAuth();
    const navigate = useNavigate();

    const formik = useFormik({
        initialValues: {
            name: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            referralCode: '',
        },
        validationSchema: signupSchema,
        validateOnBlur: true,
        validateOnChange: false,
        onSubmit: async (values, { setSubmitting, setErrors }) => {
            try {
                const data = await authAPI.register(
                    values.name,
                    values.email,
                    values.password,
                    values.phone,
                    values.referralCode.trim() || null
                );
                if (data.success) {
                    navigate('/verify-email', { state: { email: values.email } });
                } else {
                    setErrors({ submit: data.error || 'Registration failed' });
                }
            } catch (err) {
                setErrors({ submit: err.message || 'Something went wrong. Please try again.' });
            } finally {
                setSubmitting(false);
            }
        },
    });

    const Field = ({ name, label, icon: Icon, type = 'text', placeholder }) => (
        <div className="space-y-1">
            <label className="text-sm font-medium text-text-muted">{label}</label>
            <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                    name={name}
                    type={type}
                    className={`input-field pl-10 ${formik.touched[name] && formik.errors[name] ? 'border-red-500' : ''}`}
                    placeholder={placeholder}
                    value={formik.values[name]}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={formik.isSubmitting}
                />
            </div>
            {formik.touched[name] && formik.errors[name] && (
                <p className="text-red-400 text-sm mt-1">{formik.errors[name]}</p>
            )}
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
            <div className="w-full max-w-md p-8 glass-panel animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-heading font-bold text-text-main mb-2">Create Account</h1>
                    <p className="text-text-muted">Join TechNova today</p>
                </div>

                {formik.errors.submit && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
                        {formik.errors.submit}
                    </div>
                )}

                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    <Field name="name" label="Full Name" icon={User} placeholder="John Doe" />
                    <Field name="email" label="Email" icon={Mail} type="email" placeholder="name@example.com" />
                    <Field name="phone" label="Phone" icon={Phone} type="tel" placeholder="9876543210" />
                    <Field name="password" label="Password" icon={Lock} type="password" placeholder="••••••••" />
                    <Field name="confirmPassword" label="Confirm Password" icon={Lock} type="password" placeholder="••••••••" />

                    {/* Referral Code (optional) */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted">
                            Referral Code <span className="text-text-muted font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                            <Gift className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                name="referralCode"
                                type="text"
                                className="input-field pl-10 uppercase"
                                placeholder="e.g. RAHUL01"
                                value={formik.values.referralCode}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                disabled={formik.isSubmitting}
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full mt-4" size="lg" disabled={formik.isSubmitting}>
                        {formik.isSubmitting ? 'Creating Account...' : 'Sign Up'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-text-muted">
                    Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
