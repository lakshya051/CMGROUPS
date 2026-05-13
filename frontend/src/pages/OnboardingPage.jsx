import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../lib/api';
import { needsPhoneCapture } from '../lib/authProfile';

export default function OnboardingPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { refreshUser, isSignedIn, user, loading: authLoading, requiresEmailVerification } = useAuth();
    const navigate = useNavigate();

    // Prefill name from the signed-in user profile so returning Google users
    // don't have to retype it.
    useEffect(() => {
        if (user?.name && !name) {
            setName(user.name);
        }
    }, [user, name]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-page-bg flex items-center justify-center" role="status" aria-live="polite">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" aria-hidden="true" />
                    <p className="text-text-muted text-sm">Loading...</p>
                </div>
            </div>
        );
    }
    if (!isSignedIn) {
        return <Navigate to="/sign-in" replace />;
    }
    if (requiresEmailVerification) {
        return <Navigate to="/verify-email" replace />;
    }
    if (user && !needsPhoneCapture(user)) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }
        setLoading(true);
        try {
            await authAPI.onboarding({ name: name.trim(), phone: `+91${cleaned}` });
            await refreshUser();
            try { window.sessionStorage?.removeItem('onboardingSkipped'); } catch { /* ignore */ }
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        try { window.sessionStorage?.setItem('onboardingSkipped', '1'); } catch { /* ignore */ }
        navigate('/', { replace: true });
    };

    return (
        <div className="min-h-screen bg-page-bg flex items-center justify-center p-lg">
            <div className="bg-surface rounded-lg shadow-sm border border-border-default p-xl w-full max-w-md">
                <h1 className="text-xl font-bold text-text-primary mb-xs">One last step</h1>
                <p className="text-sm text-text-secondary mb-lg">
                    We need your mobile number for order updates and delivery coordination.
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-md">
                    <div>
                        <label htmlFor="name" className="text-sm font-medium text-text-primary block mb-xs">Full Name</label>
                        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
                            placeholder="Rahul Sharma" required
                            className="w-full border border-border-default rounded-lg px-3 py-2.5 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust" />
                    </div>
                    <div>
                        <label htmlFor="phone" className="text-sm font-medium text-text-primary block mb-xs">
                            Mobile Number <span className="text-deal">*</span>
                        </label>
                        <div className="flex border border-border-default rounded overflow-hidden">
                            <span className="bg-page-bg px-3 py-2.5 text-base sm:text-sm text-text-secondary border-r border-border-default flex items-center">+91</span>
                            <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                placeholder="9876543210" maxLength={10} required
                                className="flex-1 px-3 py-2.5 text-base sm:text-sm outline-none bg-surface text-text-primary" />
                        </div>
                        <p className="text-text-secondary text-xs mt-xs">Used only for delivery updates. We don't spam.</p>
                    </div>
                    {error && <p className="text-deal text-sm">{error}</p>}
                    <button type="submit" disabled={loading}
                        className="w-full bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold py-3 rounded-lg transition-colors duration-base disabled:opacity-50">
                        {loading ? 'Saving...' : 'Continue to Shoptify →'}
                    </button>
                    <button type="button" onClick={handleSkip} disabled={loading}
                        className="w-full text-sm text-text-secondary hover:text-text-primary underline-offset-2 hover:underline py-2 disabled:opacity-50">
                        Skip for now
                    </button>
                </form>
            </div>
        </div>
    );
}
