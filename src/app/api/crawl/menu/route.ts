import { NextRequest, NextResponse } from "next/server";

interface CrawledMenuItem {
  name: string;
  price: number | null;
  description?: string;
}

const MENU_KEY_PATTERN = /(menu|product|goods|item)/i;
const MENU_TYPENAME_PATTERN = /(menu|product|goods|item)/i;
const BLOCKED_MENU_NAME_PATTERNS = [
  /^쇼핑백$/,
  /^배달비$/,
  /^선물포장$/,
  /^봉투$/,
  /^수저$/,
  /^젓가락$/,
  /^원산지(?: 정보)?$/,
  /^알레르기(?: 정보)?$/,
  /^리뷰 이벤트/,
];

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function extractPrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = parseInt(String(value).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractDescription(val: Record<string, unknown>): string | undefined {
  const candidates = [
    val.description,
    val.summary,
    val.detail,
    val.introduction,
    val.content,
  ];

  for (const candidate of candidates) {
    const text = toText(candidate);
    if (text) return text;
  }

  return undefined;
}

function isBlockedMenuName(name: string): boolean {
  return BLOCKED_MENU_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

function isLikelyMenuRecord(key: string, val: Record<string, unknown>): boolean {
  const typename = toText(val.__typename);
  if (typename && MENU_TYPENAME_PATTERN.test(typename)) {
    return true;
  }

  if (MENU_KEY_PATTERN.test(key)) {
    return true;
  }

  return Boolean(
    val.price !== undefined ||
      val.unitprice !== undefined ||
      val.salePrice !== undefined ||
      val.description !== undefined ||
      val.summary !== undefined
  );
}

function collectMenuItems(
  data: Record<string, unknown>,
  strategy: (key: string, val: Record<string, unknown>) => boolean
): CrawledMenuItem[] {
  const menuItems: CrawledMenuItem[] = [];
  const seen = new Set<string>();

  for (const [key, raw] of Object.entries(data)) {
    if (!raw || typeof raw !== "object") continue;

    const val = raw as Record<string, unknown>;
    const name = toText(val.name);
    if (!name || name.length < 2) continue;
    if (!strategy(key, val)) continue;
    if (isBlockedMenuName(name)) continue;

    const price =
      extractPrice(val.price) ??
      extractPrice(val.unitprice) ??
      extractPrice(val.salePrice) ??
      extractPrice(val.defaultPrice);
    const description = extractDescription(val);

    const dedupKey = `${name}_${price ?? "null"}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    menuItems.push({ name, price, description });
  }

  return menuItems;
}

function extractApolloState(html: string): string | null {
  const marker = "window.__APOLLO_STATE__=";
  let startIdx = html.indexOf(marker);
  if (startIdx < 0) {
    startIdx = html.indexOf("window.__APOLLO_STATE__ =");
  }
  if (startIdx < 0) return null;

  const jsonStart = html.indexOf("{", startIdx);
  if (jsonStart < 0) return null;

  let depth = 0;
  let end = jsonStart;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") depth++;
    if (html[i] === "}") depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }

  return html.substring(jsonStart, end);
}

function normalizePlaceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function scorePlaceMatch(shopName: string, candidateName: string): number {
  const target = normalizePlaceName(shopName);
  const candidate = normalizePlaceName(candidateName);

  if (!target || !candidate) return 0;
  if (target === candidate) return 100;
  if (candidate.includes(target)) return 80;
  if (target.includes(candidate)) return 60;

  let score = 0;
  const keywords = shopName
    .split(/\s+/)
    .map((part) => normalizePlaceName(part))
    .filter((part) => part.length >= 2);

  for (const keyword of keywords) {
    if (candidate.includes(keyword)) score += 10;
  }

  return score;
}

async function searchNaverPlaceIds(shopName: string): Promise<string[]> {
  try {
    const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(shopName)}&where=nexearch`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    if (!response.ok) return [];
    const html = await response.text();

    const matches = [...html.matchAll(/place\/(\d{5,})/g)];
    return [...new Set(matches.map((match) => match[1]))];
  } catch {
    return [];
  }
}

async function fetchPlaceName(placeId: string): Promise<string | null> {
  try {
    const url = `https://pcmap.place.naver.com/restaurant/${placeId}/home`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const apolloJson = extractApolloState(html);
    if (!apolloJson) return null;

    const data = JSON.parse(apolloJson) as Record<string, unknown>;
    const base = data[`PlaceDetailBase:${placeId}`] as
      | Record<string, unknown>
      | undefined;
    return toText(base?.name) ?? null;
  } catch {
    return null;
  }
}

async function fetchMenuFromNaverPlace(
  placeId: string
): Promise<CrawledMenuItem[]> {
  const url = `https://pcmap.place.naver.com/restaurant/${placeId}/menu/list`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9",
      Referer: `https://pcmap.place.naver.com/restaurant/${placeId}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Naver responded with ${response.status}`);
  }

  const html = await response.text();
  const apolloJson = extractApolloState(html);
  if (!apolloJson) return [];

  const data = JSON.parse(apolloJson);
  const strictMatches = collectMenuItems(data, isLikelyMenuRecord);

  // Some places omit price fields or use looser record shapes, so retry broadly
  // when the stricter menu heuristics return too few items.
  if (strictMatches.length >= 5) {
    return strictMatches;
  }

  const broadMatches = collectMenuItems(data, (_key, val) => {
    return Boolean(
      toText(val.name) &&
        (val.price !== undefined ||
          val.unitprice !== undefined ||
          val.salePrice !== undefined ||
          val.defaultPrice !== undefined ||
          val.description !== undefined ||
          val.summary !== undefined)
    );
  });

  return broadMatches.length > strictMatches.length ? broadMatches : strictMatches;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopName, naverPlaceId } = body;

    if (!shopName && !naverPlaceId) {
      return NextResponse.json(
        { error: "매장 이름 또는 네이버 플레이스 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const candidatePlaceIds = [
      ...(naverPlaceId ? [naverPlaceId] : []),
      ...(shopName ? await searchNaverPlaceIds(shopName) : []),
    ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);

    if (candidatePlaceIds.length === 0) {
      return NextResponse.json({
        success: false,
        message:
          "네이버 플레이스에서 매장을 찾을 수 없습니다. 수동으로 입력해주세요.",
        placeId: null,
        menuItems: [],
      });
    }

    const candidateResults = await Promise.all(
      candidatePlaceIds.slice(0, 6).map(async (candidatePlaceId) => {
        const [candidateName, menuItems] = await Promise.all([
          shopName ? fetchPlaceName(candidatePlaceId) : Promise.resolve(null),
          fetchMenuFromNaverPlace(candidatePlaceId).catch(() => []),
        ]);

        return {
          placeId: candidatePlaceId,
          placeName: candidateName,
          menuItems,
          score: shopName
            ? scorePlaceMatch(shopName, candidateName ?? "") + menuItems.length
            : menuItems.length,
        };
      })
    );

    const bestMatch = candidateResults
      .filter((candidate) => candidate.menuItems.length > 0)
      .sort((a, b) => b.score - a.score)[0];

    if (!bestMatch) {
      return NextResponse.json({
        success: false,
        message:
          "메뉴를 자동으로 가져올 수 없습니다. 수동으로 입력해주세요.",
        placeId: candidatePlaceIds[0] ?? null,
        menuItems: [],
      });
    }

    return NextResponse.json({
      success: true,
      placeId: bestMatch.placeId,
      placeName: bestMatch.placeName,
      count: bestMatch.menuItems.length,
      menuItems: bestMatch.menuItems,
    });
  } catch (error) {
    console.error("Failed to crawl menu:", error);
    return NextResponse.json({
      success: false,
      message:
        "메뉴를 자동으로 가져올 수 없습니다. 수동으로 입력해주세요.",
      placeId: null,
      menuItems: [],
    });
  }
}
