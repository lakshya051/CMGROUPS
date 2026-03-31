import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthPageLayout from '../components/auth/AuthPageLayout';
import { needsPhoneCapture } from '../lib/authProfile';
import { FIREBASE_OPERATION_NOT_ALLOWED } from '../lib/firebaseAuthErrors';
import toast from 'react-hot-toast';

const inputClass =
    'input-field text-base py-3 rounded-xl border-border-default/80 shadow-sm focus:border-trust focus:ring-2 focus:ring-trust/20';

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-text-secondary';

export default function SignUp() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const { registerWithEmail, loginWithGoogle, firebaseConfigured } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const ref = searchParams.get('ref');
        if (ref) {
            localStorage.setItem('referralCode', ref.trim().toUpperCase());
        }
    }, [searchParams]);

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
        if (!termsAccepted) {
            toast.error('Please accept the Terms of Service and Privacy Policy');
            return;
        }

        setLoading(true);
        try {
            const refCode = localStorage.getItem('referralCode') || undefined;
            await registerWithEmail(email, password, name.trim(), refCode);
            toast.success(
                'Account created! A verification link has been sent to your email.',
                { duration: 6000 }
            );
            navigate('/onboarding', { replace: true });
        } catch (err) {
            const msg = err.code === 'auth/email-already-in-use'
                ? 'An account with this email already exists'
                : err.code === 'auth/weak-password'
                    ? 'Password is too weak. Use at least 6 characters.'
                    : err.code === 'auth/operation-not-allowed'
                        ? FIREBASE_OPERATION_NOT_ALLOWED
                        : err.message;
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            const refCode = localStorage.getItem('referralCode') || undefined;
            const result = await loginWithGoogle(refCode);
            if (result?.redirectStarted) return;
            const dbUser = result?.user;
            navigate(needsPhoneCapture(dbUser) ? '/onboarding' : '/', { replace: true });
        } catch (err) {
            if (err.code === 'auth/popup-closed-by-user') return;
            toast.error(
                err.code === 'auth/operation-not-allowed'
                    ? FIREBASE_OPERATION_NOT_ALLOWED
                    : 'Google sign-up failed. Please try again.'
            );
        }
    };

    return (
        <AuthPageLayout
            headline="Join the community"
            subheadline="Create one account for shopping, learning, and booking tech services—tailored for how you actually use Shoptify."
        >
            <div className="mb-8">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                    Create your account
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    Takes under a minute. You can refine your profile after sign-up.
                </p>
            </div>

            {!firebaseConfigured && (
                <div className="mb-6 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] p-4 text-sm text-amber-900 dark:text-amber-100">
                    Sign-up is disabled: add Firebase env vars to{' '}
                    <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs font-mono dark:bg-white/10">
                        frontend/.env
                    </code>{' '}
                    (same as sign-in).
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                    <label htmlFor="name" className={`${labelClass} mb-2 block`}>
                        Full name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Rahul Sharma"
                        required
                        autoComplete="name"
                        className={inputClass}
                    />
                </div>

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
                            placeholder="At least 6 characters"
                            required
                            minLength={6}
                            autoComplete="new-password"
                            className={`${inputClass} pr-11`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className={`${labelClass} mb-2 block`}>
                        Confirm password
                    </label>
                    <div className="relative">
                        <input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            required
                            autoComplete="new-password"
                            className={`${inputClass} pr-11`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border-default text-primary focus:ring-primary/30"
                    />
                    <span className="text-sm text-text-secondary leading-snug">
                        I agree to the{' '}
                        <Link to="/terms-of-service" target="_blank" className="text-trust font-semibold underline-offset-4 hover:underline">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy-policy" target="_blank" className="text-trust font-semibold underline-offset-4 hover:underline">
                            Privacy Policy
                        </Link>
                    </span>
                </label>

                <button
                    type="submit"
                    disabled={loading || !firebaseConfigured || !termsAccepted}
                    className="mt-1 w-full rounded-xl bg-gradient-to-r from-primary to-secondary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-base hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]"
                >
                    {loading ? 'Creating account…' : 'Create account'}
                </button>
            </form>

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

            <p className="mt-8 border-t border-border-default/60 pt-6 text-center text-sm text-text-secondary">
                Already have an account?{' '}
                <Link
                    to="/sign-in"
                    className="font-semibold text-trust underline-offset-4 hover:underline"
                >
                    Sign in
                </Link>
            </p>
        </AuthPageLayout>
    );
}
