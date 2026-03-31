import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    errorFormat: 'minimal',
    log: ['error'],
});

const shutdown = async () => {
    await prisma.$disconnect();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default prisma;
