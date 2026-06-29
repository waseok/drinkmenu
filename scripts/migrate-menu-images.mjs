/**
 * DB에 남아 있는 base64 메뉴 사진을 Vercel Blob URL로 일괄 이전합니다.
 *
 * 사용법:
 *   DATABASE_URL="..." BLOB_READ_WRITE_TOKEN="..." node scripts/migrate-menu-images.mjs
 *
 * Vercel 프로덕션에서는 BLOB_STORE_ID(OIDC)만으로도 동작하지만,
 * 로컬 실행 시에는 BLOB_READ_WRITE_TOKEN이 필요합니다.
 *   npx vercel env pull .env.local --environment=production
 *   (Windows PowerShell) Get-Content .env.local | ForEach-Object { ... } 후 실행
 */
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });
import pg from "pg";
import sharp from "sharp";
import { put } from "@vercel/blob";

const MAX_MENU_IMAGES = 3;
const MENU_IMAGE_MAX_EDGE = 1200;
const MENU_IMAGE_JPEG_QUALITY = 82;

function isLegacyDataUrl(url) {
  return typeof url === "string" && url.startsWith("data:image/");
}

function parseDataUrl(dataUrl) {
  const match = /^data:image\/[\w+.-]+;base64,(.+)$/i.exec(dataUrl);
  if (!match?.[1]) return null;
  return Buffer.from(match[1], "base64");
}

async function resizeMenuImage(input) {
  return sharp(input)
    .rotate()
    .resize(MENU_IMAGE_MAX_EDGE, MENU_IMAGE_MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: MENU_IMAGE_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

function blobPath(shopId) {
  return `menu-images/${shopId}/${crypto.randomUUID()}.jpg`;
}

function hasBlobConfig() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      process.env.VERCEL_OIDC_TOKEN
  );
}

async function uploadToBlob(shopId, buffer) {
  const resized = await resizeMenuImage(buffer);
  // sharp Buffer → Uint8Array (SharedArrayBuffer fetch 오류 방지)
  const body = Uint8Array.from(resized);
  const blob = await put(blobPath(shopId), body, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: false,
  });
  return blob.url;
}

async function migrateUrls(shopId, urls) {
  const out = [];
  for (const url of urls) {
    if (isLegacyDataUrl(url)) {
      const raw = parseDataUrl(url);
      if (!raw) throw new Error(`잘못된 base64: shop ${shopId}`);
      out.push(await uploadToBlob(shopId, raw));
    } else {
      out.push(url);
    }
  }
  return out.slice(0, MAX_MENU_IMAGES);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL 환경 변수가 필요합니다.");
    process.exit(1);
  }
  if (!hasBlobConfig()) {
    console.error(
      "Blob 설정이 없습니다. BLOB_READ_WRITE_TOKEN(로컬) 또는 BLOB_STORE_ID(Vercel)를 설정하세요."
    );
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const { rows: shops } = await client.query(
      `SELECT id, name, "menuImageUrls" FROM shops ORDER BY name`
    );

    let migratedShops = 0;
    let migratedImages = 0;

    for (const shop of shops) {
      const urls = shop.menuImageUrls ?? [];
      const legacyCount = urls.filter(isLegacyDataUrl).length;
      if (legacyCount === 0) {
        console.log(`[skip] ${shop.name} — base64 없음`);
        continue;
      }

      console.log(`[migrate] ${shop.name} — base64 ${legacyCount}장`);
      const nextUrls = await migrateUrls(shop.id, urls);
      await client.query(
        `UPDATE shops SET "menuImageUrls" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [nextUrls, shop.id]
      );
      migratedShops += 1;
      migratedImages += legacyCount;
      console.log(`  → 완료: ${nextUrls.join(", ")}`);
    }

    console.log(
      `\n완료: 매장 ${migratedShops}곳, 이미지 ${migratedImages}장 Blob 이전`
    );
  } finally {
    await client.end();
  }
}

await main();
