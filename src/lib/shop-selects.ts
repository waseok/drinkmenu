/**
 * 주문 화면 API용 매장 필드.
 *
 * menuImageUrls는 일부러 제외한다. 이 컬럼에는 (아직 Blob으로 이전되지 않은)
 * base64 메뉴 사진이 매장당 최대 ~1MB씩 들어 있어, 이 값을 select하면
 * 주문 페이지를 열 때마다 DB→컴퓨트로 base64 전체가 읽혀 Neon egress
 * (Network transfer)를 크게 잡아먹는다. 화면에는 "사진 N장" 표시만 필요하므로
 * 개수는 cardinality() 경량 쿼리로 따로 구한다(아래 mapShopForOrderResponse).
 */
export const shopForOrderSelect = {
  id: true,
  name: true,
  phone: true,
  address: true,
  category: true,
} as const;

export type ShopForOrder = {
  id: string;
  name: string;
  phone: string;
  address: string;
  category: string;
};

/** 매장 레코드 + 메뉴 사진 개수 → 클라이언트 응답 (이미지 본문은 보내지 않음) */
export function mapShopForOrderResponse<T extends ShopForOrder>(
  shop: T,
  menuImageCount: number
): T & {
  hasMenuImages: boolean;
  menuImageCount: number;
} {
  return {
    ...shop,
    hasMenuImages: menuImageCount > 0,
    menuImageCount,
  };
}

/** 세션 목록 등 경량 응답용 */
export const shopLiteSelect = {
  id: true,
  name: true,
  phone: true,
} as const;
