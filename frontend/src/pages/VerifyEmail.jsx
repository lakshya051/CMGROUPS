import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MailCheck, RefreshCw, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthPageLayout from '../components/auth/AuthPageLayout';
import { useAuth } from '../context/AuthContext';
import { needsPhoneCapture } from '../lib/authProfile';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
    const {
        isSignedIn,
        firebaseUser,
        emailVerified,
        user,
        loading: authLoading,
        reloadFirebaseUser,
        resendVerificationEmail,
        logout,
    } = useAuth();
    const navigate = useNavigate();

    const [checking, setChecking] = useState(false);
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const pollRef = useRef(null);

    useEffect(() => {
        if (!isSignedIn || !firebaseUser || emailVerified) return;
        pollRef.current = setInterval(async () => {
            try {
                const verified = await reloadFirebaseUser();
                if (verified) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
            } catch {
                /* ignore transient reload errors */
            }
        }, 5000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [isSignedIn, firebaseUser, emailVerified, reloadFirebaseUser]);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-page-bg flex items-center justify-center" role="status" aria-live="polite">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" aria-hidden="true" />
            </div>
        );
    }

    if (!isSignedIn) {
        return <Navigate to="/sign-in" replace />;
    }

    if (emailVerified) {
        const next = user && needsPhoneCapture(user) ? '/onboarding' : '/';
        return <Navigate to={next} replace />;
    }

    const handleCheck = async () => {
        setChecking(true);
        try {
            const verified = await reloadFirebaseUser();
            if (verified) {
                toast.success('Email verified! Redirecting…');
            } else {
                toast.error('Still not verified. Click the link in your inbox, then try again.');
            }
        } catch (err) {
            console.error('[VerifyEmail] reload error:', err);
            toast.error('Could not check verification status. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        setResending(true);
        try {
            await resendVerificationEmail();
            toast.success('Verification email sent. Check your inbox and spam folder.');
            setCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (err) {
            console.error('[VerifyEmail] resend error:', err);
            const msg = err?.code === 'auth/too-many-requests'
                ? 'Too many requests. Please wait a bit before trying again.'
                : err?.message || 'Could not resend verification email.';
            toast.error(msg);
        } finally {
            setResending(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await logout();
        } finally {
            navigate('/sign-in', { replace: true });
        }
    };

    const email = firebaseUser?.email || user?.email || 'your email';

    return (
        <AuthPageLayout
            headline="One quick check"
            subheadline="Confirm your email so we can keep your account secure and deliver your updates reliably."
        >
            <div className="mb-6 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary">
                    <MailCheck size={28} aria-hidden="true" />
                </div>
            </div>

            <div className="mb-6 text-center">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                    Verify your email
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    We sent a verification link to{' '}
                    <span className="font-semibold text-text-primary break-all">{email}</span>.
                    Open it on this device to activate your account.
                </p>
            </div>

            <div className="mb-6 rounded-xl border border-border-default/70 bg-surface/60 p-4 text-sm text-text-secondary">
                <p className="font-semibold text-text-primary mb-1">Didn't get the email?</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Check your spam or promotions folder.</li>
                    <li>Make sure {email} is spelled correctly.</li>
                    <li>Wait a minute, then tap “Resend email”.</li>
                </ul>
            </div>

            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={handleCheck}
                    disabled={checking}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-base hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]"
                >
                    <RefreshCw size={16} className={checking ? 'animate-spin' : ''} aria-hidden="true" />
                    {checking ? 'Checking…' : 'I’ve verified my email'}
                </button>

                <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || cooldown > 0}
                    className="w-full rounded-xl border border-border-default bg-surface py-3 text-sm font-semibold text-text-primary shadow-sm transition-all duration-base hover:border-text-muted/40 hover:bg-surface-hover hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust disabled:cursor-not-allowed disabled:opacity-45"
                >
                    {resending
                        ? 'Sending…'
                        : cooldown > 0
                            ? `Resend email in ${cooldown}s`
                            : 'Resend verification email'}
                </button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 border-t border-border-default/60 pt-6 text-center text-sm text-text-secondary">
                <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 font-semibold text-trust underline-offset-4 hover:underline"
                >
                    <LogOut size={14} aria-hidden="true" />
                    Sign out &amp; use a different email
                </button>
            </div>
        </AuthPageLayout>
    );
}
