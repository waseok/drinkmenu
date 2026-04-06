import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "세션 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { sessionId },
      include: {
        staff: true,
        menuItem: {
          include: { shop: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
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
      quantity,
      options,
      price,
    } = body as {
      sessionId: string;
      staffId?: string;
      staffName?: string;
      staffDepartment?: string;
      menuItemId: string;
      quantity: number;
      options: string;
      price: number;
    };

    if (!sessionId || !menuItemId || !price || (!staffId && !staffName?.trim())) {
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

    const order = await prisma.order.create({
      data: {
        sessionId,
        staffId: resolvedStaffId,
        menuItemId,
        quantity: quantity || 1,
        options: options || "",
        price,
      },
      include: {
        staff: true,
        menuItem: {
          include: { shop: true },
        },
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
