import express from 'express';
import { Webhook } from 'svix';
import prisma from '../lib/prisma.js';

const router = express.Router();

router.post('/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    let event;

    try {
        event = wh.verify(req.body, {
            'svix-id':        req.headers['svix-id'],
            'svix-timestamp': req.headers['svix-timestamp'],
            'svix-signature': req.headers['svix-signature'],
        });
    } catch {
        return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { type, data } = event;

    if (type === 'user.created') {
        const email = data.email_addresses.find(e => e.id === data.primary_email_address_id)?.email_address;
        const existing = await prisma.user.findUnique({ where: { clerkId: data.id } });
        if (!existing) {
            await prisma.user.create({
                data: {
                    clerkId: data.id,
                    email,
                    name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || null,
                    role: 'customer',
                }
            });
        }
    }

    if (type === 'user.updated') {
        const email = data.email_addresses.find(e => e.id === data.primary_email_address_id)?.email_address;
        const existing = await prisma.user.findUnique({ where: { clerkId: data.id } });
        if (existing) {
            await prisma.user.update({ where: { clerkId: data.id }, data: { email } });
        }
    }

    if (type === 'user.deleted') {
        const existing = await prisma.user.findUnique({ where: { clerkId: data.id } });
        if (existing) {
            await prisma.user.update({ where: { clerkId: data.id }, data: { email: `deleted_${data.id}@clerk.dev` } });
        }
    }

    return res.status(200).json({ received: true });
});

export default router;
