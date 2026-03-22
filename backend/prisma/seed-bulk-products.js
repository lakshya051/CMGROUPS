/**
 * Bulk-insert random products with image URLs. No users, orders, or reviews.
 * Every product: isReturnable=false, returnWindowDays=0 (no return policy).
 * Mix: simple SKUs, multi-SKU (2–5 variants), and matrix products (Size × Color + variantOptions).
 *
 * Usage (from backend/):
 *   npm run seed:bulk-products
 *   BULK_PRODUCT_COUNT=2000 npm run seed:bulk-products
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { default: prisma } = await import('../src/lib/prisma.js');

const TOTAL = Math.min(5000, Math.max(1, parseInt(process.env.BULK_PRODUCT_COUNT || '1500', 10)));

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const priceFrom = (base) => Math.round((base + rand(-Math.floor(base * 0.15), Math.floor(base * 0.25))) / 100) * 100;

const CATEGORIES = [
    'Graphics Cards', 'Processors', 'RAM', 'Storage', 'Motherboards', 'Power Supplies',
    'Cabinets', 'Cooling', 'Monitors', 'Peripherals', 'Laptops', 'Accessories',
    'Networking', 'Audio', 'Smart Home', 'Office', 'Gaming', 'Mobile', 'Cameras', 'Wearables',
];

const BRANDS = [
    'ASUS', 'MSI', 'Gigabyte', 'Samsung', 'LG', 'Dell', 'HP', 'Lenovo', 'Apple', 'Sony',
    'Corsair', 'Logitech', 'Razer', 'SteelSeries', 'HyperX', 'NZXT', 'Noctua', 'Crucial',
    'Kingston', 'WD', 'Seagate', 'Intel', 'AMD', 'NVIDIA', 'BenQ', 'Acer', 'Anker', 'TP-Link',
];

const ADJECTIVES = ['Pro', 'Ultra', 'Elite', 'Prime', 'Max', 'Plus', 'Neo', 'X', 'Air', 'Lite', 'Studio', 'Gaming', 'Business'];
const NOUNS = ['Station', 'Hub', 'Dock', 'Adapter', 'Cable', 'Charger', 'Stand', 'Mount', 'Kit', 'Bundle', 'Pack', 'System', 'Module'];

const MULTI_SKU_LABEL_SETS = [
    ['Standard', 'Pro', 'Elite'],
    ['128GB', '256GB', '512GB', '1TB'],
    ['Wired', 'Wireless', 'Wireless + Case'],
    ['Black', 'Silver', 'White'],
    ['Single fan', 'Dual fan', 'Triple fan'],
    ['650W', '750W', '850W', '1000W'],
    ['FHD', 'QHD', '4K'],
    ['6GB', '8GB', '12GB', '16GB'],
];

const UNSPLASH_IDS = [
    '1591488320449-011701bb6704', '1555617981-dac3880eac6e', '1563770660941-20978e870e26',
    '1565536421961-d703e847c94b', '1518770660439-4636190af475', '1587202372589-95242d5af8e8',
    '1496181133206-80ce9b88a853', '1527443224154-c4a3942d3acf', '1527864550417-7fd91fc51a46',
    '1587202372775-e229f172b9d7', '1593640408182-31c70c8268f5', '1555618254-5e28e2a3de2e',
    '1517694712202-14dd9538aa97', '1542744173-8e7e53415bb0', '1555066931-4365d14bab8c',
    '1597872258083-ef52741e4694', '1554224155-6726b3ff858f', '1547658719-da2b51169166',
    '1555418341-9c96abdc8aa4', '1597872200969-2b65d56bd16b', '1505740420928-5e560c06d30e',
    '1523275339524-643329547356', '1560475214-34b9eac1113e', '1583394838335-19b32284d9fa',
];

function imagesForIndex(i) {
    const n = rand(3, 5);
    const urls = [];
    for (let k = 0; k < n; k++) {
        const photo = UNSPLASH_IDS[(i + k * 17) % UNSPLASH_IDS.length];
        urls.push(`https://images.unsplash.com/photo-${photo}?w=800&q=80&auto=format&fit=crop`);
    }
    urls.push(`https://picsum.photos/seed/bulk-${i}/800/600`);
    return urls;
}

function titleForIndex(i) {
    const cat = CATEGORIES[i % CATEGORIES.length];
    const brand = BRANDS[i % BRANDS.length];
    if (i % 4 === 0) return `${brand} ${pick(ADJECTIVES)} ${pick(NOUNS)} — ${cat} #${10000 + i}`;
    if (i % 4 === 1) return `Bulk Catalog ${cat} Item ${i + 1}`;
    return `${pick(ADJECTIVES)} ${cat} Series ${brand} ${rand(100, 999)}`;
}

/** 0 = simple, 1 = multi-SKU (named variants), 2 = matrix + variantOptions */
function productKind(i) {
    const r = i % 10;
    if (r < 4) return 0;
    if (r < 8) return 1;
    return 2;
}

