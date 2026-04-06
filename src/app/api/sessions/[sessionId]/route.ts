import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await prisma.orderSession.findUnique({
      where: { id: sessionId },
      include: {
        orders: {
          include: {
            staff: true,
            menuItem: {
              include: { shop: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        sessionShops: {
          include: {
            shop: {
              include: {
                menuItems: {
                  where: { isAvailable: true },
                  orderBy: { name: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json(
      { error: "세션 정보를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
