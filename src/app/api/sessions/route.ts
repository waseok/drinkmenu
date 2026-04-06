import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessions = await prisma.orderSession.findMany({
      orderBy: { date: "desc" },
      include: {
        _count: { select: { orders: true } },
        sessionShops: {
          include: { shop: true },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "세션 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, date, shopIds } = body as {
      title: string;
      date: string;
      shopIds: string[];
    };

    if (!title || !date || !shopIds?.length) {
      return NextResponse.json(
        { error: "제목, 날짜, 매장을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const session = await prisma.orderSession.create({
      data: {
        title,
        date: new Date(date),
        sessionShops: {
          create: shopIds.map((shopId) => ({ shopId })),
        },
      },
      include: {
        _count: { select: { orders: true } },
        sessionShops: {
          include: { shop: true },
        },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "세션 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, date, status, shopIds } = body as {
      id: string;
      title?: string;
      date?: string;
      status?: "OPEN" | "CLOSED";
      shopIds?: string[];
    };

    if (!id) {
      return NextResponse.json(
        { error: "세션 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = new Date(date);
    if (status !== undefined) updateData.status = status;

    const session = await prisma.$transaction(async (tx) => {
      if (shopIds !== undefined) {
        await tx.sessionShop.deleteMany({ where: { sessionId: id } });
        await tx.sessionShop.createMany({
          data: shopIds.map((shopId) => ({ sessionId: id, shopId })),
        });
      }

      return tx.orderSession.update({
        where: { id },
        data: updateData,
        include: {
          _count: { select: { orders: true } },
          sessionShops: {
            include: { shop: true },
          },
        },
      });
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to update session:", error);
    return NextResponse.json(
      { error: "세션 수정에 실패했습니다." },
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
        { error: "세션 ID가 필요합니다." },
        { status: 400 }
      );
    }

    await prisma.orderSession.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      { error: "세션 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
