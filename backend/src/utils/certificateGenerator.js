import PDFDocument from 'pdfkit';

export function generateCertificate(enrollment, res) {
    const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 50
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${enrollment.courseId}-${enrollment.userId}.pdf"`);

    doc.pipe(res);

    const width = doc.page.width;
    const height = doc.page.height;

    doc
        .lineWidth(10)
        .strokeColor('#1F2937')
        .rect(30, 30, width - 60, height - 60)
        .stroke();

    doc
        .lineWidth(2)
        .strokeColor('#F5A623')
        .rect(38, 38, width - 76, height - 76)
        .stroke();

    doc
        .fillColor('#1F2937')
        .fontSize(40)
        .font('Helvetica-Bold')
        .text('TechNova Institute', 0, 120, { align: 'center' });

    doc
        .fillColor('#6B7280')
        .fontSize(16)
        .font('Helvetica')
        .text('Certificate of Completion', 0, 175, { align: 'center', characterSpacing: 5 });

    doc
        .moveTo(width / 2 - 150, 210)
        .lineTo(width / 2 + 150, 210)
        .strokeColor('#E5E7EB')
        .lineWidth(1)
        .stroke();

    doc
        .fillColor('#374151')
        .fontSize(14)
        .text('This is to certify that', 0, 260, { align: 'center' });

    doc
        .fillColor('#F5A623')
        .fontSize(36)
        .font('Times-BoldItalic')
        .text(enrollment.user.name, 0, 300, { align: 'center' });

    doc
        .fillColor('#374151')
        .fontSize(14)
        .font('Helvetica')
        .text('has successfully completed the offline training course', 0, 360, { align: 'center' });

    doc
        .fillColor('#1F2937')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(`"${enrollment.course.title}"`, 0, 400, { align: 'center' });

    doc
        .fillColor('#6B7280')
        .fontSize(12)
        .font('Helvetica')
        .text(`Instructor: ${enrollment.course.instructor}`, 120, 480)
        .text(`Date of Issue: ${new Date().toLocaleDateString()}`, width - 260, 480, { align: 'right' });

    doc
        .moveTo(120, 470)
        .lineTo(260, 470)
        .strokeColor('#1F2937')
        .lineWidth(1)
        .stroke();

    doc
        .moveTo(width - 260, 470)
        .lineTo(width - 120, 470)
        .strokeColor('#1F2937')
        .lineWidth(1)
        .stroke();

    doc
        .fontSize(10)
        .text('Authorized Signature', 120, 500)
        .text('Date', width - 260, 500, { width: 140, align: 'right' });

    doc
        .circle(width / 2, 480, 40)
        .lineWidth(2)
        .strokeColor('#F5A623')
        .stroke()
        .fillColor('#F5A623')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('CERTIFIED', width / 2 - 25, 470, { width: 50, align: 'center' })
        .text('TRAINING', width / 2 - 25, 480, { width: 50, align: 'center' });

    doc.end();
}
