import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 메뉴판 사진만 별도 로드 (주문 페이지에서 펼칠 때만 요청) */
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { menuImageUrls: true },
    });

    if (!shop) {
      return NextResponse.json(
        { error: "매장을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      menuImageUrls: shop.menuImageUrls ?? [],
    });
    response.headers.set(
      "Cache-Control",
      "private, max-age=300, stale-while-revalidate=600"
    );
    return response;
  } catch (error) {
    console.error("Failed to fetch menu images:", error);
    return NextResponse.json(
      { error: "메뉴 사진을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
