import express from 'express';
import prisma from '../lib/prisma.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

const DEFAULT_SERVICE_SETTINGS = {
    timeSlots: ["10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM", "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM"],
    maxBookingsPerSlot: 2
};

const getDefaultServiceSettings = () => ({
    timeSlots: [...DEFAULT_SERVICE_SETTINGS.timeSlots],
    maxBookingsPerSlot: DEFAULT_SERVICE_SETTINGS.maxBookingsPerSlot
});

const hasServiceSettingsModel = () =>
    prisma.serviceSettings && typeof prisma.serviceSettings.findFirst === 'function';

const buildServiceSettingsPayload = (timeSlots, maxBookingsPerSlot, currentSettings = getDefaultServiceSettings()) => {
    const parsedMax = Number.parseInt(maxBookingsPerSlot, 10);

    return {
        timeSlots: Array.isArray(timeSlots) && timeSlots.length > 0 ? timeSlots : currentSettings.timeSlots,
        maxBookingsPerSlot: Number.isFinite(parsedMax) ? parsedMax : currentSettings.maxBookingsPerSlot
    };
};

// GET /api/admin/users (Admin - list all users)
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const take = parseInt(limit);
        const skip = (parseInt(page) - 1) * take;

        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { referralCode: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [users, total, stats] = await Promise.all([
            prisma.user.findMany({
                where,
                take,
                skip,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    referralCode: true,
                    walletBalance: true,
                    createdAt: true,
                    _count: { select: { orders: true, reviews: true, bookings: true, referralsMade: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where }),
            prisma.user.aggregate({
                _sum: { walletBalance: true },
                _count: { id: true }
            })
        ]);

        // Separate counts for roles because where clause might filter them out in the main query
        // But the UI shows global stats. Let's provide global role counts.
        const [totalCustomers, totalAdmins] = await Promise.all([
            prisma.user.count({ where: { role: 'customer' } }),
            prisma.user.count({ where: { role: 'admin' } })
        ]);

        res.json({
            data: users,
            pagination: {
                total,
                page: parseInt(page),
                limit: take,
                totalPages: Math.ceil(total / take)
            },
            stats: {
                totalCustomers,
                totalAdmins,
                totalWalletBalance: stats._sum.walletBalance || 0,
                totalUsers: stats._count.id
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/users/:id (Admin - get single user detailed profile)
router.get('/users/:id', protect, adminOnly, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                referralCode: true,
                walletBalance: true,
                    createdAt: true,
                orders: {
                    select: { id: true, total: true, status: true, isPaid: true, createdAt: true },
                    orderBy: { createdAt: 'desc' }
                },
                walletTransactions: {
                    select: { id: true, type: true, amount: true, description: true, createdAt: true },
                    orderBy: { createdAt: 'desc' }
                },
                referralsMade: {
                    select: { id: true, status: true, refereeReward: true, createdAt: true, referee: { select: { name: true, email: true } } },
                    orderBy: { createdAt: 'desc' }
                },
                bookings: {
                    select: { id: true, serviceType: true, status: true, createdAt: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/admin/users/:id/role (Admin - change user role)
router.patch('/users/:id/role', protect, adminOnly, async (req, res) => {
    try {
        const { role } = req.body;
        const userId = parseInt(req.params.id);

        if (!['customer', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Role must be "customer" or "admin"' });
        }

        // Prevent changing own role
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: { id: true, name: true, email: true, role: true }
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/stats (Admin - dashboard stats)
router.get('/stats', protect, adminOnly, async (req, res) => {
    try {
        const [totalUsers, totalOrders, totalProducts, pendingBookings, totalReferrals, rewardedReferrals, revenueResult, paidOrdersCount] = await Promise.all([
            prisma.user.count(),
            prisma.order.count(),
            prisma.product.count(),
            prisma.serviceBooking.count({ where: { status: 'Pending' } }),
            prisma.referral.count(),
            prisma.referral.count({ where: { status: 'rewarded' } }),
            prisma.order.aggregate({
                _sum: { total: true },
                where: { isPaid: true }
            }),
            prisma.order.count({ where: { isPaid: true } })
        ]);

        const totalRevenue = revenueResult._sum.total || 0;
        const paidOrders = paidOrdersCount;

        // Revenue Chart Data (Last 7 Days)
        const revenueChart = [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentOrdersForChart = await prisma.order.findMany({
            where: { isPaid: true, createdAt: { gte: sevenDaysAgo } },
            select: { total: true, createdAt: true }
        });

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayDate = d.toISOString().split('T')[0];

            const dayRevenue = recentOrdersForChart
                .filter(o => o.createdAt.toISOString().startsWith(dayDate))
                .reduce((sum, o) => sum + o.total, 0);

            revenueChart.push({ name: dayName, revenue: dayRevenue });
        }

        // Recent Activity Feed (Combine Orders, Users, Service Bookings)
        const [recentOrders, recentUsers, recentServices] = await Promise.all([
            prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } }),
            prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { name: true, createdAt: true } }),
            prisma.serviceBooking.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } })
        ]);

        const activityFeed = [
            ...recentOrders.map(o => ({ type: 'order', text: `New Order #${o.id} by ${o.user?.name}`, time: o.createdAt })),
            ...recentUsers.map(u => ({ type: 'user', text: `New User: ${u.name}`, time: u.createdAt })),
            ...recentServices.map(s => ({ type: 'service', text: `Service Booking (${s.serviceType}) by ${s.user?.name}`, time: s.createdAt }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

        // Top 5 Products by Sales
        const topProductsData = await prisma.orderItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        const topProductIds = topProductsData.map(p => p.productId);
        const topProductDetails = await prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: { id: true, title: true, price: true }
        });

        const topProducts = topProductsData.map(tp => {
            const prod = topProductDetails.find(p => p.id === tp.productId);
            return {
                id: tp.productId,
                title: prod?.title || 'Unknown',
                price: prod?.price || 0,
                sales: tp._sum.quantity
            };
        });

        res.json({
            users: totalUsers,
            orders: totalOrders,
            products: totalProducts,
            pendingServices: pendingBookings,
            revenue: totalRevenue,
            paidOrders,
            totalReferrals,
            rewardedReferrals,
            revenueChart,
            activityFeed,
            topProducts
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/referrals (Admin - list all referrals)
router.get('/referrals', protect, adminOnly, async (req, res) => {
    try {
        const referrals = await prisma.referral.findMany({
            include: {
                referrer: { select: { id: true, name: true, email: true, referralCode: true } },
                referee: { select: { id: true, name: true, email: true } },
                order: {
                    select: {
                        id: true,
                        total: true,
                        items: {
                            include: {
                                product: { select: { id: true, title: true, image: true, price: true, referrerPoints: true, refereePoints: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const seenOrderIds = new Set();
        const dedupedReferrals = referrals.filter((referral) => {
            if (!referral.orderId) return true;
            if (seenOrderIds.has(referral.orderId)) return false;
            seenOrderIds.add(referral.orderId);
            return true;
        });

        res.json(dedupedReferrals);
    } catch (error) {
        console.error('Get referrals error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// GET /api/admin/referral-settings
router.get('/referral-settings', protect, adminOnly, async (req, res) => {
    try {
        let settings = await prisma.referralSettings.findFirst();
        if (!settings) {
            settings = await prisma.referralSettings.create({ data: {} });
        }

        // Fetch counts of items with custom overrides
        const [customProducts, customServices, customCourses] = await Promise.all([
            prisma.product.count({ where: { referrerPoints: { not: null } } }),
            prisma.serviceType.count({ where: { referrerPoints: { not: null } } }),
            prisma.course.count({ where: { referrerPoints: { not: null } } })
        ]);

        res.json({
            ...settings,
            customCounts: {
                products: customProducts,
                services: customServices,
                courses: customCourses
            }
        });
    } catch (error) {
        console.error('Get referral settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/admin/referral-settings
router.put('/referral-settings', protect, adminOnly, async (req, res) => {
    try {
        const { pointsPerProductPurchase, pointsPerServiceBooking, pointsPerCourseEnrollment, pointToRupeeRate, pointExpiryDays, tierSystemEnabled } = req.body;
        const data = {
            pointsPerProductPurchase,
            pointsPerServiceBooking,
            pointsPerCourseEnrollment,
            pointToRupeeRate,
            pointExpiryDays,
            tierSystemEnabled
        };

        let settings = await prisma.referralSettings.findFirst();
        if (settings) {
            settings = await prisma.referralSettings.update({
                where: { id: settings.id },
                data
            });
        } else {
            settings = await prisma.referralSettings.create({ data });
        }
        res.json(settings);
    } catch (error) {
        console.error('Update referral settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/service-settings
router.get('/service-settings', protect, adminOnly, async (req, res) => {
    try {
        if (!hasServiceSettingsModel()) {
            return res.json(getDefaultServiceSettings());
        }

        let settings = await prisma.serviceSettings.findFirst();
        if (!settings) {
            settings = await prisma.serviceSettings.create({
                data: getDefaultServiceSettings()
            });
        }
        res.json(settings);
    } catch (error) {
        console.error('Get service settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/admin/service-settings
router.put('/service-settings', protect, adminOnly, async (req, res) => {
    try {
        const { timeSlots, maxBookingsPerSlot } = req.body;

        if (!hasServiceSettingsModel()) {
            return res.json(buildServiceSettingsPayload(timeSlots, maxBookingsPerSlot));
        }

        let settings = await prisma.serviceSettings.findFirst();
        if (settings) {
            const data = buildServiceSettingsPayload(timeSlots, maxBookingsPerSlot, settings);
            settings = await prisma.serviceSettings.update({
                where: { id: settings.id },
                data
            });
        } else {
            const data = buildServiceSettingsPayload(timeSlots, maxBookingsPerSlot);
            settings = await prisma.serviceSettings.create({
                data
            });
        }
        res.json(settings);
    } catch (error) {
        console.error('Update service settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== BANNER MANAGEMENT ====================

// GET /api/admin/banners — all banners (including inactive), sorted by displayOrder
router.get('/banners', protect, adminOnly, async (req, res) => {
    try {
        const banners = await prisma.banner.findMany({
            orderBy: { displayOrder: 'asc' },
        });
        res.json(banners);
    } catch (error) {
        console.error('Get admin banners error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/admin/banners — create a new banner
router.post('/banners', protect, adminOnly, async (req, res) => {
    try {
        const { title, subtitle, ctaLabel, ctaLink, image, gradient, displayOrder, active } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const maxOrder = await prisma.banner.aggregate({ _max: { displayOrder: true } });
        const nextOrder = displayOrder != null ? parseInt(displayOrder) : (maxOrder._max.displayOrder ?? -1) + 1;

        const banner = await prisma.banner.create({
            data: {
                title,
                subtitle: subtitle || null,
                ctaLabel: ctaLabel || 'Shop Now',
                ctaLink: ctaLink || '/products',
                image: image || null,
                gradient: gradient || null,
                displayOrder: nextOrder,
                active: active !== false,
            },
        });

        res.status(201).json(banner);
    } catch (error) {
        console.error('Create banner error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/admin/banners/reorder — reorder banners
// Must be defined before :id routes to avoid matching "reorder" as an id
router.patch('/banners/reorder', protect, adminOnly, async (req, res) => {
    try {
        const { orderedIds } = req.body;

        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return res.status(400).json({ error: 'orderedIds array is required' });
        }

        const updates = orderedIds.map((id, index) =>
            prisma.banner.update({
                where: { id: parseInt(id) },
                data: { displayOrder: index },
            })
        );

        await prisma.$transaction(updates);

        const banners = await prisma.banner.findMany({ orderBy: { displayOrder: 'asc' } });
        res.json(banners);
    } catch (error) {
        console.error('Reorder banners error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/admin/banners/:id — update any field on a banner
router.patch('/banners/:id', protect, adminOnly, async (req, res) => {
    try {
        const bannerId = parseInt(req.params.id);
        const { title, subtitle, ctaLabel, ctaLink, image, gradient, displayOrder, active } = req.body;

        const data = {};
        if (title !== undefined) data.title = title;
        if (subtitle !== undefined) data.subtitle = subtitle || null;
        if (ctaLabel !== undefined) data.ctaLabel = ctaLabel;
        if (ctaLink !== undefined) data.ctaLink = ctaLink;
        if (image !== undefined) data.image = image || null;
        if (gradient !== undefined) data.gradient = gradient || null;
        if (displayOrder !== undefined) data.displayOrder = parseInt(displayOrder);
        if (active !== undefined) data.active = active;

        const banner = await prisma.banner.update({
            where: { id: bannerId },
            data,
        });

        res.json(banner);
    } catch (error) {
        console.error('Update banner error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Banner not found' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/admin/banners/:id/toggle — toggle active/inactive
router.patch('/banners/:id/toggle', protect, adminOnly, async (req, res) => {
    try {
        const bannerId = parseInt(req.params.id);

        const existing = await prisma.banner.findUnique({ where: { id: bannerId } });
        if (!existing) {
            return res.status(404).json({ error: 'Banner not found' });
        }

        const banner = await prisma.banner.update({
            where: { id: bannerId },
            data: { active: !existing.active },
        });

        res.json(banner);
    } catch (error) {
        console.error('Toggle banner error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/admin/banners/:id — delete a banner
router.delete('/banners/:id', protect, adminOnly, async (req, res) => {
    try {
        const bannerId = parseInt(req.params.id);

        await prisma.banner.delete({ where: { id: bannerId } });
        res.json({ success: true, message: 'Banner deleted' });
    } catch (error) {
        console.error('Delete banner error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Banner not found' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
