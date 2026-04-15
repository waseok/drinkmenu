import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ISR: 5초마다 재검증 (주문이 실시간으로 들어옴)
export const revalidate = 5;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const includeOrders = searchParams.get("includeOrders") !== "false";

    const [session, staffGroups] = await Promise.all([
      prisma.orderSession.findUnique({
        where: { id: sessionId },
        include: {
          ...(includeOrders
            ? {
                orders: {
                  include: {
                    staff: true,
                    menuItem: {
                      include: { shop: true },
                    },
                  },
                  orderBy: { createdAt: "desc" as const },
                },
              }
            : {}),
          sessionShops: {
            include: {
              shop: {
                include: {
                  menuItems: {
                    where: { isAvailable: true },
                    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                  },
                },
              },
            },
          },
          sessionTargets: {
            include: {
              staff: {
                select: {
                  id: true,
                  name: true,
                  department: true,
                  position: true,
                },
              },
            },
          },
        },
      }),
      prisma.staffGroup.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { members: { select: { staffId: true } } },
      }),
    ]);

    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const targetIds = new Set(session.sessionTargets.map((t) => t.staffId));
    const hasTargets = targetIds.size > 0;
    const pickerGroups = staffGroups
      .map((g) => ({
        id: g.id,
        name: g.name,
        staffIds: g.members
          .map((m) => m.staffId)
          .filter((sid) => !hasTargets || targetIds.has(sid)),
      }))
      .filter((g) => g.staffIds.length > 0);

    return NextResponse.json({ ...session, pickerGroups });
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json(
      { error: "세션 정보를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
