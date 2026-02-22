const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.product.count();
    console.log(`Product count: ${count}`);

    if (count > 0) {
        const first = await prisma.product.findFirst();
        console.log('First product:', first.title);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
