const express = require('express');
const prisma = require('../lib/prisma');
const { protect, adminOnly } = require('../middleware/auth');

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
            include: {
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

        // Avoid returning password hash even sequentially
        delete user.password;

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

module.exports = router;
