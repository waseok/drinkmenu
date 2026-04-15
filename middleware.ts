import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_AUTH_COOKIE,
  ORDER_AUTH_COOKIE,
  SCHOOL_AUTH_TOKEN,
} from "@/lib/school-auth";

function getAccessScope(pathname: string, method: string): "admin" | "order" | null {
  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (pathname.startsWith("/order")) {
    return "order";
  }

  if (pathname === "/api/staff" || pathname === "/api/orders") {
    return "order";
  }

  /** 세션 조회(GET)는 주문 화면에서도 필요. 생성·수정·삭제는 관리자만. */
  if (pathname.startsWith("/api/sessions")) {
    return method === "GET" ? "order" : "admin";
  }

  if (pathname.startsWith("/api/staff/groups")) {
    return method === "GET" ? "order" : "admin";
  }

  if (pathname === "/api/sessions" && method === "GET") {
    return "order";
  }

  if (
    pathname.startsWith("/api/shops") ||
    pathname.startsWith("/api/crawl") ||
    pathname.startsWith("/api/staff/upload")
  ) {
    return "admin";
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/auth/school-access")) {
    return NextResponse.next();
  }

  const requiredScope = getAccessScope(pathname, request.method);
  if (!requiredScope) {
    return NextResponse.next();
  }

  const hasAdminAccess =
    request.cookies.get(ADMIN_AUTH_COOKIE)?.value === SCHOOL_AUTH_TOKEN;
  const hasOrderAccess =
    request.cookies.get(ORDER_AUTH_COOKIE)?.value === SCHOOL_AUTH_TOKEN;
  const isAuthenticated =
    requiredScope === "admin" ? hasAdminAccess : hasAdminAccess || hasOrderAccess;

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: `${requiredScope === "admin" ? "관리자" : "주문"} 비밀번호 인증이 필요합니다.` },
      { status: 401 }
    );
  }

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("next", `${pathname}${search}`);
  accessUrl.searchParams.set("scope", requiredScope);
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/order/:path*", "/api/:path*"],
};
