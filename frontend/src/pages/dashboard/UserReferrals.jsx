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
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-page-bg text-text-muted border border-border-default">{status}</span>;
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
        <div className="space-y-lg">
            <div>
                <h1 className="text-2xl font-bold text-text-primary mb-1">Referral Program</h1>
                <p className="text-sm text-text-secondary">Share your code — earn wallet credits when someone uses it to shop or enroll in a course!</p>
            </div>

            {/* Referral Code Card */}
            <div className="bg-surface border border-border-default rounded-lg p-lg relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-trust/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-xs mb-md text-trust">
                        <Gift size={24} />
                        <h2 className="text-xl font-bold">Your Referral Code</h2>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-sm mb-lg">
                        <div className="flex items-center gap-sm">
                            <div className="bg-page-bg border border-trust/30 rounded-lg px-xl py-xs font-mono text-3xl font-bold text-trust tracking-[0.2em] select-all">
                                {referralCode}
                            </div>
                            <button
                                onClick={() => copyToClipboard(referralCode, 'code')}
                                className="p-sm bg-page-bg hover:bg-surface-hover border border-border-default rounded-lg transition-colors text-text-muted hover:text-text-primary"
                                title="Copy Code"
                            >
                                <Copy size={20} />
                            </button>
                        </div>
                        {copied === 'code' && <span className="text-success text-sm font-bold flex items-center gap-1"><CheckCircle size={14} /> Copied!</span>}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-sm">
                        <button
                            onClick={() => copyToClipboard(referralLink, 'link')}
                            className="flex items-center justify-center gap-xs px-md py-sm bg-page-bg hover:bg-surface-hover border border-border-default rounded-lg text-sm text-text-secondary font-bold hover:text-text-primary transition-colors"
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
                            className="flex items-center justify-center gap-xs px-md py-sm bg-trust/10 hover:bg-trust/20 rounded-lg text-sm text-trust font-bold transition-colors"
                        >
                            <Share2 size={16} />
                            Share with Friends
                            {copied === 'share' && <span className="text-success ml-1">✓</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                <div className="bg-surface border border-border-default rounded-lg p-md shadow-sm">
                    <div className="flex items-center justify-between mb-sm">
                        <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Total Referrals</p>
                        <div className="p-sm bg-page-bg border border-border-default rounded text-blue-400"><Users size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-text-primary">{stats?.totalReferrals || 0}</span>
                    <div className="flex gap-3 text-xs text-text-secondary font-medium mt-2">
                        <span className="flex items-center gap-1"><ShoppingBag size={11} /> {stats?.shoppingReferrals || 0} shopping</span>
                        <span className="flex items-center gap-1"><GraduationCap size={11} /> {stats?.courseReferrals || 0} course</span>
                    </div>
                </div>

                <div className="bg-surface border border-border-default rounded-lg p-md shadow-sm">
                    <div className="flex items-center justify-between mb-sm">
                        <span className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Total Earnings</span>
                        <div className="p-sm bg-page-bg border border-border-default rounded text-success"><Gift size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-text-primary">₹{(stats?.totalEarnings || 0).toLocaleString()}</span>
                    <p className="text-xs text-text-secondary font-medium mt-2">{stats?.successfulReferrals || 0} rewarded · {stats?.pendingReferrals || 0} pending</p>
                </div>

                <div className="bg-surface border border-border-default rounded-lg p-md shadow-sm">
                    <div className="flex items-center justify-between mb-sm">
                        <span className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Wallet Balance</span>
                        <div className="p-sm bg-page-bg border border-border-default rounded text-trust"><Wallet size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-text-primary">₹{(stats?.walletBalance || 0).toLocaleString()}</span>
                    <p className="text-xs text-text-secondary font-medium mt-2">Usable at checkout for discounts</p>
                </div>
            </div>

            {/* How It Works */}
            <div className="bg-surface border border-border-default rounded-lg shadow-sm p-lg">
                <h3 className="font-bold mb-md text-lg text-text-primary">How It Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                            <ShoppingBag size={18} />
                        </div>
                        <div>
                            <h4 className="font-bold mb-1 text-text-primary">Shopping Referrals</h4>
                            <p className="text-sm text-text-secondary">Share your code — when a friend places an order using it at checkout, you both earn wallet credits.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-trust/10 border border-trust/20 text-trust flex items-center justify-center font-bold flex-shrink-0">
                            <GraduationCap size={18} />
                        </div>
                        <div>
                            <h4 className="font-bold mb-1 text-text-primary">Course Referrals</h4>
                            <p className="text-sm text-text-secondary">When a friend enrolls in a course using your referral code and their first fee payment is confirmed, you both earn credits.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Referrals Table with Tabs */}
            <div className="bg-surface border border-border-default rounded-lg p-md shadow-sm">
                <div className="flex items-center justify-between mb-md flex-wrap gap-3 border-b border-border-default pb-sm">
                    <h3 className="font-bold text-lg text-text-primary">Your Referrals</h3>
                    {/* Tabs */}
                    <div className="flex bg-page-bg border border-border-default rounded-lg p-1 gap-1">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${tab === t.key
                                    ? 'bg-surface border border-border-default shadow-sm text-text-primary'
                                    : 'text-text-secondary hover:text-text-primary border border-transparent'
                                    }`}
                            >
                                {t.icon} {t.label}
                                <span className={`ml-0.5 px-1.5 py-0.5 rounded text-xs border ${tab === t.key ? 'bg-trust/10 text-trust border-trust/20' : 'bg-surface text-text-muted border-border-default'}`}>
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
                                <tr className="bg-page-bg text-text-secondary text-xs uppercase font-bold tracking-wider border-b border-border-default">
                                    <th className="p-sm">Person Referred</th>
                                    <th className="p-sm">Type</th>
                                    <th className="p-sm">Date</th>
                                    <th className="p-sm">Status</th>
                                    <th className="p-sm text-right">Reward</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filtered.map(ref => (
                                    <tr key={ref.id} className="border-b border-border-default last:border-0 hover:bg-surface-hover transition-colors">
                                        <td className="p-sm">
                                            <div>
                                                <p className="font-bold text-text-primary">{ref.referee?.name}</p>
                                                <p className="text-xs text-text-secondary font-medium">{ref.referee?.email}</p>
                                                {ref.source === 'course' && ref.courseName && (
                                                    <p className="text-xs text-trust font-bold mt-1 flex items-center gap-1"><GraduationCap size={11} /> {ref.courseName}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-sm">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${ref.source === 'course'
                                                ? 'bg-trust/10 text-trust border border-trust/20'
                                                : 'bg-blue-50 text-blue-600 border border-blue-200'
                                                }`}>
                                                {ref.source === 'course' ? <GraduationCap size={11} /> : <ShoppingBag size={11} />}
                                                {ref.source === 'course' ? 'Course' : 'Shopping'}
                                            </span>
                                        </td>
                                        <td className="p-sm text-text-secondary text-xs font-medium">
                                            {new Date(ref.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-sm">{getStatusBadge(ref.status)}</td>
                                        <td className="p-sm text-right font-bold text-text-primary">
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
                    <div className="text-center py-xl text-text-secondary">
                        <Users size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="font-bold">No {tab === 'all' ? '' : tab + ' '}referrals yet.</p>
                        <p className="text-sm font-medium mt-1">Share your code and start earning!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserReferrals;
