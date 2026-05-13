import express from 'express';
import cache from '../lib/cache.js';
import { protect, adminOnly } from '../middleware/auth.js';
import {
    syncAllSheets,
    syncSheetFull,
    importProductsFromSheet,
} from '../utils/sheetsSync.js';

const router = express.Router();

// POST /api/admin/sheets/sync — full database → all sheets
router.post('/sync', protect, adminOnly, async (req, res) => {
    try {
        await syncAllSheets();
        res.json({ success: true, message: 'All sheets synced successfully' });
    } catch (err) {
        console.error('Full sync error:', err);
        res.status(500).json({ error: 'Sync failed', detail: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});

// POST /api/admin/sheets/sync/:sheetName — sync single sheet tab
router.post('/sync/:sheetName', protect, adminOnly, async (req, res) => {
    try {
        await syncSheetFull(req.params.sheetName);
        res.json({ success: true, message: `${req.params.sheetName} synced` });
    } catch (err) {
        res.status(500).json({ error: 'Sync failed', detail: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});

// POST /api/admin/sheets/import/products — import product + variant changes from sheet → DB
router.post('/import/products', protect, adminOnly, async (req, res) => {
    try {
        const result = await importProductsFromSheet();
        if (result.productsUpdated > 0 || result.variantsUpdated > 0) cache.bustWithHome('products:');
        res.json({
            success: true,
            productsUpdated: result.productsUpdated,
            variantsUpdated: result.variantsUpdated,
            errors: result.errors,
            message: `Updated ${result.productsUpdated} products and ${result.variantsUpdated} variants from sheet`,
        });
    } catch (err) {
        res.status(500).json({ error: 'Import failed', detail: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});

// GET /api/admin/sheets/status — row counts per sheet tab
router.get('/status', protect, adminOnly, async (req, res) => {
    try {
        const { getSheetNames, getSheetData } = await import('../utils/googleSheets.js');
        const names = await getSheetNames();
        const counts = {};
        for (const name of names) {
            const data = await getSheetData(name);
            counts[name] = Math.max(0, data.length - 1);
        }
        res.json({ sheets: names, rowCounts: counts });
    } catch (err) {
        res.status(500).json({ error: 'Status check failed', detail: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});

export default router;
