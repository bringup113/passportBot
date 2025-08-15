-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Passport" (
    "passportNo" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "issueDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "isFollowing" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "mrzCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passport_pkey" PRIMARY KEY ("passportNo")
);

-- CreateTable
CREATE TABLE "public"."Visa" (
    "id" TEXT NOT NULL,
    "passportNo" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "visaName" TEXT NOT NULL,
    "expiryDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "diffJson" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotifySetting" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "channel" TEXT NOT NULL DEFAULT 'telegram',
    "telegramBotToken" TEXT,
    "threshold15" BOOLEAN NOT NULL DEFAULT true,
    "threshold30" BOOLEAN NOT NULL DEFAULT true,
    "threshold90" BOOLEAN NOT NULL DEFAULT true,
    "threshold180" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotifySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TelegramWhitelist" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramWhitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationLog" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'telegram',
    "level" TEXT,
    "message" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "whitelistId" TEXT,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "public"."Client"("name");

-- CreateIndex
CREATE INDEX "Passport_clientId_idx" ON "public"."Passport"("clientId");

-- CreateIndex
CREATE INDEX "Passport_expiryDate_idx" ON "public"."Passport"("expiryDate");

-- CreateIndex
CREATE INDEX "Passport_status_expiryDate_idx" ON "public"."Passport"("status", "expiryDate");

-- CreateIndex
CREATE INDEX "Visa_passportNo_idx" ON "public"."Visa"("passportNo");

-- CreateIndex
CREATE INDEX "Visa_expiryDate_idx" ON "public"."Visa"("expiryDate");

-- CreateIndex
CREATE INDEX "Visa_status_expiryDate_idx" ON "public"."Visa"("status", "expiryDate");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "public"."AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramWhitelist_chatId_key" ON "public"."TelegramWhitelist"("chatId");

-- AddForeignKey
ALTER TABLE "public"."Passport" ADD CONSTRAINT "Passport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visa" ADD CONSTRAINT "Visa_passportNo_fkey" FOREIGN KEY ("passportNo") REFERENCES "public"."Passport"("passportNo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationLog" ADD CONSTRAINT "NotificationLog_whitelistId_fkey" FOREIGN KEY ("whitelistId") REFERENCES "public"."TelegramWhitelist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
