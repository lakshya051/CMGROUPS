const express = require('express');
const prisma = require('../lib/prisma');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/users (Admin - list all users)
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
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
        });
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
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
        const [totalUsers, totalOrders, totalProducts, pendingBookings, orders, totalReferrals, rewardedReferrals] = await Promise.all([
            prisma.user.count(),
            prisma.order.count(),
            prisma.product.count(),
            prisma.serviceBooking.count({ where: { status: 'Pending' } }),
            prisma.order.findMany({ select: { total: true, isPaid: true, createdAt: true } }),
            prisma.referral.count(),
            prisma.referral.count({ where: { status: 'rewarded' } })
        ]);

        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        const paidOrders = orders.filter(o => o.isPaid).length;

        // Revenue Chart Data (Last 7 Days)
        const revenueChart = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayDate = d.toISOString().split('T')[0];

            const dayRevenue = orders
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
                                product: { select: { id: true, title: true, image: true, price: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(referrals);
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

module.exports = router;
