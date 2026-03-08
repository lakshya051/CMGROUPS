import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Clock, Users, Award, CheckCircle, ChevronLeft, CreditCard, Banknote } from 'lucide-react';
import Button from '../../components/ui/Button';
import { coursesAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import ApplicationForm from './ApplicationForm';
import toast from 'react-hot-toast';
import { handleImageError } from '../../utils/image';

const CourseDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDuration, setSelectedDuration] = useState(null);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        coursesAPI.getById(id)
            .then(data => {
                setCourse(data);
                if (data.durations?.length > 0) setSelectedDuration(data.durations[0]);
            })
            .catch(() => toast.error('Failed to load course'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <GraduationCap size={48} className="text-primary animate-bounce" />
        </div>
    );
    if (!course) return <div className="p-12 text-center text-error font-bold">Course not found.</div>;

    const getSeatsLeft = (batch) => {
        const enrolled = batch._count?.applications || 0;
        return Math.max(0, batch.seatLimit - enrolled);
    };

    return (
        <div className="min-h-screen bg-page-bg">
            {/* Header */}
            <div className="bg-surface border-b border-border-default py-xl px-lg">
                <div className="container mx-auto max-w-5xl">
                    <button onClick={() => navigate('/courses')} className="flex items-center gap-xs text-text-muted hover:text-text-primary text-sm font-bold mb-md transition-colors">
                        <ChevronLeft size={18} /> Back to Courses
                    </button>
                    <div className="flex flex-col lg:flex-row gap-lg items-start">
                        <div className="flex-1">
                            <span className="inline-block bg-trust/10 text-trust text-xs font-bold px-3 py-1 rounded mb-sm tracking-wider uppercase">{course.category}</span>
                            <h1 className="text-2xl md:text-3xl font-bold mb-sm text-text-primary leading-tight">{course.title}</h1>
                            <p className="text-text-secondary text-sm leading-relaxed mb-md">{course.description}</p>
                            <div className="flex flex-wrap gap-sm text-sm font-medium">
                                <span className="flex items-center gap-xs text-text-muted"><GraduationCap size={16} className="text-trust" /> Instructor: {course.instructor}</span>
                                {course.hasCertificate && <span className="flex items-center gap-xs text-trust"><Award size={16} /> Certificate on Completion</span>}
                            </div>
                        </div>
                        {course.thumbnail && (
                            <div className="lg:w-72 w-full flex-shrink-0">
                                <img
                                    src={course.thumbnail}
                                    alt={course.title}
                                    loading="eager"
                                    fetchPriority="high"
                                    decoding="async"
                                    width={576}
                                    height={192}
                                    onError={handleImageError}
                                    className="w-full h-48 object-cover rounded-lg shadow-sm"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-5xl px-lg py-xl">
                {course.durations?.length === 0 ? (
                    <div className="text-center py-xl border border-dashed border-border-default rounded-lg bg-surface">
                        <Clock size={48} className="mx-auto text-text-muted mb-sm" />
                        <p className="text-text-primary font-bold text-sm">No duration variants set up yet.</p>
                        <p className="text-xs text-text-secondary mt-1">Contact us for more information.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
                        {/* Duration Selector */}
                        <div className="lg:col-span-1 space-y-sm">
                            <h2 className="text-lg font-bold text-text-primary mb-md">Choose Duration</h2>
                            {course.durations.map(dur => {
                                const discount = dur.fullPayDiscount;
                                const discountedFee = discount > 0 ? dur.totalFee * (1 - discount / 100) : null;
                                const monthlyEMI = Math.ceil(dur.totalFee / dur.installments);
                                return (
                                    <button
                                        key={dur.id}
                                        onClick={() => setSelectedDuration(dur)}
                                        className={`w-full text-left p-md rounded-lg border transition-colors duration-base ${selectedDuration?.id === dur.id ? 'border-trust bg-surface-hover shadow-sm' : 'border-border-default bg-surface hover:bg-surface-hover'}`}
                                    >
                                        <div className="flex items-center justify-between mb-sm">
                                            <span className="font-semibold text-base text-text-primary">{dur.label}</span>
                                            {selectedDuration?.id === dur.id && <CheckCircle size={20} className="text-trust" />}
                                        </div>
                                        <div className="text-xl font-bold text-text-primary mb-xs">₹{dur.totalFee.toLocaleString()}</div>
                                        <div className="text-xs text-text-secondary space-y-1">
                                            {discount > 0 && <div className="flex items-center gap-1 text-success font-medium"><CreditCard size={11} /> Full pay: ₹{discountedFee?.toLocaleString()} ({discount}% off)</div>}
                                            <div className="flex items-center gap-1"><Banknote size={11} /> EMI: ₹{monthlyEMI.toLocaleString()}/month × {dur.installments}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Batch Availability */}
                        <div className="lg:col-span-2">
                            <h2 className="text-lg font-bold text-text-primary mb-md">Available Batches</h2>
                            {selectedDuration ? (
                                selectedDuration.batches?.length > 0 ? (
                                    <div className="space-y-sm">
                                        {selectedDuration.batches.map(batch => {
                                            const seatsLeft = getSeatsLeft(batch);
                                            const full = seatsLeft === 0;
                                            return (
                                                <div key={batch.id} className={`p-md rounded-lg border flex items-center justify-between ${full ? 'border-border-default bg-page-bg opacity-60' : 'border-border-default bg-surface shadow-sm'}`}>
                                                    <div>
                                                        <div className="font-semibold text-sm text-text-primary">{batch.name} Batch</div>
                                                        <div className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                                                            <Clock size={12} /> {batch.timing}
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-4">
                                                        <div className={`font-bold text-sm ${full ? 'text-error' : seatsLeft <= 5 ? 'text-warning' : 'text-success'}`}>
                                                            {full ? 'Full' : `${seatsLeft} seats`}
                                                        </div>
                                                        <div className="text-xs text-text-secondary">of {batch.seatLimit}</div>
                                                        <div className="w-24 h-1.5 bg-border-default rounded-full mt-1 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${full ? 'bg-error' : seatsLeft <= 5 ? 'bg-warning' : 'bg-success'}`}
                                                                style={{ width: `${((batch.seatLimit - seatsLeft) / batch.seatLimit) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {/* Apply Button */}
                                        <div className="mt-lg">
                                            {user ? (
                                                <Button
                                                    variant="primary"
                                                    className="w-full py-sm text-sm"
                                                    onClick={() => {
                                                        const hasSeats = selectedDuration.batches.some(b => getSeatsLeft(b) > 0);
                                                        if (!hasSeats) return toast.error('All batches for this duration are full.');
                                                        setShowForm(true);
                                                    }}
                                                >
                                                    <GraduationCap size={18} className="mr-2" /> Apply for {selectedDuration.label}
                                                </Button>
                                            ) : (
                                                <div className="text-center p-md bg-page-bg rounded-lg border border-dashed border-border-default">
                                                    <p className="text-text-primary text-sm font-medium mb-sm">Login to apply for this course</p>
                                                    <Button variant="outline" onClick={() => navigate('/sign-in')} className="text-sm px-md py-xs">Login / Register</Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-xl border border-dashed border-border-default rounded-lg bg-surface">
                                        <Users size={40} className="mx-auto text-text-muted mb-sm" />
                                        <p className="text-text-primary text-sm">No batches configured for this duration yet.</p>
                                    </div>
                                )
                            ) : (
                                <p className="text-text-secondary text-sm">Select a duration to see available batches.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showForm && selectedDuration && (
                <ApplicationForm
                    course={course}
                    duration={selectedDuration}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); navigate('/dashboard/courses'); }}
                />
            )}
        </div>
    );
};

export default CourseDetail;
