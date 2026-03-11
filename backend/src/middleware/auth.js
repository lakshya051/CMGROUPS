import admin from '../utils/firebase.js';
import prisma from '../lib/prisma.js';

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

export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);

        const user = await prisma.user.findUnique({
            where: { firebaseUid: decoded.uid },
            select: SAFE_USER_SELECT,
        });

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
            const user = await prisma.user.findUnique({
                where: { firebaseUid: decoded.uid },
                select: SAFE_USER_SELECT,
            });
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
