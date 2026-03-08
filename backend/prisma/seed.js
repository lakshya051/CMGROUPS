import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const price = (base) => Math.round((base + rand(-base * 0.1, base * 0.2)) / 100) * 100;

// ── Product catalogue (150 entries via templates + auto-expand) ────────────
const BRANDS = {
    gpu: ['NVIDIA', 'AMD', 'Zotac', 'Gigabyte', 'ASUS', 'MSI', 'Sapphire', 'PowerColor'],
    cpu: ['Intel', 'AMD'],
    ram: ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'ADATA', 'TeamGroup'],
    ssd: ['Samsung', 'WD', 'Seagate', 'Crucial', 'Kingston', 'SK Hynix'],
    mb: ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Biostar'],
    psu: ['Corsair', 'Seasonic', 'be quiet!', 'Cooler Master', 'EVGA', 'Thermaltake'],
    laptop: ['ASUS', 'Dell', 'HP', 'Lenovo', 'MSI', 'Acer', 'Apple', 'Samsung'],
    monitor: ['LG', 'Samsung', 'ASUS', 'BenQ', 'ViewSonic', 'AOC', 'Acer', 'Dell'],
    peripheral: ['Logitech', 'Razer', 'SteelSeries', 'HyperX', 'Corsair', 'Roccat', 'NZXT'],
    cooler: ['Noctua', 'be quiet!', 'Deepcool', 'Cooler Master', 'ARCTIC', 'Thermalright'],
    case: ['Lian Li', 'NZXT', 'Fractal', 'Phanteks', 'Cooler Master', 'Antec'],
    accessory: ['Belkin', 'Anker', 'AmazonBasics', 'TP-Link', 'D-Link', 'Ugreen'],
};

const IMAGES = {
    gpu: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500',
    cpu: 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=500',
    ram: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=500',
    ssd: 'https://images.unsplash.com/photo-1565536421961-d703e847c94b?w=500',
    mb: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500',
    psu: 'https://images.unsplash.com/photo-1587202372589-95242d5af8e8?w=500',
    laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500',
    monitor: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500',
    peripheral: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
    cooler: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500',
    case: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500',
    accessory: 'https://images.unsplash.com/photo-1555618254-5e28e2a3de2e?w=500',
};

