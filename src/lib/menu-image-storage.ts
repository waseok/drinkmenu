import { del, put } from "@vercel/blob";
import sharp from "sharp";

export const MAX_MENU_IMAGES = 3;
/** 긴 변 기준 최대 픽셀 — 메뉴판 가독성 유지하면서 용량 절감 */
export const MENU_IMAGE_MAX_EDGE = 1200;
export const MENU_IMAGE_JPEG_QUALITY = 82;

export function isLegacyMenuImageDataUrl(url: string): boolean {
  return url.startsWith("data:image/");
}

export function isVercelBlobMenuImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function parseDataUrl(dataUrl: string): Buffer | null {
  const match = /^data:image\/[\w+.-]+;base64,(.+)$/i.exec(dataUrl);
  if (!match?.[1]) return null;
  return Buffer.from(match[1], "base64");
}

/** 업로드·마이그레이션 공통 — JPEG로 리사이즈 */
export async function resizeMenuImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(MENU_IMAGE_MAX_EDGE, MENU_IMAGE_MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: MENU_IMAGE_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

function menuImageBlobPath(shopId: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `menu-images/${shopId}/${id}.jpg`;
}

/** Vercel OIDC(BLOB_STORE_ID) 또는 구형 BLOB_READ_WRITE_TOKEN */
function hasBlobStorageConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      process.env.VERCEL_OIDC_TOKEN
  );
}

export async function uploadMenuImageToBlob(
  shopId: string,
  imageBuffer: Buffer
): Promise<string> {
  if (!hasBlobStorageConfigured()) {
    throw new Error(
      "Blob 스토어가 연결되지 않았습니다. Vercel Storage에서 drinkmenu 프로젝트에 Blob을 연결해 주세요."
    );
  }

  const resized = await resizeMenuImage(imageBuffer);
  // sharp가 SharedArrayBuffer-backed Buffer를 반환하면 Vercel fetch에서 거부됨 → 복사
  const body = new Blob([new Uint8Array(resized)], { type: "image/jpeg" });
  const blob = await put(menuImageBlobPath(shopId), body, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: false,
  });

  return blob.url;
}

export async function deleteMenuImageIfBlob(url: string): Promise<void> {
  if (!isVercelBlobMenuImageUrl(url)) return;
  if (!hasBlobStorageConfigured()) return;

  try {
    await del(url);
  } catch (error) {
    console.warn("Failed to delete menu image blob:", url, error);
  }
}

/** 저장된 URL 목록에서 제거된 Blob 파일 정리 */
export async function deleteRemovedMenuImageBlobs(
  previousUrls: string[],
  nextUrls: string[]
): Promise<void> {
  const nextSet = new Set(nextUrls);
  const removed = previousUrls.filter(
    (url) => isVercelBlobMenuImageUrl(url) && !nextSet.has(url)
  );
  await Promise.all(removed.map((url) => deleteMenuImageIfBlob(url)));
}

async function legacyDataUrlToBlobUrl(
  shopId: string,
  dataUrl: string
): Promise<string> {
  const raw = parseDataUrl(dataUrl);
  if (!raw) {
    throw new Error("잘못된 base64 메뉴 이미지입니다.");
  }
  return uploadMenuImageToBlob(shopId, raw);
}

/**
 * DB에 남아 있는 base64 data URL을 Blob URL로 일괄 변환.
 * GET /menu-images 호출 시 1회 실행되며, 이후 응답은 URL 문자열만 반환.
 */
export async function migrateLegacyMenuImageUrls(
  shopId: string,
  urls: string[]
): Promise<string[]> {
  if (!urls.some(isLegacyMenuImageDataUrl)) {
    return urls;
  }

  if (!hasBlobStorageConfigured()) {
    return urls;
  }

  const migrated: string[] = [];
  for (const url of urls) {
    if (isLegacyMenuImageDataUrl(url)) {
      migrated.push(await legacyDataUrlToBlobUrl(shopId, url));
    } else {
      migrated.push(url);
    }
  }

  return migrated.slice(0, MAX_MENU_IMAGES);
}
