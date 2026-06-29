import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  mapShopForOrderResponse,
  shopForOrderSelect,
  shopLiteSelect,
} from "@/lib/shop-selects";

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
                      include: { shop: { select: shopLiteSelect } },
                    },
                  },
                  orderBy: { createdAt: "desc" as const },
                },
              }
            : {}),
          sessionShops: {
            include: {
              shop: {
                select: {
                  ...shopForOrderSelect,
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

    const { sessionShops, ...sessionRest } = session;

    // 메뉴 사진 개수만 별도로 구한다. base64 본문은 읽지 않으므로 DB egress가
    // 매장당 수 바이트 수준으로 줄어든다. (cardinality는 배열 길이만 반환)
    const shopIds = sessionShops.map((ss) => ss.shop.id);
    const imageCountRows = shopIds.length
      ? await prisma.$queryRaw<{ id: string; cnt: number }[]>`
          SELECT id, cardinality("menuImageUrls")::int AS cnt
          FROM shops
          WHERE id = ANY(${shopIds})
        `
      : [];
    const imageCountByShopId = new Map(
      imageCountRows.map((r) => [r.id, Number(r.cnt) || 0])
    );

    const payload = {
      ...sessionRest,
      sessionShops: sessionShops.map((ss) => ({
        ...ss,
        shop: {
          ...mapShopForOrderResponse(
            ss.shop,
            imageCountByShopId.get(ss.shop.id) ?? 0
          ),
          menuItems: ss.shop.menuItems,
        },
      })),
      pickerGroups,
    };

    const response = NextResponse.json(payload);
    // 이 응답(세션 메타·매장/메뉴·대상자·그룹)은 해당 세션을 여는 모든
    // 사용자에게 동일하다. private였던 탓에 동시 접속자 수만큼 compute를
    // 호출했지만, 공용(s-maxage) 캐시로 바꾸면 Vercel 엣지가 한 번 받은
    // 응답을 모두에게 공유한다 → Fast Origin Transfer 대폭 절감.
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=10, stale-while-revalidate=30"
    );
    return response;
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json(
      { error: "세션 정보를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
