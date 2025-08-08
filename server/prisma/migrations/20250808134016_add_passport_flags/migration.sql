-- AlterTable
ALTER TABLE "public"."Passport" ADD COLUMN     "inStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isFollowing" BOOLEAN NOT NULL DEFAULT false;
