import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: './',
    plugins: [
        react(),
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
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    clerk: ['@clerk/clerk-react'],
                    ui: ['lucide-react'],
                    // Additional targeted splits
                    recharts: ['recharts'],
                    forms: ['formik', 'yup'],
                    utils: ['clsx', 'tailwind-merge', 'react-hot-toast'],
                },
            },
        },
    },
}))
