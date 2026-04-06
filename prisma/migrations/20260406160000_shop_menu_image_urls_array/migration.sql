-- AlterTable: 단일 메뉴 사진 → 최대 3장 배열
ALTER TABLE "shops" ADD COLUMN "menuImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "shops"
SET "menuImageUrls" = ARRAY["menuImageUrl"]::TEXT[]
WHERE "menuImageUrl" IS NOT NULL AND TRIM("menuImageUrl") <> '';

ALTER TABLE "shops" DROP COLUMN "menuImageUrl";
