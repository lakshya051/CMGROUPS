import prisma from './src/lib/prisma.js';

async function seed() {
    console.log('Seeding database...');

    const admin = await prisma.user.upsert({
        where: { email: 'admin@technova.com' },
        update: {},
        create: {
            name: 'Admin',
            email: 'admin@technova.com',
            role: 'admin'
        }
    });
    console.log('Admin user created:', admin.email);

    const customer = await prisma.user.upsert({
        where: { email: 'customer@test.com' },
        update: {},
        create: {
            name: 'Test Customer',
            email: 'customer@test.com',
            role: 'customer'
        }
    });
    console.log('Customer user created:', customer.email);

    const products = [
        {
            title: 'RTX 4090 Gaming GPU',
            price: 159999,
            stock: 5,
            category: 'GPU',
            brand: 'NVIDIA',
            image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=500&auto=format&fit=crop',
            description: 'The ultimate GPU for 4K gaming and content creation. DLSS 3.0 and ray tracing.',
            specs: { memory: '24GB GDDR6X', clock: '2520 MHz', tdp: '450W' },
        },
    ];

    for (const product of products) {
        await prisma.product.upsert({
            where: { id: products.indexOf(product) + 1 },
            update: product,
            create: product
        });
    }
    console.log(`${products.length} products seeded`);

    const coupons = [
        { code: 'TECHNOVA10', discountType: 'percent', value: 10, active: true },
        { code: 'SAVE500', discountType: 'fixed', value: 500, active: true }
    ];

    for (const coupon of coupons) {
        await prisma.coupon.upsert({
            where: { code: coupon.code },
            update: coupon,
            create: coupon
        });
    }
    console.log('Coupons seeded');

    console.log('\nDatabase seeding complete!');
    console.log('Admin Login:  admin@technova.com (use Clerk sign-in)');
}

seed()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
