import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import { authAPI } from '../lib/api';

const VerifyEmail = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Get email from router state if they just registered, otherwise empty string
    const initialEmail = location.state?.email || '';

    const [email, setEmail] = useState(initialEmail);
    const [otp, setOtp] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
    const [message, setMessage] = useState('');

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!email || !otp) {
            setStatus('error');
            setMessage('Email and OTP are required.');
            return;
        }

        setStatus('loading');
        try {
            const data = await authAPI.verifyEmail(email, otp);
            setStatus('success');
            setMessage(data?.message || 'Email verified successfully!');
        } catch (err) {
            setStatus('error');
            setMessage(err.message || 'Verification failed. Please check your OTP.');
        }
    };

    const handleResend = async () => {
        if (!email) {
            setStatus('error');
            setMessage('Please enter your email to resend OTP.');
            return;
        }

        setStatus('loading');
        try {
            await authAPI.resendVerification(email);
            setStatus('idle');
            setMessage('A new OTP has been sent to your email.');
        } catch (err) {
            setStatus('error');
            setMessage(err.message || 'Failed to resend OTP.');
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
                <div className="w-full max-w-md p-8 glass-panel animate-in fade-in zoom-in duration-300 text-center">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mb-6">
                            <ShieldCheck size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-text-main mb-2">Email Verified!</h1>
                        <p className="text-text-muted mb-8">{message}</p>
                        <Button className="w-full" onClick={() => navigate('/login')} size="lg">
                            Go to Login
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
            <div className="w-full max-w-md p-8 glass-panel animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-heading font-bold text-text-main mb-2">Verify Your Email</h1>
                    <p className="text-text-muted">Enter the 6-digit OTP sent to your inbox.</p>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg mb-6 text-sm text-center ${status === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleVerify} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="email"
                                className="input-field pl-10"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={status === 'loading'}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">6-Digit OTP</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                className="input-field pl-10"
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                                disabled={status === 'loading'}
                                required
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={status === 'loading'}>
                        {status === 'loading' ? 'Verifying...' : 'Verify OTP'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-text-muted">
                    Didn't receive an OTP?{' '}
                    <button type="button" onClick={handleResend} className="text-primary hover:underline" disabled={status === 'loading'}>
                        Resend
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
