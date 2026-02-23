const app = require('./app');
const dotenv = require('dotenv');
require('./cron/referrals'); // Start daily referral cron job

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
