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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-sm z-50 animate-in fade-in duration-200">
            <div className="bg-surface rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-lg border border-border-default">
                <div className="sticky top-0 bg-surface p-md border-b border-border-default flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">Apply for Course</h2>
                        <p className="text-sm text-text-secondary">{course.title} — {duration.label}</p>
                    </div>
                    <button onClick={onClose} className="p-xs hover:bg-surface-hover text-text-muted hover:text-text-primary rounded transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={formik.handleSubmit} className="p-md space-y-md">
                    {/* Personal Info (read-only) */}
                    <div className="bg-page-bg rounded-lg p-sm space-y-1 border border-border-default">
                        <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-xs">Your Details</p>
                        <div className="grid grid-cols-2 gap-xs text-sm text-text-primary">
                            <div><span className="text-text-secondary">Name:</span> <span className="font-semibold">{user?.name}</span></div>
                            <div><span className="text-text-secondary">Email:</span> <span className="font-semibold">{user?.email}</span></div>
                        </div>
                    </div>

                    {/* Batch Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-xs">Select Preferred Batch *</label>
                        {availableBatches.length === 0 ? (
                            <div className="text-center py-md bg-error/10 rounded-lg text-error font-bold text-sm">All batches for this duration are full.</div>
                        ) : (
                            <div className="space-y-xs">
                                {availableBatches.map(batch => (
                                    <button
                                        key={batch.id}
                                        type="button"
                                        onClick={() => setSelectedBatch(batch)}
                                        className={`w-full text-left p-sm rounded-lg border transition-colors duration-base flex items-center justify-between ${selectedBatch?.id === batch.id ? 'border-trust bg-surface-hover' : 'border-border-default hover:bg-surface-hover'}`}
                                    >
                                        <div>
                                            <div className="font-semibold text-sm text-text-primary">{batch.name} Batch</div>
                                            <div className="text-xs text-text-secondary flex items-center gap-1 mt-0.5"><Clock size={12} /> {batch.timing}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-success font-bold text-sm">{getSeatsLeft(batch)} seats left</div>
                                            <div className="text-xs text-text-secondary">of {batch.seatLimit}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Payment Mode */}
                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-xs">Payment Mode *</label>
                        <div className="grid grid-cols-2 gap-sm">
                            <button
                                type="button"
                                onClick={() => setPaymentMode('Full')}
                                className={`p-sm rounded-lg border text-left transition-colors duration-base ${paymentMode === 'Full' ? 'border-trust bg-surface-hover' : 'border-border-default hover:bg-surface-hover'}`}
                            >
                                <CreditCard size={20} className={`mb-xs ${paymentMode === 'Full' ? 'text-trust' : 'text-text-secondary'}`} />
                                <div className="font-semibold text-sm text-text-primary">Full Payment</div>
                                {duration.fullPayDiscount > 0 && (
                                    <div className="text-xs text-success font-bold mt-1">Save {duration.fullPayDiscount}%</div>
                                )}
                                <div className="text-xs text-text-secondary mt-1">
                                    ₹{discountedFee ? discountedFee.toLocaleString() : duration.totalFee.toLocaleString()} total
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMode('Installment')}
                                className={`p-sm rounded-lg border text-left transition-colors duration-base ${paymentMode === 'Installment' ? 'border-trust bg-surface-hover' : 'border-border-default hover:bg-surface-hover'}`}
                            >
                                <Banknote size={20} className={`mb-xs ${paymentMode === 'Installment' ? 'text-trust' : 'text-text-secondary'}`} />
                                <div className="font-semibold text-sm text-text-primary">Monthly EMI</div>
                                <div className="text-xs text-text-secondary mt-1">₹{monthlyEMI.toLocaleString()}/month</div>
                                <div className="text-xs text-text-secondary">× {duration.installments} installments</div>
                            </button>
                        </div>
                        <p className="text-xs text-text-secondary mt-xs flex items-center gap-1">
                            <span className="text-warning">⚠️</span> All payments are made physically at the centre — no online payment.
                        </p>
                    </div>

                    {/* Referral Code */}
                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-xs">Referral Code <span className="text-text-secondary font-normal">(optional)</span></label>
                        <input
                            type="text"
                            name="referralCode"
                            value={formik.values.referralCode}
                            onChange={formik.handleChange}
                            placeholder="Enter referral code if you have one"
                            className="w-full border border-border-default rounded px-sm py-xs text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:border-trust transition-colors duration-base"
                        />
                        <p className="text-xs text-text-secondary mt-1">You and the referrer both earn reward points when your first payment is recorded.</p>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-xs">Message <span className="text-text-secondary font-normal">(optional)</span></label>
                        <textarea
                            name="message"
                            value={formik.values.message}
                            onChange={formik.handleChange}
                            rows={3}
                            className="w-full border border-border-default rounded px-sm py-xs text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:border-trust transition-colors duration-base resize-none"
                            placeholder="Any specific questions or notes for the admin..."
                        />
                    </div>

                    <div className="flex gap-sm">
                        <Button type="button" variant="outline" onClick={onClose} disabled={formik.isSubmitting} className="flex-1 py-sm">Cancel</Button>
                        <Button type="submit" variant="primary" disabled={formik.isSubmitting || availableBatches.length === 0} className="flex-1 py-sm">
                            {formik.isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplicationForm;
