import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// ISR: 86400초(1일)마다 재검증 (샘플 템플릿은 정적 파일)
export const revalidate = 86400;

/**
 * 업로드 파서(`parseExcel`)와 동일한 열 이름으로 샘플 시트를 만듭니다.
 * 헤더는 수정하지 말고, 아래 빈 행에만 데이터를 입력하면 됩니다.
 */
export async function GET() {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [
    ["이름", "부서(학년)", "직위"],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "교직원");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const asciiName = "staff-upload-sample.xlsx";
  const utf8Name = encodeURIComponent("교직원_업로드_샘플.xlsx");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
