import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, BookOpen, Clock, Banknote, CreditCard, Plus, ChevronDown, ChevronRight, AlertCircle, Award, GraduationCap } from 'lucide-react';
import Button from '../../components/ui/Button';
import { coursesAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
    Pending: 'bg-warning/10 text-warning border border-warning/20',
    Approved: 'bg-primary/10 text-primary border border-primary/20',
    Rejected: 'bg-error/10 text-error border border-error/20',
    Enrolled: 'bg-success/10 text-success border border-success/20',
    Completed: 'bg-purple-100 text-purple-700 border border-purple-200'
};

const AdminEnrollments = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [feeForm, setFeeForm] = useState({ id: null, amount: '', note: '' });
    const [statusFilter, setStatusFilter] = useState('All');
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        coursesAPI.getAllApplications()
            .then(setApplications)
            .catch(() => toast.error('Failed to load enrollments'))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

    const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

    const updateStatus = async (id, status) => {
        try {
            await coursesAPI.updateStatus(id, status);
            toast.success(`Status updated to ${status}`);
            load();
        } catch (err) { toast.error(err.message || 'Failed'); }
    };

    const recordFee = async (e) => {
        e.preventDefault();
        if (!feeForm.amount) return;
        setSaving(true);
        try {
            await coursesAPI.recordFeePayment(feeForm.id, { amount: feeForm.amount, note: feeForm.note });
            toast.success('Payment recorded!');
            setFeeForm({ id: null, amount: '', note: '' });
            load();
        } catch (err) { toast.error(err.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const statuses = ['All', 'Pending', 'Approved', 'Enrolled', 'Rejected', 'Completed'];
    const filtered = statusFilter === 'All' ? applications : applications.filter(a => a.status === statusFilter);

    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === 'Pending').length,
        enrolled: applications.filter(a => a.status === 'Enrolled').length,
        completed: applications.filter(a => a.status === 'Completed').length,
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading enrollments...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-heading font-black">Course Enrollments</h1>
                <p className="text-text-muted">Manage applications, approve students, and track fee payments.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'bg-primary/5 text-primary' },
                    { label: 'Pending', value: stats.pending, color: 'bg-warning/10 text-warning' },
                    { label: 'Enrolled', value: stats.enrolled, color: 'bg-success/10 text-success' },
                    { label: 'Completed', value: stats.completed, color: 'bg-purple-50 text-purple-700' },
                ].map(s => (
                    <div key={s.label} className={`rounded-lg p-5 ${s.color}`}>
                        <div className="text-3xl font-black">{s.value}</div>
                        <div className="text-sm font-bold mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
                {statuses.map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${statusFilter === s ? 'bg-primary text-white shadow-sm' : 'bg-surface border border-border-default text-text-muted hover:border-primary hover:text-primary'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-lg border border-dashed border-border-default">
                    <BookOpen size={48} className="mx-auto text-text-muted/50 mb-4" />
                    <p className="text-text-muted font-bold">No applications in this status.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(app => {
                        const totalPaid = app.feePayments?.reduce((s, p) => s + p.amount, 0) || 0;
                        const totalFee = app.duration?.totalFee || 0;
                        const balance = totalFee - totalPaid;

                        return (
                            <div key={app.id} className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
                                {/* Header */}
                                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                    <button className="flex items-center gap-3 text-left flex-1 min-w-0" onClick={() => toggle(app.id)}>
                                        {expanded[app.id] ? <ChevronDown size={18} className="text-primary flex-shrink-0" /> : <ChevronRight size={18} className="text-text-muted flex-shrink-0" />}
                                        <div className="min-w-0">
                                            <div className="font-black truncate">{app.user?.name} — {app.course?.title}</div>
                                            <div className="text-xs text-text-muted flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                                <span>{app.user?.email}</span>
                                                <span>{app.user?.phone}</span>
                                                {app.duration && <span><Clock size={11} className="inline mr-0.5" />{app.duration.label}</span>}
                                                {app.batch && <span><GraduationCap size={11} className="inline mr-0.5" />{app.batch.name} · {app.batch.timing}</span>}
                                                <span>{app.paymentMode === 'Full' ? <CreditCard size={11} className="inline" /> : <Banknote size={11} className="inline" />} {app.paymentMode}</span>
                                            </div>
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${STATUS_STYLES[app.status] || ''}`}>{app.status}</span>
                                        <div className="text-right text-xs">
                                            <div className={`font-black ${balance > 0 ? 'text-error' : 'text-success'}`}>
                                                {balance > 0 ? `₹${balance.toLocaleString()} due` : 'Paid ✓'}
                                            </div>
                                            <div className="text-text-muted">of ₹{totalFee.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expanded[app.id] && (
                                    <div className="border-t border-border-default p-5 bg-page-bg space-y-5">
                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap gap-2">
                                            {app.status === 'Pending' && (
                                                <>
                                                    <Button onClick={() => updateStatus(app.id, 'Approved')} className="text-sm py-1.5 px-4">
                                                        <CheckCircle size={15} className="mr-1.5" /> Approve
                                                    </Button>
                                                    <Button variant="outline" onClick={() => updateStatus(app.id, 'Rejected')} className="text-sm py-1.5 px-4 text-error border-error hover:bg-error hover:text-white">
                                                        <XCircle size={15} className="mr-1.5" /> Reject
                                                    </Button>
                                                </>
                                            )}
                                            {app.status === 'Approved' && (
                                                <Button onClick={() => updateStatus(app.id, 'Enrolled')} className="text-sm py-1.5 px-4">
                                                    <GraduationCap size={15} className="mr-1.5" /> Mark Enrolled
                                                </Button>
                                            )}
                                            {app.status === 'Enrolled' && (
                                                <Button onClick={() => updateStatus(app.id, 'Completed')} className="text-sm py-1.5 px-4 bg-purple-600 hover:bg-purple-700">
                                                    <Award size={15} className="mr-1.5" /> Mark Completed
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Fee Ledger */}
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-wider text-text-muted mb-3">Fee Ledger</h4>
                                                <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
                                                    {app.feePayments?.length === 0 && <p className="text-sm text-text-muted">No payments yet.</p>}
                                                    {app.feePayments?.map(pay => (
                                                        <div key={pay.id} className="flex justify-between items-center text-sm p-2.5 bg-success/5 border border-success/10 rounded-lg">
                                                            <div>
                                                                <div className="font-bold text-success">+₹{pay.amount.toLocaleString()}</div>
                                                                <div className="text-xs text-text-muted">{new Date(pay.paidAt).toLocaleDateString('en-IN')} {pay.note && `· ${pay.note}`}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Add Fee Payment Form */}
                                                {(app.status === 'Approved' || app.status === 'Enrolled') && (
                                                    feeForm.id === app.id ? (
                                                        <form onSubmit={recordFee} className="space-y-2 p-3 bg-surface rounded-xl border border-border-default">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input required type="number" min="1" placeholder="Amount (₹)" value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))} className="input-field text-sm py-2" />
                                                                <input placeholder="Note (optional)" value={feeForm.note} onChange={e => setFeeForm(f => ({ ...f, note: e.target.value }))} className="input-field text-sm py-2" />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button type="button" variant="ghost" onClick={() => setFeeForm({ id: null, amount: '', note: '' })} className="flex-1 text-xs py-1.5">Cancel</Button>
                                                                <Button type="submit" disabled={saving} className="flex-1 text-xs py-1.5">{saving ? 'Saving...' : 'Record Payment'}</Button>
                                                            </div>
                                                        </form>
                                                    ) : (
                                                        <button onClick={() => setFeeForm({ id: app.id, amount: '', note: '' })} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                                                            <Plus size={13} /> Record Fee Payment
                                                        </button>
                                                    )
                                                )}
                                            </div>

                                            {/* Student & Application Info */}
                                            <div className="text-sm space-y-2">
                                                <h4 className="font-black text-sm uppercase tracking-wider text-text-muted mb-3">Application Info</h4>
                                                {app.referralCode && (
                                                    <div className="text-xs p-2.5 bg-primary/5 border border-primary/10 rounded-lg">
                                                        <span className="font-bold text-primary">Referral Code Used:</span> {app.referralCode}
                                                    </div>
                                                )}
                                                {app.message && (
                                                    <div className="text-xs p-2.5 bg-page-bg border border-border-default rounded-lg text-text-muted">
                                                        <span className="font-bold text-text-main">Message:</span> {app.message}
                                                    </div>
                                                )}
                                                <div className="text-xs text-text-muted">Applied: {new Date(app.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                                                {app.enrolledAt && <div className="text-xs text-text-muted">Enrolled: {new Date(app.enrolledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
                                                {app.completedAt && <div className="text-xs text-purple-600 font-bold">Completed: {new Date(app.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminEnrollments;
