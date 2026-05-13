/**
 * Runtime configuration for the frontend. Single source of truth for the
 * API base URL so every module agrees on where to call the backend.
 *
 * In production VITE_API_URL must be set (Vercel dashboard → Environment
 * Variables). The localhost fallback is for the dev server only.
 */
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
