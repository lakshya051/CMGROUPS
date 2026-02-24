const dotenv = require('dotenv');

dotenv.config();

if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Cannot start server.');
}

const app = require('./app');
require('./cron/referrals'); // Start daily referral cron job

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
