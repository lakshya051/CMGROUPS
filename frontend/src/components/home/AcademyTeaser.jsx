import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Clock, Award, CheckCircle, ChevronRight } from 'lucide-react';
import { coursesAPI } from '../../lib/api';
import { handleImageError } from '../../utils/image';

const AcademyTeaser = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    useEffect(() => {
        coursesAPI.getAll()
            .then(data => setCourses((data || []).slice(0, 4)))
            .catch(() => setCourses([]))
            .finally(() => setLoading(false));
    }, []);

    if (!loading && courses.length === 0) return null;

    return (
        <section className="py-xl sm:py-2xl bg-trust/5">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">
                        Learn In-Demand Skills
                    </h2>
                    <Link
                        to="/courses"
                        className="text-sm font-semibold text-trust hover:underline flex-shrink-0 flex items-center gap-1"
                    >
                        View All Courses <ChevronRight size={16} />
                    </Link>
                </div>
                <p className="text-sm text-text-secondary mb-6 sm:mb-8">
                    Expert-led courses in Etah — learn offline with certificate
                </p>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-64 bg-surface rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Desktop: grid */}
                        <div className="hidden md:grid md:grid-cols-4 gap-4">
                            {courses.map((course) => (
                                <CourseCard key={course.id} course={course} />
                            ))}
                        </div>

                        {/* Mobile: horizontal scroll */}
                        <div className="md:hidden relative">
                            <div
                                ref={scrollRef}
                                className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
                            >
                                {courses.map((course) => (
                                    <div key={course.id} className="flex-shrink-0 w-[220px] snap-start">
                                        <CourseCard course={course} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 pt-4 border-t border-trust/10">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <CheckCircle size={16} className="text-success" />
                        <span>Certificate on completion</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <CheckCircle size={16} className="text-success" />
                        <span>Expert instructors</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <CheckCircle size={16} className="text-success" />
                        <span>Offline classes in Etah</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

const CourseCard = ({ course }) => {
    const fees = (course.durations || []).map(d => Number(d.totalFee)).filter(Number.isFinite);
    const minFee = fees.length > 0 ? Math.min(...fees) : null;

    return (
        <Link
            to={`/courses/${course.id}`}
            className="group bg-surface rounded-xl border border-border-default overflow-hidden hover:shadow-card-hover transition-all duration-smooth flex flex-col h-full"
        >
            <div className="relative h-36 bg-page-bg overflow-hidden">
                {course.thumbnail ? (
                    <img
                        src={course.thumbnail}
                        alt={course.title}
                        loading="lazy"
                        decoding="async"
                        width={640}
                        height={288}
                        onError={handleImageError}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap size={40} className="text-text-muted" />
                    </div>
                )}
                {course.category && (
                    <span className="absolute top-2 left-2 bg-surface/90 backdrop-blur text-trust text-xs font-bold px-2 py-0.5 rounded">
                        {course.category}
                    </span>
                )}
                {course.hasCertificate && (
                    <span className="absolute top-2 right-2 bg-success text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <Award size={10} /> Cert
                    </span>
                )}
            </div>
            <div className="p-3 flex flex-col flex-grow">
                <h3 className="font-bold text-sm text-text-primary line-clamp-2 leading-tight mb-2">
                    {course.title}
                </h3>
                {course.durations?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-text-secondary mb-2">
                        <Clock size={12} />
                        <span>{course.durations.length} Duration{course.durations.length > 1 ? 's' : ''}</span>
                    </div>
                )}
                <div className="mt-auto">
                    {minFee !== null ? (
                        <div>
                            <span className="text-xs text-text-secondary">From </span>
                            <span className="text-base font-bold text-text-primary">₹{minFee.toLocaleString('en-IN')}</span>
                        </div>
                    ) : (
                        <span className="text-xs text-text-secondary italic">Fees TBD</span>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default AcademyTeaser;
