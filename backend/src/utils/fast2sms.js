const axios = require('axios');

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

/**
 * Send OTP via Fast2SMS
 * @param {string} phoneNumber - 10-digit phone number
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<boolean>} - Success status
 */
async function sendOTP(phoneNumber, otp) {
    try {
        // Remove any spaces, dashes, or country code
        const cleanPhone = phoneNumber.replace(/[\s\-+]|^91/g, '');
        
        if (cleanPhone.length !== 10) {
            throw new Error('Invalid phone number format. Must be 10 digits.');
        }

        const message = `Your TechNova verification code is ${otp}. Valid for 10 minutes. Do not share this code.`;
        
        const response = await axios.post(FAST2SMS_URL, {
            message,
            language: 'english',
            route: 'q',
            numbers: cleanPhone
        }, {
            headers: {
                'authorization': FAST2SMS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.return === true) {
            console.log(`✅ OTP sent to ${cleanPhone}: ${otp}`);
            return true;
        } else {
            console.error('❌ Fast2SMS error:', response.data);
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to send OTP:', error.message);
        // In development, log OTP to console even if SMS fails
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔑 [DEV MODE] OTP for ${phoneNumber}: ${otp}`);
        }
        return false;
    }
}

module.exports = { sendOTP };
