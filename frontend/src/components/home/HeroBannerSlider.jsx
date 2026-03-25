import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Monitor, Wrench, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { bannersAPI } from '../../lib/api';
import { handleImageError } from '../../utils/image';

const FALLBACK_SLIDES = [
    {
        title: 'Etah\'s #1 Computer Store',
        subtitle: 'Laptops, desktops, printers & accessories — genuine products with local warranty and free delivery above ₹499.',
        ctaLabel: 'Shop Now',
        ctaLink: '/products',
        gradient: 'from-primary via-primary/80 to-secondary',
        icon: Monitor,
    },
    {
        title: 'Doorstep Repair Services',
        subtitle: 'Laptop, desktop, printer & mobile repair by certified technicians. Book online, we come to you.',
        ctaLabel: 'Book a Repair',
        ctaLink: '/services',
        gradient: 'from-trust via-trust/80 to-primary',
        icon: Wrench,
    },
    {
        title: 'Learn In-Demand Skills',
        subtitle: 'Tally Prime, computer basics, web development — expert-led courses with certificate. Join AICT Academy in Etah.',
        ctaLabel: 'Explore Courses',
        ctaLink: '/courses',
        gradient: 'from-secondary via-secondary/80 to-accent',
        icon: GraduationCap,
    },
];

const AUTO_INTERVAL = 4500;

const SkeletonSlide = () => (
    <section className="relative w-full overflow-hidden">
        <div className="bg-gradient-to-r from-primary via-primary/80 to-secondary">
            <div className="container mx-auto px-4 flex items-center h-[350px] sm:h-[400px] md:h-[420px] max-sm:h-[220px]">
                <div className="max-w-2xl space-y-4 max-sm:space-y-2 animate-pulse">
                    <div className="h-8 sm:h-10 md:h-12 bg-white/10 rounded-lg w-3/4" />
                    <div className="h-4 sm:h-5 bg-white/10 rounded w-2/3" />
                    <div className="h-10 sm:h-12 bg-white/10 rounded-lg w-40 mt-2" />
                </div>
            </div>
        </div>
    </section>
);

const HeroBannerSlider = () => {
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [current, setCurrent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef(null);
    const touchStartRef = useRef(0);

    useEffect(() => {
        bannersAPI.getPublic()
            .then(data => {
                setSlides(data.length > 0 ? data : FALLBACK_SLIDES);
            })
            .catch(() => {
                setSlides(FALLBACK_SLIDES);
            })
            .finally(() => setLoading(false));
    }, []);

    const slideCount = slides.length;

    const goTo = useCallback((idx) => {
        setCurrent((idx + slideCount) % slideCount);
    }, [slideCount]);

    const next = useCallback(() => goTo(current + 1), [current, goTo]);
    const prev = useCallback(() => goTo(current - 1), [current, goTo]);

    useEffect(() => {
        if (isPaused || slideCount <= 1) return;
        timerRef.current = setInterval(next, AUTO_INTERVAL);
        return () => clearInterval(timerRef.current);
    }, [isPaused, next, slideCount]);

    const onTouchStart = (e) => {
        touchStartRef.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e) => {
        const diff = touchStartRef.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            diff > 0 ? next() : prev();
        }
    };

    if (loading) return <SkeletonSlide />;
    if (slideCount === 0) return null;

    return (
        <section
            className="relative w-full overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            aria-label="Promotional banners"
        >
            <div
                className="flex transition-transform duration-smooth ease-in-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {slides.map((slide, i) => {
                    const SlideIcon = slide.icon || null;
                    return (
                        <div
                            key={slide.id || i}
                            className={`w-full flex-shrink-0 relative ${
                                !slide.image ? `bg-gradient-to-r ${slide.gradient || 'from-primary via-primary/80 to-secondary'}` : ''
                            }`}
                        >
                            {slide.image && (
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    loading={i === 0 ? 'eager' : 'lazy'}
                                    fetchPriority={i === 0 ? 'high' : 'auto'}
                                    width={1920}
                                    height={720}
                                    onError={handleImageError}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            )}
                            {slide.image && (
                                <div className="absolute inset-0 bg-black/40" />
                            )}
                            <div className="container mx-auto px-4 flex items-center justify-between h-[350px] sm:h-[400px] md:h-[420px] max-sm:h-[220px] relative z-10">
                                <div className="max-w-xl space-y-4 max-sm:space-y-2">
                                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-heading font-bold text-white leading-tight">
                                        {slide.title || slide.headline}
                                    </h2>
                                    <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-lg">
                                        {slide.subtitle || slide.subline}
                                    </p>
                                    <Link
                                        to={slide.ctaLink || slide.link || '/products'}
                                        className="inline-block mt-2 px-6 py-2.5 sm:px-8 sm:py-3 bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold rounded-lg text-sm sm:text-base transition-colors duration-base shadow-lg"
                                    >
                                        {slide.ctaLabel || slide.cta || 'Shop Now'}
                                    </Link>
                                </div>
                                {SlideIcon && !slide.image && (
                                    <div className="hidden md:flex items-center justify-center flex-shrink-0">
                                        <SlideIcon size={180} className="text-white/10" strokeWidth={1} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {slideCount > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors"
                        aria-label="Previous slide"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors"
                        aria-label="Next slide"
                    >
                        <ChevronRight size={22} />
                    </button>
                </>
            )}

            {slideCount > 1 && (
                <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={`rounded-full transition-all duration-base ${i === current
                                    ? 'w-8 h-2.5 bg-buy-primary'
                                    : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
                                }`}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default HeroBannerSlider;
