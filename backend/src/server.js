import dotenv from 'dotenv';

dotenv.config();

if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_SECRET_KEY.trim()) {
    throw new Error('FATAL: CLERK_SECRET_KEY environment variable is not set. Cannot start server.');
}

import app from './app.js';
import './cron/referrals.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
