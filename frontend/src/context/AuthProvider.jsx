import React, { useState, useEffect, useRef } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { authAPI, setTokenGetter } from '../lib/api';
import { AuthContext } from './AuthContext';

const MAX_RETRIES = 2;
const RETRY_DELAY = 1500;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { isSignedIn, isLoaded, getToken } = useClerkAuth();
    const { signOut } = useClerk();
    const retriesRef = useRef(0);

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
            retriesRef.current = 0;
            return;
        }

        const hydrateUser = async () => {
            try {
                const data = await authAPI.getMe();
                setUser(data.user);
                retriesRef.current = 0;
            } catch {
                if (retriesRef.current < MAX_RETRIES) {
                    retriesRef.current += 1;
                    setTimeout(hydrateUser, RETRY_DELAY);
                    return;
                }
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        hydrateUser();
    }, [isLoaded, isSignedIn]);

    const logout = () => {
        setUser(null);
        signOut();
    };

    const refreshUser = async () => {
        try {
                const data = await authAPI.getMe();
            setUser(data.user);
        } catch {
            // silently fail
        }
    };

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
