const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...\n');

    // ============ ADMIN USER ============
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cmgroups.in' },
        update: {},
        create: {
            email: 'admin@cmgroups.in',
            name: 'CM Admin',
            password: hashedPassword,
            role: 'admin',
            phone: '9876543210',
            isVerified: true,
            referralCode: 'CMADMIN'
        }
    });
    console.log('✅ Admin user ready');

    // ============ SAMPLE CUSTOMERS ============
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customers = [];
    const customerData = [
        { email: 'rahul@example.com', name: 'Rahul Sharma', phone: '9876500001', referralCode: 'RAHUL01' },
        { email: 'priya@example.com', name: 'Priya Patel', phone: '9876500002', referralCode: 'PRIYA02' },
        { email: 'amit@example.com', name: 'Amit Kumar', phone: '9876500003', referralCode: 'AMIT03' },
        { email: 'neha@example.com', name: 'Neha Singh', phone: '9876500004', referralCode: 'NEHA04' },
        { email: 'vikram@example.com', name: 'Vikram Reddy', phone: '9876500005', referralCode: 'VIKRAM05' },
    ];
    for (const c of customerData) {
        const user = await prisma.user.upsert({
            where: { email: c.email },
            update: {},
            create: { ...c, password: customerPassword, role: 'customer', isVerified: true }
        });
        customers.push(user);
    }
    console.log(`✅ ${customers.length} customers created`);

    // ============ CATEGORIES ============
    const categoryData = [
        { name: 'Graphics Cards', slug: 'graphics-cards', description: 'High-performance GPUs for gaming and workloads' },
        { name: 'Processors', slug: 'processors', description: 'Desktop and laptop CPUs' },
        { name: 'RAM', slug: 'ram', description: 'Desktop and laptop memory modules' },
        { name: 'Storage', slug: 'storage', description: 'SSDs, HDDs, and NVMe drives' },
        { name: 'Motherboards', slug: 'motherboards', description: 'Intel and AMD motherboards' },
        { name: 'Power Supplies', slug: 'power-supplies', description: 'PSUs for every build' },
        { name: 'Cabinets', slug: 'cabinets', description: 'PC cases and enclosures' },
        { name: 'Cooling', slug: 'cooling', description: 'Air and liquid coolers' },
        { name: 'Monitors', slug: 'monitors', description: 'Gaming and professional displays' },
        { name: 'Peripherals', slug: 'peripherals', description: 'Keyboards, mice, headsets' },
        { name: 'Laptops', slug: 'laptops', description: 'Gaming and productivity laptops' },
        { name: 'Networking', slug: 'networking', description: 'Routers, adapters, and cables' },
    ];
    for (const cat of categoryData) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {},
            create: cat
        });
    }
    console.log(`✅ ${categoryData.length} categories created`);

    // ============ SERVICE TYPES ============
    const serviceTypeData = [
        { title: 'Expert PC Repair', description: 'Diagnose and fix any hardware or software issue with your desktop or laptop.', icon: 'Wrench', price: '₹499', features: ['Free Diagnostics', 'No Fix, No Fee', 'Original Parts Only', '7-Day Warranty'] },
        { title: 'Deep Cleaning Service', description: 'Professional dust removal, thermal repasting, and internal cleaning.', icon: 'Monitor', price: '₹999', features: ['Thermal Paste Replacement', 'Fan & Heatsink Cleaning', 'Cable Management', 'Exterior Polish'] },
        { title: 'Custom PC Build', description: 'We assemble your dream PC with perfect cable management and stress testing.', icon: 'Cpu', price: '₹2,499', features: ['Component Selection Help', 'Neat Cable Management', 'Stress Testing', 'BIOS Optimization', 'Windows Installation'] },
        { title: 'Laptop Screen Repair', description: 'LCD/LED screen replacement for all laptop brands.', icon: 'Monitor', price: '₹2,999', features: ['All Brands Supported', 'Original Screens', 'Same-Day Service', '30-Day Warranty'] },
        { title: 'Data Recovery', description: 'Recover lost or deleted data from damaged drives and SSDs.', icon: 'HardDrive', price: '₹1,499', features: ['HDD & SSD Recovery', 'Pen Drive Recovery', 'No Data, No Charge', 'Confidential Handling'] },
        { title: 'Printer Setup & Repair', description: 'Installation, driver setup, and repair for all printer types.', icon: 'Printer', price: '₹399', features: ['Inkjet & Laser', 'WiFi Setup', 'Driver Installation', 'Cartridge Refill'] },
    ];
    for (const st of serviceTypeData) {
        await prisma.serviceType.upsert({
            where: { title: st.title },
            update: {},
            create: st
        });
    }
    console.log(`✅ ${serviceTypeData.length} service types created`);

    // ============ PRODUCTS ============
    const productData = [
        // Multi-Variant Showcase Products
        {
            title: 'Apple iPhone 15 Pro',
            price: 134900,
            stock: 50,
            category: 'Smartphones',
            brand: 'Apple',
            sku: 'APP-IP15P-BASE',
            image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500',
            description: 'Forged in titanium and featuring the groundbreaking A17 Pro chip, a customizable Action button, and a more versatile Pro camera system.',
            specs: { Display: '6.1" Super Retina XDR', Chip: 'A17 Pro', Camera: '48MP Main | 3x Telephoto', Material: 'Titanium' },
            rating: 4.8,
            numReviews: 245,
            variants: [
                { name: '256GB - Natural Titanium', price: 134900, stock: 20, sku: 'APP-IP15P-256-NT' },
                { name: '512GB - Natural Titanium', price: 154900, stock: 15, sku: 'APP-IP15P-512-NT' },
                { name: '1TB - Natural Titanium', price: 174900, stock: 5, sku: 'APP-IP15P-1TB-NT' },
                { name: '256GB - Blue Titanium', price: 134900, stock: 10, sku: 'APP-IP15P-256-BT' }
            ]
        },
        {
            title: 'Apple Watch Series 9',
            price: 41900,
            stock: 30,
            category: 'Smartwatches',
            brand: 'Apple',
            sku: 'APP-W9-BASE',
            image: 'https://images.unsplash.com/photo-1434493789847-2f02bba68d6c?w=500',
            description: 'Smarter. Brighter. Mightier. The most powerful chip in Apple Watch ever.',
            specs: { Display: 'Always-On Retina', Chip: 'S9 SiP', WaterResistance: 'Swimproof 50m' },
            rating: 4.7,
            numReviews: 120,
            variants: [
                { name: '41mm - Midnight Aluminum', price: 41900, stock: 12, sku: 'APP-W9-41-MID' },
                { name: '45mm - Midnight Aluminum', price: 44900, stock: 8, sku: 'APP-W9-45-MID' },
                { name: '41mm - Starlight Aluminum', price: 41900, stock: 5, sku: 'APP-W9-41-STAR' },
                { name: '45mm - Starlight Aluminum', price: 44900, stock: 5, sku: 'APP-W9-45-STAR' }
            ]
        },
        // Graphics Cards
        { title: 'NVIDIA RTX 4070 Ti Super', price: 72999, stock: 8, category: 'Graphics Cards', brand: 'NVIDIA', image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500', description: 'The GeForce RTX 4070 Ti Super delivers incredible performance for gamers and creators with Ada Lovelace architecture.', specs: { VRAM: '16GB GDDR6X', 'Boost Clock': '2610 MHz', 'TDP': '285W', 'CUDA Cores': '8448' }, rating: 4.8, numReviews: 42 },
        { title: 'AMD Radeon RX 7800 XT', price: 44999, stock: 12, category: 'Graphics Cards', brand: 'AMD', image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500', description: 'Excellent 1440p gaming GPU with 16GB VRAM powered by RDNA 3 architecture.', specs: { VRAM: '16GB GDDR6', 'Boost Clock': '2430 MHz', 'TDP': '263W', 'Stream Processors': '3840' }, rating: 4.6, numReviews: 38 },
        { title: 'NVIDIA RTX 4060 8GB', price: 29999, stock: 20, category: 'Graphics Cards', brand: 'NVIDIA', image: 'https://images.unsplash.com/photo-1555618254-5e28e2a3de2e?w=500', description: 'Great 1080p gaming card with DLSS 3 support and efficient power consumption.', specs: { VRAM: '8GB GDDR6', 'Boost Clock': '2460 MHz', 'TDP': '115W', 'CUDA Cores': '3072' }, rating: 4.4, numReviews: 56 },

        // Processors
        { title: 'AMD Ryzen 7 7800X3D', price: 33499, stock: 15, category: 'Processors', brand: 'AMD', image: 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=500', description: 'The ultimate gaming processor with 3D V-Cache technology. 8 cores, 16 threads.', specs: { Cores: '8', Threads: '16', 'Base Clock': '4.2 GHz', 'Boost Clock': '5.0 GHz', 'L3 Cache': '96MB', 'TDP': '120W' }, rating: 4.9, numReviews: 73 },
        { title: 'Intel Core i5-14600K', price: 24999, stock: 18, category: 'Processors', brand: 'Intel', image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500', description: 'Raptor Lake Refresh with 14 cores. Great for gaming and multitasking.', specs: { Cores: '14 (6P+8E)', Threads: '20', 'Boost Clock': '5.3 GHz', 'TDP': '125W' }, rating: 4.5, numReviews: 45 },
        { title: 'AMD Ryzen 5 5600X', price: 12999, stock: 25, category: 'Processors', brand: 'AMD', image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=500', description: 'Best budget gaming CPU. 6 cores, 12 threads, excellent single-core performance.', specs: { Cores: '6', Threads: '12', 'Boost Clock': '4.6 GHz', 'TDP': '65W' }, rating: 4.7, numReviews: 120 },

        // RAM
        { title: 'Corsair Vengeance DDR5 32GB (2x16GB)', price: 8999, stock: 30, category: 'RAM', brand: 'Corsair', image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=500', description: 'DDR5-5600MHz CL36 kit with Intel XMP 3.0 support.', specs: { Capacity: '32GB (2x16GB)', Speed: 'DDR5-5600', Latency: 'CL36', Voltage: '1.25V' }, rating: 4.6, numReviews: 33 },
        { title: 'G.Skill Trident Z5 RGB DDR5 32GB', price: 11499, stock: 14, category: 'RAM', brand: 'G.Skill', image: 'https://images.unsplash.com/photo-1541140532154-b024d6fb1f44?w=500', description: 'Premium RGB DDR5-6000 kit for high-end builds.', specs: { Capacity: '32GB (2x16GB)', Speed: 'DDR5-6000', Latency: 'CL30', Voltage: '1.35V' }, rating: 4.8, numReviews: 28 },

        // Storage
        { title: 'Samsung 990 Pro 2TB NVMe', price: 13999, stock: 22, category: 'Storage', brand: 'Samsung', image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500', description: 'PCIe 4.0 NVMe SSD with 7450MB/s sequential read speeds.', specs: { Capacity: '2TB', Interface: 'PCIe 4.0 x4', 'Read Speed': '7450 MB/s', 'Write Speed': '6900 MB/s' }, rating: 4.9, numReviews: 67 },
        { title: 'WD Black SN770 1TB NVMe', price: 5499, stock: 35, category: 'Storage', brand: 'Western Digital', image: 'https://images.unsplash.com/photo-1628557044797-f21a177c37ec?w=500', description: 'Great value PCIe 4.0 SSD for gaming and productivity.', specs: { Capacity: '1TB', Interface: 'PCIe 4.0 x4', 'Read Speed': '5150 MB/s', 'Write Speed': '4900 MB/s' }, rating: 4.5, numReviews: 89 },

        // Motherboards
        { title: 'ASUS ROG Strix B650E-F', price: 24999, stock: 10, category: 'Motherboards', brand: 'ASUS', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500', description: 'AM5 ATX motherboard with PCIe 5.0, WiFi 6E, and premium VRM.', specs: { Socket: 'AM5', Chipset: 'B650E', 'Form Factor': 'ATX', 'RAM Slots': '4 x DDR5' }, rating: 4.7, numReviews: 24 },
        { title: 'MSI MAG B760 Tomahawk WiFi', price: 16999, stock: 16, category: 'Motherboards', brand: 'MSI', image: 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=500', description: 'Intel LGA 1700 board with WiFi 6E and 2.5G LAN.', specs: { Socket: 'LGA 1700', Chipset: 'B760', 'Form Factor': 'ATX', 'RAM Slots': '4 x DDR5' }, rating: 4.5, numReviews: 31 },

        // Power Supplies
        { title: 'Corsair RM850x 850W 80+ Gold', price: 9999, stock: 20, category: 'Power Supplies', brand: 'Corsair', image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500', description: 'Fully modular ATX 3.0 PSU with 80+ Gold efficiency.', specs: { Wattage: '850W', Efficiency: '80+ Gold', Modular: 'Fully Modular', 'ATX Standard': 'ATX 3.0' }, rating: 4.8, numReviews: 55 },

        // Monitors
        { title: 'LG 27GP850-B 27" QHD Gaming', price: 29999, stock: 7, category: 'Monitor', brand: 'LG', sku: 'LG-27GP850', image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500', description: '27-inch Nano IPS, 165Hz, 1ms, HDR400 gaming monitor.', specs: { Size: '27"', Resolution: '2560x1440', 'Refresh Rate': '165Hz', Panel: 'Nano IPS', 'Response Time': '1ms' }, rating: 4.7, numReviews: 40 },
        { title: 'Samsung Odyssey G5 34" Ultrawide', price: 34999, stock: 5, category: 'Monitor', brand: 'Samsung', sku: 'SAM-G5-34', image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500', description: '34-inch UWQHD curved VA, 165Hz gaming monitor.', specs: { Size: '34"', Resolution: '3440x1440', 'Refresh Rate': '165Hz', Panel: 'VA Curved', Curvature: '1000R' }, rating: 4.4, numReviews: 22 },

        // Motherboards
        { title: 'MSI MAG B650 TOMAHAWK WIFI', price: 21999, stock: 20, category: 'Motherboard', brand: 'MSI', sku: 'MSI-B650-TOM', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500', description: 'ATX motherboard with robust VRM, PCIe 4.0, and Wi-Fi 6E support.', specs: { Form: 'ATX', Socket: 'AM5', Memory: 'DDR5', Network: 'Wi-Fi 6E' }, rating: 4.6, numReviews: 32 },
        { title: 'Gigabyte Z790 AORUS ELITE AX', price: 26500, stock: 15, category: 'Motherboard', brand: 'Gigabyte', sku: 'GIG-Z790-AOR', image: 'https://images.unsplash.com/photo-1555617781-897aa056c0db?w=500', description: 'Intel Z790 motherboard designed for 13th & 14th Gen Core CPUs with DDR5 support.', specs: { Form: 'ATX', Socket: 'LGA 1700', Memory: 'DDR5', M2Slots: '4' }, rating: 4.7, numReviews: 40 },

        // RAM
        { title: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5', price: 12500, stock: 40, category: 'RAM', brand: 'Corsair', sku: 'COR-RAM-32D5', image: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=500', description: 'High performance DDR5 memory with dynamic RGB lighting and 6000MHz speed.', specs: { Capacity: '32GB (2x16)', Type: 'DDR5', Speed: '6000MHz', Latency: 'CL30' }, rating: 4.8, numReviews: 105 },

        // Storage
        { title: 'Samsung 990 PRO 2TB NVMe M.2 SSD', price: 16999, stock: 30, category: 'Storage', brand: 'Samsung', sku: 'SAM-990P-2TB', image: 'https://images.unsplash.com/photo-1565536421961-d703e847c94b?w=500', description: 'Blazing fast PCIe 4.0 NVMe SSD with speeds up to 7450 MB/s.', specs: { Capacity: '2TB', Interface: 'PCIe 4.0 x4', Read: '7450 MB/s', Write: '6900 MB/s' }, rating: 4.9, numReviews: 250 },
        { title: 'Crucial MX500 1TB 3D NAND SATA SSD', price: 5499, stock: 50, category: 'Storage', brand: 'Crucial', sku: 'CRU-MX500-1TB', image: 'https://images.unsplash.com/photo-1602447952445-5df18816c2c8?w=500', description: 'Reliable high-capacity 2.5-inch SATA solid state drive.', specs: { Capacity: '1TB', Interface: 'SATA III', Format: '2.5 inch' }, rating: 4.6, numReviews: 310 },

        // PSU
        { title: 'Corsair RM850x 850W 80+ Gold Fully Modular', price: 11999, stock: 25, category: 'PSU', brand: 'Corsair', sku: 'COR-RM850X', image: 'https://images.unsplash.com/photo-1587202372589-95242d5af8e8?w=500', description: 'Highly efficient, whisper-quiet power supply with fully modular cables.', specs: { Wattage: '850W', Efficiency: '80+ Gold', Modularity: 'Fully Modular', Form: 'ATX' }, rating: 4.8, numReviews: 120 },

        // Case
        { title: 'Lian Li PC-O11 Dynamic EVO Mid-Tower', price: 15499, stock: 12, category: 'Case', brand: 'Lian Li', sku: 'LIA-O11-EVO', image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500', description: 'Reversible mid-tower chassis featuring dual-chamber design and tempered glass.', specs: { Form: 'Mid-Tower', Motherboard: 'E-ATX', Glass: 'Front & Side', Color: 'Black' }, rating: 4.9, numReviews: 88 },

        // Peripherals
        { title: 'Logitech G Pro X Superlight 2', price: 12999, stock: 25, category: 'Peripherals', brand: 'Logitech', sku: 'LOG-GPX2', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500', description: 'Ultra-lightweight wireless gaming mouse, 63g, HERO 2 sensor.', specs: { Weight: '63g', Sensor: 'HERO 2', DPI: '32,000', Battery: '95 hours' }, rating: 4.8, numReviews: 88 },
        { title: 'Keychron Q1 Pro Mechanical Keyboard', price: 16999, stock: 12, category: 'Peripherals', brand: 'Keychron', sku: 'KC-Q1PRO', image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500', description: '75% wireless mechanical keyboard with hot-swappable Gateron Jupiter Red switches.', specs: { Layout: '75%', Switches: 'Gateron Jupiter Red', Connectivity: 'BT/2.4G/USB-C', Backlight: 'RGB' }, rating: 4.6, numReviews: 34 },
        { title: 'HyperX Cloud III Wireless', price: 10999, stock: 18, category: 'Peripherals', brand: 'HyperX', sku: 'HX-C3-WL', image: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=500', description: 'Wireless gaming headset with 53mm drivers and DTS:X spatial audio.', specs: { Driver: '53mm', Battery: '120 hours', Mic: 'Detachable', Audio: 'DTS:X Spatial' }, rating: 4.5, numReviews: 47 },

        // Accessories
        { title: 'Arctic Silver 5 Thermal Paste - 3.5g', price: 799, stock: 100, category: 'Accessories', brand: 'Arctic', sku: 'ARC-S5-35G', image: 'https://images.unsplash.com/photo-1555618254-5e28e2a3de2e?w=500', description: 'High-density polysynthetic silver thermal compound for CPUs and GPUs.', specs: { Weight: '3.5g', Material: 'Silver', Density: 'High' }, rating: 4.7, numReviews: 420 },

        // Laptops
        { title: 'ASUS ROG Strix G16 (2024)', price: 129999, stock: 4, category: 'Laptops', brand: 'ASUS', sku: 'ROG-STRIXG16', image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=500', description: 'Intel i9-14900HX, RTX 4070, 16" 240Hz QHD, 32GB DDR5 gaming laptop.', specs: { CPU: 'i9-14900HX', GPU: 'RTX 4070 8GB', RAM: '32GB DDR5', Storage: '1TB NVMe', Display: '16" QHD 240Hz' }, rating: 4.7, numReviews: 15 },
        { title: 'Lenovo IdeaPad Slim 5', price: 54999, stock: 10, category: 'Laptops', brand: 'Lenovo', sku: 'LEN-IPS5', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500', description: 'Ryzen 7 7730U, 16GB RAM, 512GB SSD — perfect productivity laptop.', specs: { CPU: 'Ryzen 7 7730U', RAM: '16GB', Storage: '512GB SSD', Display: '15.6" FHD IPS' }, rating: 4.3, numReviews: 62 },

        // Cooling
        { title: 'Noctua NH-D15 Chromax Black', price: 8999, stock: 11, category: 'Cooling', brand: 'Noctua', sku: 'NOC-NHD15-CB', image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500', description: 'The king of air coolers. Dual tower design with dual 140mm fans.', specs: { Type: 'Air Cooler', Fans: '2x 140mm', TDP: '250W', Height: '165mm' }, rating: 4.9, numReviews: 95 },
        { title: 'Deepcool LS720 360mm AIO', price: 9499, stock: 9, category: 'Cooling', brand: 'Deepcool', sku: 'DEP-LS720', image: 'https://images.unsplash.com/photo-1555618254-5e28e2a3de2e?w=500', description: '360mm AIO liquid cooler with ARGB infinity mirror pump head.', specs: { Type: 'AIO Liquid', Radiator: '360mm', Fans: '3x 120mm ARGB', 'Pump Speed': '3100 RPM' }, rating: 4.5, numReviews: 29 },
    ];

    for (const product of productData) {
        const { rating, numReviews, sku, variants, ...productPayload } = product;

        const existing = await prisma.product.findFirst({ where: { title: productPayload.title } });
        if (!existing) {
            const created = await prisma.product.create({ data: productPayload });

            if (variants && variants.length > 0) {
                // Insert the multiple variants provided in the seed data
                for (const v of variants) {
                    await prisma.productVariant.create({
                        data: {
                            productId: created.id,
                            name: v.name,
                            price: v.price || created.price,
                            stock: v.stock !== undefined ? v.stock : created.stock,
                            sku: v.sku || sku || null
                        }
                    });
                }
            } else {
                // Fallback: All products need at least one variant to be purchasable under the new schema
                await prisma.productVariant.create({
                    data: {
                        productId: created.id,
                        name: 'Standard',
                        price: created.price,
                        stock: created.stock,
                        sku: sku || null
                    }
                });
            }
        }
    }
    console.log(`✅ ${productData.length} products created with their variants`);

    // ============ SAMPLE ORDERS ============
    const sampleProducts = await prisma.product.findMany({ take: 5 });
    for (let i = 0; i < 8; i++) {
        const customer = customers[i % customers.length];
        const product1 = sampleProducts[i % sampleProducts.length];
        const product2 = sampleProducts[(i + 1) % sampleProducts.length];
        const total = product1.price + product2.price;

        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 7));

        await prisma.order.create({
            data: {
                userId: customer.id,
                total,
                isPaid: i < 6,
                paymentMethod: i % 2 === 0 ? 'razorpay' : 'cod',
                shippingAddress: JSON.stringify({
                    name: customer.name,
                    address: `${100 + i}, MG Road`,
                    city: ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai'][i % 5],
                    pincode: `${560000 + i}`,
                    phone: customer.phone
                }),
                status: ['Processing', 'Shipped', 'Delivered', 'Processing'][i % 4],
                createdAt: createdDate,
                items: {
                    create: [
                        { productId: product1.id, quantity: 1, price: product1.price },
                        { productId: product2.id, quantity: 1, price: product2.price }
                    ]
                }
            }
        });
    }
    console.log('✅ 8 sample orders created');

    // ============ SAMPLE SERVICE BOOKINGS ============
    const serviceNames = ['Expert PC Repair', 'Deep Cleaning Service', 'Custom PC Build', 'Laptop Screen Repair', 'Data Recovery'];
    for (let i = 0; i < 5; i++) {
        const customer = customers[i];
        const bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() - Math.floor(Math.random() * 5));

        await prisma.serviceBooking.create({
            data: {
                userId: customer.id,
                serviceType: serviceNames[i],
                date: new Date(Date.now() + (i + 1) * 86400000),
                description: [
                    'Laptop is overheating and shutting down randomly',
                    'Need a thorough cleaning, lots of dust inside',
                    'Want to build a gaming PC within ₹1.5L budget',
                    'Cracked laptop screen, need replacement',
                    'Accidentally deleted important project files'
                ][i],
                status: ['Pending', 'Confirmed', 'Picked Up', 'In Progress', 'Pending'][i],
                customerName: customer.name,
                customerPhone: customer.phone,
                deviceType: ['Laptop', 'Desktop', 'Desktop', 'Laptop', 'Laptop'][i],
                deviceBrand: ['HP', 'Custom', 'Custom', 'Dell', 'Lenovo'][i],
                address: `${200 + i}, Tech Park Road`,
                city: ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai'][i],
                pincode: `${560000 + i}`,
                pickupOtp: String(100000 + Math.floor(Math.random() * 900000)),
                createdAt: bookingDate
            }
        });
    }
    console.log('✅ 5 sample service bookings created');

    // ============ SAMPLE REVIEWS ============
    const reviewProducts = await prisma.product.findMany({ take: 8 });
    const reviewTexts = [
        'Amazing product! Worth every penny.',
        'Good performance, but slightly overpriced.',
        'Absolutely love it! Best purchase this year.',
        'Decent quality. Does the job well.',
        'Excellent build quality and fast delivery.',
        'Great for gaming. No complaints at all.',
        'Solid product. Would recommend to anyone.',
        'Top-notch quality. Exceeded my expectations!',
    ];
    for (let i = 0; i < reviewProducts.length; i++) {
        const product = reviewProducts[i];
        const customer = customers[i % customers.length];
        const existing = await prisma.review.findFirst({
            where: { productId: product.id, userId: customer.id }
        });
        if (!existing) {
            await prisma.review.create({
                data: {
                    productId: product.id,
                    userId: customer.id,
                    rating: 4 + (i % 2),
                    comment: reviewTexts[i]
                }
            });
        }
    }
    console.log('✅ Sample reviews created');

    // ============ SAMPLE REFERRALS ============
    // Create meaningful referral chains
    // Rahul (0) referred Priya (1) -> Completed
    // Priya (1) referred Amit (2) -> Rewarded
    // Amit (2) referred Neha (3) -> Pending
    // Rahul (0) referred Vikram (4) -> Rewarded

    const referralData = [
        { referrer: customers[0], referee: customers[1], status: 'completed', reward: 200 },
        { referrer: customers[1], referee: customers[2], status: 'rewarded', reward: 200 },
        { referrer: customers[2], referee: customers[3], status: 'pending', reward: 200 },
        { referrer: customers[0], referee: customers[4], status: 'rewarded', reward: 200 },
    ];

    for (const ref of referralData) {
        // Link users first
        await prisma.user.update({
            where: { id: ref.referee.id },
            data: { referredById: ref.referrer.id }
        });

        // Create referral record
        const existingRef = await prisma.referral.findFirst({
            where: { referrerId: ref.referrer.id, refereeId: ref.referee.id }
        });

        if (!existingRef) {
            await prisma.referral.create({
                data: {
                    referrerId: ref.referrer.id,
                    refereeId: ref.referee.id,
                    status: ref.status,
                    rewardAmount: ref.reward,
                    completedAt: ref.status !== 'pending' ? new Date() : null
                }
            });
        }
    }

    // Create some extra random referrals for the admin view
    // Create dummy users to be referees
    const dummyReferees = [];
    for (let i = 1; i <= 5; i++) {
        const dummy = await prisma.user.upsert({
            where: { email: `referee${i}@example.com` },
            update: {},
            create: {
                email: `referee${i}@example.com`,
                name: `Referee User ${i}`,
                password: customerPassword,
                role: 'customer',
                isVerified: true,
                referredById: customers[0].id // All referred by Rahul
            }
        });
        dummyReferees.push(dummy);
    }

    for (let i = 0; i < dummyReferees.length; i++) {
        const status = ['pending', 'completed', 'rewarded'][i % 3];
        const existingRef = await prisma.referral.findFirst({
            where: { referrerId: customers[0].id, refereeId: dummyReferees[i].id }
        });

        if (!existingRef) {
            await prisma.referral.create({
                data: {
                    referrerId: customers[0].id,
                    refereeId: dummyReferees[i].id,
                    status: status,
                    rewardAmount: 200,
                    completedAt: status !== 'pending' ? new Date() : null
                }
            });
        }
    }

    console.log('✅ Sample referrals created');

    // ============ COURSES ============
    console.log('🧹 Clearing existing course data...');
    try {
        await prisma.courseApplication.deleteMany({});
        await prisma.enrollment.deleteMany({});
        await prisma.course.deleteMany({});
        console.log('✅ Course data cleared');
    } catch (error) {
        console.warn('⚠️ Could not clear some course data (tables might not exist yet):', error.message);
    }

    const courseData = [
        {
            title: 'PC Building Masterclass',
            description: 'Hands-on training to build a gaming PC from scratch. Learn component selection, assembly, and cable management in our lab.',
            instructor: 'Institute Faculty',
            category: 'Computer',
            thumbnail: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=1000&auto=format&fit=crop',
            hasCertificate: true,
            isPublished: true
        },
        {
            title: 'Overclocking 101',
            description: 'Advanced lab sessions on pushing CPU and GPU limits safely. Practical demonstrations.',
            instructor: 'Institute Faculty',
            category: 'Computer',
            thumbnail: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=1000&auto=format&fit=crop',
            hasCertificate: true,
            isPublished: true
        },
        {
            title: 'Troubleshooting Hardware',
            description: 'Diagnose common PC issues like BSODs, overheating, and boot failures in our repair workshop.',
            instructor: 'Institute Faculty',
            category: 'Computer',
            thumbnail: 'https://images.unsplash.com/photo-1597872258083-ef52741e4694?q=80&w=1000&auto=format&fit=crop',
            isPublished: true
        },
        {
            title: 'CCC (Course on Computer Concepts)',
            description: 'Essential computer literacy course designed by NIELIT. Classroom training for 80 hours.',
            instructor: 'Institute Faculty',
            category: 'Computer',
            thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop',
            hasCertificate: true,
            isPublished: true
        },
        {
            title: 'O Level (IT Foundation)',
            description: 'Foundation course in Information Technology. Equivalent to a diploma in Computer Applications. Full year offline program.',
            instructor: 'Institute Faculty',
            category: 'Computer',
            thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop',
            hasCertificate: true,
            isPublished: true
        },
        {
            title: 'DCA (Diploma in Computer Applications)',
            description: 'A 6-month diploma course covering the fundamentals of computer applications. Offline classes daily.',
            instructor: 'Institute Faculty',
            category: 'Computer',
            thumbnail: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1000&auto=format&fit=crop',
            hasCertificate: true,
            isPublished: true
        }
    ];

    for (const data of courseData) {
        const course = await prisma.course.create({
            data: data
        });

        // Add a default duration for each course since they are required in the app
        const duration = await prisma.courseDuration.create({
            data: {
                courseId: course.id,
                label: '3 Months',
                totalFee: 5000,
                fullPayDiscount: 10,
                installments: 3
            }
        });

        // Add a default batch
        await prisma.courseBatch.create({
            data: {
                durationId: duration.id,
                name: 'Evening',
                timing: '04:00 PM – 06:00 PM',
                seatLimit: 20
            }
        });
    }
    console.log(`✅ ${courseData.length} courses created`);

    console.log('\n🎉 Database seeded successfully!');
}

main()
    .catch(e => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
