const express = require('express');
const prisma = require('../lib/prisma');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories - List all categories (Public)
router.get('/', async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/categories - Create category (Admin)
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { name, image, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const category = await prisma.category.create({
            data: { name, slug, image, description }
        });

        res.status(201).json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Category name already exists' });
        }
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/categories/:id - Delete category (Admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        await prisma.category.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============ SERVICE TYPES ============

// GET /api/categories/service-types - List all active service types (Public)
router.get('/service-types', async (req, res) => {
    try {
        const serviceTypes = await prisma.serviceType.findMany({
            where: { active: true },
            orderBy: { createdAt: 'asc' }
        });
        res.json(serviceTypes);
    } catch (error) {
        console.error('Get service types error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/categories/service-types/all - List ALL service types (Admin)
router.get('/service-types/all', protect, adminOnly, async (req, res) => {
    try {
        const serviceTypes = await prisma.serviceType.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(serviceTypes);
    } catch (error) {
        console.error('Get all service types error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/categories/service-types - Create service type (Admin)
router.post('/service-types', protect, adminOnly, async (req, res) => {
    try {
        const { title, description, icon, price, features } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const serviceType = await prisma.serviceType.create({
            data: {
                title,
                description: description || null,
                icon: icon || 'Wrench',
                price: price || null,
                features: features || []
            }
        });

        res.status(201).json(serviceType);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Service type with this title already exists' });
        }
        console.error('Create service type error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/categories/service-types/:id - Delete service type (Admin)
router.delete('/service-types/:id', protect, adminOnly, async (req, res) => {
    try {
        await prisma.serviceType.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete service type error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
