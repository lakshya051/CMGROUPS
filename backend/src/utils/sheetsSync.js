import prisma from '../lib/prisma.js';
import {
    writeSheetData,
    appendRow,
    updateRowById,
    ensureSheetExists,
    formatHeaderRow,
    getSheetData,
} from './googleSheets.js';

const cctvEnquiryDelegate =
    prisma.cCTVEnquiry ?? prisma.CCTVEnquiry ?? prisma.cctvEnquiry;

const fmtDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : '');

// ─── SHEET DEFINITIONS ───────────────────────────────────────

const SHEETS = {
    Products: {
        headers: [
            'Row Type', 'Product ID', 'Title', 'Category',
            'Variant ID', 'SKU',
            'Option1 Name', 'Option1 Value',
            'Option2 Name', 'Option2 Value',
            'Option3 Name', 'Option3 Value',
            'Price', 'Original Price', 'Stock',
            'Has Variants', 'Is Active', 'Condition', 'Created At',
        ],
        // Column indices:
        //  0  Row Type       7  Option1 Value   14 Stock
        //  1  Product ID     8  Option2 Name    15 Has Variants
        //  2  Title          9  Option2 Value   16 Is Active
        //  3  Category      10  Option3 Name    17 Condition
        //  4  Variant ID    11  Option3 Value   18 Created At
        //  5  SKU           12  Price
        //  6  Option1 Name  13  Original Price
        toRow: (r) => {
            const opts = r._options || [];
            const o1 = opts[0] || {};
            const o2 = opts[1] || {};
            const o3 = opts[2] || {};

            if (r._type === 'VARIANT') {
                const combo = r.combination || {};
                return [
                    'VARIANT', r.productId, r._productTitle || '', '',
                    r.id, r.sku || '',
                    o1.name || '', combo[o1.name] || '',
                    o2.name || '', combo[o2.name] || '',
                    o3.name || '', combo[o3.name] || '',
                    r.price ?? '', r.originalPrice ?? '', r.stock ?? 0,
                    '', r.isActive ? 'Yes' : 'No', '', '',
                ];
            }
            return [
                'PRODUCT', r.id, r.title, r.category,
                '', '',
                o1.name || '', '',
                o2.name || '', '',
                o3.name || '', '',
                r.price ?? '', r.originalPrice ?? '', r.stock ?? 0,
                r.hasVariants ? 'Yes' : 'No', r.isActive ? 'Yes' : 'No',
                r.condition || 'New', fmtDate(r.createdAt),
            ];
        },
        fetchAll: async () => {
            const products = await prisma.product.findMany({
                include: {
                    variants: { orderBy: { id: 'asc' } },
                    variantOptions: {
                        include: { values: { orderBy: { position: 'asc' } } },
                        orderBy: { position: 'asc' },
                    },
                },
                orderBy: { id: 'asc' },
            });
            const rows = [];
            for (const p of products) {
                const opts = (p.variantOptions || []).slice(0, 3).map((o) => ({
                    name: o.name,
                    values: o.values.map((v) => v.value),
                }));
                rows.push({ _type: 'PRODUCT', _options: opts, ...p });
                if (p.hasVariants && p.variants?.length > 0) {
                    for (const v of p.variants) {
                        rows.push({
                            _type: 'VARIANT',
                            _productTitle: p.title,
                            _options: opts,
                            ...v,
                        });
                    }
                }
            }
            return rows;
        },
    },

    Orders: {
        headers: [
            'ID', 'Customer Name', 'Customer Email', 'Status',
            'Total', 'Wallet Used', 'Payment Method', 'Is Paid',
            'Items Count', 'Created At',
        ],
        toRow: (o) => [
            o.id,
            o.user?.name || o.guestInfo?.name || '',
            o.user?.email || o.guestInfo?.email || '',
            o.status,
            o.total,
            o.walletUsed || 0,
            o.paymentMethod || 'pay_at_store',
            o.isPaid ? 'Yes' : 'No',
            o.items?.length || 0,
            fmtDate(o.createdAt),
        ],
        fetchAll: () =>
            prisma.order.findMany({
                include: { user: true, items: true },
                orderBy: { createdAt: 'desc' },
            }),
    },

    ServiceBookings: {
        headers: [
            'ID', 'Customer Name', 'Service Type', 'Status',
            'Estimated Price', 'Final Price', 'Assigned To',
            'Booking Date', 'Created At',
        ],
        toRow: (b) => [
            b.id,
            b.customerName || b.user?.name || '',
            b.serviceType,
            b.status,
            b.estimatedPrice ?? '',
            b.finalPrice ?? '',
            b.assignedTo || '',
            fmtDate(b.date),
            fmtDate(b.createdAt),
        ],
        fetchAll: () =>
            prisma.serviceBooking.findMany({
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            }),
    },

    Customers: {
        headers: [
            'ID', 'Name', 'Email', 'Phone', 'Role',
            'Wallet Balance', 'Tier', 'Total Orders',
            'Created At',
        ],
        toRow: (u) => [
            u.id, u.name || '', u.email, u.phone || '', u.role,
            u.walletBalance || 0,
            u.tier || 'Bronze',
            u._count?.orders || 0,
            fmtDate(u.createdAt),
        ],
        fetchAll: () =>
            prisma.user.findMany({
                include: { _count: { select: { orders: true } } },
                orderBy: { createdAt: 'desc' },
            }),
    },

    Courses: {
        headers: [
            'ID', 'Title', 'Instructor', 'Category',
            'Is Published', 'Has Certificate', 'Created At',
        ],
        toRow: (c) => [
            c.id, c.title, c.instructor, c.category,
            c.isPublished ? 'Yes' : 'No',
            c.hasCertificate ? 'Yes' : 'No',
            fmtDate(c.createdAt),
        ],
        fetchAll: () => prisma.course.findMany({ orderBy: { id: 'asc' } }),
    },

    CourseApplications: {
        headers: [
            'ID', 'Student Name', 'Email', 'Phone', 'Course',
            'Payment Mode', 'Status', 'Created At',
        ],
        toRow: (a) => [
            a.id, a.name, a.email, a.phone,
            a.course?.title || '',
            a.paymentMode,
            a.status,
            fmtDate(a.createdAt),
        ],
        fetchAll: () =>
            prisma.courseApplication.findMany({
                include: { course: true },
                orderBy: { createdAt: 'desc' },
            }),
    },

    WalletTransactions: {
        headers: [
            'ID', 'User Name', 'User Email', 'Amount', 'Type',
            'Description', 'Order ID', 'Created At',
        ],
        toRow: (t) => [
            t.id,
            t.user?.name || '',
            t.user?.email || '',
            t.amount,
            t.type,
            t.description,
            t.orderId ?? '',
            fmtDate(t.createdAt),
        ],
        fetchAll: () =>
            prisma.walletTransaction.findMany({
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            }),
    },

    TallyEnquiries: {
        headers: [
            'ID', 'Name', 'Business Name', 'Phone', 'City',
            'License Type', 'Status', 'Created At',
        ],
        toRow: (e) => [
            e.id, e.name, e.businessName, e.phone, e.city,
            e.licenseType, e.status, fmtDate(e.createdAt),
        ],
        fetchAll: () =>
            prisma.tallyEnquiry.findMany({ orderBy: { createdAt: 'desc' } }),
    },

    CCTVEnquiries: {
        headers: [
            'ID', 'Name', 'Phone', 'City', 'Property Type',
            'Cameras Needed', 'Status', 'Created At',
        ],
        toRow: (e) => [
            e.id, e.name, e.phone, e.city, e.propertyType,
            e.camerasNeeded, e.status, fmtDate(e.createdAt),
        ],
        fetchAll: () =>
            cctvEnquiryDelegate
                ? cctvEnquiryDelegate.findMany({ orderBy: { createdAt: 'desc' } })
                : Promise.resolve([]),
    },
};

