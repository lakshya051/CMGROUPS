import express from 'express';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { escapeHtml } from '../utils/escapeHtml.js';
import { createAdminNotification } from '../utils/notifications.js';

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many messages. Please try again later.' },
});

const router = express.Router();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

router.post('/', contactLimiter, async (req, res) => {
    try {
        const { name, email, phone, department, subject, message } = req.body;

        if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
            return res.status(400).json({ error: 'Name, email, subject, and message are required' });
        }

        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Contact form: SMTP not configured, email not sent');
            return res.status(503).json({ error: 'Email service unavailable' });
        } else if (adminEmail) {
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: adminEmail,
                replyTo: email,
                subject: `[${department || 'General'}] Contact Form: ${subject}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <h2 style="color: #111827; margin-bottom: 4px;">New Contact Form Submission</h2>
                        <p style="color: #6b7280; font-size: 13px; margin-top: 0;">Department: ${escapeHtml(department || 'General')}</p>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280; width: 30%;">Name</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;">${escapeHtml(name)}</td></tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">Email</td><td style="padding: 10px 8px; color: #111827;"><a href="mailto:${escapeHtml(email)}" style="color: #4F46E5;">${escapeHtml(email)}</a></td></tr>
                            ${phone ? `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">Phone</td><td style="padding: 10px 8px; color: #111827;">${escapeHtml(phone)}</td></tr>` : ''}
                            <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 8px; color: #6b7280;">Subject</td><td style="padding: 10px 8px; font-weight: bold; color: #111827;">${escapeHtml(subject)}</td></tr>
                            <tr><td style="padding: 10px 8px; color: #6b7280; vertical-align: top;">Message</td><td style="padding: 10px 8px; color: #111827; white-space: pre-wrap;">${escapeHtml(message)}</td></tr>
                        </table>
                    </div>
                `,
            }).catch(err => console.error('Contact form email failed:', err));
        }

        createAdminNotification({
            title: `New Contact: ${department || 'General'}`,
            message: `${name} — ${subject}`,
            type: 'admin',
            link: '/admin',
        }).catch(() => {});

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }
});

export default router;
