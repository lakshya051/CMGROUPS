import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Users, ChevronRight, GraduationCap, Award } from 'lucide-react';
import Button from '../../components/ui/Button';
import { coursesAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('All');

    useEffect(() => {
        coursesAPI.getAll()
            .then(data => setCourses(data))
            .catch(() => toast.error('Failed to load courses'))
            .finally(() => setLoading(false));
    }, []);

    const categories = ['All', ...new Set(courses.map(c => c.category))];
    const filtered = category === 'All' ? courses : courses.filter(c => c.category === category);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <GraduationCap size={48} className="text-primary animate-bounce" />
                <p className="text-text-muted font-medium">Loading courses...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen">
            {/* Hero */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent py-20 px-4 text-center border-b border-gray-100">
                <div className="max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold mb-6">
                        <GraduationCap size={16} /> Offline Computer Institute
                    </div>
                    <h1 className="text-5xl font-heading font-black mb-4 leading-tight">
                        Build Your Career <br />in <span className="text-primary">Computer Skills</span>
                    </h1>
                    <p className="text-text-muted text-lg max-w-xl mx-auto">
                        Join our offline training centre. Choose your course, pick your batch,
                        and learn from expert instructors — in person.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12">
                {/* Category Filter */}
                <div className="flex flex-wrap gap-3 mb-10">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${category === cat
                                ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                                : 'bg-surface border border-gray-200 text-text-muted hover:border-primary hover:text-primary'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <BookOpen size={64} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-xl font-bold text-text-muted">No courses available yet</h3>
                        <p className="text-sm text-text-muted mt-2">Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filtered.map(course => {
                            const minFee = course.durations?.length > 0
                                ? Math.min(...course.durations.map(d => d.totalFee))
                                : null;
                            const totalBatches = course.durations?.flatMap(d => d.batches || []).length || 0;

                            return (
                                <div key={course.id} className="bg-surface rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                                    {/* Thumbnail */}
                                    <div className="relative h-44 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                                        {course.thumbnail ? (
                                            <img src={course.thumbnail} alt={course.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <GraduationCap size={64} className="text-primary/30" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3">
                                            <span className="bg-white/90 backdrop-blur text-primary text-xs font-black px-3 py-1 rounded-full shadow">
                                                {course.category}
                                            </span>
                                        </div>
                                        {course.hasCertificate && (
                                            <div className="absolute top-3 right-3">
                                                <span className="bg-amber-400/90 text-amber-900 text-xs font-black px-3 py-1 rounded-full shadow flex items-center gap-1">
                                                    <Award size={12} /> Certificate
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 flex flex-col flex-grow">
                                        <h3 className="font-black text-lg mb-2 group-hover:text-primary transition-colors leading-tight">{course.title}</h3>
                                        <p className="text-sm text-text-muted mb-4 line-clamp-2 flex-grow">{course.description}</p>

                                        <div className="flex items-center gap-4 text-xs text-text-muted mb-5 border-t border-gray-100 pt-4">
                                            <span className="flex items-center gap-1 font-medium">
                                                <Clock size={13} /> {course.durations?.length || 0} Duration Options
                                            </span>
                                            <span className="flex items-center gap-1 font-medium">
                                                <Users size={13} /> {totalBatches} Batch{totalBatches !== 1 ? 'es' : ''}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                {minFee !== null ? (
                                                    <div>
                                                        <span className="text-xs text-text-muted">Starting from</span>
                                                        <div className="text-xl font-black text-primary">₹{minFee.toLocaleString()}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-text-muted italic">Fees TBD</span>
                                                )}
                                            </div>
                                            <Link to={`/courses/${course.id}`}>
                                                <Button className="flex items-center gap-1">
                                                    View & Apply <ChevronRight size={16} />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Courses;
