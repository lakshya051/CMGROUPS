const express = require('express');
const prisma = require('../lib/prisma');
const { protect, adminOnly } = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = express.Router();

// Shared transporter (uses same env vars as rest of project)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ─────────────────────────────────────────────
// PUBLIC — POST /api/tally/enquiry
// ─────────────────────────────────────────────
router.post('/enquiry', async (req, res) => {
    try {
        const { name, businessName, phone, city, licenseType, message } = req.body;

        // Validate required fields
        const missing = [];
        if (!name?.trim()) missing.push('Full Name');
        if (!businessName?.trim()) missing.push('Business Name');
        if (!phone?.trim()) missing.push('Phone Number');
        if (!city?.trim()) missing.push('City');
        if (!licenseType?.trim()) missing.push('License Type');

        if (missing.length > 0) {
            return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
        }

        // Validate Indian mobile number (10 digits)
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ error: 'Phone number must be a valid 10-digit Indian mobile number' });
        }

        // Save to database
        const enquiry = await prisma.tallyEnquiry.create({
            data: {
                name: name.trim(),
                businessName: businessName.trim(),
                phone: cleanPhone,
                city: city.trim(),
                licenseType: licenseType.trim(),
                message: message?.trim() || null
            }
        });

        // Send admin email (non-blocking — failure does NOT fail the request)
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        if (adminEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: adminEmail,
                subject: `New Tally ERP Enquiry - ${name} - ${businessName}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <h2 style="color: #111827; margin-bottom: 4px;">New Tally ERP Enquiry</h2>
                        <p style="color: #6b7280; font-size: 13px; margin-top: 0;">Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280; width: 40%;">Name</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;">${name}</td></tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">Business</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;">${businessName}</td></tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">Phone</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;"><a href="tel:+91${cleanPhone}" style="color: #4F46E5;">+91 ${cleanPhone}</a></td></tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">City</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;">${city}</td></tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">License Type</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;">${licenseType}</td></tr>
                            <tr><td style="padding: 10px 8px; color: #6b7280; vertical-align: top;">Message</td><td style="padding: 10px 8px; color: #111827;">${message || '<em style="color:#9ca3af">No message provided</em>'}</td></tr>
                        </table>
                        <div style="margin-top: 24px; text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/tally-enquiries" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View in Admin Panel</a>
                        </div>
                    </div>
                `
            }).catch(err => console.error('Tally enquiry admin email failed (non-blocking):', err));
        } else {
            // Local dev mock
            console.log('\n[TALLY ENQUIRY — EMAIL MOCK]');
            console.log(`To: ${adminEmail}`);
            console.log(`Name: ${name} | Business: ${businessName} | Phone: ${cleanPhone} | City: ${city} | License: ${licenseType}`);
            console.log('---\n');
        }

        res.status(201).json({ success: true, message: 'Enquiry submitted successfully', id: enquiry.id });
    } catch (error) {
        console.error('Tally enquiry submit error:', error);
        res.status(500).json({ error: 'Failed to submit enquiry. Please try again or contact us directly on WhatsApp.' });
    }
});

// ─────────────────────────────────────────────
// ADMIN — GET /api/tally/admin/enquiries
// ─────────────────────────────────────────────
router.get('/admin/enquiries', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.query;
        const where = status ? { status } : {};

        const [enquiries, total] = await Promise.all([
            prisma.tallyEnquiry.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.tallyEnquiry.count({ where })
        ]);

        res.json({ success: true, enquiries, total });
    } catch (error) {
        console.error('Get tally enquiries error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// ADMIN — PUT /api/tally/admin/enquiries/:id
// ─────────────────────────────────────────────
router.put('/admin/enquiries/:id', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['new', 'contacted', 'converted'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be: new, contacted, or converted' });
        }

        const enquiry = await prisma.tallyEnquiry.update({
            where: { id: parseInt(req.params.id) },
            data: { status }
        });

        res.json({ success: true, enquiry });
    } catch (error) {
        console.error('Update tally enquiry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
