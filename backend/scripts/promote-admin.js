/**
 * One-time: set role=admin for a user by email.
 * Usage: node --env-file=.env scripts/promote-admin.js [email]
 * Default email matches ADMIN_EMAILS default in auth.js.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email = (process.argv[2] || process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || 'lakshyavarshney2003@gmail.com').trim();

async function main() {
    const r = await prisma.user.updateMany({ where: { email }, data: { role: 'admin' } });
    if (r.count === 0) {
        console.error(`No user with email: ${email}`);
        console.error('Sign in once with Firebase so /api/auth/register creates the row, then run this again.');
        process.exit(1);
    }
    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, role: true, firebaseUid: true },
    });
    console.log('Updated to admin:', user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
