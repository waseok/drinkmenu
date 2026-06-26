import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MAX_MENU_IMAGES,
  migrateLegacyMenuImageUrls,
  uploadMenuImageToBlob,
  deleteMenuImageIfBlob,
  isVercelBlobMenuImageUrl,
} from "@/lib/menu-image-storage";

/** 메뉴판 사진만 별도 로드 (주문 페이지에서 펼칠 때만 요청) */
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { menuImageUrls: true },
    });

    if (!shop) {
      return NextResponse.json(
        { error: "매장을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    let menuImageUrls = shop.menuImageUrls ?? [];
    const migrated = await migrateLegacyMenuImageUrls(shopId, menuImageUrls);
    if (migrated !== menuImageUrls && migrated.join("|") !== menuImageUrls.join("|")) {
      menuImageUrls = migrated;
      await prisma.shop.update({
        where: { id: shopId },
        data: { menuImageUrls },
      });
    }

    const response = NextResponse.json({ menuImageUrls });
    response.headers.set(
      "Cache-Control",
      "private, max-age=300, stale-while-revalidate=600"
    );
    return response;
  } catch (error) {
    console.error("Failed to fetch menu images:", error);
    return NextResponse.json(
      { error: "메뉴 사진을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

/** 관리자: 리사이즈 후 Blob 업로드, DB에 URL만 저장 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { menuImageUrls: true },
    });

    if (!shop) {
      return NextResponse.json(
        { error: "매장을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const current = shop.menuImageUrls ?? [];
    if (current.length >= MAX_MENU_IMAGES) {
      return NextResponse.json(
        { error: `메뉴 사진은 최대 ${MAX_MENU_IMAGES}장까지 등록할 수 있습니다.` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadMenuImageToBlob(shopId, buffer);
    const menuImageUrls = [...current, url].slice(0, MAX_MENU_IMAGES);

    await prisma.shop.update({
      where: { id: shopId },
      data: { menuImageUrls },
    });

    return NextResponse.json({ url, menuImageUrls }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload menu image:", error);
    const message =
      error instanceof Error ? error.message : "메뉴 사진 업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 관리자: Blob 삭제 + DB에서 URL 제거 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json(
        { error: "삭제할 이미지 URL이 필요합니다." },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { menuImageUrls: true },
    });

    if (!shop) {
      return NextResponse.json(
        { error: "매장을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const current = shop.menuImageUrls ?? [];
    if (!current.includes(url)) {
      return NextResponse.json(
        { error: "해당 메뉴 사진을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const menuImageUrls = current.filter((item) => item !== url);
    await prisma.shop.update({
      where: { id: shopId },
      data: { menuImageUrls },
    });

    if (isVercelBlobMenuImageUrl(url)) {
      await deleteMenuImageIfBlob(url);
    }

    return NextResponse.json({ menuImageUrls });
  } catch (error) {
    console.error("Failed to delete menu image:", error);
    return NextResponse.json(
      { error: "메뉴 사진 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
