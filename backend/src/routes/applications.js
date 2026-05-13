import express from 'express';
import prisma from '../lib/prisma.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { bookingCreateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// @route   POST /api/applications
// @desc    Apply for a course
// @access  Private
router.post('/', bookingCreateLimiter, protect, async (req, res) => {
    try {
        const { courseId, name, email, phone, message } = req.body;

        if (!courseId || !name || !email || !phone) {
            return res.status(400).json({ error: 'courseId, name, email, and phone are required' });
        }
        if (Number.isNaN(parseInt(courseId))) {
            return res.status(400).json({ error: 'Invalid courseId' });
        }

        const existingApplication = await prisma.courseApplication.findFirst({
            where: {
                userId: req.user.id,
                courseId: parseInt(courseId),
                status: 'Pending'
            }
        });

        if (existingApplication) {
            return res.status(400).json({ error: 'You have already applied for this course' });
        }

        const application = await prisma.courseApplication.create({
            data: {
                userId: req.user.id,
                courseId: parseInt(courseId),
                name,
                email,
                phone,
                message
            }
        });

        res.status(201).json(application);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/applications/my-applications
// @desc    Get current user's applications
// @access  Private
router.get('/my-applications', protect, async (req, res) => {
    try {
        const applications = await prisma.courseApplication.findMany({
            where: { userId: req.user.id },
            include: { course: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(applications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/applications/admin/all
// @desc    Get all applications (Admin)
// @access  Private/Admin
router.get('/admin/all', protect, adminOnly, async (req, res) => {
    try {
        const applications = await prisma.courseApplication.findMany({
            include: {
                course: true,
                user: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(applications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT /api/applications/:id/status
// @desc    Update application status
// @access  Private/Admin
router.put('/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Approved', 'Rejected', 'Enrolled', 'Completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const application = await prisma.courseApplication.update({
            where: { id: parseInt(req.params.id) },
            data: { status }
        });

        // If approved, create enrollment
        if (status === 'Approved') {
            const existingEnrollment = await prisma.enrollment.findUnique({
                where: {
                    userId_courseId: {
                        userId: application.userId,
                        courseId: application.courseId
                    }
                }
            });

            if (!existingEnrollment) {
                await prisma.enrollment.create({
                    data: {
                        userId: application.userId,
                        courseId: application.courseId,
                        paymentStatus: 'Pending',
                        feePaid: 0
                    }
                });
            }
        }

        res.json(application);
    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT /api/applications/enrollment/:id/payment
// @desc    Update enrollment payment status (Admin)
// @access  Private/Admin
router.put('/enrollment/:id/payment', protect, adminOnly, async (req, res) => {
    try {
        const { paymentStatus, feePaid } = req.body;

        const enrollment = await prisma.enrollment.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { course: true, user: { select: { id: true, name: true, email: true, referredById: true } } }
        });

        if (!enrollment) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }

        const parsedFeePaid = parseFloat(feePaid);
        const willBePaid = paymentStatus === 'Paid';

        // Atomic state transition + referral credit. Using updateMany with a
        // paymentStatus guard ensures only ONE concurrent request can flip the
        // enrollment from non-Paid → Paid, preventing double referral credit.
        const enrollmentId = parseInt(req.params.id);
        const referredById = enrollment.user.referredById;

        const { transitionedToPaid, updatedEnrollment } = await prisma.$transaction(async (tx) => {
            if (willBePaid && enrollment.paymentStatus !== 'Paid') {
                // Guarded flip to Paid. If another request already flipped it,
                // result.count === 0 and we do NOT credit a referral again.
                const result = await tx.enrollment.updateMany({
                    where: {
                        id: enrollmentId,
                        paymentStatus: { not: 'Paid' },
                    },
                    data: {
                        paymentStatus: 'Paid',
                        feePaid: parsedFeePaid,
                    },
                });

                const row = await tx.enrollment.findUnique({ where: { id: enrollmentId } });

                if (result.count === 1 && referredById) {
                    const settings = await tx.referralSettings.findFirst();
                    const rewardAmount = settings ? settings.pointsPerCourseEnrollment : 300;

                    await tx.user.update({
                        where: { id: referredById },
                        data: { walletBalance: { increment: rewardAmount } }
                    });

                    await tx.referral.create({
                        data: {
                            referrerId: referredById,
                            refereeId: enrollment.userId,
                            status: 'rewarded',
                            rewardAmount,
                            source: 'course',
                            completedAt: new Date(),
                        },
                    });
                }

                return { transitionedToPaid: result.count === 1, updatedEnrollment: row };
            }

            // Non-Paid → Non-Paid or Paid → something else: straightforward update.
            const row = await tx.enrollment.update({
                where: { id: enrollmentId },
                data: {
                    paymentStatus,
                    feePaid: parsedFeePaid,
                },
            });
            return { transitionedToPaid: false, updatedEnrollment: row };
        });

        if (transitionedToPaid && referredById) {
            console.log(`[course-referral] Credited referrer ${referredById} for enrollment ${enrollmentId}`);
        }

        res.json(updatedEnrollment);
    } catch (error) {
        console.error('Update enrollment payment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
