import { useState, useEffect, useCallback, useRef } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signOut,
    sendEmailVerification,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AuthContext } from './AuthContext';
import { setTokenGetter, authAPI } from '../lib/api';
import { API_BASE } from '../lib/config';


/** Load DB user via /auth/me, or create/link row via /auth/register (same as after sign-up). */
async function fetchMeOrRegister(fbUser, idToken) {
    const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (meRes.ok) {
        const data = await meRes.json();
        return { ok: true, user: data.user };
    }
    const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
            name: fbUser.displayName?.trim() || fbUser.email?.split('@')[0]?.trim() || 'User',
        }),
    });
    const regData = await regRes.json().catch(() => ({}));
    if (regRes.ok && regData.user) {
        return { ok: true, user: regData.user };
    }
    return { ok: false, error: regData.error || `HTTP ${meRes.status}` };
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [emailVerified, setEmailVerified] = useState(false);
    const [loading, setLoading] = useState(true);
    const tokenRef = useRef(null);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        getRedirectResult(auth).then(async (result) => {
            if (result) {
                const refCode = localStorage.getItem('referralCode') || undefined;
                try {
                    await completeGoogleSignIn(result, refCode);
                } catch (err) {
                    console.error('Google redirect sign-in completion failed:', err);
                }
            }
        }).catch((err) => {
            if (err.code !== 'auth/popup-closed-by-user') {
                console.error('getRedirectResult error:', err);
            }
        });

        let cancelled = false;
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                const idToken = await fbUser.getIdToken();
                if (cancelled) return;
                tokenRef.current = idToken;
                setFirebaseUser(fbUser);
                setEmailVerified(Boolean(fbUser.emailVerified));

                setTokenGetter(() => Promise.resolve(tokenRef.current));

                try {
                    const { ok, user: dbUser, error } = await fetchMeOrRegister(fbUser, idToken);
                    if (cancelled) return;
                    if (ok && dbUser) {
                        setUser(dbUser);
                    } else {
                        console.warn('DB user sync failed, signing out of Firebase:', error);
                        setUser(null);
                        setFirebaseUser(null);
                        tokenRef.current = null;
                        setTokenGetter(null);
                        if (auth) await signOut(auth);
                    }
                } catch (err) {
                    if (cancelled) return;
                    console.error('Failed to fetch DB user:', err);
                    setUser(null);
                    setFirebaseUser(null);
                    tokenRef.current = null;
                    setTokenGetter(null);
                    if (auth) await signOut(auth);
                }
            } else {
                setFirebaseUser(null);
                setUser(null);
                setEmailVerified(false);
                tokenRef.current = null;
                setTokenGetter(null);
            }
            if (!cancelled) setLoading(false);
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    // Auto-refresh token every 50 minutes
    useEffect(() => {
        if (!firebaseUser) return;
        const interval = setInterval(async () => {
            const idToken = await firebaseUser.getIdToken(true);
            tokenRef.current = idToken;
        }, 50 * 60 * 1000);
        return () => clearInterval(interval);
    }, [firebaseUser]);

    const registerWithEmail = useCallback(async (email, password, name, referredByCode) => {
        if (!auth) throw new Error('Firebase is not configured. Add VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID to frontend/.env');
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        try {
            await sendEmailVerification(cred.user);
        } catch (err) {
            console.warn('Failed to send verification email:', err);
        }

        const idToken = await cred.user.getIdToken();
        tokenRef.current = idToken;
        setTokenGetter(() => Promise.resolve(tokenRef.current));

        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ name, referredByCode }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || `Registration failed (${res.status})`);
        }
        setUser(data.user);
        setEmailVerified(Boolean(cred.user.emailVerified));
        localStorage.removeItem('referralCode');
        return cred;
    }, []);

    const resendVerificationEmail = useCallback(async () => {
        if (!firebaseUser) throw new Error('Not signed in');
        if (firebaseUser.emailVerified) throw new Error('Email already verified');
        await sendEmailVerification(firebaseUser);
    }, [firebaseUser]);

    const reloadFirebaseUser = useCallback(async () => {
        if (!auth?.currentUser) return false;
        try {
            await auth.currentUser.reload();
        } catch (err) {
            console.warn('reloadFirebaseUser: reload failed', err);
            return false;
        }
        const fresh = auth.currentUser;
        const verified = Boolean(fresh?.emailVerified);
        setFirebaseUser(fresh);
        setEmailVerified(verified);
        if (verified) {
            try {
                const idToken = await fresh.getIdToken(true);
                tokenRef.current = idToken;
                setTokenGetter(() => Promise.resolve(tokenRef.current));
            } catch { /* ignore token refresh errors */ }
        }
        return verified;
    }, []);

    const completeGoogleSignIn = useCallback(async (cred, referredByCode) => {
        const idToken = await cred.user.getIdToken();
        tokenRef.current = idToken;
        setTokenGetter(() => Promise.resolve(tokenRef.current));

        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ name: cred.user.displayName, referredByCode }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || `Server error (${res.status})`);
        }
        setUser(data.user);
        localStorage.removeItem('referralCode');
        return { cred, user: data.user };
    }, []);

    const loginWithGoogle = useCallback(async (referredByCode) => {
        if (!auth) throw new Error('Firebase is not configured. Add VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID to frontend/.env');
        const provider = new GoogleAuthProvider();

        try {
            const cred = await signInWithPopup(auth, provider);
            return await completeGoogleSignIn(cred, referredByCode);
        } catch (err) {
            if (err.code === 'auth/popup-blocked') {
                if (referredByCode) localStorage.setItem('referralCode', referredByCode);
                await signInWithRedirect(auth, provider);
                return { redirectStarted: true };
            }
            throw err;
        }
    }, [completeGoogleSignIn]);

    const logout = useCallback(async () => {
        setUser(null);
        tokenRef.current = null;
        setTokenGetter(null);
        if (auth) await signOut(auth);
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const token = tokenRef.current;
            if (!token) return false;
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                isSignedIn: !!firebaseUser,
                isAdmin: user?.role === 'admin',
                firebaseUser,
                firebaseConfigured: !!auth,
                logout,
                refreshUser,
                loginWithEmail: async (email, password) => {
                    if (!auth) throw new Error('Firebase is not configured. Add VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID to frontend/.env');
                    const cred = await signInWithEmailAndPassword(auth, email, password);
                    const idToken = await cred.user.getIdToken();
                    tokenRef.current = idToken;
                    setTokenGetter(() => Promise.resolve(tokenRef.current));
                    let dbUser = null;
                    try {
                        const { ok, user: synced, error } = await fetchMeOrRegister(cred.user, idToken);
                        if (ok && synced) {
                            dbUser = synced;
                            setUser(synced);
                        } else {
                            console.warn('DB user sync failed after email login, signing out:', error);
                            setUser(null);
                            tokenRef.current = null;
                            setTokenGetter(null);
                            if (auth) await signOut(auth);
                            throw new Error(error || 'Could not connect your account to the server. Check your connection and try again.');
                        }
                    } catch (err) {
                        if (err.message?.includes('Could not connect')) throw err;
                        console.error('Failed to fetch DB user after email login:', err);
                        setUser(null);
                        tokenRef.current = null;
                        setTokenGetter(null);
                        if (auth) await signOut(auth);
                        throw err;
                    }
                    return { cred, user: dbUser };
                },
                emailVerified,
                requiresEmailVerification:
                    !!firebaseUser && !emailVerified,
                registerWithEmail,
                resendVerificationEmail,
                reloadFirebaseUser,
                loginWithGoogle,
                resetPassword: async (email) => {
                    const trimmed = String(email || '').trim();
                    if (!trimmed) throw new Error('Email is required');
                    await authAPI.forgotPassword(trimmed);
                },
            }}
        >
            {loading ? null : children}
        </AuthContext.Provider>
    );
};
