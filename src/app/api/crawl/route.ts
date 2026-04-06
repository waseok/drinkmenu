import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = body.keyword || "와석초 카페";

    const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=nexearch`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "네이버 검색에 실패했습니다." },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Extract unique place IDs from search results
    const placeIdMatches = [...html.matchAll(/place\/(\d{5,})/g)];
    const uniqueIds = [...new Set(placeIdMatches.map((m) => m[1]))];

    if (uniqueIds.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        places: [],
        message: "검색 결과가 없습니다. 다른 검색어를 시도해보세요.",
      });
    }

    // Fetch place info from each place page's Apollo State
    const places: {
      place_name: string;
      address_name: string;
      phone: string;
      category_name: string;
      naverPlaceId: string;
    }[] = [];

    // Fetch up to 5 places in parallel for speed
    const fetchPromises = uniqueIds.slice(0, 5).map(async (pid) => {
      try {
        const placeUrl = `https://pcmap.place.naver.com/restaurant/${pid}/home`;
        const placeRes = await fetch(placeUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept-Language": "ko-KR,ko;q=0.9",
          },
        });
        if (!placeRes.ok) return null;

        const placeHtml = await placeRes.text();
        const apolloJson = extractApolloState(placeHtml);
        if (!apolloJson) return null;

        const data = JSON.parse(apolloJson);
        const base = data[`PlaceDetailBase:${pid}`];
        if (!base?.name) return null;

        return {
          place_name: base.name,
          address_name: base.roadAddress || base.address || "",
          phone: base.phone || base.virtualPhone || "",
          category_name: Array.isArray(base.category)
            ? base.category.join(" > ")
            : base.category || "",
          naverPlaceId: pid,
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    for (const r of results) {
      if (r) places.push(r);
    }

    return NextResponse.json({
      success: true,
      count: places.length,
      places,
    });
  } catch (error) {
    console.error("Failed to search shops:", error);
    return NextResponse.json(
      { error: "매장 검색에 실패했습니다." },
      { status: 500 }
    );
  }
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
