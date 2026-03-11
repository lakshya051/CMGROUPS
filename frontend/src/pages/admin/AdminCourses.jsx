import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Clock, Users, BookOpen, X, Save } from 'lucide-react';
import Button from '../../components/ui/Button';
import { coursesAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import { addCourseSchema } from '../../utils/validationSchemas';

const emptyForm = { title: '', description: '', instructor: '', category: 'Computer', thumbnail: '', hasCertificate: true, isPublished: true, enableReferral: false, referrerPoints: '', refereePoints: '' };
const emptyDuration = { label: '', totalFee: '', fullPayDiscount: '0', installments: '3' };
const emptyBatch = { name: '', timing: '', seatLimit: '20' };

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-sm z-50 animate-in fade-in duration-200">
        <div className="bg-surface rounded-lg max-w-md w-full shadow-lg border border-border-default animate-in zoom-in duration-300">
            <div className="p-sm border-b border-border-default flex items-center justify-between">
                <h3 className="font-bold text-lg text-text-primary">{title}</h3>
                <button onClick={onClose} className="p-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors"><X size={18} /></button>
            </div>
            <div className="p-md">{children}</div>
        </div>
    </div>
);

const AdminCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});

    // Modals state
    const [courseModal, setCourseModal] = useState(null); // null | 'create' | course object
    const [durationModal, setDurationModal] = useState(null);
    const [batchModal, setBatchModal] = useState(null);
    const [durForm, setDurForm] = useState(emptyDuration);
    const [batchForm, setBatchForm] = useState(emptyBatch);
    const [saving, setSaving] = useState(false);

    const courseFormik = useFormik({
        initialValues: emptyForm,
        validationSchema: addCourseSchema,
        validateOnBlur: true,
        validateOnChange: false,
        enableReinitialize: true,
        onSubmit: async (values, { setSubmitting, setErrors }) => {
            try {
                const payload = {
                    ...values,
                    referrerPoints: values.enableReferral && values.referrerPoints ? parseInt(values.referrerPoints) : null,
                    refereePoints: values.enableReferral && values.refereePoints ? parseInt(values.refereePoints) : null
                };
                if (courseModal === 'create') await coursesAPI.create(payload);
                else await coursesAPI.update(courseModal.id, payload);
                toast.success('Course saved!'); load(); setCourseModal(null);
                courseFormik.resetForm();
            } catch (err) { setErrors({ submit: err.message || 'Failed' }); }
            finally { setSubmitting(false); }
        },
    });

    const load = () => {
        setLoading(true);
        coursesAPI.getAll()
            .then(d => setCourses(d))
            .catch(() => toast.error('Failed to load courses'))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

    const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

    // Course CRUD
    const openCourseCreate = () => { courseFormik.resetForm(); setCourseModal('create'); };
    const openCourseEdit = (c) => {
        courseFormik.resetForm({ values: { title: c.title, description: c.description, instructor: c.instructor, category: c.category, thumbnail: c.thumbnail || '', hasCertificate: c.hasCertificate, isPublished: c.isPublished, enableReferral: c.referrerPoints !== null && c.referrerPoints !== undefined, referrerPoints: c.referrerPoints !== null ? c.referrerPoints : '', refereePoints: c.refereePoints !== null ? c.refereePoints : '' } });
        setCourseModal(c);
    };
    const deleteCourse = async (id) => {
        if (!window.confirm('Delete this course and all its durations/batches?')) return;
        try { await coursesAPI.delete(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
    };

    // Duration CRUD
    const openDurCreate = (courseId) => { setDurForm(emptyDuration); setDurationModal({ courseId }); };
    const openDurEdit = (dur) => { setDurForm({ label: dur.label, totalFee: dur.totalFee, fullPayDiscount: dur.fullPayDiscount, installments: dur.installments }); setDurationModal(dur); };
    const saveDuration = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            if (durationModal.courseId && !durationModal.id) await coursesAPI.addDuration(durationModal.courseId, durForm);
            else await coursesAPI.updateDuration(durationModal.id, durForm);
            toast.success('Duration saved!'); load(); setDurationModal(null);
        } catch (err) { toast.error(err.message || 'Failed'); }
        finally { setSaving(false); }
    };
    const deleteDuration = async (id) => {
        if (!window.confirm('Delete this duration and all its batches?')) return;
        try { await coursesAPI.deleteDuration(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
    };

    // Batch CRUD
    const openBatchCreate = (durationId) => { setBatchForm(emptyBatch); setBatchModal({ durationId }); };
    const openBatchEdit = (batch) => { setBatchForm({ name: batch.name, timing: batch.timing, seatLimit: batch.seatLimit }); setBatchModal(batch); };
    const saveBatch = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            if (batchModal.durationId && !batchModal.id) await coursesAPI.addBatch(batchModal.durationId, batchForm);
            else await coursesAPI.updateBatch(batchModal.id, batchForm);
            toast.success('Batch saved!'); load(); setBatchModal(null);
        } catch (err) { toast.error(err.message || 'Failed'); }
        finally { setSaving(false); }
    };
    const deleteBatch = async (id) => {
        if (!window.confirm('Delete this batch?')) return;
        try { await coursesAPI.deleteBatch(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading courses...</div>;

    return (
        <div className="space-y-lg animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-1">Course Management</h1>
                    <p className="text-sm text-text-secondary">Manage courses, duration variants, and batch slots.</p>
                </div>
                <Button variant="primary" onClick={openCourseCreate}><Plus size={16} className="mr-2" /> Add Course</Button>
            </div>

            {courses.length === 0 ? (
                <div className="text-center py-xl bg-surface rounded-lg border border-dashed border-border-default">
                    <BookOpen size={48} className="mx-auto text-text-muted mb-sm" />
                    <p className="text-text-primary font-bold text-sm">No courses yet. Add one to get started.</p>
                </div>
            ) : (
                <div className="space-y-sm">
                    {courses.map(course => (
                        <div key={course.id} className="bg-surface rounded-lg border border-border-default shadow-sm hover:shadow-md transition-shadow duration-base overflow-hidden">
                            {/* Course Header */}
                            <div className="p-md flex items-center justify-between gap-sm">
                                <button className="flex items-center gap-sm text-left flex-1 min-w-0" onClick={() => toggle(course.id)}>
                                    {expanded[course.id] ? <ChevronDown size={18} className="text-trust flex-shrink-0" /> : <ChevronRight size={18} className="text-text-muted flex-shrink-0" />}
                                    <div className="min-w-0">
                                        <span className="font-semibold text-base text-text-primary block truncate">{course.title}</span>
                                        <span className="text-xs text-text-secondary">{course.category} · {course.instructor} · {course.durations?.length || 0} durations</span>
                                    </div>
                                </button>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${course.isPublished ? 'bg-success/10 text-success' : 'bg-page-bg text-text-secondary border border-border-default'}`}>
                                        {course.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                    <button onClick={() => openCourseEdit(course)} className="p-xs hover:text-text-primary hover:bg-surface-hover rounded transition-colors text-text-secondary"><Pencil size={15} /></button>
                                    <button onClick={() => deleteCourse(course.id)} className="p-xs hover:text-error hover:bg-error/10 rounded transition-colors text-text-secondary"><Trash2 size={15} /></button>
                                </div>
                            </div>

                            {/* Expanded: Durations & Batches */}
                            {expanded[course.id] && (
                                <div className="border-t border-border-default p-md space-y-md bg-page-bg">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-xs uppercase tracking-wider text-text-secondary">Duration Variants</h4>
                                        <button onClick={() => openDurCreate(course.id)} className="text-xs font-bold text-trust flex items-center gap-1 hover:underline"><Plus size={13} /> Add Duration</button>
                                    </div>

                                    {course.durations?.length === 0 && <p className="text-sm text-text-secondary">No durations yet.</p>}

                                    {course.durations?.map(dur => (
                                        <div key={dur.id} className="bg-surface rounded-lg border border-border-default overflow-hidden shadow-sm">
                                            <div className="p-sm flex items-center justify-between">
                                                <div>
                                                    <span className="font-semibold text-text-primary">{dur.label}</span>
                                                    <span className="text-xs text-text-secondary ml-sm">₹{dur.totalFee.toLocaleString()} · {dur.installments} EMI · {dur.fullPayDiscount}% full-pay disc.</span>
                                                </div>
                                                <div className="flex gap-xs">
                                                    <button onClick={() => openBatchCreate(dur.id)} className="text-xs font-bold text-trust flex items-center gap-1 hover:underline px-xs"><Plus size={12} /> Batch</button>
                                                    <button onClick={() => openDurEdit(dur)} className="p-xs hover:text-text-primary hover:bg-surface-hover text-text-secondary rounded transition-colors"><Pencil size={14} /></button>
                                                    <button onClick={() => deleteDuration(dur.id)} className="p-xs hover:text-error hover:bg-error/10 text-text-secondary rounded transition-colors"><Trash2 size={14} /></button>
                                                </div>
                                            </div>

                                            {/* Batches */}
                                            {dur.batches?.length > 0 && (
                                                <div className="border-t border-border-default divide-y divide-border-default">
                                                    {dur.batches.map(batch => {
                                                        const enrolled = batch._count?.applications || 0;
                                                        const seatsLeft = Math.max(0, batch.seatLimit - enrolled);
                                                        return (
                                                            <div key={batch.id} className="px-sm py-xs flex items-center justify-between text-sm bg-surface">
                                                                <div className="flex items-center gap-sm">
                                                                    <span className="font-semibold text-text-primary">{batch.name}</span>
                                                                    <span className="text-text-secondary flex items-center gap-1 text-xs"><Clock size={12} /> {batch.timing}</span>
                                                                    <span className="text-text-secondary flex items-center gap-1 text-xs"><Users size={12} /> {seatsLeft}/{batch.seatLimit} seats</span>
                                                                </div>
                                                                <div className="flex gap-xs">
                                                                    <button onClick={() => openBatchEdit(batch)} className="p-xs hover:text-text-primary hover:bg-surface-hover text-text-secondary rounded transition-colors"><Pencil size={13} /></button>
                                                                    <button onClick={() => deleteBatch(batch.id)} className="p-xs hover:text-error hover:bg-error/10 text-text-secondary rounded transition-colors"><Trash2 size={13} /></button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Course Modal */}
            {courseModal && (
                <Modal title={courseModal === 'create' ? 'Add Course' : 'Edit Course'} onClose={() => { setCourseModal(null); courseFormik.resetForm(); }}>
                    <form onSubmit={courseFormik.handleSubmit} className="space-y-4">
                        {courseFormik.errors.submit && <div className="text-error text-sm bg-error/10 p-2 rounded">{courseFormik.errors.submit}</div>}
                        <div>
                            <label className="block text-sm font-bold mb-1">Title *</label>
                            <input name="title" value={courseFormik.values.title} onChange={courseFormik.handleChange} onBlur={courseFormik.handleBlur} className={`input-field ${courseFormik.touched.title && courseFormik.errors.title ? 'border-red-500' : ''}`} />
                            {courseFormik.touched.title && courseFormik.errors.title && <p className="text-red-400 text-sm mt-1">{courseFormik.errors.title}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Instructor *</label>
                            <input name="instructor" value={courseFormik.values.instructor} onChange={courseFormik.handleChange} onBlur={courseFormik.handleBlur} className={`input-field ${courseFormik.touched.instructor && courseFormik.errors.instructor ? 'border-red-500' : ''}`} />
                            {courseFormik.touched.instructor && courseFormik.errors.instructor && <p className="text-red-400 text-sm mt-1">{courseFormik.errors.instructor}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Category</label>
                            <input name="category" value={courseFormik.values.category} onChange={courseFormik.handleChange} onBlur={courseFormik.handleBlur} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Thumbnail URL</label>
                            <input name="thumbnail" value={courseFormik.values.thumbnail} onChange={courseFormik.handleChange} onBlur={courseFormik.handleBlur} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Description *</label>
                            <textarea name="description" value={courseFormik.values.description} onChange={courseFormik.handleChange} onBlur={courseFormik.handleBlur} className={`input-field h-20 resize-none ${courseFormik.touched.description && courseFormik.errors.description ? 'border-red-500' : ''}`} />
                            {courseFormik.touched.description && courseFormik.errors.description && <p className="text-red-400 text-sm mt-1">{courseFormik.errors.description}</p>}
                        </div>
                        <div className="flex gap-6 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="hasCertificate" checked={courseFormik.values.hasCertificate} onChange={courseFormik.handleChange} className="w-4 h-4 accent-primary" />
                                <span className="font-bold">Has Certificate</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="isPublished" checked={courseFormik.values.isPublished} onChange={courseFormik.handleChange} className="w-4 h-4 accent-primary" />
                                <span className="font-bold">Published</span>
                            </label>
                        </div>

                        {/* Referral Points Overrides */}
                        <div className="bg-page-bg p-4 rounded-lg border border-border-default mt-4">
                            <div className="flex items-center gap-3 mb-4">
                                <input
                                    type="checkbox"
                                    id="enableReferral"
                                    name="enableReferral"
                                    checked={courseFormik.values.enableReferral}
                                    onChange={courseFormik.handleChange}
                                    className="w-5 h-5 text-primary bg-surface border-border-default rounded focus:ring-primary focus:ring-2"
                                />
                                <label htmlFor="enableReferral" className="font-medium text-text-main cursor-pointer select-none">
                                    Enable Referral Rewards for this course?
                                </label>
                            </div>

                            {courseFormik.values.enableReferral && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">
                                            Referrer Points <span className="text-error">*</span>
                                        </label>
                                        <input type="number" required={courseFormik.values.enableReferral} name="referrerPoints" className="input-field bg-surface" placeholder="e.g. 500" value={courseFormik.values.referrerPoints} onChange={courseFormik.handleChange} onBlur={courseFormik.handleBlur} min="1" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">
                                            Referee Points <span className="text-error">*</span>
                                        </label>
                                        <input type="number" required={courseFormik.values.enableReferral} name="refereePoints" className="input-field bg-surface" placeholder="e.g. 250" value={courseFormik.values.refereePoints} onChange={courseFormik.handleChange} onBlur={courseFormik.handleBlur} min="0" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => { setCourseModal(null); courseFormik.resetForm(); }} className="flex-1">Cancel</Button>
                            <Button type="submit" disabled={courseFormik.isSubmitting} className="flex-1"><Save size={15} className="mr-1" /> {courseFormik.isSubmitting ? 'Saving...' : 'Save'}</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Duration Modal */}
            {durationModal && (
                <Modal title={durationModal.id ? 'Edit Duration' : 'Add Duration Variant'} onClose={() => setDurationModal(null)}>
                    <form onSubmit={saveDuration} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">Label * <span className="text-text-muted font-normal">(e.g. "3 Months")</span></label>
                            <input required value={durForm.label} onChange={e => setDurForm(p => ({ ...p, label: e.target.value }))} className="input-field" placeholder="3 Months" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-bold mb-1">Total Fee (₹) *</label>
                                <input required type="number" min="0" value={durForm.totalFee} onChange={e => setDurForm(p => ({ ...p, totalFee: e.target.value }))} className="input-field" placeholder="5000" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Full-Pay Discount (%)</label>
                                <input type="number" min="0" max="100" value={durForm.fullPayDiscount} onChange={e => setDurForm(p => ({ ...p, fullPayDiscount: e.target.value }))} className="input-field" placeholder="10" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold mb-1">Number of EMI Installments</label>
                                <input type="number" min="1" value={durForm.installments} onChange={e => setDurForm(p => ({ ...p, installments: e.target.value }))} className="input-field" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setDurationModal(null)} className="flex-1">Cancel</Button>
                            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save'}</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Batch Modal */}
            {batchModal && (
                <Modal title={batchModal.id ? 'Edit Batch' : 'Add Batch'} onClose={() => setBatchModal(null)}>
                    <form onSubmit={saveBatch} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">Batch Name * <span className="text-text-muted font-normal">(e.g. "Morning")</span></label>
                            <select required value={batchForm.name} onChange={e => setBatchForm(p => ({ ...p, name: e.target.value }))} className="input-field">
                                <option value="">Select...</option>
                                {['Morning', 'Afternoon', 'Evening', 'Weekend'].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Timing * <span className="text-text-muted font-normal">(e.g. "10:00 AM – 12:00 PM")</span></label>
                            <input required value={batchForm.timing} onChange={e => setBatchForm(p => ({ ...p, timing: e.target.value }))} className="input-field" placeholder="10:00 AM – 12:00 PM" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Seat Limit</label>
                            <input type="number" min="1" value={batchForm.seatLimit} onChange={e => setBatchForm(p => ({ ...p, seatLimit: e.target.value }))} className="input-field" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setBatchModal(null)} className="flex-1">Cancel</Button>
                            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save'}</Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default AdminCourses;
