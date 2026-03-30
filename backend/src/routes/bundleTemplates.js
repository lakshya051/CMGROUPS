import express from 'express';
import prisma from '../lib/prisma.js';
import cache from '../lib/cache.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

const templateInclude = {
    slots: { orderBy: { position: 'asc' } },
};

// GET /api/bundle-templates — list active templates
router.get('/', async (req, res) => {
    try {
        const cacheKey = 'bundleTemplates:list';
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const templates = await prisma.bundleTemplate.findMany({
            where: { isActive: true },
            include: templateInclude,
            orderBy: { createdAt: 'desc' },
        });

        cache.set(cacheKey, templates, 120);
        res.json(templates);
    } catch (error) {
        console.error('Get bundle templates error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/bundle-templates/admin — all templates for admin
router.get('/admin', protect, adminOnly, async (req, res) => {
    try {
        const templates = await prisma.bundleTemplate.findMany({
            include: templateInclude,
            orderBy: { createdAt: 'desc' },
        });
        res.json(templates);
    } catch (error) {
        console.error('Get admin bundle templates error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/bundle-templates/:id — single template with slots
router.get('/:id', async (req, res) => {
    try {
        const template = await prisma.bundleTemplate.findUnique({
            where: { id: parseInt(req.params.id) },
            include: templateInclude,
        });
        if (!template) return res.status(404).json({ error: 'Template not found' });
        res.json(template);
    } catch (error) {
        console.error('Get bundle template error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/bundle-templates/:id/products — products grouped by slot category
router.get('/:id/products', async (req, res) => {
    try {
        const template = await prisma.bundleTemplate.findUnique({
            where: { id: parseInt(req.params.id) },
            include: templateInclude,
        });
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const categories = [...new Set(template.slots.map(s => s.category))];
        const products = await prisma.product.findMany({
            where: { category: { in: categories }, isActive: true, stock: { gt: 0 } },
            select: { id: true, title: true, price: true, images: true, category: true, stock: true, rating: true },
            orderBy: { rating: 'desc' },
        });

        const grouped = {};
        for (const slot of template.slots) {
            grouped[slot.id] = products.filter(p => p.category === slot.category);
        }

        res.json({ template, productsBySlot: grouped });
    } catch (error) {
        console.error('Get template products error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/bundle-templates/:id/calculate — calculate discounted price
router.post('/:id/calculate', async (req, res) => {
    try {
        const template = await prisma.bundleTemplate.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const { productIds } = req.body;
        if (!Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: 'productIds array is required' });
        }

        const products = await prisma.product.findMany({
            where: { id: { in: productIds.map(id => parseInt(id)) }, isActive: true },
            select: { id: true, price: true, title: true },
        });

        const totalPrice = products.reduce((sum, p) => sum + p.price, 0);
        const discountedPrice = Math.round(totalPrice * (1 - template.discount / 100));
        const savings = totalPrice - discountedPrice;

        res.json({ totalPrice, discountedPrice, savings, discountPercent: template.discount });
    } catch (error) {
        console.error('Calculate bundle price error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/bundle-templates — create template (admin)
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { name, description, image, discount, slots } = req.body;

        if (!name) return res.status(400).json({ error: 'Name is required' });

        const template = await prisma.bundleTemplate.create({
            data: {
                name,
                description: description || null,
                image: image || null,
                discount: parseFloat(discount) || 10,
                slots: {
                    create: (slots || []).map((slot, idx) => ({
                        label: slot.label,
                        category: slot.category,
                        minQty: parseInt(slot.minQty) || 1,
                        maxQty: parseInt(slot.maxQty) || 1,
                        required: slot.required !== false,
                        position: idx,
                    })),
                },
            },
            include: templateInclude,
        });

        cache.delByPrefix('bundleTemplates:');
        logAudit({
            userId: req.user.id, action: 'CREATE', entity: 'BundleTemplate', entityId: template.id,
            details: { after: { name: template.name, discount: template.discount } },
            req,
        });

        res.status(201).json(template);
    } catch (error) {
        console.error('Create bundle template error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/bundle-templates/:id — update template (admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        const { name, description, image, discount, isActive, slots } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (image !== undefined) updateData.image = image;
        if (discount !== undefined) updateData.discount = parseFloat(discount);
        if (isActive !== undefined) updateData.isActive = isActive;

        await prisma.$transaction(async (tx) => {
            await tx.bundleTemplate.update({
                where: { id: templateId },
                data: updateData,
            });

            if (Array.isArray(slots)) {
                await tx.bundleTemplateSlot.deleteMany({ where: { templateId } });
                await tx.bundleTemplateSlot.createMany({
                    data: slots.map((slot, idx) => ({
                        templateId,
                        label: slot.label,
                        category: slot.category,
                        minQty: parseInt(slot.minQty) || 1,
                        maxQty: parseInt(slot.maxQty) || 1,
                        required: slot.required !== false,
                        position: idx,
                    })),
                });
            }
        });

        const updated = await prisma.bundleTemplate.findUnique({
            where: { id: templateId },
            include: templateInclude,
        });

        cache.delByPrefix('bundleTemplates:');
        logAudit({
            userId: req.user.id, action: 'UPDATE', entity: 'BundleTemplate', entityId: templateId,
            details: { changedFields: Object.keys(updateData) },
            req,
        });

        res.json(updated);
    } catch (error) {
        console.error('Update bundle template error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/bundle-templates/:id — soft delete (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        await prisma.bundleTemplate.update({
            where: { id: templateId },
            data: { isActive: false },
        });

        cache.delByPrefix('bundleTemplates:');
        logAudit({
            userId: req.user.id, action: 'DELETE', entity: 'BundleTemplate', entityId: templateId,
            details: { meta: 'Soft-deleted (isActive → false)' },
            req,
        });

        res.json({ message: 'Bundle template deleted' });
    } catch (error) {
        console.error('Delete bundle template error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
