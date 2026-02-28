import { getAuth, clerkClient } from '@clerk/express';
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

    if (user) {
        if (user.email && user.email.startsWith('pending_')) {
            try {
                const clerkUser = await clerkClient.users.getUser(clerkUserId);
                const email = clerkUser.emailAddresses.find(
                    e => e.id === clerkUser.primaryEmailAddressId
                )?.emailAddress;
                const name = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || null;

                if (email) {
                    user = await prisma.user.update({
                        where: { clerkId: clerkUserId },
                        data: { email, ...(name && { name }) },
                        select: SAFE_USER_SELECT
                    });
                }
            } catch (err) {
                console.error('Failed to resolve pending user from Clerk:', err.message);
            }
        }
        return user;
    }

    let email = `pending_${clerkUserId}@clerk.dev`;
    let name = null;
    try {
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const primaryEmail = clerkUser.emailAddresses.find(
            e => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress;
        if (primaryEmail) email = primaryEmail;
        name = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || null;
    } catch (err) {
        console.error('Failed to fetch user from Clerk API:', err.message);
    }

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
            email,
            name,
            referralCode,
        },
        select: SAFE_USER_SELECT
    });

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
