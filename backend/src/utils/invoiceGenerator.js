import PDFDocument from 'pdfkit';

export function generateInvoice(order, user, res) {
    const doc = new PDFDocument({ margin: 50 });

    doc.on('error', (err) => {
        console.error('PDF generation error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Invoice generation failed' });
        }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.id}.pdf"`);

    doc.pipe(res);

    const grouped = {};

    (order.items || []).forEach(item => {
        const seller = item.product?.sellerName || 'Shoptify';
        if (!grouped[seller]) grouped[seller] = { standalone: [], bundles: {} };

        if (item.bundleInstanceId) {
            if (!grouped[seller].bundles[item.bundleInstanceId]) {
                grouped[seller].bundles[item.bundleInstanceId] = {
                    bundleId: item.bundleId,
                    templateId: item.bundleTemplateId,
                    bundle: item.bundle || null,
                    bundleTemplate: item.bundleTemplate || null,
                    items: [],
                };
            }
            grouped[seller].bundles[item.bundleInstanceId].items.push(item);
        } else {
            grouped[seller].standalone.push(item);
        }
    });
    const sellerNames = Object.keys(grouped);

    doc
        .fillColor('#444444')
        .fontSize(20)
        .text('Shoptify', 50, 57)
        .fontSize(10)
        .text('123 Tech Park', 200, 50, { align: 'right' })
        .text('New Delhi, India 110001', 200, 65, { align: 'right' })
        .text('GSTIN: 07AABCU9603R1ZX', 200, 80, { align: 'right' })
        .moveDown();

    const guestInfo = order.guestInfo || {};
    const billedName = user?.name || guestInfo.name || 'Guest';
    const billedEmail = user?.email || guestInfo.email || 'N/A';
    const billedPhone = user?.phone || guestInfo.phone || 'N/A';

    doc
        .fillColor('#000000')
        .text(`Invoice Number: INV-${order.id}`, 50, 150)
        .text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 165)
        .text(`Billed To: ${billedName}`, 50, 180)
        .text(`Email: ${billedEmail}`, 50, 195)
        .text(`Phone: ${billedPhone}`, 50, 210)
        .moveDown();

    let y = 250;
    let subtotal = 0;

    for (const sellerName of sellerNames) {
        doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .fillColor('#1e3a5f')
            .text(sellerName, 50, y);
        y += 18;

        doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#666666')
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

        y += 25;

        const sellerData = grouped[sellerName];
        const items = sellerData.standalone;
        let sectionSubtotal = 0;

        for (const [, bundleGroup] of Object.entries(sellerData.bundles)) {
            if (y > 680) { doc.addPage(); y = 50; }

            const bundleName = bundleGroup.bundle?.name
                || bundleGroup.bundleTemplate?.name
                || 'Custom Bundle';

            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a5f')
                .text(`Bundle: ${bundleName}`, 50, y);
            y += 14;

            let catalogTotal = 0;
            bundleGroup.items.forEach(item => {
                if (y > 700) { doc.addPage(); y = 50; }
                const lineTotal = item.quantity * item.price;
                catalogTotal += lineTotal;

                doc
                    .font('Helvetica').fontSize(9).fillColor('#555555')
                    .text('  ' + (item.product?.title || bundleGroup.bundle?.name || bundleGroup.bundleTemplate?.name || 'Item').substring(0, 33), 50, y)
                    .text(`Rs. ${item.price.toLocaleString()}`, 280, y, { width: 90, align: 'right' })
                    .text(item.quantity.toString(), 370, y, { width: 90, align: 'right' })
                    .text(`Rs. ${lineTotal.toLocaleString()}`, 400, y, { align: 'right' });
                y += 16;
            });

            let bundleActualPrice = catalogTotal;
            if (bundleGroup.bundle?.bundlePrice != null) {
                bundleActualPrice = bundleGroup.bundle.bundlePrice;
            } else if (bundleGroup.bundleTemplate?.discount) {
                bundleActualPrice = Math.round(catalogTotal * (1 - bundleGroup.bundleTemplate.discount / 100));
            }

            if (bundleActualPrice < catalogTotal) {
                const discount = catalogTotal - bundleActualPrice;
                if (y > 700) { doc.addPage(); y = 50; }
                doc
                    .font('Helvetica-Bold').fontSize(9).fillColor('#2e7d32')
                    .text('  Bundle Discount', 50, y)
                    .text(`- Rs. ${discount.toLocaleString()}`, 400, y, { align: 'right' });
                y += 16;
            }

            sectionSubtotal += bundleActualPrice;
            subtotal += bundleActualPrice;
            y += 4;
        }

        items.forEach(item => {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
            const lineTotal = item.quantity * item.price;
            sectionSubtotal += lineTotal;
            subtotal += lineTotal;

            doc
                .font('Helvetica').fontSize(10).fillColor('#000000')
                .text((item.product?.title || 'Unknown Product').substring(0, 35) + ((item.product?.title || '').length > 35 ? '...' : ''), 50, y)
                .text(`Rs. ${item.price.toLocaleString()}`, 280, y, { width: 90, align: 'right' })
                .text(item.quantity.toString(), 370, y, { width: 90, align: 'right' })
                .text(`Rs. ${lineTotal.toLocaleString()}`, 400, y, { align: 'right' });
            y += 20;
        });

        doc
            .strokeColor('#cccccc')
            .lineWidth(0.5)
            .moveTo(300, y)
            .lineTo(550, y)
            .stroke();
        y += 8;

        doc
            .fontSize(9)
            .fillColor('#444444')
            .text(`${sellerName} Subtotal:`, 350, y, { width: 100, align: 'right' })
            .text(`Rs. ${sectionSubtotal.toLocaleString()}`, 450, y, { align: 'right' });

        y += 25;
    }

    doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();

    y += 15;

    const discountAmount = order.discountAmount || 0;
    const walletUsed = order.walletUsed || 0;

    if (discountAmount > 0) {
        doc
            .fontSize(10)
            .fillColor('#2e7d32')
            .font('Helvetica')
            .text('Coupon Discount:', 350, y, { width: 100, align: 'right' })
            .text(`- Rs. ${discountAmount.toLocaleString()}`, 450, y, { align: 'right' });
        y += 15;
    }

    const afterDiscount = subtotal - discountAmount;
    const gstRate = 0.18;
    const taxableAmount = afterDiscount / (1 + gstRate);
    const gstAmount = afterDiscount - taxableAmount;

    doc
        .fontSize(10)
        .fillColor('#000000')
        .font('Helvetica')
        .text('Taxable Amount:', 350, y, { width: 100, align: 'right' })
        .text(`Rs. ${taxableAmount.toFixed(2)}`, 450, y, { align: 'right' });
    y += 15;
    doc
        .text('IGST (18%):', 350, y, { width: 100, align: 'right' })
        .text(`Rs. ${gstAmount.toFixed(2)}`, 450, y, { align: 'right' });
    y += 20;

    if (walletUsed > 0) {
        doc
            .fontSize(10)
            .fillColor('#1e3a5f')
            .font('Helvetica')
            .text('Wallet Used:', 350, y, { width: 100, align: 'right' })
            .text(`- Rs. ${walletUsed.toLocaleString()}`, 450, y, { align: 'right' });
        y += 20;
    }

    doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Total Amount:', 350, y, { width: 100, align: 'right' })
        .text(`Rs. ${order.total.toLocaleString()}`, 450, y, { align: 'right' });

    doc
        .fontSize(10)
        .font('Helvetica')
        .text('Thank you for your business!', 50, 700, { align: 'center', width: 500 });

    doc.end();
}
