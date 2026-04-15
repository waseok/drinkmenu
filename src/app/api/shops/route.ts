import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ISR: 300초(5분)마다 재검증 (메뉴 정보는 관리자만 수정)
export const revalidate = 300;

const MAX_MENU_IMAGES = 3;

function normalizeMenuImageUrlsInput(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.menuImageUrls)) {
    return body.menuImageUrls
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      .slice(0, MAX_MENU_IMAGES);
  }
  if (typeof body.menuImageUrl === "string" && body.menuImageUrl.trim()) {
    return [body.menuImageUrl.trim()];
  }
  return [];
}

export async function GET() {
  try {
    const shops = await prisma.shop.findMany({
      include: {
        menuItems: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(shops);
  } catch (error) {
    console.error("Failed to fetch shops:", error);
    return NextResponse.json(
      { error: "매장 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { name, address, phone, category, naverPlaceId } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "매장 이름은 필수입니다." },
        { status: 400 }
      );
    }

    const menuImageUrls = normalizeMenuImageUrlsInput(body);

    const shop = await prisma.shop.create({
      data: {
        name,
        address: typeof address === "string" ? address : "",
        phone: typeof phone === "string" ? phone : "",
        category: typeof category === "string" ? category : "",
        naverPlaceId: typeof naverPlaceId === "string" ? naverPlaceId : "",
        menuImageUrls,
      },
    });

    return NextResponse.json(shop, { status: 201 });
  } catch (error) {
    console.error("Failed to create shop:", error);
    return NextResponse.json(
      { error: "매장 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { id, name, address, phone, category, naverPlaceId } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "매장 ID는 필수입니다." },
        { status: 400 }
      );
    }

    const menuUrlsPatch =
      "menuImageUrls" in body || "menuImageUrl" in body
        ? normalizeMenuImageUrlsInput(body)
        : undefined;

    const shop = await prisma.shop.update({
      where: { id },
      data: {
        ...(name !== undefined && typeof name === "string" ? { name } : {}),
        ...(address !== undefined && typeof address === "string"
          ? { address }
          : {}),
        ...(phone !== undefined && typeof phone === "string" ? { phone } : {}),
        ...(category !== undefined && typeof category === "string"
          ? { category }
          : {}),
        ...(naverPlaceId !== undefined && typeof naverPlaceId === "string"
          ? { naverPlaceId }
          : {}),
        ...(menuUrlsPatch !== undefined ? { menuImageUrls: menuUrlsPatch } : {}),
      },
    });

    return NextResponse.json(shop);
  } catch (error) {
    console.error("Failed to update shop:", error);
    return NextResponse.json(
      { error: "매장 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "매장 ID는 필수입니다." },
        { status: 400 }
      );
    }

    await prisma.shop.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete shop:", error);
    return NextResponse.json(
      { error: "매장 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
