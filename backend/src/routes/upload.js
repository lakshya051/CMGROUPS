import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadImage, deleteImage, getPublicIdFromUrl } from '../utils/cloudinary.js';

const router = express.Router();
// H5: decoded-image size is capped to 3 MB in cloudinary.js; the raw JSON
// request body is capped well above that to account for base64 overhead
// (~1.37x) plus other fields, but much tighter than the previous 10 MB.
const UPLOAD_JSON_LIMIT = express.json({ limit: '5mb' });
const VALID_FOLDER_PATTERN = /^[a-zA-Z0-9_-]+$/;

// Per-IP upload throttling on top of the global rate limiter. Admin routes
// are still protected, but a compromised admin token should not be able to
// flood Cloudinary with uploads.
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many uploads from this IP; please slow down.' },
});

function handleUploadError(res, error, contextLabel) {
    if (error?.isClientError) {
        return res.status(400).json({ error: error.message });
    }
    console.error(`${contextLabel}:`, error);
    const message = error.message?.includes('Cloudinary') ? error.message : 'Upload failed';
    return res.status(500).json({ error: message });
}

// POST /api/upload — upload a single image (base64)
router.post('/', UPLOAD_JSON_LIMIT, uploadLimiter, protect, adminOnly, async (req, res) => {
    try {
        const { image, folder } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'image (base64 data URI) is required' });
        }

        const safeFolder = (folder && VALID_FOLDER_PATTERN.test(folder)) ? folder : 'products';
        const url = await uploadImage(image, safeFolder);
        res.json({ url });
    } catch (error) {
        return handleUploadError(res, error, 'Upload error');
    }
});

// POST /api/upload/multiple — upload multiple images
router.post('/multiple', UPLOAD_JSON_LIMIT, uploadLimiter, protect, adminOnly, async (req, res) => {
    try {
        const { images, folder } = req.body;

        if (!Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'images array is required' });
        }

        if (images.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 images allowed per upload' });
        }

        const safeFolder = (folder && VALID_FOLDER_PATTERN.test(folder)) ? folder : 'products';
        const urls = await Promise.all(
            images.map(img => uploadImage(img, safeFolder))
        );

        res.json({ urls });
    } catch (error) {
        return handleUploadError(res, error, 'Multiple upload error');
    }
});

// DELETE /api/upload — delete an image by URL.
// SECURITY: deleteImage() itself only permits deletes within the `cmgroups/`
// Cloudinary namespace; this route additionally validates that the URL
// belongs to our namespace before dispatching.
router.delete('/', protect, adminOnly, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'url is required' });
        }

        const publicId = getPublicIdFromUrl(url);
        if (!publicId) return res.status(400).json({ error: 'Could not extract public ID from URL' });

        await deleteImage(publicId);

        res.json({ success: true });
    } catch (error) {
        if (error?.isClientError) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Delete image error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

export default router;
