-- Service-only bundle lines have no Product row; store bundle price on the line with productId NULL.
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;
