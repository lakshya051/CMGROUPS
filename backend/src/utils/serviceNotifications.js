import { transporter } from './emailNotifications.js';
import { escapeHtml } from './escapeHtml.js';

/**
 * Sends a status-aware notification email for a service booking.
 * Fails gracefully — wrapped in try/catch so it never crashes the API.
 *
 * @param {object} booking  - The full ServiceBooking object (with user relation included).
 * @param {string} newStatus - The new status being applied.
 */
export async function sendServiceNotification(booking, newStatus) {
    try {
        const user = booking.user;
        const email = user?.email;
        if (!email) return;

        const bookingRef = `SRV-${booking.id}`;
        let subject = `Shoptify Service Update — ${bookingRef}`;
        let bodyMessage = '';
        let showOtp = false;
        let showDeliveryOtp = false;

        switch (newStatus) {
            case 'Confirmed': {
                const techName = booking.technician?.name || booking.assignedTo || 'Our technician';
                const arrivalDate = booking.date
                    ? new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'your scheduled date';
                subject = `Service Confirmed — ${bookingRef}`;
                bodyMessage = `
                    <p>Great news! Your service request <strong>${bookingRef}</strong> has been <strong>confirmed</strong>.</p>
                    <p><strong>Estimated Cost:</strong> ₹${booking.estimatedPrice ?? 'TBD'}</p>
                    <p><strong>Technician:</strong> ${techName}</p>
                    <p><strong>Expected Arrival:</strong> ${arrivalDate}</p>
                `;
                showOtp = Boolean(booking.pickupOtp);
                break;
            }

            case 'In Progress':
                subject = `Device Picked Up — ${bookingRef}`;
                bodyMessage = `
                    <p>Your device has been picked up for service request <strong>${bookingRef}</strong>.</p>
                    <p>Our team has started working on your device. We'll notify you once it's ready.</p>
                `;
                break;

            case 'Completed': {
                const safeInvoiceUrl = booking.invoiceUrl && /^https?:\/\//i.test(booking.invoiceUrl)
                    ? escapeHtml(booking.invoiceUrl)
                    : null;
                const invoiceLink = safeInvoiceUrl ? `<br/><a href="${safeInvoiceUrl}">Download Invoice</a>` : '';
                subject = `Service Completed — ${bookingRef}`;
                bodyMessage = `
                    <p>Your device has been repaired and is ready for delivery!</p>
                    <p><strong>Final Amount:</strong> ₹${escapeHtml(String(booking.finalPrice ?? 'N/A'))}</p>
                    ${safeInvoiceUrl ? `<p><strong>Invoice:</strong> ${invoiceLink}</p>` : ''}
                    <p>When the technician delivers your device, share the Delivery OTP below to confirm receipt.</p>
                `;
                showDeliveryOtp = Boolean(booking.deliveryOtp);
                break;
            }

            case 'Cancelled':
                subject = `Service Booking Cancelled — ${bookingRef}`;
                bodyMessage = `
                    <p>Your service request <strong>${bookingRef}</strong> has been <strong>cancelled</strong>.</p>
                    ${booking.cancellationReason ? `<p><strong>Reason:</strong> ${escapeHtml(booking.cancellationReason)}</p>` : ''}
                    <p>If you believe this is an error, please contact our support team.</p>
                `;
                break;

            default:
                // For other status transitions, send a generic update
                bodyMessage = `<p>Your service request <strong>${bookingRef}</strong> status has been updated to <strong>${newStatus}</strong>.</p>`;
        }

        const otpBlock = showOtp
            ? `
            <div style="background-color:#FEF3C7;color:#92400E;padding:15px;border-radius:6px;margin:20px 0;">
                <p style="margin:0 0 8px 0;font-weight:700;">Pickup Verification OTP</p>
                <p style="margin:0 0 10px 0;">Share this OTP with our technician when they arrive to collect your device.</p>
                <div style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;margin:12px 0;">${escapeHtml(String(booking.pickupOtp))}</div>
                <p style="margin:0;font-size:12px;">Do not share this OTP with anyone else.</p>
            </div>`
            : '';

        const deliveryOtpBlock = showDeliveryOtp
            ? `
            <div style="background-color:#DBEAFE;color:#1E40AF;padding:15px;border-radius:6px;margin:20px 0;">
                <p style="margin:0 0 8px 0;font-weight:700;">Delivery Verification OTP</p>
                <p style="margin:0 0 10px 0;">Share this OTP with the technician when receiving your device to confirm delivery.</p>
                <div style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;margin:12px 0;">${escapeHtml(String(booking.deliveryOtp))}</div>
                <p style="margin:0;font-size:12px;">Do not share this OTP with anyone else.</p>
            </div>`
            : '';

        const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <h2 style="color:#1e3a5f;margin-bottom:16px;">Shoptify Service Hub</h2>
                ${bodyMessage}
                ${otpBlock}
                ${deliveryOtpBlock}
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
                <p style="color:#6b7280;font-size:12px;">This is an automated message from Shoptify. Please do not reply.</p>
            </div>
        `;

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            // Local dev mock — print to console
            console.log('\n[LOCAL DEV MOCK: Service Notification Email]');
            console.log(`To:      ${email}`);
            console.log(`Subject: ${subject}`);
            console.log(`Status:  ${newStatus}`);
            if (showOtp) console.log(`Pickup OTP:   ${booking.pickupOtp}`);
            if (showDeliveryOtp) console.log(`Delivery OTP: ${booking.deliveryOtp}`);
            console.log('----------------------------------------\n');
            return;
        }

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject,
            html
        });
    } catch (err) {
        // Never let a notification failure crash the API
        console.error('[sendServiceNotification] Failed to send notification:', err.message);
    }
}
