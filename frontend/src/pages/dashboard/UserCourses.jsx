import React, { useState, useEffect } from 'react';
import { BookOpen, Award, Clock, CreditCard, Link as LinkIcon, GraduationCap, Banknote, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { coursesAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
    Pending: 'bg-warning/10 text-warning border border-warning/20',
    Approved: 'bg-blue-100 text-blue-700 border border-blue-200',
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-black mb-1">My Courses</h1>
                    <p className="text-text-muted">Track your applications, batch details, and fee status.</p>
                </div>
                <Link to="/courses">
                    <Button variant="outline"><GraduationCap size={16} className="mr-2" /> Browse Courses</Button>
                </Link>
            </div>

            {/* Referral Code Banner */}
            {user?.referralCode && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-black text-primary mb-1">Your Referral Code</p>
                        <p className="text-xs text-text-muted">Share this code — both you and the new student earn reward points when their first fee payment is recorded.</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <button
                            className="font-mono font-black text-xl text-primary bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 hover:bg-primary/20 transition-colors"
                            onClick={() => { navigator.clipboard.writeText(user.referralCode); toast.success('Referral code copied!'); }}
                        >
                            {user.referralCode}
                        </button>
                        <p className="text-xs text-text-muted mt-1">Click to copy</p>
                    </div>
                </div>
            )}

            {applications.length === 0 ? (
                <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-gray-200">
                    <BookOpen size={56} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-black mb-2">No applications yet</h3>
                    <p className="text-text-muted mb-6">Apply for a course to get started.</p>
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
                            <div key={app.id} className="bg-surface rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {/* Header */}
                                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="font-black text-xl">{app.course?.title}</h2>
                                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-text-muted">
                                            <span className="flex items-center gap-1"><Clock size={14} /> {app.duration?.label}</span>
                                            {app.batch && <span className="flex items-center gap-1"><GraduationCap size={14} /> {app.batch.name} — {app.batch.timing}</span>}
                                            <span className="flex items-center gap-1">
                                                {app.paymentMode === 'Full' ? <CreditCard size={14} /> : <Banknote size={14} />}
                                                {app.paymentMode} Payment
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-black ${STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {app.status}
                                    </span>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Fee Ledger */}
                                    {(isEnrolled || isCompleted || app.feePayments?.length > 0) && (
                                        <div>
                                            <h3 className="font-black text-sm uppercase tracking-wider text-text-muted mb-4">Fee Ledger</h3>
                                            {/* Progress */}
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                                    <span>₹{totalPaid.toLocaleString()} paid</span>
                                                    <span className={balance > 0 ? 'text-error' : 'text-success'}>
                                                        {balance > 0 ? `₹${balance.toLocaleString()} due` : 'Fully Paid ✓'}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${paidPct === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${paidPct}%` }} />
                                                </div>
                                                <div className="text-xs text-text-muted mt-1">Total Fee: ₹{totalFee.toLocaleString()}</div>
                                            </div>
                                            {/* Payment history */}
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {app.feePayments?.map((pay, i) => (
                                                    <div key={pay.id} className="flex items-center justify-between text-sm p-2.5 bg-success/5 rounded-lg border border-success/10">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle size={14} className="text-success flex-shrink-0" />
                                                            <span className="text-text-muted">
                                                                {new Date(pay.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                {pay.note && <span className="text-xs ml-1 text-text-muted">· {pay.note}</span>}
                                                            </span>
                                                        </div>
                                                        <span className="font-black text-success">+₹{pay.amount.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                {app.feePayments?.length === 0 && (
                                                    <div className="flex items-center gap-2 text-sm text-warning p-2.5 bg-warning/5 rounded-lg border border-warning/10">
                                                        <AlertCircle size={14} /> No payments recorded yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Info & Actions */}
                                    <div className="flex flex-col gap-4">
                                        {app.status === 'Pending' && (
                                            <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl text-sm text-warning font-bold flex items-start gap-2">
                                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                                Your application is under review. We'll notify you once it's approved.
                                            </div>
                                        )}
                                        {app.status === 'Rejected' && (
                                            <div className="p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error flex items-start gap-2">
                                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                                Your application was not approved. Please contact us for more info.
                                            </div>
                                        )}
                                        {app.enrolledAt && (
                                            <div className="text-xs text-text-muted">
                                                Enrolled on: <span className="font-bold">{new Date(app.enrolledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
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
