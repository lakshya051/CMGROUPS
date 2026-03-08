import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Update stock to 0...');
    const product = await prisma.product.update({
        where: { id: 1 }, // Assuming ID 1 exists (from seed)
        data: { stock: 0 }
    });
    console.log(`Updated product: ${product.title} (ID: ${product.id}) -> Stock: ${product.stock}`);

    // Let's also verify another product has stock > 0 for price alert testing
    const p2 = await prisma.product.update({
        where: { id: 2 },
        data: { stock: 10 }
    });
    console.log(`Verified product: ${p2.title} (ID: ${p2.id}) -> Stock: ${p2.stock}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
