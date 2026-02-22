const prisma = require('./src/lib/prisma');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('🌱 Seeding database...');

    // 1. Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@technova.com' },
        update: {},
        create: {
            name: 'Admin',
            email: 'admin@technova.com',
            password: adminPassword,
            role: 'admin'
        }
    });
    console.log('✅ Admin user created:', admin.email);

    // 2. Create Test Customer
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customer = await prisma.user.upsert({
        where: { email: 'customer@test.com' },
        update: {},
        create: {
            name: 'Test Customer',
            email: 'customer@test.com',
            password: customerPassword,
            role: 'customer'
        }
    });
    console.log('✅ Customer user created:', customer.email);

    // 3. Seed Products (matching frontend mockProducts)
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
            rating: 4.9,
            numReviews: 128
        },
        {
            title: 'Ryzen 9 7950X Processor',
            price: 54999,
            stock: 12,
            category: 'CPU',
            brand: 'AMD',
            image: 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?q=80&w=500&auto=format&fit=crop',
            description: '16-core, 32-thread desktop processor for extreme multitasking.',
            specs: { cores: '16C/32T', clock: '5.7 GHz', tdp: '170W' },
            rating: 4.8,
            numReviews: 95
        },
        {
            title: 'Samsung 990 PRO 2TB SSD',
            price: 14999,
            stock: 30,
            category: 'Storage',
            brand: 'Samsung',
            image: 'https://images.unsplash.com/photo-1597872258083-ef52741e4694?q=80&w=500&auto=format&fit=crop',
            description: 'PCIe 4.0 NVMe M.2 SSD with blazing read/write speeds.',
            specs: { read: '7450 MB/s', write: '6900 MB/s', interface: 'NVMe' },
            rating: 4.7,
            numReviews: 210
        },
        {
            title: 'Corsair Vengeance 32GB DDR5',
            price: 9999,
            stock: 25,
            category: 'RAM',
            brand: 'Corsair',
            image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?q=80&w=500&auto=format&fit=crop',
            description: 'High-performance DDR5 memory with Intel XMP 3.0 support.',
            specs: { speed: '6000 MHz', type: 'DDR5', kit: '2x16GB' },
            rating: 4.6,
            numReviews: 78
        },
        {
            title: 'ASUS ROG Strix B650E-F Motherboard',
            price: 24999,
            stock: 10,
            category: 'Motherboard',
            brand: 'ASUS',
            image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=500&auto=format&fit=crop',
            description: 'AM5 motherboard with PCIe 5.0, DDR5, and WiFi 6E.',
            specs: { socket: 'AM5', chipset: 'B650E', wifi: 'WiFi 6E' },
            rating: 4.5,
            numReviews: 45
        },
        {
            title: 'NZXT Kraken X73 AIO',
            price: 17999,
            stock: 15,
            category: 'Cooling',
            brand: 'NZXT',
            image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=500&auto=format&fit=crop',
            description: '360mm AIO with infinity mirror LCD display.',
            specs: { radiator: '360mm', fans: '3x 120mm', noise: '21 dBA' },
            rating: 4.4,
            numReviews: 56
        }
    ];

    for (const product of products) {
        await prisma.product.upsert({
            where: { id: products.indexOf(product) + 1 },
            update: product,
            create: product
        });
    }
    console.log(`✅ ${products.length} products seeded`);

    // 4. Seed Coupons
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
    console.log('✅ Coupons seeded');

    console.log('\n🎉 Database seeding complete!');
    console.log('---');
    console.log('Admin Login:  admin@technova.com / admin123');
    console.log('Customer:     customer@test.com / customer123');
}

seed()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
