import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const groups = await prisma.staffGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        members: {
          include: {
            staff: {
              select: { id: true, name: true, department: true, position: true },
            },
          },
        },
      },
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Failed to fetch staff groups:", error);
    return NextResponse.json(
      { error: "그룹 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "그룹 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    const rawIds = body?.staffIds;
    const uniqueStaffIds = Array.isArray(rawIds)
      ? [...new Set(rawIds.filter((x: unknown) => typeof x === "string" && x))]
      : [];

    const maxOrder = await prisma.staffGroup.aggregate({
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.staffGroup.create({
        data: { name, sortOrder },
      });
      if (uniqueStaffIds.length > 0) {
        await tx.staffGroupMember.createMany({
          data: uniqueStaffIds.map((staffId) => ({
            groupId: created.id,
            staffId,
          })),
        });
      }
      return tx.staffGroup.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          members: {
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
      });
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Failed to create staff group:", error);
    return NextResponse.json(
      { error: "그룹 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, staffIds } = body as {
      id: string;
      name?: string;
      staffIds?: string[];
    };

    if (!id) {
      return NextResponse.json(
        { error: "그룹 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const group = await prisma.$transaction(async (tx) => {
      if (name !== undefined) {
        const trimmed = String(name).trim();
        if (!trimmed) {
          throw new Error("empty name");
        }
        await tx.staffGroup.update({
          where: { id },
          data: { name: trimmed },
        });
      }

      if (staffIds !== undefined) {
        const unique = [...new Set(staffIds.filter((x) => typeof x === "string"))];
        await tx.staffGroupMember.deleteMany({ where: { groupId: id } });
        if (unique.length > 0) {
          await tx.staffGroupMember.createMany({
            data: unique.map((staffId) => ({ groupId: id, staffId })),
          });
        }
      }

      return tx.staffGroup.findUniqueOrThrow({
        where: { id },
        include: {
          members: {
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
      });
    });

    return NextResponse.json(group);
  } catch (error) {
    if (error instanceof Error && error.message === "empty name") {
      return NextResponse.json(
        { error: "그룹 이름을 입력해주세요." },
        { status: 400 }
      );
    }
    console.error("Failed to update staff group:", error);
    return NextResponse.json(
      { error: "그룹 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json(
        { error: "그룹 ID가 필요합니다." },
        { status: 400 }
      );
    }
    await prisma.staffGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete staff group:", error);
    return NextResponse.json(
      { error: "그룹 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
