import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Users, ChevronRight, GraduationCap, Award } from 'lucide-react';
import Button from '../../components/ui/Button';
import { coursesAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { handleImageError } from '../../utils/image';

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
        <div className="min-h-screen bg-page-bg">
            {/* Hero */}
            <div className="bg-surface py-2xl px-lg text-center border-b border-border-default">
                <div className="max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-xs bg-trust/10 text-trust px-sm py-xs rounded text-xs font-bold mb-md uppercase tracking-wider">
                        <GraduationCap size={16} /> Offline Computer Institute
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-sm leading-tight text-text-primary">
                        Build Your Career <br />in <span className="text-trust">Computer Skills</span>
                    </h1>
                    <p className="text-text-secondary text-sm max-w-xl mx-auto leading-relaxed">
                        Join our offline training centre. Choose your course, pick your batch,
                        and learn from expert instructors — in person.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-lg py-xl">
                {/* Category Filter */}
                <div className="flex flex-wrap gap-sm mb-lg">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-sm py-xs rounded text-sm font-semibold transition-colors duration-base ${category === cat
                                ? 'bg-buy-primary text-text-primary shadow-sm'
                                : 'bg-surface border border-border-default text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-xl bg-surface border border-dashed border-border-default rounded-lg">
                        <BookOpen size={48} className="mx-auto text-text-muted mb-sm" />
                        <h3 className="text-base font-bold text-text-primary">No courses available yet</h3>
                        <p className="text-sm text-text-secondary mt-1">Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
                        {filtered.map(course => {
                            const minFee = course.durations?.length > 0
                                ? Math.min(...course.durations.map(d => d.totalFee))
                                : null;
                            const totalBatches = course.durations?.flatMap(d => d.batches || []).length || 0;

                            return (
                                <div key={course.id} className="bg-surface rounded-lg border border-border-default shadow-sm hover:shadow-md transition-shadow duration-base flex flex-col group">
                                    {/* Thumbnail */}
                                    <div className="relative h-44 bg-page-bg overflow-hidden rounded-t-lg">
                                        {course.thumbnail ? (
                                            <img
                                                src={course.thumbnail}
                                                alt={course.title}
                                                loading="lazy"
                                                decoding="async"
                                                width={640}
                                                height={352}
                                                onError={handleImageError}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <GraduationCap size={48} className="text-text-muted" />
                                            </div>
                                        )}
                                        <div className="absolute top-sm left-sm">
                                            <span className="bg-surface/90 backdrop-blur text-trust text-xs font-bold px-xs py-1 rounded shadow-sm">
                                                {course.category}
                                            </span>
                                        </div>
                                        {course.hasCertificate && (
                                            <div className="absolute top-sm right-sm">
                                                <span className="bg-success text-white text-xs font-bold px-xs py-1 rounded shadow-sm flex items-center gap-1">
                                                    <Award size={12} /> Certificate
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-md flex flex-col flex-grow">
                                        <h3 className="font-semibold text-base mb-xs text-text-primary line-clamp-2 leading-tight">{course.title}</h3>
                                        <p className="text-xs text-text-secondary mb-md line-clamp-2 flex-grow">{course.description}</p>

                                        <div className="flex items-center gap-sm text-xs text-text-secondary mb-md border-t border-border-default pt-sm">
                                            <span className="flex items-center gap-1 font-medium">
                                                <Clock size={12} /> {course.durations?.length || 0} Durations
                                            </span>
                                            <span className="flex items-center gap-1 font-medium">
                                                <Users size={12} /> {totalBatches} Batch{totalBatches !== 1 ? 'es' : ''}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                {minFee !== null ? (
                                                    <div>
                                                        <span className="text-xs text-text-secondary">Starting from</span>
                                                        <div className="text-base font-bold text-text-primary">₹{minFee.toLocaleString()}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-text-secondary italic">Fees TBD</span>
                                                )}
                                            </div>
                                            <Link to={`/courses/${course.id}`}>
                                                <Button variant="outline" className="text-xs px-sm py-xs flex items-center gap-1 border-border-default">
                                                    View Details <ChevronRight size={14} />
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
