import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    const menuItems = await prisma.menuItem.findMany({
      where: { shopId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(menuItems);
  } catch (error) {
    console.error("Failed to fetch menu items:", error);
    return NextResponse.json(
      { error: "메뉴 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;
    const body = await request.json();
    const { name, price, category, isIce, isHot } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "메뉴 이름과 가격은 필수입니다." },
        { status: 400 }
      );
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        shopId,
        name,
        price: Number(price),
        category: category ?? "",
        isIce: isIce ?? false,
        isHot: isHot ?? false,
      },
    });

    return NextResponse.json(menuItem, { status: 201 });
  } catch (error) {
    console.error("Failed to create menu item:", error);
    return NextResponse.json(
      { error: "메뉴 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, price, category, isAvailable, isIce, isHot } = body;

    if (!id) {
      return NextResponse.json(
        { error: "메뉴 ID는 필수입니다." },
        { status: 400 }
      );
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: Number(price) }),
        ...(category !== undefined && { category }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(isIce !== undefined && { isIce }),
        ...(isHot !== undefined && { isHot }),
      },
    });

    return NextResponse.json(menuItem);
  } catch (error) {
    console.error("Failed to update menu item:", error);
    return NextResponse.json(
      { error: "메뉴 수정에 실패했습니다." },
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
        { error: "메뉴 ID는 필수입니다." },
        { status: 400 }
      );
    }

    await prisma.menuItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete menu item:", error);
    return NextResponse.json(
      { error: "메뉴 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
