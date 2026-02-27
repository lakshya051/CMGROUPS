import { getAuth } from '@clerk/express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';

const SAFE_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    referralCode: true,
    walletBalance: true,
    createdAt: true
};

function generateReferralCode() {
    return 'TN' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function findOrCreateUser(clerkUserId) {
    let user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        select: SAFE_USER_SELECT
    });

    if (!user) {
        let referralCode;
        let unique = false;
        while (!unique) {
            referralCode = generateReferralCode();
            const found = await prisma.user.findFirst({ where: { referralCode } });
            if (!found) unique = true;
        }

        user = await prisma.user.create({
            data: {
                clerkId: clerkUserId,
                email: `pending_${clerkUserId}@clerk.dev`,
                referralCode,
            },
            select: SAFE_USER_SELECT
        });
    }

    return user;
}

export const protect = async (req, res, next) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return res.status(401).json({ error: 'Not authorized, no token' });
        }

        req.user = await findOrCreateUser(userId);
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(401).json({ error: 'Not authorized, invalid token' });
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
        const { userId } = getAuth(req);
        if (userId) {
            req.user = await findOrCreateUser(userId);
        }
        next();
    } catch {
        next();
    }
};
