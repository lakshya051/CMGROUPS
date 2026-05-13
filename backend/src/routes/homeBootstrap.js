import express from 'express';
import prisma, { isDatabaseUnavailable } from '../lib/prisma.js';
import cache from '../lib/cache.js';
import { getFeatureFlags } from '../lib/featureFlags.js';

const router = express.Router();

const CACHE_KEY = 'home:bootstrap';
const FRESH_TTL = 90;     // 90 s — shorter than category pages so the homepage feels fresh.
const STALE_TTL = 600;    // 10 min — far past freshness so a slow DB never breaks the home page.

// ─── Sub-queries ──────────────────────────────────────────────────────────────
// Each section here is what the various Home.jsx components used to fetch on
// their own. Keeping them as small pure functions makes it easy to drop or add
// sections later, and to reason about which one is slow if a regression appears.

const productCardInclude = {
    variantOptions: {
        include: { values: { orderBy: { position: 'asc' } } },
        orderBy: { position: 'asc' },
    },
    variants: {
        where: { isActive: true },
        orderBy: { price: 'asc' },
    },
};

const enrichProduct = (p) => {
    const variantStock = p.hasVariants && p.variants.length > 0
        ? p.variants.reduce((sum, v) => sum + v.stock, 0)
        : null;
    const effectiveStock = variantStock !== null ? variantStock : p.stock;
    if (p.hasVariants && p.variants.length > 0) {
        const cheapest = p.variants[0];
        return {
            ...p,
            displayPrice: cheapest.price,
            displayMrp: cheapest.originalPrice != null && cheapest.originalPrice > cheapest.price ? cheapest.originalPrice : null,
            totalStock: effectiveStock,
        };
    }
    return {
        ...p,
        displayPrice: p.price,
        displayMrp: p.originalPrice != null && p.originalPrice > p.price ? p.originalPrice : null,
        totalStock: effectiveStock,
    };
};

const fetchBanners = () =>
    prisma.banner.findMany({
        where: { active: true },
        orderBy: { displayOrder: 'asc' },
    });

const fetchCategories = () =>
    prisma.category.findMany({ orderBy: { name: 'asc' } });

const fetchDeals = async () => {
    const deals = await prisma.product.findMany({
        where: { isActive: true, isDeal: true },
        orderBy: { id: 'desc' },
        take: 12,
        include: productCardInclude,
    });
    return deals.map(enrichProduct);
};

const fetchBestSellers = async () => {
    const items = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { rating: 'desc' },
        take: 10,
        include: productCardInclude,
    });
    return items.map(enrichProduct);
};

