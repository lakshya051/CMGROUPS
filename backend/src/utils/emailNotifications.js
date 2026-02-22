const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // App password, not regular password
    }
});

async function sendOrderConfirmationEmail(email, orderId, total) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('\n[LOCAL DEV MOCK: Order Confirmation Email]');
        console.log(`To: ${email}`);
        console.log(`Subject: Order Confirmed - TechNova #${orderId}`);
        console.log(`Total: Rs.${total}`);
        console.log('----------------------------------------\n');
        return true; // Pretend it sent
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Order Confirmed - TechNova #${orderId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-w-lg mx-auto p-6 bg-gray-50 border border-gray-100 rounded-lg">
                <h2 style="color: #333; margin-bottom: 20px;">Order Confirmation</h2>
                <p style="color: #555; line-height: 1.6;">Hello,</p>
                <p style="color: #555; line-height: 1.6;">Thank you for shopping with TechNova!</p>
                <p style="color: #555; line-height: 1.6;">Your order <strong>#${orderId}</strong> for <strong>Rs.${total}</strong> has been confirmed.</p>
                <div style="background-color: #E0E7FF; color: #3730A3; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    We are currently processing your order and will notify you once it's shipped or ready for pickup.
                </div>
                <p style="color: #555; line-height: 1.6;">You can view your order details in your dashboard.</p>
                <p style="color: #888; font-size: 12px; margin-top: 30px;">This is an automated message, please do not reply to this email.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        return false;
    }
}

async function sendServiceBookingEmail(email, bookingId, otp) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('\n[LOCAL DEV MOCK: Service Booking Email]');
        console.log(`To: ${email}`);
        console.log(`Subject: Service Booking Confirmed - TechNova #${bookingId}`);
        console.log(`OTP: ${otp}`);
        console.log('----------------------------------------\n');
        return true; // Pretend it sent
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Service Booking Confirmed - TechNova #${bookingId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-w-lg mx-auto p-6 bg-gray-50 border border-gray-100 rounded-lg">
                <h2 style="color: #333; margin-bottom: 20px;">Service Booking Confirmation</h2>
                <p style="color: #555; line-height: 1.6;">Hello,</p>
                <p style="color: #555; line-height: 1.6;">Your service booking <strong>#${bookingId}</strong> has been confirmed.</p>
                <div style="background-color: #FEF3C7; color: #92400E; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 18px; text-align: center;">
                    Your Pickup OTP is: <strong>${otp}</strong>
                </div>
                <p style="color: #555; line-height: 1.6;">Please keep this OTP ready and show it to our technician when they arrive for pickup.</p>
                <p style="color: #555; line-height: 1.6;">You can view the progress of your service booking in your dashboard.</p>
                <p style="color: #888; font-size: 12px; margin-top: 30px;">This is an automated message, please do not reply to this email.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        return false;
    }
}

module.exports = {
    transporter,
    sendVerificationEmail: require('./nodemailer').sendVerificationEmail,
    sendOrderConfirmationEmail,
    sendServiceBookingEmail
};
