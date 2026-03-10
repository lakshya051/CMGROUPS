import React, { useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { authAPI, setTokenGetter } from '../lib/api';
import { AuthContext } from './AuthContext';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { isSignedIn, isLoaded, getToken } = useClerkAuth();
    const { signOut } = useClerk();

    useEffect(() => {
        if (isLoaded) {
            setTokenGetter(isSignedIn ? getToken : null);
        }
    }, [isLoaded, isSignedIn, getToken]);

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            setUser(null);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const hydrateUser = async () => {
            // Wait briefly for Clerk to mint the session token after sign-in
            const token = await getToken();
            if (!token) {
                await wait(500);
            }

            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                if (cancelled) return;

                try {
                    const data = await authAPI.getMe();
                    if (!cancelled) {
                        setUser(data.user);
                        setLoading(false);
                    }
                    return;
                } catch {
                    if (attempt < MAX_RETRIES) {
                        await wait(RETRY_DELAY);
                    }
                }
            }

            // All retries exhausted
            if (!cancelled) {
                setUser(null);
                setLoading(false);
            }
        };

        hydrateUser();

        return () => { cancelled = true; };
    }, [isLoaded, isSignedIn, getToken]);

    const logout = useCallback(async () => {
        setUser(null);
        await signOut();
    }, [signOut]);

    const refreshUser = useCallback(async () => {
        try {
            const data = await authAPI.getMe();
            setUser(data.user);
            return true;
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
                isSignedIn: isSignedIn ?? false,
                logout,
                refreshUser,
            }}
        >
            {(!isLoaded || loading) ? null : children}
        </AuthContext.Provider>
    );
};
