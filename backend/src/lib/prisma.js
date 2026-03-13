import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    errorFormat: 'minimal',
    log: ['error'],
});

// Gracefully disconnect on process exit (important for serverless/pooled DBs)
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export default prisma;
