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
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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

    const maxOrder = await prisma.menuItem.aggregate({
      where: { shopId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const menuItem = await prisma.menuItem.create({
      data: {
        shopId,
        name,
        price: Number(price),
        category: category ?? "",
        sortOrder: nextSortOrder,
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
    const { id, name, price, category, sortOrder, isAvailable, isIce, isHot } =
      body;

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
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;
    const body = await request.json();
    const { orderedIds } = body as { orderedIds?: string[] };

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds 배열이 필요합니다." },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(orderedIds)];
    if (uniqueIds.length !== orderedIds.length) {
      return NextResponse.json(
        { error: "중복된 메뉴 ID가 있습니다." },
        { status: 400 }
      );
    }

    const count = await prisma.menuItem.count({
      where: { shopId, id: { in: orderedIds } },
    });

    if (count !== orderedIds.length) {
      return NextResponse.json(
        { error: "해당 매장에 속하지 않은 메뉴가 포함되어 있습니다." },
        { status: 400 }
      );
    }

    const totalInShop = await prisma.menuItem.count({ where: { shopId } });
    if (totalInShop !== orderedIds.length) {
      return NextResponse.json(
        { error: "매장의 모든 메뉴 ID를 순서대로 보내야 합니다." },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.menuItem.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder menu items:", error);
    return NextResponse.json(
      { error: "메뉴 순서 변경에 실패했습니다." },
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
