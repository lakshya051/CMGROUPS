import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Clock, Users, Award, CheckCircle, ChevronLeft, CreditCard, Banknote } from 'lucide-react';
import Button from '../../components/ui/Button';
import { coursesAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import ApplicationForm from './ApplicationForm';
import toast from 'react-hot-toast';

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
        <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary/10 to-transparent border-b border-gray-100 py-12 px-4">
                <div className="container mx-auto max-w-5xl">
                    <button onClick={() => navigate('/courses')} className="flex items-center gap-2 text-text-muted hover:text-primary text-sm font-bold mb-6 transition-colors">
                        <ChevronLeft size={18} /> Back to Courses
                    </button>
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        <div className="flex-1">
                            <span className="inline-block bg-primary/10 text-primary text-xs font-black px-3 py-1 rounded-full mb-4">{course.category}</span>
                            <h1 className="text-4xl font-heading font-black mb-4 leading-tight">{course.title}</h1>
                            <p className="text-text-muted text-lg leading-relaxed mb-6">{course.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm font-medium">
                                <span className="flex items-center gap-2 text-text-muted"><GraduationCap size={16} className="text-primary" /> Instructor: {course.instructor}</span>
                                {course.hasCertificate && <span className="flex items-center gap-2 text-amber-600"><Award size={16} /> Certificate on Completion</span>}
                            </div>
                        </div>
                        {course.thumbnail && (
                            <div className="lg:w-72 w-full flex-shrink-0">
                                <img src={course.thumbnail} alt={course.title} loading="lazy" decoding="async" className="w-full h-48 object-cover rounded-2xl shadow-lg" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-5xl px-4 py-12">
                {course.durations?.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
                        <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-text-muted font-bold">No duration variants set up yet.</p>
                        <p className="text-sm text-text-muted mt-2">Contact us for more information.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Duration Selector */}
                        <div className="lg:col-span-1 space-y-4">
                            <h2 className="text-xl font-black mb-5">Choose Duration</h2>
                            {course.durations.map(dur => {
                                const discount = dur.fullPayDiscount;
                                const discountedFee = discount > 0 ? dur.totalFee * (1 - discount / 100) : null;
                                const monthlyEMI = Math.ceil(dur.totalFee / dur.installments);
                                return (
                                    <button
                                        key={dur.id}
                                        onClick={() => setSelectedDuration(dur)}
                                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${selectedDuration?.id === dur.id ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-gray-100 bg-surface hover:border-primary/40'}`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-black text-lg">{dur.label}</span>
                                            {selectedDuration?.id === dur.id && <CheckCircle size={20} className="text-primary" />}
                                        </div>
                                        <div className="text-2xl font-black text-primary mb-1">₹{dur.totalFee.toLocaleString()}</div>
                                        <div className="text-xs text-text-muted space-y-1">
                                            {discount > 0 && <div className="flex items-center gap-1 text-success font-bold"><CreditCard size={11} /> Full pay: ₹{discountedFee?.toLocaleString()} ({discount}% off)</div>}
                                            <div className="flex items-center gap-1"><Banknote size={11} /> EMI: ₹{monthlyEMI.toLocaleString()}/month × {dur.installments}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Batch Availability */}
                        <div className="lg:col-span-2">
                            <h2 className="text-xl font-black mb-5">Available Batches</h2>
                            {selectedDuration ? (
                                selectedDuration.batches?.length > 0 ? (
                                    <div className="space-y-4">
                                        {selectedDuration.batches.map(batch => {
                                            const seatsLeft = getSeatsLeft(batch);
                                            const full = seatsLeft === 0;
                                            return (
                                                <div key={batch.id} className={`p-5 rounded-2xl border-2 flex items-center justify-between ${full ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 bg-surface'}`}>
                                                    <div>
                                                        <div className="font-black text-base">{batch.name} Batch</div>
                                                        <div className="text-sm text-text-muted mt-1 flex items-center gap-2">
                                                            <Clock size={14} /> {batch.timing}
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-4">
                                                        <div className={`font-black text-lg ${full ? 'text-error' : seatsLeft <= 5 ? 'text-warning' : 'text-success'}`}>
                                                            {full ? 'Full' : `${seatsLeft} seats`}
                                                        </div>
                                                        <div className="text-xs text-text-muted">of {batch.seatLimit}</div>
                                                        <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
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
                                        <div className="mt-8">
                                            {user ? (
                                                <Button
                                                    className="w-full py-4 text-base"
                                                    onClick={() => {
                                                        const hasSeats = selectedDuration.batches.some(b => getSeatsLeft(b) > 0);
                                                        if (!hasSeats) return toast.error('All batches for this duration are full.');
                                                        setShowForm(true);
                                                    }}
                                                >
                                                    <GraduationCap size={20} className="mr-2" /> Apply for {selectedDuration.label}
                                                </Button>
                                            ) : (
                                                <div className="text-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                    <p className="text-text-muted font-bold mb-3">Login to apply for this course</p>
                                                    <Button onClick={() => navigate('/login')}>Login / Register</Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
                                        <Users size={40} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-text-muted">No batches configured for this duration yet.</p>
                                    </div>
                                )
                            ) : (
                                <p className="text-text-muted">Select a duration to see available batches.</p>
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
