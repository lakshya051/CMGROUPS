const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seedTestUsers() {
    try {
        const passwordHash = await bcrypt.hash('password123', 10);

        // 1. Admin
        const admin = await prisma.user.upsert({
            where: { email: 'admin@test.com' },
            update: { password: passwordHash, role: 'admin' },
            create: {
                name: 'Test Admin',
                email: 'admin@test.com',
                password: passwordHash,
                phone: '9999999991',
                role: 'admin',
                referralCode: 'ADMINREF',
                isVerified: true
            }
        });

        // 2. User 1 (The Referrer)
        const user1 = await prisma.user.upsert({
            where: { email: 'user1@test.com' },
            update: { password: passwordHash, walletBalance: 500 },
            create: {
                name: 'User One',
                email: 'user1@test.com',
                password: passwordHash,
                phone: '9999999992',
                role: 'customer',
                referralCode: 'USER1REF',
                walletBalance: 500,
                isVerified: true
            }
        });

        // 3. User 2 (The Referee / Buyer)
        const user2 = await prisma.user.upsert({
            where: { email: 'user2@test.com' },
            update: { password: passwordHash, walletBalance: 0 },
            create: {
                name: 'User Two',
                email: 'user2@test.com',
                password: passwordHash,
                phone: '9999999993',
                role: 'customer',
                referralCode: 'USER2REF',
                walletBalance: 0,
                isVerified: true
            }
        });

        console.log('Seeded successfully!');
        console.log('Admin:', admin.email);
        console.log('User 1 (Referrer):', user1.email, 'code:', user1.referralCode, 'wallet:', user1.walletBalance);
        console.log('User 2:', user2.email, 'wallet:', user2.walletBalance);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

seedTestUsers();
