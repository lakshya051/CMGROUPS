import admin from '../utils/firebase.js';
import prisma from '../lib/prisma.js';
import NodeCache from 'node-cache';

const SAFE_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    referralCode: true,
    walletBalance: true,
    createdAt: true,
};

// Per-instance cache of `firebaseUid → user`. 60 s TTL is short enough that
// role / wallet changes propagate quickly, long enough to absorb most repeated
// hits within a single session and remove one Postgres round-trip per
// authenticated request. The wallet itself is not authoritative from this cache;
// any handler that needs the live balance reads from prisma.user directly.
const userCache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false });

const fetchUser = async (firebaseUid) => {
    const cached = userCache.get(firebaseUid);
    if (cached) return cached;
    const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: SAFE_USER_SELECT,
    });
    if (user) userCache.set(firebaseUid, user);
    return user;
};

/** Test-only: invalidate a cached user (e.g. after role change). */
export const invalidateAuthUser = (firebaseUid) => {
    userCache.del(firebaseUid);
};

export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);

        const user = await fetchUser(decoded.uid);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        req.firebaseUid = decoded.uid;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: 'Admin access only' });
    }
};

export const optionalProtect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1];
            const decoded = await admin.auth().verifyIdToken(token);
            const user = await fetchUser(decoded.uid);
            if (user) {
                req.user = user;
                req.firebaseUid = decoded.uid;
            }
        }
        next();
    } catch {
        next();
    }
};
