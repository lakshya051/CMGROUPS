import React, { useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { authAPI, setTokenGetter } from '../lib/api';
import { AuthContext } from './AuthContext';

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

        const hydrateUser = async () => {
            try {
                const data = await authAPI.getMe();
                setUser(data.user);
            } catch {
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
                logout,
                refreshUser,
            }}
        >
            {(!isLoaded || loading) ? null : children}
        </AuthContext.Provider>
    );
};
