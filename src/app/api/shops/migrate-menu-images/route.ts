import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isLegacyMenuImageDataUrl,
  migrateLegacyMenuImageUrls,
} from "@/lib/menu-image-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 관리자 전용: 모든 매장의 base64 메뉴 사진을 Blob URL로 일괄 이전.
 * POST /api/shops/migrate-menu-images (관리자 쿠키 필요)
 */
export async function POST() {
  try {
    const shops = await prisma.shop.findMany({
      select: { id: true, name: true, menuImageUrls: true },
      orderBy: { name: "asc" },
    });

    const results: {
      shopId: string;
      name: string;
      migrated: number;
      skipped: boolean;
      urls?: string[];
      error?: string;
    }[] = [];

    let totalMigrated = 0;

    for (const shop of shops) {
      const urls = shop.menuImageUrls ?? [];
      const legacyCount = urls.filter(isLegacyMenuImageDataUrl).length;

      if (legacyCount === 0) {
        results.push({
          shopId: shop.id,
          name: shop.name,
          migrated: 0,
          skipped: true,
        });
        continue;
      }

      try {
        const migrated = await migrateLegacyMenuImageUrls(shop.id, urls);
        await prisma.shop.update({
          where: { id: shop.id },
          data: { menuImageUrls: migrated },
        });
        results.push({
          shopId: shop.id,
          name: shop.name,
          migrated: legacyCount,
          skipped: false,
          urls: migrated,
        });
        totalMigrated += legacyCount;
      } catch (error) {
        results.push({
          shopId: shop.id,
          name: shop.name,
          migrated: 0,
          skipped: false,
          error:
            error instanceof Error ? error.message : "마이그레이션 실패",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      totalMigrated,
      shops: results,
    });
  } catch (error) {
    console.error("Bulk menu image migration failed:", error);
    return NextResponse.json(
      { error: "일괄 마이그레이션에 실패했습니다." },
      { status: 500 }
    );
  }
}
