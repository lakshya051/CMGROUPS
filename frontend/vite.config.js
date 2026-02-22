import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        // Bundle analyzer — only runs during `npm run build:analyze`
        mode === 'analyze' && visualizer({
            open: true,
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
        }),
    ].filter(Boolean),
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        // Target modern browsers — smaller output
        target: 'es2015',
        // Warn if a chunk exceeds 500 kB
        chunkSizeWarningLimit: 500,
        rollupOptions: {
            output: {
                // Split heavy libs into their own cached chunks
                manualChunks: {
                    // React core — almost never changes
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    // Chart library — large, rarely changes
                    'vendor-recharts': ['recharts'],
                    // Animation library
                    'vendor-framer': ['framer-motion'],
                    // Icon library
                    'vendor-lucide': ['lucide-react'],
                },
            },
        },
    },
}))
