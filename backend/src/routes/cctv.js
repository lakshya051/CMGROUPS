import express from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma.js';
import { protect, adminOnly } from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import { escapeHtml } from '../utils/escapeHtml.js';
import { createAdminNotification } from '../utils/notifications.js';
import { logAudit } from '../utils/auditLog.js';

const enquiryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many enquiry submissions. Please try again later.' }
});

const router = express.Router();
const cctvEnquiryDelegate = prisma.cCTVEnquiry ?? prisma.CCTVEnquiry ?? prisma.cctvEnquiry;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// PUBLIC — POST /api/cctv/enquiry
router.post('/enquiry', enquiryLimiter, async (req, res) => {
    try {
        if (!cctvEnquiryDelegate) {
            throw new Error('CCTVEnquiry Prisma delegate is not available. Restart the backend after regenerating Prisma client.');
        }

        const { name, phone, city, propertyType, camerasNeeded, message } = req.body;

        const missing = [];
        if (!name?.trim()) missing.push('Full Name');
        if (!phone?.trim()) missing.push('Phone Number');
        if (!city?.trim()) missing.push('City / Area');
        if (!propertyType?.trim()) missing.push('Property Type');
        if (!camerasNeeded?.trim()) missing.push('Cameras Needed');

        if (missing.length > 0) {
            return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
        }

        if (message && typeof message === 'string' && message.length > 1000) {
            return res.status(400).json({ error: 'Message must be 1000 characters or fewer' });
        }

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ error: 'Phone number must be a valid 10-digit Indian mobile number' });
        }

        const enquiry = await cctvEnquiryDelegate.create({
            data: {
                name: name.trim(),
                phone: cleanPhone,
                city: city.trim(),
                propertyType: propertyType.trim(),
                camerasNeeded: camerasNeeded.trim(),
                message: message?.trim() || null
            }
        });

        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        if (adminEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: adminEmail,
                subject: `New CCTV Enquiry - ${name} - ${propertyType}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <h2 style="color: #111827; margin-bottom: 4px;">New CCTV Security Enquiry</h2>
                        <p style="color: #6b7280; font-size: 13px; margin-top: 0;">Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280; width: 40%;">Name</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;">${escapeHtml(name)}</td></tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">Phone</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;"><a href="tel:+91${cleanPhone}" style="color: #4F46E5;">+91 ${cleanPhone}</a></td></tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">City / Area</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;">${escapeHtml(city)}</td></tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">Property Type</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;">${escapeHtml(propertyType)}</td></tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">Cameras Needed</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;">${escapeHtml(camerasNeeded)}</td></tr>
                            <tr><td style="padding: 10px 8px; color: #6b7280; vertical-align: top;">Message</td><td style="padding: 10px 8px; color: #111827;">${message ? escapeHtml(message) : '<em style="color:#9ca3af">No message provided</em>'}</td></tr>
                        </table>
                        <div style="margin-top: 24px; text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/cctv-enquiries" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View in Admin Panel</a>
                        </div>
                    </div>
                `
            }).catch(err => console.error('CCTV enquiry admin email failed (non-blocking):', err));
        } else {
            console.log('\n[CCTV ENQUIRY — EMAIL MOCK]');
            console.log(`Name: ${name} | Phone: ${cleanPhone} | City: ${city} | Property: ${propertyType} | Cameras: ${camerasNeeded}`);
            console.log('---\n');
        }

        createAdminNotification({
            title: 'New CCTV Enquiry',
            message: `${name} — ${propertyType}, ${camerasNeeded} cameras`,
            type: 'admin',
            link: '/admin/cctv-enquiries',
        }).catch(() => {});

        res.status(201).json({ success: true, message: 'Enquiry submitted successfully', id: enquiry.id });
    } catch (error) {
        console.error('CCTV enquiry submit error:', error);
        res.status(500).json({ error: 'Failed to submit enquiry. Please try again or contact us directly on WhatsApp.' });
    }
});

// ADMIN — GET /api/cctv/admin/enquiries
router.get('/admin/enquiries', protect, adminOnly, async (req, res) => {
    try {
        if (!cctvEnquiryDelegate) {
            throw new Error('CCTVEnquiry Prisma delegate is not available. Restart the backend after regenerating Prisma client.');
        }

        const { status } = req.query;
        const where = status ? { status } : {};

        const [enquiries, total] = await Promise.all([
            cctvEnquiryDelegate.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            }),
            cctvEnquiryDelegate.count({ where })
        ]);

        res.json({ success: true, enquiries, total });
    } catch (error) {
        console.error('Get CCTV enquiries error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ADMIN — PATCH /api/cctv/admin/enquiries/:id
router.patch('/admin/enquiries/:id', protect, adminOnly, async (req, res) => {
    try {
        if (!cctvEnquiryDelegate) {
            throw new Error('CCTVEnquiry Prisma delegate is not available. Restart the backend after regenerating Prisma client.');
        }

        const { status, adminNotes, sellerName } = req.body;
        const validStatuses = ['new', 'contacted', 'converted'];

        if (status !== undefined && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be: new, contacted, or converted' });
        }

        if (status === undefined && adminNotes === undefined && sellerName === undefined) {
            return res.status(400).json({ error: 'Nothing to update' });
        }

        const enqId = parseInt(req.params.id, 10);
        const enquiry = await cctvEnquiryDelegate.update({
            where: { id: enqId },
            data: {
                ...(status !== undefined ? { status } : {}),
                ...(adminNotes !== undefined ? { adminNotes: adminNotes?.trim() || null } : {}),
                ...(sellerName !== undefined ? { sellerName: sellerName?.trim() || null } : {})
            }
        });

        logAudit({
            userId: req.user.id, action: 'UPDATE', entity: 'CCTVEnquiry', entityId: enqId,
            details: { after: { status, adminNotes, sellerName } },
            req,
        });

        res.json({ success: true, enquiry });
    } catch (error) {
        console.error('Update CCTV enquiry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
