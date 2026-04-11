-- AlterTable: menuItemId를 nullable로 변경, customItemName 컬럼 추가
ALTER TABLE "orders" ALTER COLUMN "menuItemId" DROP NOT NULL;
ALTER TABLE "orders" ADD COLUMN "customItemName" TEXT;
