import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { referralsAPI } from '../../lib/api';
import { Copy, Gift, Users, Wallet, CheckCircle, Clock, Link as LinkIcon, Share2, ShoppingBag, GraduationCap } from 'lucide-react';

const UserReferrals = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [allReferrals, setAllReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState('');
    const [tab, setTab] = useState('all'); // 'all' | 'shopping' | 'course'

    useEffect(() => {
        Promise.all([
            referralsAPI.getMyStats(),
            referralsAPI.getMyReferrals() // fetch all once
        ])
            .then(([statsData, referralsData]) => {
                setStats(statsData);
                setAllReferrals(referralsData);
            })
            .catch(err => console.error('Failed to fetch referral data:', err))
            .finally(() => setLoading(false));
    }, []);

    const copyToClipboard = (text, type) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(''), 2000);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-400/10 text-yellow-500 border border-yellow-400/20 flex items-center gap-1"><Clock size={11} /> Pending</span>;
            case 'rewarded':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20 flex items-center gap-1"><CheckCircle size={11} /> Rewarded</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-text-muted border border-gray-200">{status}</span>;
        }
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading referral data...</div>;

    const referralCode = stats?.referralCode || user?.referralCode || '';
    const referralLink = stats?.referralLink || `${window.location.origin}/sign-up?ref=${referralCode}`;

    // Client-side filter for tabs
    const filtered = tab === 'all' ? allReferrals
        : allReferrals.filter(r => r.source === tab);

    const tabs = [
        { key: 'all', label: 'All', count: stats?.totalReferrals || 0, icon: <Users size={14} /> },
        { key: 'shopping', label: 'Shopping', count: stats?.shoppingReferrals || 0, icon: <ShoppingBag size={14} /> },
        { key: 'course', label: 'Courses', count: stats?.courseReferrals || 0, icon: <GraduationCap size={14} /> },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-heading font-bold mb-1">Referral Program</h1>
                <p className="text-text-muted">Share your code — earn wallet credits when someone uses it to shop or enroll in a course!</p>
            </div>

            {/* Referral Code Card */}
            <div className="glass-panel p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-primary">
                        <Gift size={24} />
                        <h2 className="text-xl font-bold">Your Referral Code</h2>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-100 border-2 border-primary/50 rounded-xl px-6 py-3 font-mono text-3xl font-bold text-primary tracking-[0.2em] select-all">
                                {referralCode}
                            </div>
                            <button
                                onClick={() => copyToClipboard(referralCode, 'code')}
                                className="p-3 bg-gray-100 hover:bg-slate-700 rounded-lg transition-colors text-text-muted hover:text-text-main"
                                title="Copy Code"
                            >
                                <Copy size={20} />
                            </button>
                        </div>
                        {copied === 'code' && <span className="text-success text-sm flex items-center gap-1"><CheckCircle size={14} /> Copied!</span>}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => copyToClipboard(referralLink, 'link')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-slate-700 rounded-lg text-sm text-text-muted hover:text-text-main transition-colors"
                        >
                            <LinkIcon size={16} />
                            Copy Invite Link
                            {copied === 'link' && <span className="text-success ml-1">✓</span>}
                        </button>
                        <button
                            onClick={() => {
                                const text = `Join CMGROUPS and use my referral code: ${referralCode} — earn rewards on shopping and course enrollment! 🎁`;
                                if (navigator.share) {
                                    navigator.share({ title: 'Join CMGROUPS!', text });
                                } else {
                                    copyToClipboard(text, 'share');
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg text-sm text-primary transition-colors"
                        >
                            <Share2 size={16} />
                            Share with Friends
                            {copied === 'share' && <span className="text-success ml-1">✓</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-text-muted font-medium">Total Referrals</p>
                        <div className="p-2 bg-gray-100 rounded-lg text-blue-400"><Users size={24} /></div>
                    </div>
                    <span className="text-3xl font-bold">{stats?.totalReferrals || 0}</span>
                    <div className="flex gap-3 text-xs text-text-muted mt-2">
                        <span className="flex items-center gap-1"><ShoppingBag size={11} /> {stats?.shoppingReferrals || 0} shopping</span>
                        <span className="flex items-center gap-1"><GraduationCap size={11} /> {stats?.courseReferrals || 0} course</span>
                    </div>
                </div>

                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-text-muted font-medium">Total Earnings</span>
                        <div className="p-2 bg-gray-100 rounded-lg text-success"><Gift size={24} /></div>
                    </div>
                    <span className="text-3xl font-bold">₹{(stats?.totalEarnings || 0).toLocaleString()}</span>
                    <p className="text-xs text-text-muted mt-1">{stats?.successfulReferrals || 0} rewarded · {stats?.pendingReferrals || 0} pending</p>
                </div>

                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-text-muted font-medium">Wallet Balance</span>
                        <div className="p-2 bg-gray-100 rounded-lg text-primary"><Wallet size={24} /></div>
                    </div>
                    <span className="text-3xl font-bold">₹{(stats?.walletBalance || 0).toLocaleString()}</span>
                    <p className="text-xs text-text-muted mt-1">Usable at checkout for discounts</p>
                </div>
            </div>

            {/* How It Works */}
            <div className="glass-panel p-6">
                <h3 className="font-bold mb-4 text-lg">How It Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                            <ShoppingBag size={18} />
                        </div>
                        <div>
                            <h4 className="font-bold mb-1">Shopping Referrals</h4>
                            <p className="text-sm text-text-muted">Share your code — when a friend places an order using it at checkout, you both earn wallet credits.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                            <GraduationCap size={18} />
                        </div>
                        <div>
                            <h4 className="font-bold mb-1">Course Referrals</h4>
                            <p className="text-sm text-text-muted">When a friend enrolls in a course using your referral code and their first fee payment is confirmed, you both earn credits.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Referrals Table with Tabs */}
            <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <h3 className="font-bold text-lg">Your Referrals</h3>
                    {/* Tabs */}
                    <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === t.key
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-text-muted hover:text-text-main'
                                    }`}
                            >
                                {t.icon} {t.label}
                                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${tab === t.key ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-text-muted'}`}>
                                    {t.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {filtered.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-text-muted text-xs border-b border-gray-200">
                                    <th className="pb-3 pl-2">Person Referred</th>
                                    <th className="pb-3">Type</th>
                                    <th className="pb-3">Date</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3 text-right pr-2">Reward</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filtered.map(ref => (
                                    <tr key={ref.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 pl-2">
                                            <div>
                                                <p className="font-bold">{ref.referee?.name}</p>
                                                <p className="text-xs text-text-muted">{ref.referee?.email}</p>
                                                {ref.source === 'course' && ref.courseName && (
                                                    <p className="text-xs text-primary mt-0.5 flex items-center gap-1"><GraduationCap size={11} /> {ref.courseName}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ref.source === 'course'
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {ref.source === 'course' ? <GraduationCap size={11} /> : <ShoppingBag size={11} />}
                                                {ref.source === 'course' ? 'Course' : 'Shopping'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-text-muted text-xs">
                                            {new Date(ref.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-4">{getStatusBadge(ref.status)}</td>
                                        <td className="py-4 text-right pr-2 font-bold">
                                            {ref.status === 'rewarded' ? (
                                                <span className="text-success">+₹{ref.rewardAmount}</span>
                                            ) : (
                                                <span className="text-text-muted">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-10 text-text-muted">
                        <Users size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold">No {tab === 'all' ? '' : tab + ' '}referrals yet.</p>
                        <p className="text-sm mt-1">Share your code and start earning!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserReferrals;
