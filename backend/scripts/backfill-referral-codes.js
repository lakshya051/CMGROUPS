// Migration script: backfill referral codes for existing users
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function generateReferralCode() {
    return 'TN' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function main() {
    // Find all users without a referral code
    const users = await prisma.user.findMany({
        where: { referralCode: null },
        select: { id: true }
    });

    console.log(`Found ${users.length} users without referral codes`);

    for (const user of users) {
        let code;
        let unique = false;
        while (!unique) {
            code = generateReferralCode();
            const existing = await prisma.user.findFirst({ where: { referralCode: code } });
            if (!existing) unique = true;
        }
        await prisma.user.update({
            where: { id: user.id },
            data: { referralCode: code }
        });
        console.log(`  User ${user.id} → ${code}`);
    }

    console.log('Done! All users now have referral codes.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
