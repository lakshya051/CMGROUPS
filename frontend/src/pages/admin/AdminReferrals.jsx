import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    CheckCircle,
    Clock,
    DollarSign,
    Gift,
    GraduationCap,
    Package,
    ShoppingBag,
    Users,
    Wrench
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { handleImageError } from '../../utils/image';

const INITIAL_VISIBLE_ROWS = 50;
const ROWS_STEP = 25;
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

const AdminReferrals = () => {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);
    const loadMoreRef = useRef(null);

    useEffect(() => {
        adminAPI.getReferrals()
            .then((data) => setReferrals(data))
            .catch((err) => console.error('Failed to fetch referrals:', err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        setVisibleRows(INITIAL_VISIBLE_ROWS);
    }, [referrals.length]);

    const getCalculatedRewards = (ref) => ({
        referrerReward: ref.rewardAmount || 0,
        refereeReward: ref.refereeReward || 0
    });

    const totalRewarded = referrals.filter((referral) => referral.status === 'rewarded').length;
    const totalPending = referrals.filter((referral) => referral.status === 'pending').length;
    const totalPayout = referrals
        .filter((referral) => referral.status === 'rewarded')
        .reduce((sum, referral) => {
            const rewards = getCalculatedRewards(referral);
            return sum + rewards.referrerReward + rewards.refereeReward;
        }, 0);

    const visibleReferrals = useMemo(
        () => referrals.slice(0, visibleRows),
        [referrals, visibleRows]
    );
    const canLoadMore = visibleRows < referrals.length;

    const loadMoreRows = useCallback(() => {
        setVisibleRows((current) => Math.min(current + ROWS_STEP, referrals.length));
    }, [referrals.length]);

    useEffect(() => {
        if (!canLoadMore || !loadMoreRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreRows();
                }
            },
            { rootMargin: '120px' }
        );

        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [canLoadMore, loadMoreRows]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center gap-1 w-fit"><Clock size={12} /> Pending</span>;
            case 'rewarded':
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20 flex items-center gap-1 w-fit"><CheckCircle size={12} /> Rewarded</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-page-bg text-text-muted border border-border-default w-fit">{status}</span>;
        }
    };

    const renderSourceCell = (referral) => {
        const meta = SOURCE_META[referral.source] || SOURCE_META.shopping;
        const Icon = meta.icon;

        return (
            <div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${meta.className}`}>
                    <Icon size={11} />
                    {meta.label}
                </span>
                {referral.source === 'course' && referral.courseName && (
                    <p className="text-[11px] text-trust font-medium mt-1">{referral.courseName}</p>
                )}
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading referral data...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-heading font-bold mb-1">Referral Activity</h1>
                <p className="text-text-muted">Track all referral code usage and rewards across the platform.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-text-muted text-xs uppercase tracking-wider">Total Referrals</span>
                        <div className="p-2 bg-page-bg rounded-lg text-blue-400"><Users size={18} /></div>
                    </div>
                    <span className="text-2xl font-bold">{referrals.length}</span>
                </div>
                <div className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-text-muted text-xs uppercase tracking-wider">Rewarded</span>
                        <div className="p-2 bg-page-bg rounded-lg text-success"><CheckCircle size={18} /></div>
                    </div>
                    <span className="text-2xl font-bold text-success">{totalRewarded}</span>
                </div>
                <div className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-text-muted text-xs uppercase tracking-wider">Pending</span>
                        <div className="p-2 bg-page-bg rounded-lg text-yellow-400"><Clock size={18} /></div>
                    </div>
                    <span className="text-2xl font-bold text-yellow-400">{totalPending}</span>
                </div>
                <div className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-text-muted text-xs uppercase tracking-wider">Total Payout</span>
                        <div className="p-2 bg-page-bg rounded-lg text-primary"><DollarSign size={18} /></div>
                    </div>
                    <span className="text-2xl font-bold text-primary">Rs {totalPayout.toLocaleString()}</span>
                </div>
            </div>

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-page-bg text-text-muted text-xs uppercase tracking-wider border-b border-border-default">
                                <th className="p-4">#</th>
                                <th className="p-4">Referrer (Code Owner)</th>
                                <th className="p-4">Code Used</th>
                                <th className="p-4">Used By</th>
                                <th className="p-4">Order ID</th>
                                <th className="p-4">Products Ordered</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Source</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Referrer Reward</th>
                                <th className="p-4 text-right">Referee Reward</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-border-default">
                            {visibleReferrals.map((referral, idx) => {
                                const rewards = getCalculatedRewards(referral);
                                return (
                                    <tr key={referral.id} className="hover:bg-surface-hover transition-colors">
                                        <td className="p-4 text-text-muted">{idx + 1}</td>
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium">{referral.referrer?.name}</p>
                                                <p className="text-xs text-text-muted">{referral.referrer?.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-xs bg-page-bg px-2 py-1 rounded border border-primary/20 text-primary">
                                                {referral.referrer?.referralCode || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium">{referral.referee?.name}</p>
                                                <p className="text-xs text-text-muted">{referral.referee?.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {referral.orderId ? (
                                                <span className="font-mono text-xs bg-page-bg px-2 py-1 rounded border border-border-default">
                                                    #{referral.orderId}
                                                </span>
                                            ) : (
                                                <span className="text-text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {referral.order?.items?.length > 0 ? (
                                                <div className="space-y-1.5 max-w-xs">
                                                    {referral.order.items.map((item, itemIndex) => (
                                                        <div key={itemIndex} className="flex items-center gap-2">
                                                            {(item.product?.images?.[0] || item.product?.image) ? (
                                                                <img
                                                                    src={item.product.images?.[0] || item.product.image}
                                                                    alt={item.product.title}
                                                                    loading="lazy"
                                                                    width={32}
                                                                    height={32}
                                                                    onError={handleImageError}
                                                                    className="w-8 h-8 rounded object-cover border border-border-default flex-shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded bg-page-bg flex items-center justify-center flex-shrink-0">
                                                                    <Package size={14} className="text-text-muted" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium truncate">{item.product?.title || 'Unknown'}</p>
                                                                <p className="text-[10px] text-text-muted">Qty: {item.quantity} x Rs {item.price?.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <p className="text-[10px] text-primary font-medium pt-1 border-t border-border-default">Order Total: Rs {referral.order.total?.toLocaleString()}</p>
                                                </div>
                                            ) : (
                                                <span className="text-text-muted text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-text-muted text-xs">
                                            {new Date(referral.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4">{renderSourceCell(referral)}</td>
                                        <td className="p-4">{getStatusBadge(referral.status)}</td>
                                        <td className="p-4 text-right">
                                            {referral.status === 'rewarded' ? (
                                                <span className="text-success font-medium">+Rs {rewards.referrerReward}</span>
                                            ) : (
                                                <span className="text-text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {referral.status === 'rewarded' ? (
                                                <span className="text-success font-medium">+Rs {rewards.refereeReward}</span>
                                            ) : (
                                                <span className="text-text-muted">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {referrals.length === 0 && (
                                <tr>
                                    <td colSpan="11" className="p-12 text-center text-text-muted">
                                        <Gift size={40} className="mx-auto mb-3 opacity-50" />
                                        <p>No referral activity yet.</p>
                                        <p className="text-xs mt-1">Referrals appear when users enter a referral code at checkout.</p>
                                    </td>
                                </tr>
                            )}
                            {canLoadMore && (
                                <tr>
                                    <td colSpan="11" className="p-4 text-center text-xs text-text-muted">
                                        <div ref={loadMoreRef}>Loading more referrals...</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminReferrals;