// ─── SYNC FUNCTIONS ──────────────────────────────────────────

export const syncSheetFull = async (sheetName) => {
    const def = SHEETS[sheetName];
    if (!def) throw new Error(`No sheet definition for: ${sheetName}`);

    await ensureSheetExists(sheetName);
    const records = await def.fetchAll();
    const rows = records.map(def.toRow);
    await writeSheetData(sheetName, def.headers, rows);
    await formatHeaderRow(sheetName);

    console.log(`[Sheets] Synced ${sheetName}: ${rows.length} rows`);
};

export const syncAllSheets = async () => {
    console.log('[Sheets] Starting full database → Sheets sync...');
    const failures = [];
    for (const sheetName of Object.keys(SHEETS)) {
        try {
            await syncSheetFull(sheetName);
        } catch (err) {
            console.error(`[Sheets] Failed to sync ${sheetName}:`, err.message);
            failures.push(sheetName);
        }
    }
    if (failures.length > 0) {
        console.warn(`[Sheets] Sync completed with failures: ${failures.join(', ')}`);
    } else {
        console.log('[Sheets] Full sync complete');
    }
    return { failures };
};

export const syncRecord = async (sheetName, record) => {
    const def = SHEETS[sheetName];
    if (!def) return;
    if (sheetName === 'Products') {
        debouncedSyncProducts();
        return;
    }
    try {
        await ensureSheetExists(sheetName);
        const row = def.toRow(record);
        await updateRowById(sheetName, record.id, row);
    } catch (err) {
        console.error(`[Sheets] Sync failed for ${sheetName}:`, err.message);
    }
};

let _productsSyncTimer = null;
export const debouncedSyncProducts = () => {
    if (_productsSyncTimer) clearTimeout(_productsSyncTimer);
    _productsSyncTimer = setTimeout(() => {
        _productsSyncTimer = null;
        syncSheetFull('Products').catch((err) =>
            console.error('[Sheets] Debounced Products sync failed:', err.message)
        );
    }, 2000);
};

// ─── SHEETS → DATABASE ───────────────────────────────────────

