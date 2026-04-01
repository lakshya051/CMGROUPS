-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "firebaseUid" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "referralCode" TEXT,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'Bronze',
    "tierPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referredById" INTEGER,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Computer',
    "thumbnail" TEXT NOT NULL DEFAULT '',
    "hasCertificate" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "referrerPoints" DOUBLE PRECISION,
    "refereePoints" DOUBLE PRECISION,
    "sellerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseDuration" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "totalFee" DOUBLE PRECISION NOT NULL,
    "fullPayDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installments" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "CourseDuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseBatch" (
    "id" SERIAL NOT NULL,
    "durationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "timing" TEXT NOT NULL,
    "seatLimit" INTEGER NOT NULL DEFAULT 20,

    CONSTRAINT "CourseBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseApplication" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "durationId" INTEGER,
    "batchId" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "paymentMode" TEXT NOT NULL DEFAULT 'Installment',
    "referralCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "enrolledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markedBy" TEXT NOT NULL,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
    "feePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseMaterial" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Present',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "sellerName" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "specs" JSONB,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numReviews" INTEGER NOT NULL DEFAULT 0,
    "condition" TEXT NOT NULL DEFAULT 'New',
    "isSecondHand" BOOLEAN NOT NULL DEFAULT false,
    "isRefurbished" BOOLEAN NOT NULL DEFAULT false,
    "isReturnable" BOOLEAN NOT NULL DEFAULT true,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 3,
    "referrerPoints" DOUBLE PRECISION,
    "refereePoints" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeal" BOOLEAN NOT NULL DEFAULT false,
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "bundleId" TEXT,
    "bundleInstanceId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "total" DOUBLE PRECISION NOT NULL,
    "walletUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Processing',
    "paymentMethod" TEXT NOT NULL DEFAULT 'pay_at_store',
    "paymentOtp" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "shippingAddress" JSONB,
    "guestInfo" JSONB,
    "referralCodeUsed" TEXT,
    "couponCode" TEXT,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "giftWrap" BOOLEAN NOT NULL DEFAULT false,
    "giftMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelReason" TEXT,
    "returnReason" TEXT,
    "returnStatus" TEXT NOT NULL DEFAULT 'None',
    "refundStatus" TEXT NOT NULL DEFAULT 'None',
    "refundAmount" DOUBLE PRECISION,
    "deliveredAt" TIMESTAMP(3),
    "referralEligibleAt" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googleMapLink" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "variantId" INTEGER,
    "bundleId" INTEGER,
    "bundleInstanceId" TEXT,
    "bundleTemplateId" INTEGER,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "voters" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBooking" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "serviceType" TEXT NOT NULL,
    "description" TEXT,
    "deviceType" TEXT,
    "deviceBrand" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "referralCodeUsed" TEXT,
    "customFields" JSONB,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googleMapLink" TEXT,
    "estimatedPrice" DOUBLE PRECISION,
    "finalPrice" DOUBLE PRECISION,
    "adminNotes" TEXT,
    "assignedTo" TEXT,
    "pickupOtp" TEXT,
    "deliveryOtp" TEXT,
    "deliveryOtpVerified" BOOLEAN NOT NULL DEFAULT false,
    "deliveryOtpGeneratedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "otpGeneratedAt" TIMESTAMP(3),
    "technicianId" INTEGER,
    "estimatedCompletionDate" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "customerRating" INTEGER,
    "customerReview" TEXT,

    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "skills" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceInvoice" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "technicianName" TEXT NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL,
    "partsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsNotes" TEXT,
    "gst" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "minOrderAmount" DOUBLE PRECISION,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "applicableTo" TEXT NOT NULL DEFAULT 'all',

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" SERIAL NOT NULL,
    "referrerId" INTEGER NOT NULL,
    "refereeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "refereeReward" DOUBLE PRECISION,
    "orderId" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'shopping',
    "courseName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "price" TEXT,
    "features" JSONB,
    "formFields" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "referrerPoints" DOUBLE PRECISION,
    "refereePoints" DOUBLE PRECISION,
    "sellerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantOption" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VariantOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantOptionValue" (
    "id" SERIAL NOT NULL,
    "optionId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VariantOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT,
    "combination" JSONB,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAlert" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "priceThreshold" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralSettings" (
    "id" SERIAL NOT NULL,
    "pointsPerProductPurchase" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "pointsPerServiceBooking" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "pointsPerCourseEnrollment" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "pointToRupeeRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "pointExpiryDays" INTEGER,
    "tierSystemEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierConfig" (
    "id" SERIAL NOT NULL,
    "tierName" TEXT NOT NULL,
    "minPoints" DOUBLE PRECISION NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#CD7F32',

    CONSTRAINT "TierConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyEnquiry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "message" TEXT,
    "sellerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallyEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CCTVEnquiry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "camerasNeeded" TEXT NOT NULL,
    "message" TEXT,
    "sellerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CCTVEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSettings" (
    "id" SERIAL NOT NULL,
    "timeSlots" TEXT[],
    "maxBookingsPerSlot" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Shop Now',
    "ctaLink" TEXT NOT NULL DEFAULT '/products',
    "image" TEXT,
    "gradient" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "label" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googleMapLink" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "image" TEXT,
    "bundlePrice" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGiftable" BOOLEAN NOT NULL DEFAULT false,
    "displayOn" TEXT[] DEFAULT ARRAY['home']::TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" SERIAL NOT NULL,
    "bundleId" INTEGER NOT NULL,
    "productId" INTEGER,
    "variantId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "serviceTypeId" INTEGER,
    "courseId" INTEGER,
    "itemType" TEXT NOT NULL DEFAULT 'product',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleReview" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bundleId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "voters" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "discountType" TEXT NOT NULL DEFAULT 'flat',
    "discountTiers" JSONB,
    "templateType" TEXT NOT NULL DEFAULT 'slot',
    "mixMatchQty" INTEGER,
    "mixMatchPrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleTemplateSlot" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "maxQty" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BundleTemplateSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuantityTier" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "minQty" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "QuantityTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_firebaseUid_idx" ON "User"("firebaseUid");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "CourseApplication_userId_idx" ON "CourseApplication"("userId");

-- CreateIndex
CREATE INDEX "CourseApplication_status_idx" ON "CourseApplication"("status");

-- CreateIndex
CREATE INDEX "CourseApplication_courseId_idx" ON "CourseApplication"("courseId");

-- CreateIndex
CREATE INDEX "CourseApplication_durationId_idx" ON "CourseApplication"("durationId");

-- CreateIndex
CREATE INDEX "CourseApplication_batchId_idx" ON "CourseApplication"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_enrollmentId_date_key" ON "Attendance"("enrollmentId", "date");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_idx" ON "WalletTransaction"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_orderId_idx" ON "WalletTransaction"("orderId");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_isSecondHand_idx" ON "Product"("isSecondHand");

-- CreateIndex
CREATE INDEX "Product_isRefurbished_idx" ON "Product"("isRefurbished");

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "Product"("price");

-- CreateIndex
CREATE INDEX "Product_rating_idx" ON "Product"("rating");

-- CreateIndex
CREATE INDEX "Wishlist_userId_createdAt_idx" ON "Wishlist"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId");

-- CreateIndex
CREATE INDEX "CartItem_userId_idx" ON "CartItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_productId_variantId_bundleInstanceId_key" ON "CartItem"("userId", "productId", "variantId", "bundleInstanceId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_returnStatus_idx" ON "Order"("returnStatus");

-- CreateIndex
CREATE INDEX "Order_isPaid_idx" ON "Order"("isPaid");

-- CreateIndex
CREATE INDEX "Order_isPaid_createdAt_idx" ON "Order"("isPaid", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "OrderItem_bundleId_idx" ON "OrderItem"("bundleId");

-- CreateIndex
CREATE INDEX "OrderItem_bundleTemplateId_idx" ON "OrderItem"("bundleTemplateId");

-- CreateIndex
CREATE INDEX "Review_productId_createdAt_idx" ON "Review"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_userId_productId_idx" ON "Review"("userId", "productId");

-- CreateIndex
CREATE INDEX "ServiceBooking_userId_createdAt_idx" ON "ServiceBooking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceBooking_status_createdAt_idx" ON "ServiceBooking"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceBooking_date_idx" ON "ServiceBooking"("date");

-- CreateIndex
CREATE INDEX "ServiceBooking_date_timeSlot_status_idx" ON "ServiceBooking"("date", "timeSlot", "status");

-- CreateIndex
CREATE INDEX "ServiceBooking_technicianId_idx" ON "ServiceBooking"("technicianId");

-- CreateIndex
CREATE INDEX "ServiceBooking_orderId_idx" ON "ServiceBooking"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_phone_key" ON "Technician"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_email_key" ON "Technician"("email");

-- CreateIndex
CREATE INDEX "Technician_isActive_idx" ON "Technician"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceInvoice_bookingId_key" ON "ServiceInvoice"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceInvoice_invoiceNumber_key" ON "ServiceInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "ServiceInvoice_bookingId_idx" ON "ServiceInvoice"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Referral_refereeId_idx" ON "Referral"("refereeId");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_source_idx" ON "Referral"("source");

-- CreateIndex
CREATE INDEX "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status");

-- CreateIndex
CREATE INDEX "Referral_referrerId_source_idx" ON "Referral"("referrerId", "source");

-- CreateIndex
CREATE INDEX "Referral_refereeId_referrerId_source_idx" ON "Referral"("refereeId", "referrerId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_orderId_key" ON "Referral"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_title_key" ON "ServiceType"("title");

-- CreateIndex
CREATE INDEX "ServiceType_active_idx" ON "ServiceType"("active");

-- CreateIndex
CREATE INDEX "VariantOption_productId_idx" ON "VariantOption"("productId");

-- CreateIndex
CREATE INDEX "VariantOptionValue_optionId_idx" ON "VariantOptionValue"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_price_idx" ON "ProductVariant"("productId", "price");

-- CreateIndex
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductAlert_userId_idx" ON "ProductAlert"("userId");

-- CreateIndex
CREATE INDEX "ProductAlert_productId_type_isActive_idx" ON "ProductAlert"("productId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAlert_userId_productId_type_key" ON "ProductAlert"("userId", "productId", "type");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TierConfig_tierName_key" ON "TierConfig"("tierName");

-- CreateIndex
CREATE INDEX "TallyEnquiry_status_createdAt_idx" ON "TallyEnquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CCTVEnquiry_status_createdAt_idx" ON "CCTVEnquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Banner_displayOrder_idx" ON "Banner"("displayOrder");

-- CreateIndex
CREATE INDEX "Banner_active_displayOrder_idx" ON "Banner"("active", "displayOrder");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_slug_key" ON "Bundle"("slug");

-- CreateIndex
CREATE INDEX "Bundle_isActive_idx" ON "Bundle"("isActive");

-- CreateIndex
CREATE INDEX "Bundle_isActive_startDate_endDate_idx" ON "Bundle"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "BundleItem_bundleId_idx" ON "BundleItem"("bundleId");

-- CreateIndex
CREATE INDEX "BundleReview_bundleId_createdAt_idx" ON "BundleReview"("bundleId", "createdAt");

-- CreateIndex
CREATE INDEX "BundleReview_userId_bundleId_idx" ON "BundleReview"("userId", "bundleId");

-- CreateIndex
CREATE INDEX "BundleTemplate_isActive_idx" ON "BundleTemplate"("isActive");

-- CreateIndex
CREATE INDEX "BundleTemplateSlot_templateId_idx" ON "BundleTemplateSlot"("templateId");

-- CreateIndex
CREATE INDEX "QuantityTier_productId_idx" ON "QuantityTier"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "QuantityTier_productId_minQty_key" ON "QuantityTier"("productId", "minQty");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDuration" ADD CONSTRAINT "CourseDuration_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBatch" ADD CONSTRAINT "CourseBatch_durationId_fkey" FOREIGN KEY ("durationId") REFERENCES "CourseDuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseApplication" ADD CONSTRAINT "CourseApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseApplication" ADD CONSTRAINT "CourseApplication_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseApplication" ADD CONSTRAINT "CourseApplication_durationId_fkey" FOREIGN KEY ("durationId") REFERENCES "CourseDuration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseApplication" ADD CONSTRAINT "CourseApplication_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CourseBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CourseApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseMaterial" ADD CONSTRAINT "CourseMaterial_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_bundleTemplateId_fkey" FOREIGN KEY ("bundleTemplateId") REFERENCES "BundleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInvoice" ADD CONSTRAINT "ServiceInvoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ServiceBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOptionValue" ADD CONSTRAINT "VariantOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "VariantOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAlert" ADD CONSTRAINT "ProductAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAlert" ADD CONSTRAINT "ProductAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleReview" ADD CONSTRAINT "BundleReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleReview" ADD CONSTRAINT "BundleReview_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleTemplateSlot" ADD CONSTRAINT "BundleTemplateSlot_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BundleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantityTier" ADD CONSTRAINT "QuantityTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
