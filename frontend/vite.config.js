import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: './',
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: [
                'icons/*.png',
                'icon.svg',
                'offline.html',
                'placeholder-product.svg',
            ],
            manifest: {
                name: 'CMGROUPS - Technology, Services & Education',
                short_name: 'CMGROUPS',
                description: 'Shop computers, book tech services, and learn with expert courses — all in one app.',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                theme_color: '#e91e63',
                background_color: '#EAEDED',
                orientation: 'portrait',
                lang: 'en',
                dir: 'ltr',
                categories: ['shopping', 'education', 'business'],
                icons: [
                    { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
                    { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
                    { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
                    { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
                    { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
                    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
                    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/icons/icon-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
                shortcuts: [
                    {
                        name: 'Browse Products',
                        short_name: 'Products',
                        url: '/products',
                        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
                    },
                    {
                        name: 'My Cart',
                        short_name: 'Cart',
                        url: '/cart',
                        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
                    },
                    {
                        name: 'My Orders',
                        short_name: 'Orders',
                        url: '/dashboard/orders',
                        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
                    },
                    {
                        name: 'Courses',
                        short_name: 'Courses',
                        url: '/courses',
                        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
                    },
                ],
            },
        workbox: {
            importScripts: ['/push-sw.js'],
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api\//, /^\/.well-known\//],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /\/api\/products(\?.*)?$/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'api-products',
                            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /\/api\/products\/[^/]+$/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'api-product-detail',
                            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /\/api\/categories(\?.*)?$/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'api-categories',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /\/api\/banners(\?.*)?$/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'api-banners',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 15 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /\/api\/courses(\?.*)?$/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'api-courses',
                            expiration: { maxEntries: 30, maxAgeSeconds: 60 * 10 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /\/api\/cart(\?.*)?$/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cart',
                            expiration: { maxEntries: 5, maxAgeSeconds: 60 * 5 },
                            networkTimeoutSeconds: 2,
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /\/api\/orders\/my-orders(\?.*)?$/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-orders',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 5 },
                            networkTimeoutSeconds: 2,
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /\/api\/auth\/me$/,
                        handler: 'NetworkOnly',
                    },
                    {
                        urlPattern: /\/api\/.*(POST|PUT|PATCH|DELETE)/,
                        handler: 'NetworkOnly',
                    },
                    {
                        urlPattern: /\.(png|jpg|jpeg|webp|gif|avif)$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'images-cache',
                            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
            devOptions: {
                enabled: false,
            },
        }),
        // Bundle analyzer - only runs during `npm run build:analyze`
        mode === 'analyze' && visualizer({
            open: true,
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
        }),
    ].filter(Boolean),
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // Target modern browsers - smaller output
        target: 'es2015',
        // Warn if a chunk exceeds 500 kB
        chunkSizeWarningLimit: 500,
        // Production optimization controls
        sourcemap: false,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
        rollupOptions: {
            output: {
                // Requested baseline vendor splits
                manualChunks(id) {
                    if (id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
                    if (id.includes('node_modules/react/')) return 'react-vendor';
                    if (id.includes('firebase')) return 'vendor-firebase';
                    if (id.includes('lucide-react')) return 'ui';
                    if (id.includes('recharts')) return 'recharts';
                    if (id.includes('formik') || id.includes('yup')) return 'forms';
                    if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('react-hot-toast')) return 'utils';
                },
            },
        },
    },
}))
