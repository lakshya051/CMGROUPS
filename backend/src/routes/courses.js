const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const { protect, adminOnly } = require('../middleware/auth');
const { generateCertificate } = require('../utils/certificateGenerator');
const { calculateReferralReward } = require('../utils/referralHelper');

// ─────────────────────────────────────────────
// STUDENT — Get my applications (with fee ledger)
// ─────────────────────────────────────────────
router.get('/my-applications', protect, async (req, res) => {
    try {
        const apps = await prisma.courseApplication.findMany({
            where: { userId: req.user.id },
            include: {
                course: true,
                duration: true,
                batch: true,
                feePayments: { orderBy: { paidAt: 'asc' } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(apps);
    } catch (error) {
        console.error('Get my applications error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Keep backward compat for old enrollment endpoint
router.get('/my-enrollments', protect, async (req, res) => {
    try {
        const enrollments = await prisma.enrollment.findMany({
            where: { userId: req.user.id },
            include: { course: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(enrollments);
    } catch (error) {
        console.error('Get my enrollments error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// PUBLIC — Get all published courses
// Supports: ?page=1&limit=12 (optional; omit for full list)
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { page, limit } = req.query;
        const cacheKey = `courses:list:${JSON.stringify(req.query)}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const usePagination = page !== undefined || limit !== undefined;
        const take = usePagination ? parseInt(limit) || 12 : undefined;
        const skip = usePagination ? ((parseInt(page) || 1) - 1) * take : undefined;

        const include = {
            durations: {
                include: {
                    batches: {
                        include: {
                            _count: { select: { applications: { where: { status: { in: ['Approved', 'Enrolled', 'Completed'] } } } } }
                        }
                    }
                }
            }
        };

        if (usePagination) {
            const [courses, total] = await Promise.all([
                prisma.course.findMany({ where: { isPublished: true }, include, orderBy: { createdAt: 'desc' }, take, skip }),
                prisma.course.count({ where: { isPublished: true } }),
            ]);
            const result = {
                data: courses,
                total,
                page: parseInt(page) || 1,
                limit: take,
                totalPages: Math.ceil(total / take),
            };
            cache.set(cacheKey, result);
            return res.json(result);
        }

        const courses = await prisma.course.findMany({
            where: { isPublished: true },
            include,
            orderBy: { createdAt: 'desc' }
        });
        cache.set(cacheKey, courses);
        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUBLIC — Get single course detail
router.get('/:id', async (req, res) => {
    try {
        const course = await prisma.course.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                durations: {
                    include: {
                        batches: {
                            include: {
                                _count: { select: { applications: { where: { status: { in: ['Approved', 'Enrolled', 'Completed'] } } } } }
                            }
                        }
                    }
                }
            }
        });
        if (!course) return res.status(404).json({ error: 'Course not found' });
        res.json(course);
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// STUDENT — Apply for a course
// ─────────────────────────────────────────────
router.post('/apply', protect, async (req, res) => {
    try {
        const { courseId, durationId, batchId, name, email, phone, message, paymentMode, referralCode } = req.body;

        if (!courseId || !durationId || !batchId || !name || !email || !phone || !paymentMode) {
            return res.status(400).json({ error: 'courseId, durationId, batchId, name, email, phone, and paymentMode are required' });
        }

        // Check seat availability
        const approvedCount = await prisma.courseApplication.count({
            where: { batchId: parseInt(batchId), status: { in: ['Approved', 'Enrolled', 'Completed'] } }
        });
        const batch = await prisma.courseBatch.findUnique({ where: { id: parseInt(batchId) } });
        if (!batch) return res.status(404).json({ error: 'Batch not found' });
        if (approvedCount >= batch.seatLimit) {
            return res.status(400).json({ error: 'This batch is full. Please select another batch.' });
        }

        // Check duplicate application
        const existing = await prisma.courseApplication.findFirst({
            where: { userId: req.user.id, courseId: parseInt(courseId), status: { notIn: ['Rejected'] } }
        });
        if (existing) return res.status(400).json({ error: 'You have already applied for this course.' });

        const application = await prisma.courseApplication.create({
            data: {
                userId: req.user.id,
                courseId: parseInt(courseId),
                durationId: parseInt(durationId),
                batchId: parseInt(batchId),
                name, email, phone,
                message: message || null,
                paymentMode,
                referralCode: referralCode || null,
                status: 'Pending'
            },
            include: { course: true, duration: true, batch: true }
        });

        // In-app notification
        await prisma.notification.create({
            data: {
                userId: req.user.id,
                title: 'Application Submitted',
                message: `Your application for ${application.course.title} has been received and is pending review.`,
                type: 'course',
                link: '/dashboard/courses'
            }
        }).catch(() => { });

        res.status(201).json(application);
    } catch (error) {
        console.error('Apply course error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// STUDENT — Download Certificate
// ─────────────────────────────────────────────
router.get('/:id/certificate', protect, async (req, res) => {
    try {
        const application = await prisma.courseApplication.findFirst({
            where: { courseId: parseInt(req.params.id), userId: req.user.id, status: 'Completed' },
            include: { user: { select: { id: true, name: true, email: true } }, course: true }
        });
        if (!application) return res.status(403).json({ error: 'Certificate not available. Course must be completed.' });

        // Use existing certificate generator via a compatible enrollment-like object
        const enrollmentLike = {
            user: application.user,
            course: application.course,
            completedAt: application.completedAt
        };
        generateCertificate(enrollmentLike, res);
    } catch (error) {
        console.error('Certificate error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// ADMIN — Get all applications
// ─────────────────────────────────────────────
router.get('/applications/all', protect, adminOnly, async (req, res) => {
    try {
        const apps = await prisma.courseApplication.findMany({
            include: {
                user: { select: { id: true, name: true, email: true, phone: true, referralCode: true, referredById: true } },
                course: true,
                duration: true,
                batch: true,
                feePayments: { orderBy: { paidAt: 'asc' } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(apps);
    } catch (error) {
        console.error('Admin get applications error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ADMIN — Update application status
router.patch('/applications/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const appId = parseInt(req.params.id);
        const validStatuses = ['Pending', 'Approved', 'Rejected', 'Enrolled', 'Completed'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const updateData = { status };
        if (status === 'Enrolled') updateData.enrolledAt = new Date();
        if (status === 'Completed') updateData.completedAt = new Date();

        const app = await prisma.courseApplication.update({
            where: { id: appId },
            data: updateData,
            include: { user: { select: { id: true, name: true, email: true } }, course: true }
        });

        // Notify student
        await prisma.notification.create({
            data: {
                userId: app.userId,
                title: `Course Application ${status}`,
                message: `Your application for ${app.course.title} is now ${status}.`,
                type: 'course',
                link: '/dashboard/courses'
            }
        }).catch(() => { });

        res.json(app);
    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ADMIN — Record a fee payment (triggers referral on first payment)
router.post('/applications/:id/fee', protect, adminOnly, async (req, res) => {
    try {
        const { amount, note } = req.body;
        const appId = parseInt(req.params.id);

        if (!amount || isNaN(parseFloat(amount))) return res.status(400).json({ error: 'Amount is required' });

        const application = await prisma.courseApplication.findUnique({
            where: { id: appId },
            include: { user: { select: { id: true, name: true, email: true } }, course: true, duration: true, feePayments: true }
        });
        if (!application) return res.status(404).json({ error: 'Application not found' });

        const isFirstPayment = application.feePayments.length === 0;

        // *** TRANSACTION: fee payment + status update + referral reward ***
        const payment = await prisma.$transaction(async (tx) => {
            // 1. Record payment
            const feePayment = await tx.feePayment.create({
                data: {
                    applicationId: appId,
                    amount: parseFloat(amount),
                    note: note || null,
                    markedBy: req.user.email
                }
            });

            // 2. Auto-update status to Enrolled after first payment (if currently Approved)
            if (isFirstPayment && application.status === 'Approved') {
                await tx.courseApplication.update({
                    where: { id: appId },
                    data: { status: 'Enrolled', enrolledAt: new Date() }
                });
            }

            // 3. Trigger referral points on FIRST payment
            if (isFirstPayment && application.referralCode) {
                const referrer = await tx.user.findFirst({ where: { referralCode: application.referralCode } });

                if (referrer && referrer.id !== application.userId) {
                    // Prevent duplicate rewards
                    const existingReferral = await tx.referral.findFirst({
                        where: {
                            refereeId: application.userId,
                            referrerId: referrer.id,
                            source: 'course'
                        }
                    });

                    if (!existingReferral) {
                        const { referrerPoints, refereePoints } = await calculateReferralReward({
                            referrerPoints: application.course?.referrerPoints,
                            refereePoints: application.course?.refereePoints
                        });

                        if (referrerPoints > 0) {
                            // Credit referrer wallet
                            await tx.user.update({ where: { id: referrer.id }, data: { walletBalance: { increment: referrerPoints } } });
                            await tx.walletTransaction.create({ data: { userId: referrer.id, amount: referrerPoints, type: 'CREDIT', description: `Course referral reward — ${application.user.name} enrolled in ${application.course.title}` } });

                            // Credit the student (referee)
                            await tx.user.update({ where: { id: application.userId }, data: { walletBalance: { increment: refereePoints } } });
                            await tx.walletTransaction.create({ data: { userId: application.userId, amount: refereePoints, type: 'CREDIT', description: `Course referral bonus for enrolling in ${application.course.title}` } });

                            // Create Referral record so it shows in the referral portal
                            await tx.referral.create({
                                data: {
                                    referrerId: referrer.id,
                                    refereeId: application.userId,
                                    status: 'rewarded',
                                    rewardAmount: referrerPoints,
                                    refereeReward: refereePoints > 0 ? refereePoints : null,
                                    source: 'course',
                                    courseName: application.course.title,
                                    completedAt: new Date()
                                }
                            });
                        }
                    }
                }
            }

            return feePayment;
        });

        // Notify student
        await prisma.notification.create({
            data: {
                userId: application.userId,
                title: 'Fee Payment Recorded',
                message: `₹${amount} payment received for ${application.course.title}.`,
                type: 'course',
                link: '/dashboard/courses'
            }
        }).catch(() => { });

        res.status(201).json(payment);
    } catch (error) {
        console.error('Record fee error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// ADMIN — Course CRUD
// ─────────────────────────────────────────────
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { title, description, instructor, category, thumbnail, hasCertificate, referrerPoints, refereePoints } = req.body;
        const course = await prisma.course.create({
            data: {
                title,
                description,
                instructor,
                category: category || 'Computer',
                thumbnail: thumbnail || '',
                hasCertificate: hasCertificate !== false,
                referrerPoints: referrerPoints !== undefined && referrerPoints !== null ? parseFloat(referrerPoints) : null,
                refereePoints: refereePoints !== undefined && refereePoints !== null ? parseFloat(refereePoints) : null
            }
        });
        cache.delByPrefix('courses:');
        res.status(201).json(course);
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const { title, description, instructor, category, thumbnail, hasCertificate, isPublished, referrerPoints, refereePoints } = req.body;
        const course = await prisma.course.update({
            where: { id: parseInt(req.params.id) },
            data: {
                title,
                description,
                instructor,
                category,
                thumbnail,
                hasCertificate,
                isPublished,
                referrerPoints: referrerPoints !== undefined ? (referrerPoints === null ? null : parseFloat(referrerPoints)) : undefined,
                refereePoints: refereePoints !== undefined ? (refereePoints === null ? null : parseFloat(refereePoints)) : undefined
            }
        });
        cache.delByPrefix('courses:');
        res.json(course);
    } catch (error) {
        console.error('Update course error:', error);
        res.status(404).json({ error: 'Course not found' });
    }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        await prisma.course.delete({ where: { id: parseInt(req.params.id) } });
        cache.delByPrefix('courses:');
        res.json({ message: 'Course deleted' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(404).json({ error: 'Course not found' });
    }
});

// ─────────────────────────────────────────────
// ADMIN — Duration CRUD
// ─────────────────────────────────────────────
router.post('/:courseId/durations', protect, adminOnly, async (req, res) => {
    try {
        const { label, totalFee, fullPayDiscount, installments } = req.body;
        const duration = await prisma.courseDuration.create({
            data: {
                courseId: parseInt(req.params.courseId),
                label, totalFee: parseFloat(totalFee),
                fullPayDiscount: parseFloat(fullPayDiscount || 0),
                installments: parseInt(installments || 3)
            }
        });
        res.status(201).json(duration);
    } catch (error) {
        console.error('Create duration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/durations/:id', protect, adminOnly, async (req, res) => {
    try {
        const { label, totalFee, fullPayDiscount, installments } = req.body;
        const duration = await prisma.courseDuration.update({
            where: { id: parseInt(req.params.id) },
            data: { label, totalFee: parseFloat(totalFee), fullPayDiscount: parseFloat(fullPayDiscount || 0), installments: parseInt(installments || 3) }
        });
        res.json(duration);
    } catch (error) {
        console.error('Update duration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/durations/:id', protect, adminOnly, async (req, res) => {
    try {
        await prisma.courseDuration.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Duration deleted' });
    } catch (error) {
        console.error('Delete duration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// ADMIN — Batch CRUD
// ─────────────────────────────────────────────
router.post('/durations/:durationId/batches', protect, adminOnly, async (req, res) => {
    try {
        const { name, timing, seatLimit } = req.body;
        const batch = await prisma.courseBatch.create({
            data: { durationId: parseInt(req.params.durationId), name, timing, seatLimit: parseInt(seatLimit || 20) }
        });
        res.status(201).json(batch);
    } catch (error) {
        console.error('Create batch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/batches/:id', protect, adminOnly, async (req, res) => {
    try {
        const { name, timing, seatLimit } = req.body;
        const batch = await prisma.courseBatch.update({
            where: { id: parseInt(req.params.id) },
            data: { name, timing, seatLimit: parseInt(seatLimit) }
        });
        res.json(batch);
    } catch (error) {
        console.error('Update batch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/batches/:id', protect, adminOnly, async (req, res) => {
    try {
        await prisma.courseBatch.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Batch deleted' });
    } catch (error) {
        console.error('Delete batch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