const fetchHotBundles = async () => {
    const bundles = await prisma.bundle.findMany({
        where: { isActive: true },
        include: {
            items: {
                orderBy: { position: 'asc' },
                include: {
                    product: {
                        select: {
                            id: true, title: true, price: true, images: true, stock: true,
                            category: true, rating: true, hasVariants: true,
                            variants: { where: { isActive: true }, orderBy: { price: 'asc' }, select: { id: true, name: true, price: true, stock: true, combination: true } },
                        },
                    },
                    serviceType: { select: { id: true, title: true, description: true, icon: true, price: true } },
                    course: { select: { id: true, title: true, description: true, thumbnail: true, durations: { select: { id: true, label: true, totalFee: true }, take: 1, orderBy: { totalFee: 'asc' } } } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const isActive = (b) => {
        if (!b.isActive) return false;
        if (b.startDate && now < b.startDate) return false;
        if (b.endDate && now > b.endDate) return false;
        return true;
    };
    const parseServicePrice = (priceStr) => {
        if (!priceStr) return 0;
        const digits = String(priceStr).replace(/[^0-9.]/g, '');
        return parseFloat(digits) || 0;
    };
    const enrichBundle = (b) => {
        const itemTotal = b.items.reduce((sum, bi) => {
            if (bi.itemType === 'product' && bi.product) {
                const variant = bi.variantId && bi.product.variants?.length > 0
                    ? bi.product.variants.find(v => v.id === bi.variantId)
                    : null;
                const unit = variant ? variant.price : bi.product.price;
                return sum + unit * bi.quantity;
            }
            if (bi.itemType === 'service' && bi.serviceType?.price) {
                return sum + parseServicePrice(bi.serviceType.price) * bi.quantity;
            }
            if (bi.itemType === 'course' && bi.course) {
                const fee = bi.course.durations?.[0]?.totalFee ?? 0;
                return sum + fee * bi.quantity;
            }
            return sum;
        }, 0);
        return {
            ...b,
            itemTotal,
            savings: Math.max(0, itemTotal - b.bundlePrice),
            savingsPercent: itemTotal > 0 ? Math.round(((itemTotal - b.bundlePrice) / itemTotal) * 100) : 0,
        };
    };

    return bundles
        .filter(isActive)
        .filter(b => Array.isArray(b.displayOn) && b.displayOn.includes('home'))
        .map(enrichBundle);
};

const fetchBundleTemplates = () =>
    prisma.bundleTemplate.findMany({
        where: { isActive: true },
        include: { slots: { orderBy: { position: 'asc' } } },
        orderBy: { createdAt: 'desc' },
    });

const fetchCourses = () =>
    prisma.course.findMany({
        where: { isPublished: true },
        include: {
            durations: {
                include: {
                    batches: {
                        include: {
                            _count: { select: { applications: { where: { status: { in: ['Approved', 'Enrolled', 'Completed'] } } } } },
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

const fetchServiceTypes = () =>
    prisma.serviceType.findMany({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
    });

const fetchTopBrands = async () => {
    // GROUP BY brand for the marquee — replaces the old N+1 hack of pulling
    // 100 products and counting client-side.
    const rows = await prisma.product.groupBy({
        by: ['brand'],
        where: { isActive: true, brand: { not: null } },
        _count: { brand: true },
        orderBy: { _count: { brand: 'desc' } },
        take: 10,
    });
    return rows
        .filter(r => r.brand)
        .map(r => ({ name: r.brand, count: r._count.brand }));
};

// ─── Route ────────────────────────────────────────────────────────────────────

const buildBootstrap = async () => {
    // Promise.all so the entire bootstrap is one wave of parallel queries on the
    // server. The product enrichment functions all use the same productCardInclude
    // which Prisma can plan well.
    //
    // `Promise.allSettled` would also be reasonable here (degrade individual
    // sections rather than the whole payload) but the route's catch+empty-fallback
    // already provides the same outcome on a sick DB, so allSettled is overkill.
    //
    // Read the bundles flag up front so we can skip both bundle queries
    // entirely when the feature is off — saves DB work AND avoids leaking
    // bundle data to a client that we just told "bundles are disabled".
    const flags = await getFeatureFlags().catch(() => ({ bundlesEnabled: false }));
    const wantBundles = flags.bundlesEnabled;

    const [
        banners, categories, deals, bundles, bundleTemplates,
        courses, serviceTypes, bestSellers, brands,
    ] = await Promise.all([
        fetchBanners(),
        fetchCategories(),
        fetchDeals(),
        wantBundles ? fetchHotBundles() : Promise.resolve([]),
        wantBundles ? fetchBundleTemplates() : Promise.resolve([]),
        fetchCourses(),
        fetchServiceTypes(),
        fetchBestSellers(),
        fetchTopBrands(),
    ]);

    return {
        banners,
        categories,
        deals,
        bundles,
        bundleTemplates,
        courses,
        serviceTypes,
        bestSellers,
        brands,
        // Echo the public flags inside the bootstrap so first paint already
        // knows which surfaces to render — saves a separate /feature-flags
        // round-trip on cold load.
        featureFlags: { bundlesEnabled: wantBundles },
        // Surfacing the cache age helps the frontend decide whether to show a
        // "data is stale" notice if the DB is sick and we're serving from cache.
        generatedAt: new Date().toISOString(),
    };
};

router.get('/', async (req, res) => {
    try {
        const payload = await cache.getOrRefresh(CACHE_KEY, FRESH_TTL, STALE_TTL, buildBootstrap);
        res.json(payload);
    } catch (error) {
        if (isDatabaseUnavailable(error)) {
            // No fresh, no stale, DB down — return an empty-but-valid shape so
            // every Home component renders its empty state instead of crashing.
            return res.json({
                banners: [],
                categories: [],
                deals: [],
                bundles: [],
                bundleTemplates: [],
                courses: [],
                serviceTypes: [],
                bestSellers: [],
                brands: [],
                featureFlags: { bundlesEnabled: false },
                generatedAt: new Date().toISOString(),
                degraded: true,
            });
        }
        console.error('Home bootstrap error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
