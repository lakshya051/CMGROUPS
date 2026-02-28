import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SLIDES = [
    {
        headline: 'Gaming Week — Up to 40% Off GPUs',
        subline: 'Upgrade your rig with the latest NVIDIA & AMD graphics cards. Limited stock available.',
        cta: 'Shop GPUs',
        link: '/products?category=GPU',
        gradient: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
        accent: 'text-buy-primary',
    },
    {
        headline: 'Build Your Dream PC',
        subline: 'Top-tier CPUs, motherboards, and RAM — everything you need for a custom build.',
        cta: 'Explore Components',
        link: '/products',
        gradient: 'from-[#0f3460] via-[#533483] to-[#e94560]',
        accent: 'text-white',
    },
    {
        headline: 'Back to College Deals',
        subline: 'Laptops, SSDs, and accessories at student-friendly prices. Free shipping on orders over ₹499.',
        cta: 'Shop Now',
        link: '/products?category=Storage',
        gradient: 'from-[#2d3436] via-[#636e72] to-[#00b894]',
        accent: 'text-buy-primary',
    },
];

const AUTO_INTERVAL = 4500;

const HeroBannerSlider = () => {
    const [current, setCurrent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef(null);
    const touchStartRef = useRef(0);

    const goTo = useCallback((idx) => {
        setCurrent((idx + SLIDES.length) % SLIDES.length);
    }, []);

    const next = useCallback(() => goTo(current + 1), [current, goTo]);
    const prev = useCallback(() => goTo(current - 1), [current, goTo]);

    // Auto-rotate
    useEffect(() => {
        if (isPaused) return;
        timerRef.current = setInterval(next, AUTO_INTERVAL);
        return () => clearInterval(timerRef.current);
    }, [isPaused, next]);

    // Touch swipe support
    const onTouchStart = (e) => {
        touchStartRef.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e) => {
        const diff = touchStartRef.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            diff > 0 ? next() : prev();
        }
    };

    return (
        <section
            className="relative w-full overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            aria-label="Promotional banners"
        >
            {/* Slides container */}
            <div
                className="flex transition-transform duration-smooth ease-in-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {SLIDES.map((slide, i) => (
                    <div
                        key={i}
                        className={`w-full flex-shrink-0 bg-gradient-to-r ${slide.gradient}`}
                    >
                        <div className="container mx-auto px-4 flex items-center h-[350px] sm:h-[400px] md:h-[420px] max-sm:h-[220px]">
                            <div className="max-w-2xl space-y-4 max-sm:space-y-2">
                                <h2 className={`text-2xl sm:text-3xl md:text-5xl font-heading font-bold text-white leading-tight`}>
                                    {slide.headline}
                                </h2>
                                <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-lg">
                                    {slide.subline}
                                </p>
                                <Link
                                    to={slide.link}
                                    className="inline-block mt-2 px-6 py-2.5 sm:px-8 sm:py-3 bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold rounded-lg text-sm sm:text-base transition-colors duration-base shadow-lg"
                                >
                                    {slide.cta}
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Arrows */}
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

            {/* Dot indicators */}
            <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
                {SLIDES.map((_, i) => (
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
        </section>
    );
};

export default HeroBannerSlider;
