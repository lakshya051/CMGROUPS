import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: '/',
    plugins: [
        react(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.js',
            registerType: 'autoUpdate',
            // Register from main.jsx (immediate) so push can run before window "load" on mobile PWAs.
            injectRegister: null,
            includeAssets: [
                'icons/*.png',
                'icon.svg',
                'offline.html',
                'placeholder-product.svg',
                'screenshots/*.png',
            ],
            manifest: {
                name: 'Shoptify',
                short_name: 'Shoptify',
                description: 'Shop, Book Services, Learn Courses & More — Your Local Super App',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                theme_color: '#e91e63',
                background_color: '#ffffff',
                orientation: 'portrait',
                lang: 'en',
                dir: 'ltr',
                id: '/',
                categories: ['shopping', 'education', 'lifestyle'],
                prefer_related_applications: false,
                handle_links: 'preferred',
                icons: [
                    { src: '/icons/icon-48x48.png', sizes: '48x48', type: 'image/png' },
                    { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
                    { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
                    { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
                    { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
                    { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
                    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
                    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-192x192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
                    { src: '/icons/icon-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
                shortcuts: [
                    {
                        name: 'My Orders',
                        short_name: 'Orders',
                        url: '/dashboard/orders',
                        icons: [{ src: '/icons/shortcut-orders.png', sizes: '96x96', type: 'image/png' }],
                    },
                    {
                        name: 'Book Service',
                        short_name: 'Services',
                        url: '/services',
                        icons: [{ src: '/icons/shortcut-services.png', sizes: '96x96', type: 'image/png' }],
                    },
                    {
                        name: 'My Courses',
                        short_name: 'Courses',
                        url: '/courses',
                        icons: [{ src: '/icons/shortcut-courses.png', sizes: '96x96', type: 'image/png' }],
                    },
                    {
                        name: 'Shop Now',
                        short_name: 'Shop',
                        url: '/products',
                        icons: [{ src: '/icons/shortcut-shop.png', sizes: '96x96', type: 'image/png' }],
                    },
                ],
                screenshots: [
                    {
                        src: '/screenshots/home.png',
                        sizes: '1080x1920',
                        type: 'image/png',
                        form_factor: 'narrow',
                        label: 'Shoptify Home',
                    },
                    {
                        src: '/screenshots/products.png',
                        sizes: '1080x1920',
                        type: 'image/png',
                        form_factor: 'narrow',
                        label: 'Shop Products',
                    },
                ],
                share_target: {
                    action: '/products',
                    method: 'GET',
                    params: {
                        title: 'title',
                        text: 'text',
                        url: 'url',
                    },
                },
            },
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            },
            // Required to test offline / custom offline.html in DevTools (Network → Offline).
            // Without this, `vite` has no controlling SW, so Chrome shows its dino page.
            devOptions: {
                enabled: mode === 'development',
                type: 'module',
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
    // With PWA dev enabled, Workbox is pulled in after first load; without this, Vite
    // discovers packages in waves and triggers "optimized dependencies changed → reloading" repeatedly.
    optimizeDeps: {
        include: [
            'workbox-window',
            'workbox-core',
            'workbox-precaching',
            'workbox-routing',
            'workbox-strategies',
            'workbox-expiration',
            'workbox-cacheable-response',
        ],
    },
    esbuild: {
        drop: ['console', 'debugger'],
    },
    build: {
        target: 'es2015',
        chunkSizeWarningLimit: 500,
        sourcemap: false,
        rollupOptions: {
            output: {
                // Requested baseline vendor splits
                manualChunks(id) {
                    if (id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
                    if (id.includes('node_modules/react/')) return 'react-vendor';
                    if (id.includes('firebase')) return 'vendor-firebase';
                    if (id.includes('lucide-react')) return 'ui';
                    if (id.includes('recharts')) return 'recharts';
                    if (id.includes('framer-motion')) return 'vendor-motion';
                    if (id.includes('formik') || id.includes('yup')) return 'forms';
                    if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('react-hot-toast')) return 'utils';
                },
            },
        },
    },
}))
