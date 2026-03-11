import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SignUp() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { registerWithEmail, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await registerWithEmail(email, password, name.trim());
            toast.success('Account created successfully!');
            navigate('/onboarding', { replace: true });
        } catch (err) {
            const msg = err.code === 'auth/email-already-in-use'
                ? 'An account with this email already exists'
                : err.code === 'auth/weak-password'
                    ? 'Password is too weak. Use at least 6 characters.'
                    : err.message;
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            await loginWithGoogle();
            navigate('/', { replace: true });
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                toast.error('Google sign-up failed. Please try again.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-page-bg flex items-center justify-center p-lg">
            <div className="bg-surface rounded-lg shadow-sm border border-border-default p-xl w-full max-w-md">
                <h1 className="text-xl font-bold text-text-primary mb-xs">Create Account</h1>
                <p className="text-sm text-text-secondary mb-lg">
                    Join CMGROUPS — shop, learn, and get tech services.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-md">
                    <div>
                        <label htmlFor="name" className="text-sm font-medium text-text-primary block mb-xs">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Rahul Sharma"
                            required
                            className="w-full border border-border-default rounded px-sm py-xs text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="text-sm font-medium text-text-primary block mb-xs">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full border border-border-default rounded px-sm py-xs text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="text-sm font-medium text-text-primary block mb-xs">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            className="w-full border border-border-default rounded px-sm py-xs text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="text-sm font-medium text-text-primary block mb-xs">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full border border-border-default rounded px-sm py-xs text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold py-sm rounded transition-colors duration-base disabled:opacity-50"
                    >
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <div className="relative my-lg">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border-default" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-surface px-2 text-text-muted">OR</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogle}
                    className="w-full flex items-center justify-center gap-2 border border-border-default rounded py-sm text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
                >
                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.97-6.19A23.9 23.9 0 0 0 0 24c0 3.77.87 7.36 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    Continue with Google
                </button>

                <div className="mt-lg text-center text-sm">
                    <span className="text-text-muted">Already have an account? </span>
                    <Link to="/sign-in" className="text-trust hover:underline font-medium">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
