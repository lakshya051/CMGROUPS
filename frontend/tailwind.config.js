/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#f8f9fc",
                surface: "#ffffff",
                primary: "#e91e63",
                secondary: "#7c3aed",
                accent: "#ff6d00",
                success: "#007600",
                warning: "#ffab00",
                error: "#d50000",
                text: {
                    main: "#1a1a2e",
                    muted: "#6b7280"
                },
                'buy-primary':          '#FFD814',
                'buy-primary-hover':    '#F7CA00',
                'buy-secondary':        '#FF9F00',
                'buy-secondary-hover':  '#E8920A',
                'urgency':              '#C7511F',
                'deal':                 '#CC0C39',
                'trust':                '#007185',
                'page-bg':              '#EAEDED',
                'surface-hover':        '#F7FAFA',
                'border-default':       '#DDDDDD',
                'text-primary':         '#0F1111',
                'text-secondary':       '#565959',
                'text-muted':           '#767676',
                'badge-bestseller':     '#FF6D00',
                'badge-choice':         '#1a1a1a',
                'badge-choice-text':    '#C7A33A',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                heading: ['Outfit', 'sans-serif'],
            },
            fontSize: {
                'price':    ['1.5rem',   { lineHeight: '1', fontWeight: '700' }],
                'price-lg': ['1.875rem', { lineHeight: '1', fontWeight: '700' }],
                'price-xl': ['2.25rem',  { lineHeight: '1', fontWeight: '700' }],
            },
            spacing: {
                'xs': '4px',  'sm': '8px',   'md': '12px',
                'lg': '16px', 'xl': '24px',  '2xl': '32px',
            },
            transitionDuration: {
                'fast': '100ms', 'base': '150ms', 'smooth': '250ms', 'slow': '400ms',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(233, 30, 99, 0.35)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
                'card': '0 2px 12px rgba(0, 0, 0, 0.06)',
                'card-hover': '0 8px 24px rgba(233, 30, 99, 0.15)',
            }
        },
    },
    safelist: [
        'bg-buy-primary',
        'bg-success',
        'bg-deal',
        'bg-urgency',
        'bg-trust',
    ],
    plugins: [
        require("tailwindcss-animate"),
    ],
}
