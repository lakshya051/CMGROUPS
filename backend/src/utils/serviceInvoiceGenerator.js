import PDFDocument from 'pdfkit';

/**
 * Generates a PDF invoice for a completed service booking.
 * Returns a Promise<Buffer> that resolves with the PDF binary.
 *
 * @param {object} booking       - ServiceBooking record (with user included)
 * @param {object} invoiceData   - ServiceInvoice record
 * @returns {Promise<Buffer>}
 */
export function generateServiceInvoicePdf(booking, invoiceData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // ── Header ──────────────────────────────────────────────────────
            doc
                .fillColor('#1e3a5f')
                .fontSize(22)
                .font('Helvetica-Bold')
                .text('TechNova', 50, 50)
                .fontSize(10)
                .font('Helvetica')
                .fillColor('#444444')
                .text('Service Hub — Tax Invoice', 50, 78)
                .text('123 Tech Park, New Delhi, India 110001', 200, 50, { align: 'right' })
                .text('support@technova.in', 200, 65, { align: 'right' })
                .text('GSTIN: 07AABCU9603R1ZX', 200, 80, { align: 'right' });

            doc
                .strokeColor('#1e3a5f')
                .lineWidth(2)
                .moveTo(50, 100)
                .lineTo(550, 100)
                .stroke();

            // ── Invoice Meta ─────────────────────────────────────────────────
            doc
                .fillColor('#000000')
                .fontSize(11)
                .font('Helvetica-Bold')
                .text('Invoice Details', 50, 120)
                .font('Helvetica')
                .fontSize(10)
                .text(`Invoice Number: ${invoiceData.invoiceNumber}`, 50, 136)
                .text(`Invoice Date:   ${new Date(invoiceData.createdAt).toLocaleDateString('en-IN')}`, 50, 151)
                .text(`Booking Ref:    SRV-${booking.id}`, 50, 166);

            // ── Billed To ────────────────────────────────────────────────────
            const user = booking.user || {};
            doc
                .font('Helvetica-Bold')
                .text('Billed To', 320, 120)
                .font('Helvetica')
                .text(booking.customerName || user.name || 'Customer', 320, 136)
                .text(`Phone: ${booking.customerPhone || user.phone || 'N/A'}`, 320, 151)
                .text(`${booking.address || ''}, ${booking.city || ''} – ${booking.pincode || ''}`, 320, 166);

            // ── Service Details Table ────────────────────────────────────────
            let y = 210;
            doc
                .strokeColor('#cccccc')
                .lineWidth(1)
                .moveTo(50, y - 5)
                .lineTo(550, y - 5)
                .stroke();

            doc
                .fillColor('#1e3a5f')
                .fontSize(10)
                .font('Helvetica-Bold')
                .text('Description', 50, y)
                .text('Amount', 450, y, { width: 100, align: 'right' });

            y += 18;
            doc
                .strokeColor('#cccccc')
                .moveTo(50, y - 3)
                .lineTo(550, y - 3)
                .stroke();

            doc.fillColor('#000000').font('Helvetica');

            // Labor
            doc
                .text(`${invoiceData.serviceType} — Labour Charges`, 50, y)
                .text(`₹${invoiceData.laborCost.toFixed(2)}`, 450, y, { width: 100, align: 'right' });
            y += 20;

            // Parts (if any)
            if (invoiceData.partsCost > 0) {
                doc
                    .text('Spare Parts / Materials', 50, y)
                    .text(`₹${invoiceData.partsCost.toFixed(2)}`, 450, y, { width: 100, align: 'right' });
                y += 20;
            }

            // Technician
            doc
                .fillColor('#555555')
                .text(`Technician: ${invoiceData.technicianName}`, 50, y);
            y += 20;

            doc
                .strokeColor('#cccccc')
                .moveTo(50, y)
                .lineTo(550, y)
                .stroke();
            y += 12;

            // ── Totals ───────────────────────────────────────────────────────
            const subtotal = invoiceData.laborCost + invoiceData.partsCost;
            const gstAmount = invoiceData.gst;
            const total = invoiceData.totalAmount;

            doc
                .fillColor('#000000')
                .font('Helvetica')
                .text('Taxable Amount:', 350, y, { width: 100, align: 'right' })
                .text(`₹${subtotal.toFixed(2)}`, 450, y, { width: 100, align: 'right' });
            y += 16;

            doc
                .text('GST (18%):', 350, y, { width: 100, align: 'right' })
                .text(`₹${gstAmount.toFixed(2)}`, 450, y, { width: 100, align: 'right' });
            y += 20;

            doc
                .font('Helvetica-Bold')
                .fontSize(12)
                .fillColor('#1e3a5f')
                .text('Total Amount:', 350, y, { width: 100, align: 'right' })
                .text(`₹${total.toFixed(2)}`, 450, y, { width: 100, align: 'right' });

            // ── Footer ───────────────────────────────────────────────────────
            doc
                .fontSize(9)
                .font('Helvetica')
                .fillColor('#888888')
                .text('Thank you for choosing TechNova Service Hub!', 50, 700, { align: 'center', width: 500 })
                .text('This is a computer-generated invoice and does not require a signature.', 50, 715, { align: 'center', width: 500 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}
