import React, { useState, useEffect } from 'react';
import { BookOpen, Award, Clock, CreditCard, Link as LinkIcon, GraduationCap, Banknote, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { coursesAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
    Pending: 'bg-warning/10 text-warning border border-warning/20',
    Approved: 'bg-trust/10 text-trust border border-trust/20',
    Rejected: 'bg-error/10 text-error border border-error/20',
    Enrolled: 'bg-success/10 text-success border border-success/20',
    Completed: 'bg-purple-100 text-purple-700 border border-purple-200'
};

const UserCourses = () => {
    const { user } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        coursesAPI.getMyApplications()
            .then(setApplications)
            .catch(() => toast.error('Failed to load your courses'))
            .finally(() => setLoading(false));
    }, []);

    const handleDownloadCertificate = async (courseId) => {
        try {
            toast.loading('Generating certificate...', { id: 'cert' });
            await coursesAPI.downloadCertificate(courseId);
            toast.success('Certificate downloaded!', { id: 'cert' });
        } catch (err) {
            toast.error(err.message || 'Failed to download certificate', { id: 'cert' });
        }
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading your courses...</div>;

    return (
        <div className="space-y-lg animate-in fade-in duration-500">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-1">My Courses</h1>
                    <p className="text-sm text-text-secondary">Track your applications, batch details, and fee status.</p>
                </div>
                <Link to="/courses">
                    <Button variant="outline"><GraduationCap size={16} className="mr-2" /> Browse Courses</Button>
                </Link>
            </div>

            {/* Referral Code Banner */}
            {user?.referralCode && (
                <div className="bg-surface border border-trust/50 rounded-lg p-md flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-trust mb-1">Your Referral Code</p>
                        <p className="text-sm text-text-secondary">Share this code — both you and the new student earn reward points when their first fee payment is recorded.</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <button
                            className="font-mono font-bold text-lg text-trust bg-trust/10 px-md py-xs rounded border border-trust/20 hover:bg-trust/20 transition-colors"
                            onClick={() => { navigator.clipboard.writeText(user.referralCode); toast.success('Referral code copied!'); }}
                        >
                            {user.referralCode}
                        </button>
                        <p className="text-xs text-text-muted mt-1">Click to copy</p>
                    </div>
                </div>
            )}

            {applications.length === 0 ? (
                <div className="text-center py-xl bg-surface rounded-lg border border-border-default shadow-sm">
                    <BookOpen size={56} className="mx-auto text-text-muted mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2 text-text-primary">No applications yet</h3>
                    <p className="text-text-secondary mb-6">Apply for a course to get started.</p>
                    <Link to="/courses"><Button>Browse Courses</Button></Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {applications.map(app => {
                        const totalPaid = app.feePayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                        const totalFee = app.duration?.totalFee || 0;
                        const balance = totalFee - totalPaid;
                        const paidPct = totalFee > 0 ? Math.min(100, Math.round((totalPaid / totalFee) * 100)) : 0;
                        const isCompleted = app.status === 'Completed';
                        const isEnrolled = app.status === 'Enrolled';
                        const canDownloadCert = isCompleted && app.course?.hasCertificate;

                        return (
                            <div key={app.id} className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
                                {/* Header */}
                                <div className="p-md border-b border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-page-bg">
                                    <div>
                                        <h2 className="font-bold text-xl text-text-primary">{app.course?.title}</h2>
                                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-text-secondary font-medium">
                                            <span className="flex items-center gap-1"><Clock size={14} /> {app.duration?.label}</span>
                                            {app.batch && <span className="flex items-center gap-1"><GraduationCap size={14} /> {app.batch.name} — {app.batch.timing}</span>}
                                            <span className="flex items-center gap-1">
                                                {app.paymentMode === 'Full' ? <CreditCard size={14} /> : <Banknote size={14} />}
                                                {app.paymentMode} Payment
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded text-xs font-bold ${STATUS_STYLES[app.status] || 'bg-page-bg text-text-secondary border border-border-default'}`}>
                                        {app.status}
                                    </span>
                                </div>

                                <div className="p-md grid grid-cols-1 md:grid-cols-2 gap-md">
                                    {/* Fee Ledger */}
                                    {(isEnrolled || isCompleted || app.feePayments?.length > 0) && (
                                        <div>
                                            <h3 className="font-semibold text-xs uppercase tracking-wider text-text-secondary mb-sm">Fee Ledger</h3>
                                            {/* Progress */}
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                                    <span>₹{totalPaid.toLocaleString()} paid</span>
                                                    <span className={balance > 0 ? 'text-error' : 'text-success'}>
                                                        {balance > 0 ? `₹${balance.toLocaleString()} due` : 'Fully Paid ✓'}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-page-bg border border-border-default rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${paidPct === 100 ? 'bg-success' : 'bg-buy-primary'}`} style={{ width: `${paidPct}%` }} />
                                                </div>
                                                <div className="text-xs text-text-secondary mt-1">Total Fee: ₹{totalFee.toLocaleString()}</div>
                                            </div>
                                            {/* Payment history */}
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {app.feePayments?.map((pay, i) => (
                                                    <div key={pay.id} className="flex items-center justify-between text-sm p-sm bg-success/5 rounded border border-success/10">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle size={14} className="text-success flex-shrink-0" />
                                                            <span className="text-text-secondary font-medium">
                                                                {new Date(pay.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                {pay.note && <span className="text-xs ml-1 text-text-muted font-normal">· {pay.note}</span>}
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-success">+₹{pay.amount.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                {app.feePayments?.length === 0 && (
                                                    <div className="flex items-center gap-2 text-sm text-warning p-sm bg-warning/5 rounded border border-warning/10 font-medium">
                                                        <AlertCircle size={14} /> No payments recorded yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Info & Actions */}
                                    <div className="flex flex-col gap-sm">
                                        {app.status === 'Pending' && (
                                            <div className="p-sm bg-warning/5 border border-warning/20 rounded text-sm text-warning font-semibold flex items-start gap-2">
                                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                                Your application is under review. We'll notify you once it's approved.
                                            </div>
                                        )}
                                        {app.status === 'Rejected' && (
                                            <div className="p-sm bg-error/5 border border-error/20 rounded text-sm text-error font-semibold flex items-start gap-2">
                                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                                Your application was not approved. Please contact us for more info.
                                            </div>
                                        )}
                                        {app.enrolledAt && (
                                            <div className="text-xs text-text-secondary">
                                                Enrolled on: <span className="font-bold text-text-primary">{new Date(app.enrolledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                            </div>
                                        )}
                                        {canDownloadCert && (
                                            <Button onClick={() => handleDownloadCertificate(app.courseId)} className="w-full">
                                                <Award size={16} className="mr-2" /> Download Certificate
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default UserCourses;
