-- 직접 입력 주문을 취합 시 선택 주문과 같은 업체 구역에 묶기 위한 매장명
ALTER TABLE "orders" ADD COLUMN "customShopName" TEXT;