function baseProductFields(i) {
    const category = CATEGORIES[i % CATEGORIES.length];
    const base = rand(499, 249999);
    const p = priceFrom(base);
    const orig = Math.random() > 0.4 ? priceFrom(p * 1.08) : null;
    const second = Math.random() < 0.08;
    const refurbed = !second && Math.random() < 0.06;

    return {
        title: titleForIndex(i),
        price: p,
        originalPrice: orig,
        stock: rand(0, 120),
        category,
        brand: pick(BRANDS),
        sellerName: pick(['CM Store', 'Tech Plaza', 'Digital Hub', 'Prime Retail', 'Metro Electronics', null]),
        images: imagesForIndex(i),
        description: `High-quality ${category.toLowerCase()} item. Family SKU BULK-FAM-${String(i).padStart(5, '0')}. Suitable for home and professional use.`,
        specs: {
            familySku: `BULK-FAM-${String(i).padStart(5, '0')}`,
            category,
            weightKg: parseFloat((0.05 + Math.random() * 8).toFixed(2)),
            color: pick(['Black', 'Silver', 'White', 'Gray', 'Blue']),
            warrantyMonths: pick([12, 24, 36]),
            countryOfOrigin: pick(['India', 'China', 'Vietnam', 'Taiwan', 'USA']),
            packageContents: ['Unit', 'Quick start guide', pick(['Cable', 'Adapter', 'Bracket', 'Mounting kit'])],
        },
        rating: parseFloat((3.2 + Math.random() * 1.7).toFixed(1)),
        numReviews: rand(0, 850),
        condition: refurbed ? 'Refurbished' : second ? 'Used — Good' : 'New',
        isSecondHand: second,
        isRefurbished: refurbed,
        isReturnable: false,
        returnWindowDays: 0,
        referrerPoints: Math.random() > 0.7 ? rand(50, 400) : null,
        refereePoints: Math.random() > 0.75 ? rand(25, 200) : null,
        isActive: Math.random() > 0.03,
        hasVariants: false,
    };
}

function uniqueSku(prefix, i, k) {
    return `${prefix}-${i}-${k}-${rand(10000, 99999)}`;
}

function buildSimpleMultiVariants(i, basePrice, images) {
    const labelSet = pick(MULTI_SKU_LABEL_SETS);
    const n = Math.min(labelSet.length, rand(2, Math.min(5, labelSet.length)));
    const labels = labelSet.slice(0, n);
    const rows = [];
    for (let k = 0; k < n; k++) {
        const mult = 1 + k * (0.04 + Math.random() * 0.06);
        const vp = priceFrom(basePrice * mult);
        rows.push({
            name: labels[k],
            price: vp,
            originalPrice: Math.random() > 0.45 ? priceFrom(vp * 1.1) : null,
            stock: rand(0, 55),
            sku: uniqueSku('BMS', i, k),
            image: Math.random() > 0.65 ? pick(images) : null,
        });
    }
    return rows;
}