// Templates — expanded below to 150+ SKUs
const TEMPLATES = [
    // Graphics Cards (15 products)
    ...['RTX 4090 24GB', 'RTX 4080 Super 16GB', 'RTX 4070 Ti Super 16GB', 'RTX 4070 Super 12GB', 'RTX 4060 Ti 16GB', 'RTX 4060 8GB', 'RX 7900 XTX 24GB', 'RX 7900 XT 20GB', 'RX 7800 XT 16GB', 'RX 7700 XT 12GB', 'RTX 3080 10GB (Refurb)', 'RX 6800 XT 16GB (Refurb)', 'RTX 4050 Laptop 6GB', 'Arc A770 16GB', 'Arc A750 8GB']
        .map((n, i) => ({ title: n, cat: 'Graphics Cards', type: 'gpu', base: [189999, 94999, 72999, 52999, 42999, 28999, 104999, 79999, 44999, 32999, 39999, 26999, 35999, 24999, 19999][i] })),

    // Processors (12)
    ...['Ryzen 9 7950X3D', 'Core i9-14900KS', 'Ryzen 9 7900X3D', 'Ryzen 7 7800X3D', 'Core i7-14700K', 'Core i5-14600K', 'Ryzen 5 7600X', 'Ryzen 5 5600X', 'Core i3-14100F', 'Ryzen 9 5950X', 'Core i9-13900K', 'Ryzen 7 5800X3D']
        .map((n, i) => ({ title: n, cat: 'Processors', type: 'cpu', base: [59999, 54999, 44999, 33499, 37999, 24999, 17499, 12999, 8999, 32999, 39999, 24999][i] })),

    // RAM (10)
    ...['Corsair Dominator Platinum RGB 64GB DDR5-6000', 'G.Skill Trident Z5 32GB DDR5-6400', 'Kingston Fury Beast 32GB DDR5-5200', 'ADATA XPG Lancer 32GB DDR5-6000', 'TeamGroup T-Force Delta RGB 32GB DDR4-3200', 'Corsair Vengeance RGB 32GB DDR5-6000', 'G.Skill Ripjaws V 16GB DDR4-3600', 'Kingston 8GB DDR4-3200 (Single)', 'Crucial 16GB DDR4-3200', 'Corsair Vengeance LPX 64GB DDR4-3200']
        .map((n, i) => ({ title: n, cat: 'RAM', type: 'ram', base: [18999, 12999, 9499, 10999, 4999, 11499, 3299, 1799, 3499, 14999][i] })),

    // SSDs (12)
    ...['Samsung 990 Pro 4TB NVMe', 'Samsung 990 Pro 2TB NVMe', 'Samsung 990 Pro 1TB NVMe', 'WD Black SN850X 2TB', 'WD Black SN770 1TB', 'Crucial P3 Plus 2TB', 'Kingston NV3 1TB', 'Seagate Expansion 2TB HDD', 'WD Blue 1TB HDD', 'Samsung 870 EVO 1TB SATA SSD', 'SK Hynix Gold P31 2TB NVMe', 'Sabrent Rocket 4 Plus 2TB']
        .map((n, i) => ({ title: n, cat: 'Storage', type: 'ssd', base: [26999, 13999, 7499, 16999, 5499, 7999, 3499, 5499, 4499, 6999, 11999, 17999][i] })),

    // Motherboards (10)
    ...['ASUS ROG Maximus Z790 Hero', 'MSI MEG Z790 ACE', 'Gigabyte Z790 Aorus Master', 'ASUS ROG Strix B650E-F', 'MSI MAG B650 Tomahawk WiFi', 'Gigabyte B650 Aorus Elite AX', 'ASRock B760M Steel Legend', 'ASUS Prime B760-Plus', 'MSI Pro B760M-A WiFi', 'Gigabyte B550 Aorus Pro AX']
        .map((n, i) => ({ title: n, cat: 'Motherboards', type: 'mb', base: [49999, 44999, 34999, 24999, 21999, 18999, 11999, 9999, 8999, 13999][i] })),

    // PSU (8)
    ...['Seasonic Prime TX-1000 1000W Titanium', 'be quiet! Dark Power Pro 12 1200W', 'Corsair HX1000i 1000W Platinum', 'Corsair RM850x 850W Gold', 'EVGA SuperNOVA 750W Gold', 'Cooler Master MWE Gold 650W', 'Thermaltake Toughpower GF1 850W Gold', 'Cooler Master V850 SFX Gold']
        .map((n, i) => ({ title: n, cat: 'Power Supplies', type: 'psu', base: [19999, 24999, 16999, 9999, 7499, 5999, 8499, 9999][i] })),

    // Laptops (15)
    ...['ASUS ROG Zephyrus G16 2024', 'MSI Titan GT77 HX', 'Lenovo Legion Pro 7i Gen 8', 'HP Omen 16 2024', 'Acer Predator Helios 18', 'Dell XPS 15 OLED', 'Apple MacBook Pro 14 M3 Pro', 'Apple MacBook Air 15 M3', 'Lenovo ThinkPad X1 Carbon Gen 12', 'HP EliteBook 840 G11', 'ASUS VivoBook 16X', 'Lenovo IdeaPad Slim 5', 'Acer Aspire 7 AMD', 'Dell Inspiron 15 3530', 'Samsung Galaxy Book4 Pro']
        .map((n, i) => ({ title: n, cat: 'Laptops', type: 'laptop', base: [189999, 249999, 159999, 109999, 129999, 129999, 199999, 134999, 149999, 109999, 64999, 54999, 44999, 39999, 109999][i] })),

    // Monitors (12)
    ...['LG 27GP950-B 4K 160Hz Nano IPS', 'Samsung Odyssey G9 49" DQHD', 'ASUS ROG Swift PG27AQN 360Hz', 'LG UltraGear 34WP65C-B Ultrawide', 'BenQ MOBIUZ EX2710Q 165Hz', 'AOC 24G2SP 165Hz IPS', 'Dell U2723QE 4K USB-C', 'ViewSonic XG2431 240Hz', 'ASUS ProArt PA278QV', 'Samsung Smart M8 32" 4K', 'LG 32UN880 Ergo 4K USB-C', 'Acer Nitro XV252Q X 390Hz']
        .map((n, i) => ({ title: n, cat: 'Monitors', type: 'monitor', base: [59999, 109999, 74999, 34999, 24999, 11999, 44999, 22999, 32999, 44999, 49999, 27999][i] })),

    // Peripherals (20)
    ...['Logitech G Pro X Superlight 2', 'Razer DeathAdder V3 HyperSpeed', 'SteelSeries Aerox 5 Wireless', 'Logitech MX Master 3S', 'Razer BlackWidow V4 Pro', 'Corsair K70 RGB Pro', 'SteelSeries Apex Pro TKL (2023)', 'Keychron Q1 Pro', 'HyperX Cloud III Wireless', 'Razer BlackShark V2 Pro 2023', 'SteelSeries Arctis Nova Pro Wireless', 'Logitech G733 Lightspeed', 'Corsair HS80 RGB Wireless', 'Razer Kraken V3 Pro', 'Logitech G915 TKL Wireless', 'Razer Ornata V3 X', 'Corsair Sabre RGB Pro Champion', 'HyperX Pulsefire Haste 2', 'Glorious Model O 2 Wireless', 'Fantech Helios XD5 Wireless']
        .map((n, i) => ({ title: n, cat: 'Peripherals', type: 'peripheral', base: [12999, 8499, 9999, 11499, 16999, 12999, 14999, 16999, 10999, 14999, 22999, 7999, 8999, 11999, 16999, 3999, 6999, 5999, 6999, 3499][i] })),

    // Coolers (8)
    ...['Noctua NH-D15 Chromax Black', 'be quiet! Dark Rock Pro 4', 'Cooler Master Hyper 622 Halo', 'ARCTIC Freezer 36 A-RGB', 'Deepcool LS720 360mm AIO', 'Corsair iCUE H150i ELITE LCD', 'NZXT Kraken 360 RGB', 'Thermaltake TOUGHLIQUID Ultra 360']
        .map((n, i) => ({ title: n, cat: 'Cooling', type: 'cooler', base: [8999, 6499, 4999, 2999, 9499, 16999, 12999, 14999][i] })),

    // Cases (8)
    ...['Lian Li PC-O11 Dynamic EVO XL', 'Fractal Design Torrent Compact', 'NZXT H9 Elite', 'Phanteks Eclipse G500A', 'Cooler Master HAF 700 EVO', 'Thermaltake View 51 ARGB', 'Lian Li LANCOOL III', 'Antec P120 Crystal']
        .map((n, i) => ({ title: n, cat: 'Cabinets', type: 'case', base: [14999, 9999, 12999, 8999, 19999, 11999, 9499, 6999][i] })),

    // Accessories (20)
    ...['Belkin Thunderbolt 4 Dock Pro', 'Anker 727 Charging Station', 'TP-Link AX3000 WiFi 6 Router', 'TP-Link Archer AX73 AX5400', 'D-Link DIR-X5460 AX5400', 'Ugreen USB-C Hub 10-in-1', 'Cable Matters 10Gbps USB Hub', 'Arctic Silver 5 Thermal Paste', 'Noctua NT-H1 Thermal Paste', 'GELID GC-Extreme Thermal Paste', 'CableMod Pro ModMesh Cables', 'Sleeved Cable Kit 24-pin', 'Anti-static Wrist Strap', 'Cable Tidy Kit 100pcs', 'SATA III Cable 3-Pack', 'M.2 Screw Kit', 'CPU Delid Tool Kit', 'Laptop Cooling Pad RGB', 'USB WiFi Adapter AX1800', 'Bluetooth 5.3 USB Adapter']
        .map((n, i) => ({ title: n, cat: 'Accessories', type: 'accessory', base: [19999, 7499, 5999, 8499, 7999, 3999, 2999, 799, 599, 999, 2499, 1499, 299, 499, 299, 199, 2999, 1999, 1499, 699][i] })),
];

