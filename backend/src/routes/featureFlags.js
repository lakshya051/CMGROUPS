import express from 'express';
import { getFeatureFlags, getDefaultFeatureFlags } from '../lib/featureFlags.js';

const router = express.Router();

// GET /api/feature-flags
// Public read of customer-facing flags. Open to unauthenticated visitors so
// the SPA can decide what to render before any sign-in happens. Falls back to
// the safe defaults (everything OFF) on a DB hiccup so the app stays usable
// rather than blowing up the home/page render.
router.get('/', async (req, res) => {
    try {
        const flags = await getFeatureFlags();
        res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=300');
        res.json(flags);
    } catch (error) {
        console.error('Get public feature flags error:', error);
        res.json(getDefaultFeatureFlags());
    }
});

export default router;
