import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

interface StaffRow {
  name: string;
  department: string;
  position: string;
}

const COLUMN_MAP: Record<string, keyof StaffRow> = {
  이름: "name",
  "부서(학년)": "department",
  부서: "department",
  직위: "position",
  name: "name",
  department: "department",
  position: "position",
};

function parseExcel(buffer: ArrayBuffer): StaffRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  return raw
    .map((row) => {
      const mapped: Partial<StaffRow> = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.trim();
        const field = COLUMN_MAP[normalizedKey];
        if (field) {
          mapped[field] = String(value ?? "").trim();
        }
      }
      return mapped;
    })
    .filter((row): row is StaffRow => Boolean(row.name && row.department))
    .map((row) => ({
      ...row,
      position: row.position ?? "",
    }));
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isPreview = searchParams.get("preview") === "true";

  try {
    if (isPreview) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "파일이 필요합니다." },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      const staff = parseExcel(buffer);

      if (staff.length === 0) {
        return NextResponse.json(
          { error: "유효한 데이터가 없습니다. 열 이름을 확인해주세요. (이름, 부서(학년), 직위)" },
          { status: 400 }
        );
      }

      return NextResponse.json({ staff, count: staff.length });
    }

    const body = await request.json();
    const staffData: StaffRow[] = body.staff;

    if (!Array.isArray(staffData) || staffData.length === 0) {
      return NextResponse.json(
        { error: "등록할 직원 데이터가 없습니다." },
        { status: 400 }
      );
    }

    const created = await prisma.staff.createMany({
      data: staffData.map((s) => ({
        name: s.name.trim(),
        department: s.department.trim(),
        position: (s.position ?? "").trim(),
      })),
    });

    return NextResponse.json(
      { success: true, count: created.count },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to process staff upload:", error);
    return NextResponse.json(
      { error: "파일 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
