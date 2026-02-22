import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // validate backend token and hydrate user
        const token = localStorage.getItem('token');
        const initBackendSession = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const data = await authAPI.getMe();
                setUser(data.user);
            } catch {
                localStorage.removeItem('token');
            } finally {
                setLoading(false);
            }
        };

        initBackendSession();
    }, []);

    const login = async (identifier, password) => {
        try {
            const data = await authAPI.login(identifier, password);
            localStorage.setItem('token', data.token);
            setUser(data.user);
            return { success: true, role: data.user.role };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const register = async (userData) => {
        try {
            const data = await authAPI.register(userData.name, userData.email, userData.password, userData.phone, userData.referralCode);
            localStorage.setItem('token', data.token);
            setUser(data.user);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                login,
                register,
                logout,
            }}
        >
            {!loading && children}
        </AuthContext.Provider>
    );
};
