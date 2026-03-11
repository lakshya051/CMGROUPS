import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [resetMode, setResetMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const { loginWithEmail, loginWithGoogle, resetPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (resetMode) {
                await resetPassword(email);
                toast.success('Password reset email sent! Check your inbox.');
                setResetMode(false);
            } else {
                await loginWithEmail(email, password);
                navigate('/', { replace: true });
            }
        } catch (err) {
            const msg = err.code === 'auth/invalid-credential'
                ? 'Invalid email or password'
                : err.code === 'auth/user-not-found'
                    ? 'No account found with this email'
                    : err.code === 'auth/too-many-requests'
                        ? 'Too many attempts. Please try again later.'
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
                toast.error('Google sign-in failed. Please try again.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-page-bg flex items-center justify-center p-lg">
            <div className="bg-surface rounded-lg shadow-sm border border-border-default p-xl w-full max-w-md">
                <h1 className="text-xl font-bold text-text-primary mb-xs">
                    {resetMode ? 'Reset Password' : 'Sign In'}
                </h1>
                <p className="text-sm text-text-secondary mb-lg">
                    {resetMode
                        ? 'Enter your email and we\'ll send you a reset link.'
                        : 'Welcome back to CMGROUPS'}
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-md">
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

                    {!resetMode && (
                        <div>
                            <label htmlFor="password" className="text-sm font-medium text-text-primary block mb-xs">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full border border-border-default rounded px-sm py-xs text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold py-sm rounded transition-colors duration-base disabled:opacity-50"
                    >
                        {loading
                            ? (resetMode ? 'Sending…' : 'Signing in…')
                            : (resetMode ? 'Send Reset Link' : 'Sign In')}
                    </button>
                </form>

                {!resetMode && (
                    <>
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
                    </>
                )}

                <div className="mt-lg text-center text-sm">
                    {resetMode ? (
                        <button
                            onClick={() => setResetMode(false)}
                            className="text-trust hover:underline font-medium"
                        >
                            Back to Sign In
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setResetMode(true)}
                                className="text-trust hover:underline font-medium"
                            >
                                Forgot password?
                            </button>
                            <span className="mx-2 text-text-muted">|</span>
                            <Link to="/sign-up" className="text-trust hover:underline font-medium">
                                Create an account
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
