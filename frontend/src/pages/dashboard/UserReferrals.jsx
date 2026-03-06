import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { referralsAPI } from '../../lib/api';
import {
    CheckCircle,
    Clock,
    Copy,
    Gift,
    GraduationCap,
    Link as LinkIcon,
    Share2,
    ShoppingBag,
    Users,
    Wallet,
    Wrench
} from 'lucide-react';

const SOURCE_META = {
    shopping: {
        label: 'Shopping',
        icon: ShoppingBag,
        className: 'bg-blue-50 text-blue-600 border border-blue-200'
    },
    course: {
        label: 'Course',
        icon: GraduationCap,
        className: 'bg-trust/10 text-trust border border-trust/20'
    },
    service: {
        label: 'Service',
        icon: Wrench,
        className: 'bg-orange-50 text-orange-600 border border-orange-200'
    }
};

const UserReferrals = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [sentReferrals, setSentReferrals] = useState([]);
    const [receivedReferrals, setReceivedReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState('');
    const [tab, setTab] = useState('sent');

    useEffect(() => {
        Promise.all([
            referralsAPI.getMyStats(),
            referralsAPI.getMyReferrals(),
            referralsAPI.getMyReceivedReferrals()
        ])
            .then(([statsData, sentData, receivedData]) => {
                setStats(statsData);
                setSentReferrals(sentData);
                setReceivedReferrals(receivedData);
            })
            .catch((err) => console.error('Failed to fetch referral data:', err))
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

    const renderSourceBadge = (source, courseName) => {
        const meta = SOURCE_META[source] || SOURCE_META.shopping;
        const Icon = meta.icon;

        return (
            <div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${meta.className}`}>
                    <Icon size={11} />
                    {meta.label}
                </span>
                {source === 'course' && courseName && (
                    <p className="text-xs text-trust font-bold mt-1">{courseName}</p>
                )}
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading referral data...</div>;

    const referralCode = stats?.referralCode || user?.referralCode || '';
    const referralLink = stats?.referralLink || `${window.location.origin}/signup?ref=${referralCode}`;
    const activeReferrals = tab === 'sent' ? sentReferrals : receivedReferrals;
    const tabs = [
        { key: 'sent', label: 'Sent', count: sentReferrals.length, icon: <Users size={14} /> },
        { key: 'received', label: 'Received', count: receivedReferrals.length, icon: <Gift size={14} /> }
    ];

    return (
        <div className="space-y-lg">
            <div>
                <h1 className="text-2xl font-bold text-text-primary mb-1">Referral Program</h1>
                <p className="text-sm text-text-secondary">Share your code to earn when someone shops, books a service, or enrolls in a course with it.</p>
            </div>

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
                            {copied === 'link' && <span className="text-success ml-1">Copied</span>}
                        </button>
                        <button
                            onClick={() => {
                                const text = `Join CMGROUPS and use my referral code: ${referralCode}. Earn rewards on shopping, services, and courses.`;
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
                            {copied === 'share' && <span className="text-success ml-1">Copied</span>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-md">
                <div className="bg-surface border border-border-default rounded-lg p-md shadow-sm">
                    <div className="flex items-center justify-between mb-sm">
                        <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Total Referrals</p>
                        <div className="p-sm bg-page-bg border border-border-default rounded text-blue-400"><Users size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-text-primary">{stats?.totalReferrals || 0}</span>
                    <div className="flex flex-wrap gap-3 text-xs text-text-secondary font-medium mt-2">
                        <span className="flex items-center gap-1"><ShoppingBag size={11} /> {stats?.shoppingReferrals || 0} shopping</span>
                        <span className="flex items-center gap-1"><GraduationCap size={11} /> {stats?.courseReferrals || 0} course</span>
                        <span className="flex items-center gap-1"><Wrench size={11} /> {stats?.serviceReferrals || 0} service</span>
                    </div>
                </div>

                <div className="bg-surface border border-border-default rounded-lg p-md shadow-sm">
                    <div className="flex items-center justify-between mb-sm">
                        <span className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Total Earnings</span>
                        <div className="p-sm bg-page-bg border border-border-default rounded text-success"><Gift size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-text-primary">Rs {(stats?.totalEarnings || 0).toLocaleString()}</span>
                    <p className="text-xs text-text-secondary font-medium mt-2">{stats?.successfulReferrals || 0} rewarded · {stats?.pendingReferrals || 0} pending</p>
                </div>

                <div className="bg-surface border border-border-default rounded-lg p-md shadow-sm">
                    <div className="flex items-center justify-between mb-sm">
                        <span className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Earned As Referee</span>
                        <div className="p-sm bg-page-bg border border-border-default rounded text-orange-500"><Gift size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-text-primary">Rs {(stats?.myReceivedEarnings || 0).toLocaleString()}</span>
                    <p className="text-xs text-text-secondary font-medium mt-2">Rewards you received by using someone else's code</p>
                </div>

                <div className="bg-surface border border-border-default rounded-lg p-md shadow-sm">
                    <div className="flex items-center justify-between mb-sm">
                        <span className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Wallet Balance</span>
                        <div className="p-sm bg-page-bg border border-border-default rounded text-trust"><Wallet size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-text-primary">Rs {(stats?.walletBalance || 0).toLocaleString()}</span>
                    <p className="text-xs text-text-secondary font-medium mt-2">Usable at checkout for discounts</p>
                </div>
            </div>

            <div className="bg-surface border border-border-default rounded-lg shadow-sm p-lg">
                <h3 className="font-bold mb-md text-lg text-text-primary">How It Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                            <ShoppingBag size={18} />
                        </div>
                        <div>
                            <h4 className="font-bold mb-1 text-text-primary">Shopping Referrals</h4>
                            <p className="text-sm text-text-secondary">When a friend places an order using your code at checkout, you both earn wallet credits.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center font-bold flex-shrink-0">
                            <Wrench size={18} />
                        </div>
                        <div>
                            <h4 className="font-bold mb-1 text-text-primary">Service Referrals</h4>
                            <p className="text-sm text-text-secondary">When someone books a service using your code and the booking is delivered, both wallets are credited.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-trust/10 border border-trust/20 text-trust flex items-center justify-center font-bold flex-shrink-0">
                            <GraduationCap size={18} />
                        </div>
                        <div>
                            <h4 className="font-bold mb-1 text-text-primary">Course Referrals</h4>
                            <p className="text-sm text-text-secondary">When a friend enrolls in a course using your referral code and the first fee payment is confirmed, you both earn credits.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-border-default rounded-lg p-md shadow-sm">
                <div className="flex items-center justify-between mb-md flex-wrap gap-3 border-b border-border-default pb-sm">
                    <h3 className="font-bold text-lg text-text-primary">{tab === 'sent' ? 'Sent Referrals' : 'Received Referrals'}</h3>
                    <div className="flex bg-page-bg border border-border-default rounded-lg p-1 gap-1">
                        {tabs.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setTab(item.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${tab === item.key
                                    ? 'bg-surface border border-border-default shadow-sm text-text-primary'
                                    : 'text-text-secondary hover:text-text-primary border border-transparent'
                                    }`}
                            >
                                {item.icon} {item.label}
                                <span className={`ml-0.5 px-1.5 py-0.5 rounded text-xs border ${tab === item.key ? 'bg-trust/10 text-trust border-trust/20' : 'bg-surface text-text-muted border-border-default'}`}>
                                    {item.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {activeReferrals.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-page-bg text-text-secondary text-xs uppercase font-bold tracking-wider border-b border-border-default">
                                    <th className="p-sm">{tab === 'sent' ? 'Person Referred' : 'Referred By'}</th>
                                    <th className="p-sm">Source</th>
                                    <th className="p-sm">Date</th>
                                    <th className="p-sm">Status</th>
                                    {tab === 'sent' && <th className="p-sm text-right">You Earned</th>}
                                    {tab === 'sent' && <th className="p-sm text-right">Referee Got</th>}
                                    {tab === 'received' && <th className="p-sm text-right">You Got</th>}
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {activeReferrals.map((ref) => (
                                    <tr key={ref.id} className="border-b border-border-default last:border-0 hover:bg-surface-hover transition-colors">
                                        <td className="p-sm">
                                            <div>
                                                <p className="font-bold text-text-primary">{tab === 'sent' ? ref.referee?.name : ref.referrer?.name}</p>
                                                <p className="text-xs text-text-secondary font-medium">{tab === 'sent' ? ref.referee?.email : ref.referrer?.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-sm">{renderSourceBadge(ref.source, ref.courseName)}</td>
                                        <td className="p-sm text-text-secondary text-xs font-medium">
                                            {new Date(ref.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-sm">{getStatusBadge(ref.status)}</td>
                                        {tab === 'sent' && (
                                            <td className="p-sm text-right font-bold text-text-primary">
                                                {ref.status === 'rewarded' ? (
                                                    <span className="text-success">+Rs {ref.rewardAmount}</span>
                                                ) : (
                                                    <span className="text-text-muted">-</span>
                                                )}
                                            </td>
                                        )}
                                        {tab === 'sent' && (
                                            <td className="p-sm text-right font-bold text-text-primary">
                                                {ref.status === 'rewarded' ? (
                                                    <span className="text-success">+Rs {ref.refereeReward || 0}</span>
                                                ) : (
                                                    <span className="text-text-muted">-</span>
                                                )}
                                            </td>
                                        )}
                                        {tab === 'received' && (
                                            <td className="p-sm text-right font-bold text-text-primary">
                                                {ref.status === 'rewarded' ? (
                                                    <span className="text-success">+Rs {ref.refereeReward || 0}</span>
                                                ) : (
                                                    <span className="text-text-muted">-</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-xl text-text-secondary">
                        <Users size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="font-bold">{tab === 'sent' ? 'No sent referrals yet.' : 'No received referrals yet.'}</p>
                        <p className="text-sm font-medium mt-1">
                            {tab === 'sent'
                                ? 'Share your code to start earning.'
                                : 'Rewards you receive by using someone else\'s code will appear here.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserReferrals;
