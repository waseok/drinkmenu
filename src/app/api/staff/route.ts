import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return NextResponse.json(
      { error: "직원 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, department, position } = body;

    if (!name || !department) {
      return NextResponse.json(
        { error: "이름과 부서는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.create({
      data: {
        name: name.trim(),
        department: department.trim(),
        position: (position ?? "").trim(),
      },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    console.error("Failed to create staff:", error);
    return NextResponse.json(
      { error: "직원 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, department, position } = body;

    if (!id) {
      return NextResponse.json(
        { error: "직원 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!name || !department) {
      return NextResponse.json(
        { error: "이름과 부서는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.update({
      where: { id },
      data: {
        name: name.trim(),
        department: department.trim(),
        position: (position ?? "").trim(),
      },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Failed to update staff:", error);
    return NextResponse.json(
      { error: "직원 정보 수정에 실패했습니다." },
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
        { error: "직원 ID가 필요합니다." },
        { status: 400 }
      );
    }

    await prisma.staff.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete staff:", error);
    return NextResponse.json(
      { error: "직원 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
