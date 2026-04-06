import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_PASSWORD,
  ORDER_AUTH_COOKIE,
  ORDER_PASSWORD,
  SCHOOL_AUTH_TOKEN,
  type AccessScope,
} from "@/lib/school-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = String(body?.password ?? "");
    const scope = String(body?.scope ?? "order") as AccessScope;

    const expectedPassword =
      scope === "admin" ? ADMIN_PASSWORD : ORDER_PASSWORD;

    if (!expectedPassword) {
      return NextResponse.json(
        {
          error:
            scope === "admin"
              ? "관리자 비밀번호가 설정되지 않았습니다."
              : "주문 비밀번호가 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    if (password !== expectedPassword) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      scope === "admin" ? ADMIN_AUTH_COOKIE : ORDER_AUTH_COOKIE,
      SCHOOL_AUTH_TOKEN,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      }
    );

    // Admin access should also allow order pages without asking again.
    if (scope === "admin") {
      response.cookies.set(ORDER_AUTH_COOKIE, SCHOOL_AUTH_TOKEN, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "인증 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_AUTH_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  response.cookies.set(ORDER_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
