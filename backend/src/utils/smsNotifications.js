const axios = require('axios');

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

/**
 * Send Transactional SMS via Fast2SMS
 * @param {string} phoneNumber - 10-digit phone number
 * @param {string} message - The message to send
 * @returns {Promise<boolean>} - Success status
 */
async function sendSMS(phoneNumber, message) {
    if (!FAST2SMS_API_KEY) {
        console.warn('FAST2SMS_API_KEY not set. Skipping SMS.');
        return false;
    }

    try {
        // Remove any spaces, dashes, or country code
        const cleanPhone = phoneNumber.replace(/[\s\-+]|^91/g, '');

        if (cleanPhone.length !== 10) {
            throw new Error('Invalid phone number format');
        }

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
            console.log(`SMS sent to ${cleanPhone}: ${message}`);
            return true;
        } else {
            console.error('Fast2SMS error:', response.data);
            return false;
        }
    } catch (error) {
        console.error('Failed to send SMS:', error.message);
        return false;
    }
}

async function sendOrderConfirmationSMS(phone, orderId, total) {
    const message = `Your TechNova order #${orderId} for Rs.${total} is confirmed! Thank you for shopping with us.`;
    return await sendSMS(phone, message);
}

async function sendServiceBookingSMS(phone, bookingId, otp) {
    const message = `Your TechNova service #${bookingId} is confirmed. Pickup OTP: ${otp}. Please show this to our technician.`;
    return await sendSMS(phone, message);
}

module.exports = { sendOrderConfirmationSMS, sendServiceBookingSMS, sendSMS };