const cellStr = (row, i) => (row[i] === undefined || row[i] === null ? '' : String(row[i]).trim());

/** Parse float; empty cell → skip field. Allows 0. */
const cellFloat = (row, i) => {
    const s = cellStr(row, i);
    if (s === '') return undefined;
    const n = parseFloat(s.replace(/,/g, ''));
    return Number.isFinite(n) ? n : undefined;
};

/** Parse int; empty cell → skip field. Allows 0. */
const cellInt = (row, i) => {
    const s = cellStr(row, i);
    if (s === '') return undefined;
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? undefined : n;
};

/** Parallel Prisma updates per batch (avoids fragile raw SQL; still fast vs sequential). */
const IMPORT_PARALLEL_BATCH = 40;

export const importProductsFromSheet = async () => {
    const rows = await getSheetData('Products');
    if (rows.length <= 1) return { productsUpdated: 0, variantsUpdated: 0, errors: [] };

    const dataRows = rows.slice(1);
    const productPending = [];
    const variantPending = [];

    // Column indices matching the new header layout:
    //  0 Row Type  |  4 Variant ID  | 12 Price       | 16 Is Active
    //  1 Product ID|  5 SKU         | 13 Orig Price  | 17 Condition
    //  2 Title     |  6-11 Options  | 14 Stock       | 18 Created At
    //  3 Category  |                | 15 Has Variants|
    const COL = { ROW_TYPE: 0, PRODUCT_ID: 1, VARIANT_ID: 4, PRICE: 12, ORIG_PRICE: 13, STOCK: 14, IS_ACTIVE: 16 };

    for (const row of dataRows) {
        const rowType = cellStr(row, COL.ROW_TYPE).toUpperCase();

        const price = cellFloat(row, COL.PRICE);
        const origStr = cellStr(row, COL.ORIG_PRICE);
        let originalPrice;
        if (origStr === '') originalPrice = null;
        else {
            const op = parseFloat(origStr.replace(/,/g, ''));
            originalPrice = Number.isFinite(op) ? op : undefined;
        }
        const stock = cellInt(row, COL.STOCK);
        const active = cellStr(row, COL.IS_ACTIVE).toLowerCase();

        const data = {};
        if (price !== undefined) data.price = price;
        if (originalPrice !== undefined) data.originalPrice = originalPrice;
        if (stock !== undefined) data.stock = stock;
        if (active === 'yes' || active === 'no') data.isActive = active === 'yes';

        if (rowType === 'VARIANT') {
            const variantId = parseInt(cellStr(row, COL.VARIANT_ID), 10);
            if (!variantId || Number.isNaN(variantId)) continue;
            if (Object.keys(data).length === 0) continue;
            variantPending.push({ id: variantId, data });
        } else {
            const productId = parseInt(cellStr(row, COL.PRODUCT_ID), 10);
            if (!productId || Number.isNaN(productId)) continue;
            if (Object.keys(data).length === 0) continue;
            productPending.push({ id: productId, data });
        }
    }

    const results = { productsUpdated: 0, variantsUpdated: 0, errors: [] };

    const runBatch = async (pending, model, label) => {
        const combined = new Map();
        for (const { id, data } of pending) {
            combined.set(id, { ...(combined.get(id) || {}), ...data });
        }
        const unique = Array.from(combined, ([id, data]) => ({ id, data }));
        if (unique.length === 0) return 0;

        const ids = unique.map((p) => p.id);
        const existing = await model.findMany({
            where: { id: { in: ids } },
            select: { id: true, price: true, originalPrice: true, stock: true, isActive: true },
        });
        const byId = new Map(existing.map((e) => [e.id, e]));

        const merged = [];
        for (const { id, data } of unique) {
            const cur = byId.get(id);
            if (!cur) {
                results.errors.push({ id, error: `${label} not found` });
                continue;
            }
            merged.push({
                id,
                price: 'price' in data ? data.price : cur.price,
                originalPrice: 'originalPrice' in data ? data.originalPrice : cur.originalPrice,
                stock: 'stock' in data ? data.stock : cur.stock,
                isActive: 'isActive' in data ? data.isActive : cur.isActive,
            });
        }

        let count = 0;
        for (let i = 0; i < merged.length; i += IMPORT_PARALLEL_BATCH) {
            const chunk = merged.slice(i, i + IMPORT_PARALLEL_BATCH);
            const outcomes = await Promise.allSettled(
                chunk.map((r) =>
                    model.update({
                        where: { id: r.id },
                        data: {
                            price: r.price,
                            originalPrice: r.originalPrice,
                            stock: r.stock,
                            isActive: r.isActive,
                        },
                    })
                )
            );
            outcomes.forEach((out, j) => {
                if (out.status === 'fulfilled') count++;
                else results.errors.push({ id: chunk[j].id, error: out.reason?.message || String(out.reason) });
            });
        }
        return count;
    };

    results.productsUpdated = await runBatch(productPending, prisma.product, 'Product');
    results.variantsUpdated = await runBatch(variantPending, prisma.productVariant, 'Variant');

    return results;
};

export { SHEETS };
