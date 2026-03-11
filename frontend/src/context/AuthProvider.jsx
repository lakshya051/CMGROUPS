import { useState, useEffect, useCallback, useRef } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AuthContext } from './AuthContext';
import { setTokenGetter } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const tokenRef = useRef(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                const idToken = await fbUser.getIdToken();
                tokenRef.current = idToken;
                setFirebaseUser(fbUser);

                setTokenGetter(() => Promise.resolve(tokenRef.current));

                try {
                    const res = await fetch(`${API_BASE}/auth/me`, {
                        headers: { Authorization: `Bearer ${idToken}` },
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);
                    }
                } catch (err) {
                    console.error('Failed to fetch DB user:', err);
                }
            } else {
                setFirebaseUser(null);
                setUser(null);
                tokenRef.current = null;
                setTokenGetter(null);
            }
            setLoading(false);
        });

        return unsubscribe;
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

    const registerWithEmail = useCallback(async (email, password, name) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await cred.user.getIdToken();
        tokenRef.current = idToken;
        setTokenGetter(() => Promise.resolve(tokenRef.current));

        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ name }),
        });
        if (res.ok) {
            const data = await res.json();
            setUser(data.user);
        }
        return cred;
    }, []);

    const loginWithGoogle = useCallback(async () => {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        const idToken = await cred.user.getIdToken();
        tokenRef.current = idToken;
        setTokenGetter(() => Promise.resolve(tokenRef.current));

        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ name: cred.user.displayName }),
        });
        if (res.ok) {
            const data = await res.json();
            setUser(data.user);
        }
        return cred;
    }, []);

    const logout = useCallback(async () => {
        setUser(null);
        tokenRef.current = null;
        setTokenGetter(null);
        await signOut(auth);
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
                logout,
                refreshUser,
                loginWithEmail: (email, password) => signInWithEmailAndPassword(auth, email, password),
                registerWithEmail,
                loginWithGoogle,
                resetPassword: (email) => sendPasswordResetEmail(auth, email),
            }}
        >
            {loading ? null : children}
        </AuthContext.Provider>
    );
};
