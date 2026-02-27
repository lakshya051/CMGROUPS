import express from 'express';
import prisma from '../lib/prisma.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/applications
// @desc    Apply for a course
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { courseId, name, email, phone, message } = req.body;

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
        console.error(error);
        res.status(404).json({ error: 'Application not found' });
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

        const isNewlyPaid = paymentStatus === 'Paid' && enrollment.paymentStatus !== 'Paid';

        const updatedEnrollment = await prisma.enrollment.update({
            where: { id: parseInt(req.params.id) },
            data: {
                paymentStatus,
                feePaid: parseFloat(feePaid)
            }
        });

        // *** REFERRAL REWARD FOR COURSE ENROLLMENT ***
        // Only credit when course is fully paid
        if (isNewlyPaid && enrollment.user.referredById) {
            try {
                const settings = await prisma.referralSettings.findFirst();
                const rewardAmount = settings ? settings.pointsPerCourseEnrollment : 300;

                const referrerId = enrollment.user.referredById;

                // Credit the referrer
                await prisma.user.update({
                    where: { id: referrerId },
                    data: { walletBalance: { increment: rewardAmount } }
                });

                // Record the referral reward
                await prisma.referral.create({
                    data: {
                        referrerId,
                        refereeId: enrollment.userId,
                        status: 'rewarded',
                        rewardAmount,
                        completedAt: new Date()
                    }
                });

                console.log(`Course Referral reward: ₹${rewardAmount} credited to referrer ${referrerId} for course padding by user ${enrollment.userId}`);
            } catch (refErr) {
                console.error('Course referral reward error:', refErr);
            }
        }

        res.json(updatedEnrollment);
    } catch (error) {
        console.error('Update enrollment payment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
