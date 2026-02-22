const { verifyToken } = require('../utils/jwt');
const prisma = require('../lib/prisma');

// Protect routes - require authentication
const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Not authorized, no token' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(401).json({ error: 'Not authorized, user not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Not authorized, invalid token' });
    }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: 'Admin access only' });
    }
};

// Optional protect middleware
const optionalProtect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (user) {
            req.user = user;
        }
        next();
    } catch (error) {
        next();
    }
};

module.exports = { protect, adminOnly, optionalProtect };
