-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- 기존 데이터: 매장별로 기존(카테고리·이름) 정렬 순서를 sortOrder로 옮김
WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "shopId"
      ORDER BY "category" ASC, "name" ASC
    ) - 1 AS rn
  FROM "menu_items"
)
UPDATE "menu_items" AS m
SET "sortOrder" = numbered.rn
FROM numbered
WHERE m."id" = numbered."id";
