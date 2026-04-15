import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const staffId = searchParams.get("staffId");
    const summary = searchParams.get("summary");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam || "8"), 1), 20);

    // 세션별 주문 목록 조회 (기존 기능)
    if (sessionId) {
      // 이름 선택 단계 "주문함" 표시용 경량 조회
      if (summary === "staffIds") {
        const rows = await prisma.order.findMany({
          where: { sessionId },
          select: { staffId: true },
          distinct: ["staffId"],
        });
        return NextResponse.json({ staffIds: rows.map((r) => r.staffId) });
      }

      const orders = await prisma.order.findMany({
        where: { sessionId },
        include: {
          staff: true,
          menuItem: {
            include: { shop: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json(orders);
    }

    // 직원별 과거 주문 조회 (이름 선택 단계의 호버 카드에서 사용)
    if (staffId) {
      const orders = await prisma.order.findMany({
        where: { staffId },
        include: {
          session: {
            select: {
              id: true,
              title: true,
              date: true,
            },
          },
          menuItem: {
            select: {
              id: true,
              name: true,
              shop: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return NextResponse.json(orders);
    }

    return NextResponse.json(
      { error: "sessionId 또는 staffId가 필요합니다." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "주문 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      staffId,
      staffName,
      staffDepartment,
      menuItemId,
      customItemName,
      customShopName,
      quantity,
      options,
      price,
    } = body as {
      sessionId: string;
      staffId?: string;
      staffName?: string;
      staffDepartment?: string;
      menuItemId?: string;
      customItemName?: string;
      customShopName?: string;
      quantity: number;
      options: string;
      price: number;
    };

    if (!sessionId || (!menuItemId && !customItemName?.trim()) || price == null || (!staffId && !staffName?.trim())) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const session = await prisma.orderSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (session.status === "CLOSED") {
      return NextResponse.json(
        { error: "마감된 세션에는 주문할 수 없습니다." },
        { status: 400 }
      );
    }

    let resolvedStaffId = staffId;

    if (!resolvedStaffId) {
      const name = staffName?.trim();
      const department = staffDepartment?.trim() || "직접입력";

      if (!name) {
        return NextResponse.json(
          { error: "주문자 이름이 필요합니다." },
          { status: 400 }
        );
      }

      const existingStaff = await prisma.staff.findFirst({
        where: { name, department },
      });

      if (existingStaff) {
        resolvedStaffId = existingStaff.id;
      } else {
        const createdStaff = await prisma.staff.create({
          data: {
            name,
            department,
            position: "",
          },
        });
        resolvedStaffId = createdStaff.id;
      }
    } else {
      const existingStaff = await prisma.staff.findUnique({
        where: { id: resolvedStaffId },
      });

      if (!existingStaff) {
        return NextResponse.json(
          { error: "주문자를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    const trimmedShop = customShopName?.trim();
    const order = await prisma.order.create({
      data: {
        sessionId,
        staffId: resolvedStaffId,
        ...(menuItemId ? { menuItemId } : {}),
        ...(customItemName ? { customItemName: customItemName.trim() } : {}),
        ...(trimmedShop ? { customShopName: trimmedShop } : {}),
        quantity: quantity || 1,
        options: options || "",
        price,
      } as any,
      include: {
        staff: true,
        menuItem: menuItemId ? { include: { shop: true } } : false,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "주문 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, quantity, options, price, menuItemId } = body as {
      id: string;
      quantity?: number;
      options?: string;
      price?: number;
      menuItemId?: string;
    };

    if (!id) {
      return NextResponse.json(
        { error: "주문 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (options !== undefined) updateData.options = options;
    if (price !== undefined) updateData.price = price;
    if (menuItemId !== undefined) updateData.menuItemId = menuItemId;

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        staff: true,
        menuItem: {
          include: { shop: true },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json(
      { error: "주문 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body as { id: string };

    if (!id) {
      return NextResponse.json(
        { error: "주문 ID가 필요합니다." },
        { status: 400 }
      );
    }

    await prisma.order.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete order:", error);
    return NextResponse.json(
      { error: "주문 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