function buildMatrixVariants(i, basePrice, images) {
    const sizePool = pick([
        ['S', 'M', 'L'],
        ['Small', 'Medium', 'Large'],
        ['13"', '14"', '16"'],
    ]);
    const colorPool = pick([
        ['Black', 'Silver'],
        ['Black', 'White', 'Navy'],
        ['Graphite', 'Silver', 'Gold'],
    ]);
    const sizes = sizePool.slice(0, rand(2, sizePool.length));
    const colors = colorPool.slice(0, rand(2, colorPool.length));

    const variantRows = [];
    let idx = 0;
    for (const sz of sizes) {
        for (const col of colors) {
            const mult = 1 + (sizes.indexOf(sz) + colors.indexOf(col)) * 0.03 + Math.random() * 0.05;
            const vp = priceFrom(basePrice * mult);
            variantRows.push({
                name: `${sz} / ${col}`,
                combination: { Size: sz, Color: col },
                price: vp,
                originalPrice: Math.random() > 0.5 ? priceFrom(vp * 1.08) : null,
                stock: rand(0, 35),
                sku: uniqueSku('BMX', i, idx),
                image: Math.random() > 0.7 ? pick(images) : null,
            });
            idx++;
        }
    }

    const variantOptions = {
        create: [
            {
                name: 'Size',
                position: 0,
                values: { create: sizes.map((value, position) => ({ value, position })) },
            },
            {
                name: 'Color',
                position: 1,
                values: { create: colors.map((value, position) => ({ value, position })) },
            },
        ],
    };

    return { variantRows, variantOptions };
}

async function main() {
    console.log(`Bulk seed: creating ${TOTAL} products (mix of simple + multi-SKU; no users; no return policy)…`);

    let simpleCount = 0;
    let multiCount = 0;
    let matrixCount = 0;

    for (let i = 0; i < TOTAL; i++) {
        const kind = productKind(i);
        const row = baseProductFields(i);

        if (kind === 0) {
            row.hasVariants = false;
            await prisma.product.create({ data: row });
            simpleCount++;
        } else if (kind === 1) {
            const variants = buildSimpleMultiVariants(i, row.price, row.images);
            const prices = variants.map((v) => v.price);
            row.hasVariants = true;
            row.price = Math.min(...prices);
            row.originalPrice =
                variants.some((v) => v.originalPrice != null)
                    ? Math.max(...variants.map((v) => v.originalPrice || v.price))
                    : null;
            row.stock = variants.reduce((s, v) => s + v.stock, 0);
            await prisma.product.create({
                data: {
                    ...row,
                    variants: { create: variants },
                },
            });
            multiCount++;
        } else {
            const { variantRows, variantOptions } = buildMatrixVariants(i, row.price, row.images);
            const prices = variantRows.map((v) => v.price);
            row.hasVariants = true;
            row.price = Math.min(...prices);
            row.originalPrice =
                variantRows.some((v) => v.originalPrice != null)
                    ? Math.max(...variantRows.map((v) => v.originalPrice || v.price))
                    : null;
            row.stock = variantRows.reduce((s, v) => s + v.stock, 0);
            await prisma.product.create({
                data: {
                    ...row,
                    variantOptions,
                    variants: { create: variantRows },
                },
            });
            matrixCount++;
        }

        if ((i + 1) % 200 === 0 || i + 1 === TOTAL) {
            console.log(`  … ${i + 1} / ${TOTAL} (simple ${simpleCount}, multi-SKU ${multiCount}, matrix ${matrixCount})`);
        }
    }

    console.log(`Done. ${TOTAL} products — simple: ${simpleCount}, multi-SKU (named): ${multiCount}, matrix (Size×Color): ${matrixCount}.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
