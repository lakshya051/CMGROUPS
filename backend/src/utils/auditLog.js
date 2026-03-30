import prisma from '../lib/prisma.js';

/**
 * Record an admin action in the audit log.
 * Fire-and-forget — never throws to avoid disrupting the main request.
 *
 * @param {Object}  opts
 * @param {number}  opts.userId    - Admin user ID (req.user.id)
 * @param {string}  opts.action    - e.g. CREATE, UPDATE, DELETE, STATUS_CHANGE, ROLE_CHANGE, REFUND
 * @param {string}  opts.entity    - e.g. Product, Order, Category, User, ServiceBooking
 * @param {string|number} opts.entityId - ID of the affected record
 * @param {Object}  [opts.details] - { before, after, meta } — whatever context is useful
 * @param {Object}  [opts.req]     - Express request (used to extract IP)
 */
export async function logAudit({ userId, action, entity, entityId, details, req }) {
    try {
        const ipAddress = req
            ? req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null
            : null;

        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId: String(entityId),
                details: details ?? undefined,
                ipAddress,
            },
        });
    } catch (err) {
        console.error('[AuditLog] Failed to write audit log:', err.message);
    }
}
