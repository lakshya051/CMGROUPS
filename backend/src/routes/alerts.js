const express = require('express');
const prisma = require('../lib/prisma');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/alerts - Get my active alerts
router.get('/', protect, async (req, res) => {
    try {
        const alerts = await prisma.productAlert.findMany({
            where: { userId: req.user.id, isActive: true },
            include: {
                product: {
                    select: {
                        id: true,
                        title: true,
                        image: true,
                        price: true,
                        stock: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(alerts);
    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/alerts/:productId - Toggle Alert (Subscribe/Unsubscribe)
router.post('/:productId', protect, async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const { type, priceThreshold } = req.body; // type: "STOCK" or "PRICE_DROP"

        if (!type || !['STOCK', 'PRICE_DROP'].includes(type)) {
            return res.status(400).json({ error: 'Invalid alert type' });
        }

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        // Check if alert exists
        const existingAlert = await prisma.productAlert.findFirst({
            where: {
                userId: req.user.id,
                productId,
                type
            }
        });

        if (existingAlert) {
            // If exists, toggle it (delete or deactivate?)
            // Let's delete it to "Unsubscribe"
            await prisma.productAlert.delete({ where: { id: existingAlert.id } });
            return res.json({ message: 'Alert removed', subscribed: false });
        }

        // Create new alert
        const alert = await prisma.productAlert.create({
            data: {
                userId: req.user.id,
                productId,
                type,
                priceThreshold: priceThreshold || (type === 'PRICE_DROP' ? product.price : null),
                isActive: true
            }
        });

        res.json({ message: 'Alert set successfully', subscribed: true, alert });
    } catch (error) {
        console.error('Toggle alert error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
