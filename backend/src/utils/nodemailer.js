import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export async function sendVerificationEmail(email, verificationToken) {
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('\n[LOCAL DEV MOCK: Verification Email]');
        console.log(`To: ${email}`);
        console.log(`Link: ${verificationLink}`);
        console.log('----------------------------------------\n');
        return true;
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email - TechNova',
        html: `
            <div style="font-family: Arial, sans-serif; max-w-lg mx-auto p-6 bg-gray-50 border border-gray-100 rounded-lg">
                <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
                <p style="color: #555; line-height: 1.6;">Hello,</p>
                <p style="color: #555; line-height: 1.6;">Thank you for registering. Please click the button below to verify your email address:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
                </div>
                <p style="color: #555; line-height: 1.6;">Or copy and paste this link into your browser:</p>
                <p style="background: #eee; padding: 10px; border-radius: 4px; word-break: break-all;"><a href="${verificationLink}" style="color: #4F46E5;">${verificationLink}</a></p>
                <p style="color: #888; font-size: 12px; margin-top: 30px;">If you did not create an account, no further action is required.</p>
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

export { transporter };
