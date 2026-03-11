import express from 'express';
import prisma from '../lib/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/addresses — fetch all saved addresses for the logged-in user
router.get('/', protect, async (req, res) => {
    try {
        const addresses = await prisma.address.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(addresses);
    } catch (error) {
        console.error('Get addresses error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/addresses — save a new address for the logged-in user
router.post('/', protect, async (req, res) => {
    try {
        const { label, address, city, pincode, phone, latitude, longitude, googleMapLink } = req.body;

        if (!address || !city || !pincode || !phone) {
            return res.status(400).json({ error: 'address, city, pincode, and phone are required' });
        }

        const newAddress = await prisma.address.create({
            data: {
                userId: req.user.id,
                label: label || null,
                address,
                city,
                pincode,
                phone,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                googleMapLink: googleMapLink || null
            }
        });

        res.status(201).json(newAddress);
    } catch (error) {
        console.error('Create address error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/addresses/:id — delete an address that belongs to the logged-in user
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.address.findUnique({ where: { id } });

        if (!existing) {
            return res.status(404).json({ error: 'Address not found' });
        }
        if (existing.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await prisma.address.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
