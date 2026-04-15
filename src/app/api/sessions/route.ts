import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ISR: 60초마다 재검증 (세션은 자주 변경되지 않음)
export const revalidate = 60;

const staffLiteSelect = {
  id: true,
  name: true,
  department: true,
} as const;

function mapSessionListItem(
  s: {
    id: string;
    title: string;
    date: Date;
    deadlineTime: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    _count: { orders: number };
    sessionShops: unknown;
    sessionTargets: {
      staffId: string;
      staff: { id: string; name: string; department: string };
    }[];
    orders: { staffId: string }[];
  }
) {
  const orderedStaffIds = new Set(s.orders.map((o) => o.staffId));
  const targets = s.sessionTargets;
  const notOrderedStaff = targets
    .filter((t) => !orderedStaffIds.has(t.staffId))
    .map((t) => t.staff);
  const orderedTargetCount = targets.filter((t) =>
    orderedStaffIds.has(t.staffId)
  ).length;

  const { orders: _orders, ...rest } = s;

  return {
    ...rest,
    targetSummary:
      targets.length === 0
        ? null
        : {
            targetCount: targets.length,
            orderedCount: orderedTargetCount,
            notOrderedCount: notOrderedStaff.length,
            notOrderedStaff,
          },
  };
}

export async function GET() {
  try {
    const sessions = await prisma.orderSession.findMany({
      orderBy: { date: "desc" },
      include: {
        _count: { select: { orders: true } },
        sessionShops: {
          include: { shop: true },
        },
        sessionTargets: {
          include: {
            staff: { select: staffLiteSelect },
          },
        },
        orders: { select: { staffId: true } },
      },
    });

    const payload = sessions.map(mapSessionListItem);
    return NextResponse.json(payload);
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
    const { title, date, deadlineTime, shopIds, staffIds } = body as {
      title: string;
      date: string;
      deadlineTime?: string;
      shopIds: string[];
      staffIds?: string[];
    };

    if (!title || !date || !shopIds?.length) {
      return NextResponse.json(
        { error: "제목, 날짜, 매장을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const uniqueStaff =
      Array.isArray(staffIds) && staffIds.length > 0
        ? [...new Set(staffIds.filter((id) => typeof id === "string" && id))]
        : [];

    const session = await prisma.orderSession.create({
      data: {
        title,
        date: new Date(date),
        deadlineTime: deadlineTime || null,
        sessionShops: {
          create: shopIds.map((shopId) => ({ shopId })),
        },
        ...(uniqueStaff.length > 0
          ? {
              sessionTargets: {
                create: uniqueStaff.map((staffId) => ({ staffId })),
              },
            }
          : {}),
      },
      include: {
        _count: { select: { orders: true } },
        sessionShops: {
          include: { shop: true },
        },
        sessionTargets: {
          include: {
            staff: { select: staffLiteSelect },
          },
        },
        orders: { select: { staffId: true } },
      },
    });

    return NextResponse.json(mapSessionListItem(session), { status: 201 });
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
    const { id, title, date, deadlineTime, status, shopIds, staffIds } = body as {
      id: string;
      title?: string;
      date?: string;
      deadlineTime?: string | null;
      status?: "OPEN" | "CLOSED";
      shopIds?: string[];
      staffIds?: string[];
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
    if (deadlineTime !== undefined) updateData.deadlineTime = deadlineTime || null;
    if (status !== undefined) updateData.status = status;

    const session = await prisma.$transaction(async (tx) => {
      if (shopIds !== undefined) {
        await tx.sessionShop.deleteMany({ where: { sessionId: id } });
        await tx.sessionShop.createMany({
          data: shopIds.map((shopId) => ({ sessionId: id, shopId })),
        });
      }

      if (staffIds !== undefined) {
        const uniqueStaff = [
          ...new Set(
            (staffIds as string[]).filter((x) => typeof x === "string" && x)
          ),
        ];
        await tx.sessionTargetStaff.deleteMany({ where: { sessionId: id } });
        if (uniqueStaff.length > 0) {
          await tx.sessionTargetStaff.createMany({
            data: uniqueStaff.map((staffId) => ({ sessionId: id, staffId })),
          });
        }
      }

      await tx.orderSession.update({
        where: { id },
        data: updateData,
      });

      return tx.orderSession.findUniqueOrThrow({
        where: { id },
        include: {
          _count: { select: { orders: true } },
          sessionShops: {
            include: { shop: true },
          },
          sessionTargets: {
            include: {
              staff: { select: staffLiteSelect },
            },
          },
          orders: { select: { staffId: true } },
        },
      });
    });

    return NextResponse.json(mapSessionListItem(session));
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
