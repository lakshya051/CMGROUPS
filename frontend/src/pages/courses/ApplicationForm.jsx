import React, { useState } from 'react';
import { X, GraduationCap, Clock, CreditCard, Banknote, Users } from 'lucide-react';
import Button from '../../components/ui/Button';
import { coursesAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';

const ApplicationForm = ({ course, duration, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [paymentMode, setPaymentMode] = useState('Installment');

    const formik = useFormik({
        initialValues: { referralCode: '', message: '' },
        onSubmit: async (values, { setSubmitting }) => {
            if (!selectedBatch) {
                toast.error('Please select a batch');
                setSubmitting(false);
                return;
            }
            try {
                await coursesAPI.apply({
                    courseId: course.id,
                    durationId: duration.id,
                    batchId: selectedBatch.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone || '',
                    message: values.message,
                    paymentMode,
                    referralCode: values.referralCode.trim() || null,
                });
                toast.success('Application submitted! We will review it shortly.');
                onSuccess();
            } catch (error) {
                toast.error(error.message || 'Failed to submit application');
            } finally {
                setSubmitting(false);
            }
        },
    });

    const getSeatsLeft = (batch) => {
        const enrolled = batch._count?.applications || 0;
        return Math.max(0, batch.seatLimit - enrolled);
    };

    const availableBatches = duration.batches?.filter(b => getSeatsLeft(b) > 0) || [];

    const discountedFee = paymentMode === 'Full' && duration.fullPayDiscount > 0
        ? duration.totalFee * (1 - duration.fullPayDiscount / 100)
        : null;
    const monthlyEMI = Math.ceil(duration.totalFee / duration.installments);



    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-background-paper rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10">
                <div className="sticky top-0 bg-background-paper p-6 border-b border-white/10 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-black">Apply for Course</h2>
                        <p className="text-sm text-text-muted">{course.title} — {duration.label}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={formik.handleSubmit} className="p-6 space-y-6">
                    {/* Personal Info (read-only) */}
                    <div className="bg-white/5 rounded-xl p-4 space-y-2 border border-white/10">
                        <p className="text-xs font-black uppercase tracking-wider text-text-muted mb-3">Your Details</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-text-muted">Name:</span> <span className="font-bold">{user?.name}</span></div>
                            <div><span className="text-text-muted">Email:</span> <span className="font-bold">{user?.email}</span></div>
                        </div>
                    </div>

                    {/* Batch Selection */}
                    <div>
                        <label className="block text-sm font-black mb-3">Select Preferred Batch *</label>
                        {availableBatches.length === 0 ? (
                            <div className="text-center py-6 bg-error/10 rounded-xl text-error font-bold text-sm">All batches for this duration are full.</div>
                        ) : (
                            <div className="space-y-3">
                                {availableBatches.map(batch => (
                                    <button
                                        key={batch.id}
                                        type="button"
                                        onClick={() => setSelectedBatch(batch)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${selectedBatch?.id === batch.id ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/40'}`}
                                    >
                                        <div>
                                            <div className="font-bold">{batch.name} Batch</div>
                                            <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5"><Clock size={12} /> {batch.timing}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-success font-black text-sm">{getSeatsLeft(batch)} seats left</div>
                                            <div className="text-xs text-text-muted">of {batch.seatLimit}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Payment Mode */}
                    <div>
                        <label className="block text-sm font-black mb-3">Payment Mode *</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentMode('Full')}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMode === 'Full' ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/40'}`}
                            >
                                <CreditCard size={20} className={`mb-2 ${paymentMode === 'Full' ? 'text-primary' : 'text-text-muted'}`} />
                                <div className="font-black text-sm">Full Payment</div>
                                {duration.fullPayDiscount > 0 && (
                                    <div className="text-xs text-success font-bold mt-1">Save {duration.fullPayDiscount}%</div>
                                )}
                                <div className="text-xs text-text-muted mt-1">
                                    ₹{discountedFee ? discountedFee.toLocaleString() : duration.totalFee.toLocaleString()} total
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMode('Installment')}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMode === 'Installment' ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/40'}`}
                            >
                                <Banknote size={20} className={`mb-2 ${paymentMode === 'Installment' ? 'text-primary' : 'text-text-muted'}`} />
                                <div className="font-black text-sm">Monthly EMI</div>
                                <div className="text-xs text-text-muted mt-1">₹{monthlyEMI.toLocaleString()}/month</div>
                                <div className="text-xs text-text-muted">× {duration.installments} installments</div>
                            </button>
                        </div>
                        <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                            <span className="text-warning">⚠️</span> All payments are made physically at the centre — no online payment.
                        </p>
                    </div>

                    {/* Referral Code */}
                    <div>
                        <label className="block text-sm font-black mb-2">Referral Code <span className="text-text-muted font-normal">(optional)</span></label>
                        <input
                            type="text"
                            name="referralCode"
                            value={formik.values.referralCode}
                            onChange={formik.handleChange}
                            placeholder="Enter referral code if you have one"
                            className="input-field"
                        />
                        <p className="text-xs text-text-muted mt-1">You and the referrer both earn reward points when your first payment is recorded.</p>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-black mb-2">Message <span className="text-text-muted font-normal">(optional)</span></label>
                        <textarea
                            name="message"
                            value={formik.values.message}
                            onChange={formik.handleChange}
                            rows={3}
                            className="input-field resize-none"
                            placeholder="Any specific questions or notes for the admin..."
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={formik.isSubmitting} className="flex-1">Cancel</Button>
                        <Button type="submit" disabled={formik.isSubmitting || availableBatches.length === 0} className="flex-1">
                            {formik.isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplicationForm;
