/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#f8f9fc",   // Bright off-white
                surface: "#ffffff",       // Pure white
                primary: "#e91e63",       // Vibrant GoGo Pink
                secondary: "#7c3aed",    // Electric Violet
                accent: "#ff6d00",       // Energetic Orange
                success: "#00c853",      // Vivid Green
                warning: "#ffab00",      // Bright Amber
                error: "#d50000",        // Bold Red
                text: {
                    main: "#1a1a2e",       // Deep Navy
                    muted: "#6b7280"       // Cool Gray
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                heading: ['Outfit', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 20px rgba(233, 30, 99, 0.35)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
                'card': '0 2px 12px rgba(0, 0, 0, 0.06)',
                'card-hover': '0 8px 24px rgba(233, 30, 99, 0.15)',
            }
        },
    },
    plugins: [
        require("tailwindcss-animate"),
    ],
}