function makeVariants(type, basePrice) {
    if (type === 'gpu') return [
        { name: `Founders Edition`, price: basePrice, stock: rand(3, 10) },
        { name: `Gaming OC`, price: price(basePrice * 1.05), stock: rand(3, 8) },
        { name: `Windforce OC`, price: price(basePrice * 1.03), stock: rand(2, 6) },
    ];
    if (type === 'ram') return [
        { name: '16GB Kit', price: Math.round(basePrice * 0.6), stock: rand(10, 30) },
        { name: '32GB Kit', price: basePrice, stock: rand(10, 25) },
        { name: '64GB Kit', price: price(basePrice * 1.9), stock: rand(3, 10) },
    ];
    if (type === 'ssd') return [
        { name: '500GB', price: Math.round(basePrice * 0.55), stock: rand(15, 40) },
        { name: '1TB', price: basePrice, stock: rand(15, 35) },
        { name: '2TB', price: price(basePrice * 1.8), stock: rand(8, 20) },
    ];
    if (type === 'laptop') return [
        { name: 'Base — 16GB/512GB', price: basePrice, stock: rand(3, 8) },
        { name: 'Mid — 32GB/1TB', price: price(basePrice * 1.2), stock: rand(2, 6) },
        { name: 'Max — 64GB/2TB', price: price(basePrice * 1.45), stock: rand(1, 4) },
    ];
    if (type === 'monitor') return [
        { name: '24"', price: Math.round(basePrice * 0.75), stock: rand(5, 15) },
        { name: '27"', price: basePrice, stock: rand(4, 12) },
        { name: '32"', price: price(basePrice * 1.3), stock: rand(3, 8) },
    ];
    // default: single Standard variant
    return [{ name: 'Standard', price: basePrice, stock: rand(5, 30) }];
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log('🌱 Seeding database...\n');

    // ── Users ─────────────────────────────────────────────────────────
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cmgroups.in' },
        update: {},
        create: { email: 'admin@cmgroups.in', name: 'CM Admin', role: 'admin', phone: '9876543210', referralCode: 'CMADMIN' }
    });

    const CUST_DATA = [
        { email: 'rahul@example.com', name: 'Rahul Sharma', phone: '9876500001', referralCode: 'RAHUL01' },
        { email: 'priya@example.com', name: 'Priya Patel', phone: '9876500002', referralCode: 'PRIYA02' },
        { email: 'amit@example.com', name: 'Amit Kumar', phone: '9876500003', referralCode: 'AMIT03' },
        { email: 'neha@example.com', name: 'Neha Singh', phone: '9876500004', referralCode: 'NEHA04' },
        { email: 'vikram@example.com', name: 'Vikram Reddy', phone: '9876500005', referralCode: 'VIKRAM05' },
        { email: 'ananya@example.com', name: 'Ananya Roy', phone: '9876500006', referralCode: 'ANANYA06' },
        { email: 'rohan@example.com', name: 'Rohan Mehta', phone: '9876500007', referralCode: 'ROHAN07' },
        { email: 'pooja@example.com', name: 'Pooja Das', phone: '9876500008', referralCode: 'POOJA08' },
        { email: 'kiran@example.com', name: 'Kiran Nair', phone: '9876500009', referralCode: 'KIRAN09' },
        { email: 'saurav@example.com', name: 'Saurav Ghosh', phone: '9876500010', referralCode: 'SAURAV10' },
    ];
    const customers = [];
    for (const c of CUST_DATA) {
        const u = await prisma.user.upsert({ where: { email: c.email }, update: {}, create: { ...c, role: 'customer' } });
        customers.push(u);
    }
    console.log(`✅ ${customers.length} customers`);

    // ── Categories ────────────────────────────────────────────────────
    const CATS = [
        { name: 'Graphics Cards', slug: 'graphics-cards', description: 'GPUs for gaming & workloads' },
        { name: 'Processors', slug: 'processors', description: 'Desktop & laptop CPUs' },
        { name: 'RAM', slug: 'ram', description: 'Memory modules' },
        { name: 'Storage', slug: 'storage', description: 'SSDs, HDDs, NVMe' },
        { name: 'Motherboards', slug: 'motherboards', description: 'Intel & AMD boards' },
        { name: 'Power Supplies', slug: 'power-supplies', description: 'PSUs for every build' },
        { name: 'Cabinets', slug: 'cabinets', description: 'PC cases' },
        { name: 'Cooling', slug: 'cooling', description: 'Air & liquid coolers' },
        { name: 'Monitors', slug: 'monitors', description: 'Gaming & pro displays' },
        { name: 'Peripherals', slug: 'peripherals', description: 'Keyboards, mice, headsets' },
        { name: 'Laptops', slug: 'laptops', description: 'Gaming & productivity laptops' },
        { name: 'Accessories', slug: 'accessories', description: 'Cables, adapters, tools' },
    ];
    for (const c of CATS) await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    console.log(`✅ ${CATS.length} categories`);

    // ── Service Types ─────────────────────────────────────────────────
    const ST = [
        { title: 'Expert PC Repair', description: 'Diagnose and fix any hardware/software issue.', icon: 'Wrench', price: '₹499', features: ['Free Diagnostics', 'No Fix No Fee', '7-Day Warranty', 'Original Parts'] },
        { title: 'Deep Cleaning Service', description: 'Dust removal, thermal repasting, polish.', icon: 'Monitor', price: '₹999', features: ['Thermal Paste Replacement', 'Fan Cleaning', 'Cable Management', 'Exterior Polish'] },
        { title: 'Custom PC Build', description: 'We build your dream PC from components.', icon: 'Cpu', price: '₹2,499', features: ['Component Selection', 'Cable Management', 'Stress Test', 'BIOS Optimization'] },
        { title: 'Laptop Screen Repair', description: 'LCD/LED screen replacement for all brands.', icon: 'Monitor', price: '₹2,999', features: ['All Brands', 'Original Screens', 'Same-Day', '30-Day Warranty'] },
        { title: 'Data Recovery', description: 'Recover data from damaged drives.', icon: 'HardDrive', price: '₹1,499', features: ['HDD & SSD', 'Pen Drive', 'No Data No Charge', 'Confidential'] },
        { title: 'Printer Setup & Repair', description: 'Setup, drivers, and repair for all printers.', icon: 'Printer', price: '₹399', features: ['Inkjet & Laser', 'WiFi Setup', 'Driver Installation', 'Cartridge Refill'] },
        { title: 'CCTV Installation', description: 'Complete CCTV setup with remote viewing.', icon: 'Settings', price: '₹3,999', features: ['HD Cameras', 'Night Vision', 'Remote Access', '1-Year Warranty'] },
        { title: 'Networking Setup', description: 'WiFi, LAN, and router configuration.', icon: 'Wifi', price: '₹799', features: ['WiFi 6 Setup', 'LAN Cabling', 'Range Extender', 'Speed Optimization'] },
    ];
    for (const s of ST) await prisma.serviceType.upsert({ where: { title: s.title }, update: {}, create: s });
    console.log(`✅ ${ST.length} service types`);

    // ── Technicians (New for Service Hub) ──────────────────────────────
    const TECHS = [
        { name: 'Ravi Kumar', phone: '9876599001', email: 'ravi.tech@example.com', skills: ['Laptop Repair', 'Desktop Support'] },
        { name: 'Suresh Patel', phone: '9876599002', email: 'suresh.tech@example.com', skills: ['Deep Cleaning', 'Custom Build'] },
        { name: 'Mohan Das', phone: '9876599003', email: 'mohan.tech@example.com', skills: ['Printer Setup', 'Networking'] },
        { name: 'Arjun Verma', phone: '9876599004', email: 'arjun.tech@example.com', skills: ['Data Recovery', 'CCTV'] },
    ];
    const technicians = [];
    for (const t of TECHS) {
        const tech = await prisma.technician.upsert({ where: { phone: t.phone }, update: {}, create: t });
        technicians.push(tech);
    }
    console.log(`✅ ${technicians.length} technicians`);

    // ── Products (150) ────────────────────────────────────────────────
    let productCount = 0;
    for (const t of TEMPLATES) {
        const existing = await prisma.product.findFirst({ where: { title: t.title } });
        if (existing) continue;
        const basePrice = t.base;
        const p = await prisma.product.create({
            data: {
                title: t.title,
                price: basePrice,
                stock: rand(5, 40),
                category: t.cat,
                brand: pick(BRANDS[t.type]),
                image: IMAGES[t.type],
                description: `${t.title} — premium ${t.cat.toLowerCase()} product. High performance, excellent build quality.`,
                rating: parseFloat((3.8 + Math.random() * 1.1).toFixed(1)),
                numReviews: rand(10, 300),
                specs: { category: t.cat, type: t.type.toUpperCase(), warranty: `${rand(1, 3)} Year${rand(1, 3) > 1 ? 's' : ''}` },
            }
        });
        const variants = makeVariants(t.type, basePrice);
        for (const v of variants) {
            await prisma.productVariant.create({ data: { productId: p.id, name: v.name, price: v.price, stock: v.stock } });
        }
        productCount++;
    }
    console.log(`✅ ${productCount} products with variants`);

    // ── Sample Reviews ────────────────────────────────────────────────
    const reviewTexts = [
        'Absolutely love it! Best purchase this year.', 'Amazing quality, totally worth the price.',
        'Good performance for the cost.', 'Delivery was fast, product as described.',
        'Excellent build quality. Highly recommended!', 'Works perfectly. Very satisfied.',
        'Top-notch. Exceeded my expectations!', 'Solid product with great warranty support.',
        'Budget-friendly and performs well.', 'Premium feel. Will buy again.',
    ];
    const prods = await prisma.product.findMany({ take: 30 });
    for (let i = 0; i < prods.length; i++) {
        const cust = customers[i % customers.length];
        const exists = await prisma.review.findFirst({ where: { productId: prods[i].id, userId: cust.id } });
        if (!exists) {
            await prisma.review.create({
                data: { productId: prods[i].id, userId: cust.id, rating: rand(4, 5), comment: reviewTexts[i % reviewTexts.length] }
            });
        }
    }
    console.log('✅ Reviews created');

    // ── Sample Orders ─────────────────────────────────────────────────
    const orderProds = await prisma.product.findMany({ take: 20 });
    for (let i = 0; i < 30; i++) {
        const cust = customers[i % customers.length];
        const p1 = orderProds[i % orderProds.length];
        const p2 = orderProds[(i + 3) % orderProds.length];
        const total = p1.price + p2.price;
        const daysAgo = rand(0, 30);
        const createdAt = new Date(Date.now() - daysAgo * 86400000);
        await prisma.order.create({
            data: {
                userId: cust.id, total,
                isPaid: i < 25,
                paymentMethod: pick(['razorpay', 'cod', 'upi']),
                status: pick(['Processing', 'Shipped', 'Delivered', 'Delivered', 'Delivered']),
                shippingAddress: JSON.stringify({ name: cust.name, address: `${i + 1}, MG Road`, city: pick(['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai']), pincode: `${560000 + i}`, phone: cust.phone }),
                createdAt,
                items: { create: [{ productId: p1.id, quantity: 1, price: p1.price }, { productId: p2.id, quantity: rand(1, 3), price: p2.price }] }
            }
        });
    }
    console.log('✅ 30 orders created');

    // ── Service Bookings (25) ─────────────────────────────────────────
    const serviceTypes = ['Expert PC Repair', 'Deep Cleaning Service', 'Custom PC Build', 'Laptop Screen Repair', 'Data Recovery', 'Printer Setup & Repair', 'CCTV Installation', 'Networking Setup'];
    const devices = ['Laptop', 'Desktop', 'Printer', 'Monitor', 'All-in-One'];
    const brands2 = ['HP', 'Dell', 'Lenovo', 'ASUS', 'Acer', 'Apple', 'Samsung'];
    const cities = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur'];
    const statuses = ['Pending', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'Pending', 'Confirmed'];
    const issues = [
        'Device overheating and shutting down randomly',
        'Need thorough internal cleaning, lots of dust buildup',
        'Want to build a gaming PC within ₹1.5L budget',
        'Cracked laptop screen, need urgent replacement',
        'Accidentally deleted important project files',
        'Printer not detecting ink cartridge',
        'Need CCTV installed at shop premises',
        'Office WiFi range is poor, need range extenders',
        'Blue screen errors every few hours',
        'System running very slow, needs optimization',
        'Laptop keyboard not working after liquid spill',
        'Hard drive clicking sounds, need data recovery',
        'Need custom water cooling loop built',
        'Monitor flickering and display glitches',
        'Gaming PC needs RGB synchronization setup',
        'Need networking cable done for 5 workstations',
        'Laptop battery drains in 30 minutes',
        'Dead pixel issues on monitor',
        'System not booting POST failure',
        'Need thermal repaste on gaming laptop',
        'Two printers need driver reinstallation',
        'Router configuration for guest network',
        'Data migration from old HDD to new SSD',
        'Laptop hinge broken needs physical repair',
        'Annual maintenance contract for 10 PCs',
    ];

    for (let i = 0; i < 25; i++) {
        const cust = customers[i % customers.length];
        await prisma.serviceBooking.create({
            data: {
                userId: cust.id,
                serviceType: serviceTypes[i % serviceTypes.length],
                description: issues[i],
                deviceType: pick(devices),
                deviceBrand: pick(brands2),
                date: new Date(Date.now() + rand(1, 10) * 86400000),
                timeSlot: pick(['10:00 AM - 12:00 PM', '12:00 PM - 02:00 PM', '02:00 PM - 04:00 PM', '04:00 PM - 06:00 PM']),
                status: statuses[i % statuses.length],
                customerName: cust.name,
                customerPhone: cust.phone,
                address: `${200 + i}, Tech Park Road`,
                city: cities[i % cities.length],
                pincode: `${560001 + i}`,
                estimatedPrice: ['Confirmed', 'In Progress', 'Completed'].includes(statuses[i % statuses.length]) ? rand(5, 30) * 100 : null,
                finalPrice: statuses[i % statuses.length] === 'Completed' ? rand(8, 40) * 100 : null,
                technicianId: ['Confirmed', 'In Progress', 'Completed'].includes(statuses[i % statuses.length]) ? pick(technicians).id : null,
                otpVerified: statuses[i % statuses.length] === 'In Progress' || statuses[i % statuses.length] === 'Completed',
                pickupOtp: ['Confirmed'].includes(statuses[i % statuses.length]) ? String(rand(100000, 999999)) : null,
                confirmedAt: ['Confirmed', 'In Progress', 'Completed'].includes(statuses[i % statuses.length]) ? new Date(Date.now() - rand(1, 5) * 86400000) : null,
                completedAt: statuses[i % statuses.length] === 'Completed' ? new Date(Date.now() - rand(1, 2) * 86400000) : null,
            }
        });
    }
    console.log('✅ 25 service bookings created');

    // ── Coupons ───────────────────────────────────────────────────────
    const coupons = [
        { code: 'WELCOME10', discountType: 'percent', value: 10, active: true, minOrderAmount: 1000 },
        { code: 'FLAT500', discountType: 'fixed', value: 500, active: true, minOrderAmount: 5000 },
        { code: 'GPU20', discountType: 'percent', value: 20, active: true, minOrderAmount: 20000 },
        { code: 'SUMMER15', discountType: 'percent', value: 15, active: true },
        { code: 'NEWUSER', discountType: 'fixed', value: 300, active: true, minOrderAmount: 3000 },
    ];
    for (const c of coupons) await prisma.coupon.upsert({ where: { code: c.code }, update: {}, create: c });
    console.log('✅ 5 coupons created');

    // ── Courses (8 with multiple durations & batches) ────────────────
    await prisma.courseApplication.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.courseDuration.deleteMany({});
    await prisma.course.deleteMany({});

    const COURSES = [
        { title: 'CCC (Course on Computer Concepts)', description: 'Essential computer literacy — 80 hours. NIELIT syllabus.', thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600', durations: [{ label: '1 Month', fee: 1500, disc: 5, inst: 1 }, { label: '2 Months', fee: 2500, disc: 8, inst: 2 }] },
        { title: 'DCA (Diploma in Computer Applications)', description: '6-month diploma covering fundamentals of computer applications.', thumbnail: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600', durations: [{ label: '3 Months', fee: 5000, disc: 10, inst: 3 }, { label: '6 Months', fee: 8000, disc: 12, inst: 6 }] },
        { title: 'O Level (IT Foundation)', description: 'NIELIT O-Level — foundation in IT, equivalent to diploma.', thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600', durations: [{ label: '6 Months', fee: 9000, disc: 10, inst: 6 }, { label: '1 Year', fee: 15000, disc: 15, inst: 12 }] },
        { title: 'PC Building Masterclass', description: 'Hands-on training to build a gaming PC from scratch.', thumbnail: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600', durations: [{ label: '1 Month', fee: 3000, disc: 5, inst: 1 }, { label: '2 Months', fee: 5000, disc: 10, inst: 2 }] },
        { title: 'Overclocking & Benchmarking', description: 'Advanced CPU/GPU overclocking practical sessions.', thumbnail: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600', durations: [{ label: '2 Weeks', fee: 2000, disc: 0, inst: 1 }, { label: '1 Month', fee: 3500, disc: 5, inst: 1 }] },
        { title: 'Hardware Troubleshooting Pro', description: 'Diagnose BSODs, overheating, boot failures in lab.', thumbnail: 'https://images.unsplash.com/photo-1597872258083-ef52741e4694?w=600', durations: [{ label: '1 Month', fee: 4000, disc: 8, inst: 1 }, { label: '3 Months', fee: 9000, disc: 12, inst: 3 }] },
        { title: 'Tally Prime + GST', description: 'Complete Tally Prime with GST, payroll, and inventory.', thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600', durations: [{ label: '2 Months', fee: 4000, disc: 5, inst: 2 }, { label: '4 Months', fee: 7000, disc: 10, inst: 4 }] },
        { title: 'Web Development Bootcamp', description: 'HTML, CSS, JavaScript, React — full frontend development.', thumbnail: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=600', durations: [{ label: '3 Months', fee: 8000, disc: 10, inst: 3 }, { label: '6 Months', fee: 14000, disc: 15, inst: 6 }] },
    ];

    const BATCHES = [
        { name: 'Morning', timing: '8:00 AM – 10:00 AM', seats: 20 },
        { name: 'Afternoon', timing: '12:00 PM – 2:00 PM', seats: 20 },
        { name: 'Evening', timing: '4:00 PM – 6:00 PM', seats: 25 },
        { name: 'Weekend', timing: 'Sat-Sun 10:00AM–1PM', seats: 15 },
    ];

    for (const cd of COURSES) {
        const course = await prisma.course.create({
            data: { title: cd.title, description: cd.description, instructor: 'Institute Faculty', category: 'Computer', thumbnail: cd.thumbnail, hasCertificate: true, isPublished: true }
        });
        for (const d of cd.durations) {
            const dur = await prisma.courseDuration.create({
                data: { courseId: course.id, label: d.label, totalFee: d.fee, fullPayDiscount: d.disc, installments: d.inst }
            });
            for (const b of BATCHES) {
                await prisma.courseBatch.create({ data: { durationId: dur.id, name: b.name, timing: b.timing, seatLimit: b.seats } });
            }
        }
    }
    console.log(`✅ ${COURSES.length} courses with multiple durations & 4 batches each`);

    // ── Banners ───────────────────────────────────────────────────────
    const BANNERS = [
        { title: 'Mega GPU Sale — Up to 20% Off!', subtitle: 'Shop the best graphics cards at unbeatable prices.', image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1200', ctaLabel: 'Shop GPUs', ctaLink: '/products?category=Graphics+Cards', active: true, displayOrder: 1 },
        { title: 'Doorstep Repair Service', subtitle: 'Certified technicians at your home. Starts at ₹499.', image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=1200', ctaLabel: 'Book Service', ctaLink: '/services', active: true, displayOrder: 2 },
        { title: 'Custom PC Build — Starting ₹60,000', subtitle: 'We source, assemble, and test your dream machine.', image: 'https://images.unsplash.com/photo-1555418341-9c96abdc8aa4?w=1200', ctaLabel: 'Get a Quote', ctaLink: '/services', active: true, displayOrder: 3 },
        { title: 'IT Courses — Enroll Now', subtitle: 'CCC, DCA, O-Level, Tally and more. Morning & evening batches.', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200', ctaLabel: 'Explore Courses', ctaLink: '/courses', active: true, displayOrder: 4 },
    ];
    for (const b of BANNERS) {
        const ex = await prisma.banner.findFirst({ where: { title: b.title } });
        if (!ex) await prisma.banner.create({ data: b });
    }
    console.log(`✅ ${BANNERS.length} banners`);

    // ── Referrals ─────────────────────────────────────────────────────
    for (let i = 0; i < 5; i++) {
        const referrer = customers[i];
        const referee = customers[(i + 1) % customers.length];
        await prisma.user.update({ where: { id: referee.id }, data: { referredById: referrer.id } });
        const ex = await prisma.referral.findFirst({ where: { referrerId: referrer.id, refereeId: referee.id } });
        if (!ex) await prisma.referral.create({ data: { referrerId: referrer.id, refereeId: referee.id, status: pick(['pending', 'completed', 'rewarded']), rewardAmount: 200 } });
    }
    console.log('✅ Referrals created');

    console.log('\n🎉 Database seeded! Summary:');
    console.log(`   Products     : ${productCount} (with variants)`);
    console.log(`   Customers    : ${customers.length}`);
    console.log(`   Service Book.: 25`);
    console.log(`   Courses      : ${COURSES.length} (${COURSES.length * 2} durations, ${COURSES.length * 2 * 4} batches)`);
    console.log(`   Orders       : 30`);
    console.log(`   Banners      : ${BANNERS.length}`);
}

main()
    .catch(e => { console.error('❌ Seed error:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
