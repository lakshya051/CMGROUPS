import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadImage, deleteImage, getPublicIdFromUrl } from '../utils/cloudinary.js';

const router = express.Router();

// POST /api/upload — upload a single image (base64)
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { image, folder } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'image (base64 data URI) is required' });
        }

        const url = await uploadImage(image, folder || 'products');
        res.json({ url });
    } catch (error) {
        console.error('Upload error:', error);
        const message = error.message?.includes('Cloudinary') ? error.message : 'Upload failed';
        res.status(500).json({ error: message });
    }
});

// POST /api/upload/multiple — upload multiple images
router.post('/multiple', protect, adminOnly, async (req, res) => {
    try {
        const { images, folder } = req.body;

        if (!Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'images array is required' });
        }

        if (images.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 images allowed per upload' });
        }

        const urls = await Promise.all(
            images.map(img => uploadImage(img, folder || 'products'))
        );

        res.json({ urls });
    } catch (error) {
        console.error('Multiple upload error:', error);
        const message = error.message?.includes('Cloudinary') ? error.message : 'Upload failed';
        res.status(500).json({ error: message });
    }
});

// DELETE /api/upload — delete an image by URL
router.delete('/', protect, adminOnly, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'url is required' });
        }

        const publicId = getPublicIdFromUrl(url);
        if (publicId) {
            await deleteImage(publicId);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

export default router;
