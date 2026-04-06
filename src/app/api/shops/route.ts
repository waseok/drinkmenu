import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const shops = await prisma.shop.findMany({
      include: { menuItems: true },
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
    const body = await request.json();
    const { name, address, phone, category, naverPlaceId, menuImageUrl } = body;

    if (!name) {
      return NextResponse.json(
        { error: "매장 이름은 필수입니다." },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.create({
      data: {
        name,
        address: address ?? "",
        phone: phone ?? "",
        category: category ?? "",
        naverPlaceId: naverPlaceId ?? "",
        menuImageUrl: menuImageUrl ?? "",
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
    const body = await request.json();
    const { id, name, address, phone, category, naverPlaceId, menuImageUrl } = body;

    if (!id) {
      return NextResponse.json(
        { error: "매장 ID는 필수입니다." },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(category !== undefined && { category }),
        ...(naverPlaceId !== undefined && { naverPlaceId }),
        ...(menuImageUrl !== undefined && { menuImageUrl }),
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
