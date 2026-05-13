-- CreateTable
CREATE TABLE "FeatureFlags" (
    "id" SERIAL NOT NULL,
    "bundlesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlags_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row so first-read never has to do a write under the
-- request path (mirrors the pattern used for ReferralSettings / ServiceSettings).
INSERT INTO "FeatureFlags" ("id", "bundlesEnabled", "createdAt", "updatedAt")
VALUES (1, false, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
