import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthPageLayout from '../components/auth/AuthPageLayout';
import { needsPhoneCapture } from '../lib/authProfile';
import { FIREBASE_OPERATION_NOT_ALLOWED } from '../lib/firebaseAuthErrors';
import toast from 'react-hot-toast';

/**
 * H8: validate the redirect target coming from ProtectedRoute's `state.from`.
 * We only honor in-app paths to block open-redirect attempts via crafted
 * location state (e.g. a phishing page linking to /sign-in with an external
 * `state.from`).
 */
function safeInternalPath(candidate, fallback = '/') {
    if (typeof candidate !== 'string') return fallback;
    // Must be an in-app path (no scheme, no protocol-relative, no backslashes).
    if (!candidate.startsWith('/')) return fallback;
    if (candidate.startsWith('//')) return fallback;
    if (candidate.startsWith('/\\')) return fallback;
    return candidate;
}

const inputClass =
    'input-field text-base py-3 rounded-xl border-border-default/80 shadow-sm focus:border-trust focus:ring-2 focus:ring-trust/20';

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-text-secondary';

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [resetMode, setResetMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { loginWithEmail, loginWithGoogle, resetPassword, firebaseConfigured } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTarget = safeInternalPath(location.state?.from?.pathname, '/');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (resetMode) {
                await resetPassword(email);
                toast.success(
                    'If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.',
                    { duration: 6000 }
                );
                setResetMode(false);
            } else {
                const { cred, user: dbUser } = await loginWithEmail(email, password);
                if (cred?.user && !cred.user.emailVerified) {
                    toast('Please verify your email to continue.', { icon: '✉️', duration: 5000 });
                    navigate('/verify-email', { replace: true });
                } else {
                    navigate(needsPhoneCapture(dbUser) ? '/onboarding' : redirectTarget, { replace: true });
                }
            }
        } catch (err) {
            console.error(`[Auth ${resetMode ? 'reset' : 'login'}]`, err.code || err.message, err);
            const resetErrors = {
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/missing-email': 'Please enter your email address.',
                'auth/user-not-found': 'If an account exists, a reset link has been sent.',
                'auth/too-many-requests': 'Too many attempts. Please try again later.',
                'auth/operation-not-allowed': FIREBASE_OPERATION_NOT_ALLOWED,
            };
            const loginErrors = {
                'auth/invalid-credential': 'Invalid email or password.',
                'auth/user-not-found': 'No account found with this email.',
                'auth/too-many-requests': 'Too many attempts. Please try again later.',
                'auth/operation-not-allowed': FIREBASE_OPERATION_NOT_ALLOWED,
            };
            const map = resetMode ? resetErrors : loginErrors;
            toast.error(map[err.code] || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            const result = await loginWithGoogle();
            if (result?.redirectStarted) return;
            const dbUser = result?.user;
            navigate(needsPhoneCapture(dbUser) ? '/onboarding' : redirectTarget, { replace: true });
        } catch (err) {
            if (err.code === 'auth/popup-closed-by-user') return;
            const msg = err.code === 'auth/operation-not-allowed'
                ? FIREBASE_OPERATION_NOT_ALLOWED
                : err.message || (err.code ? String(err.code) : 'Google sign-in failed.');
            toast.error(msg);
            console.error('[Google sign-in]', err.code || err.message, err);
        }
    };

    return (
        <AuthPageLayout
            headline="Welcome back"
            subheadline="Your marketplace, learning hub, and tech partner—sign in to continue where you left off."
        >
            <div className="mb-8">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                    {resetMode ? 'Reset password' : 'Sign in'}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {resetMode
                        ? 'We’ll email you a link to choose a new password.'
                        : 'Enter your details below or use Google for a faster sign-in.'}
                </p>
            </div>

            {!firebaseConfigured && (
                <div className="mb-6 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] p-4 text-sm text-amber-900 dark:text-amber-100">
                    Sign-in is disabled: add{' '}
                    <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs font-mono dark:bg-white/10">
                        VITE_FIREBASE_API_KEY
                    </code>{' '}
                    and{' '}
                    <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs font-mono dark:bg-white/10">
                        VITE_FIREBASE_APP_ID
                    </code>{' '}
                    to{' '}
                    <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs font-mono dark:bg-white/10">
                        frontend/.env
                    </code>{' '}
                    (Firebase Console → Project settings → Your apps).
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                    <label htmlFor="email" className={`${labelClass} mb-2 block`}>
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                        className={inputClass}
                    />
                </div>

                {!resetMode && (
                    <div>
                        <label htmlFor="password" className={`${labelClass} mb-2 block`}>
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                className={`${inputClass} pr-11`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 min-touch rounded-full text-text-muted hover:text-text-primary transition-colors"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {/* Mobile-only duplicate "Forgot password?" for quick thumb reach */}
                        <div className="mt-2 flex justify-end sm:hidden">
                            <button
                                type="button"
                                onClick={() => setResetMode(true)}
                                className="text-sm font-semibold text-trust underline-offset-4 hover:underline min-h-11 px-1"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || (!resetMode && !firebaseConfigured)}
                    className="mt-1 w-full rounded-xl bg-gradient-to-r from-primary to-secondary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-base hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]"
                >
                    {loading
                        ? (resetMode ? 'Sending…' : 'Signing in…')
                        : (resetMode ? 'Send reset link' : 'Sign in')}
                </button>
            </form>

            {!resetMode && (
                <>
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border-default/70" />
                        </div>
                        <div className="relative flex justify-center text-xs font-medium">
                            <span className="bg-white px-4 text-text-muted">or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogle}
                        disabled={!firebaseConfigured}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-default bg-surface py-3 text-sm font-semibold text-text-primary shadow-sm transition-all duration-base hover:border-text-muted/40 hover:bg-surface-hover hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.97-6.19A23.9 23.9 0 0 0 0 24c0 3.77.87 7.36 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        Google
                    </button>
                </>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-border-default/60 pt-6 text-center text-sm">
                {resetMode ? (
                    <button
                        type="button"
                        onClick={() => setResetMode(false)}
                        className="font-semibold text-trust underline-offset-4 hover:underline"
                    >
                        Back to sign in
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => setResetMode(true)}
                            className="hidden sm:inline-flex font-semibold text-trust underline-offset-4 hover:underline"
                        >
                            Forgot password?
                        </button>
                        <span className="hidden text-text-muted sm:inline" aria-hidden>
                            ·
                        </span>
                        <Link
                            to="/sign-up"
                            className="font-semibold text-trust underline-offset-4 hover:underline"
                        >
                            Create an account
                        </Link>
                    </>
                )}
            </div>
        </AuthPageLayout>
    );
}
