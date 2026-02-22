const PDFDocument = require('pdfkit');

function generateInvoice(order, user, res) {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.id}.pdf"`);

    doc.pipe(res);

    // Header
    doc
        .fillColor('#444444')
        .fontSize(20)
        .text('TechNova Inc.', 50, 57)
        .fontSize(10)
        .text('123 Tech Park', 200, 50, { align: 'right' })
        .text('New Delhi, India 110001', 200, 65, { align: 'right' })
        .text('GSTIN: 07AABCU9603R1ZX', 200, 80, { align: 'right' })
        .moveDown();

    // Invoice Details
    doc
        .fillColor('#000000')
        .text(`Invoice Number: INV-${order.id}`, 50, 150)
        .text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 165)
        .text(`Billed To: ${user.name}`, 50, 180)
        .text(`Email: ${user.email}`, 50, 195)
        .text(`Phone: ${user.phone || 'N/A'}`, 50, 210)
        .moveDown();

    // Table Header
    let y = 250;
    doc
        .fontSize(12)
        .text('Item', 50, y)
        .text('Unit Price', 280, y, { width: 90, align: 'right' })
        .text('Qty', 370, y, { width: 90, align: 'right' })
        .text('Line Total', 400, y, { align: 'right' });

    doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, y + 15)
        .lineTo(550, y + 15)
        .stroke();

    // Table Body
    y += 30;
    let subtotal = 0;
    order.items.forEach(item => {
        const lineTotal = item.quantity * item.price;
        subtotal += lineTotal;

        doc
            .fontSize(10)
            .text(item.product.title.substring(0, 35) + (item.product.title.length > 35 ? '...' : ''), 50, y)
            .text(`Rs. ${item.price.toLocaleString()}`, 280, y, { width: 90, align: 'right' })
            .text(item.quantity.toString(), 370, y, { width: 90, align: 'right' })
            .text(`Rs. ${lineTotal.toLocaleString()}`, 400, y, { align: 'right' });
        y += 20;
    });

    // Totals
    doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();

    y += 15;
    const gstRate = 0.18; // 18% GST Example
    const taxableAmount = subtotal / (1 + gstRate);
    const gstAmount = subtotal - taxableAmount;

    doc
        .text('Taxable Amount:', 350, y, { width: 100, align: 'right' })
        .text(`Rs. ${taxableAmount.toFixed(2)}`, 450, y, { align: 'right' });
    y += 15;
    doc
        .text('IGST (18%):', 350, y, { width: 100, align: 'right' })
        .text(`Rs. ${gstAmount.toFixed(2)}`, 450, y, { align: 'right' });
    y += 20;
    doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Total Amount:', 350, y, { width: 100, align: 'right' })
        .text(`Rs. ${order.total.toLocaleString()}`, 450, y, { align: 'right' });

    // Footer
    doc
        .fontSize(10)
        .font('Helvetica')
        .text('Thank you for your business!', 50, 700, { align: 'center', width: 500 });

    doc.end();
}

module.exports = { generateInvoice };
