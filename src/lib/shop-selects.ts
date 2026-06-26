/** 주문 화면 API용 매장 필드 (base64 메뉴 사진 제외 — 전송량 절감) */

export const shopForOrderSelect = {
  id: true,
  name: true,
  phone: true,
  address: true,
  category: true,
  menuImageUrls: true,
} as const;

export type ShopWithImageUrls = {
  id: string;
  name: string;
  phone: string;
  address: string;
  category: string;
  menuImageUrls: string[];
};

/** DB에서 읽은 shop → 클라이언트 응답 (이미지 URL은 제외, 개수만) */
export function mapShopForOrderResponse<T extends ShopWithImageUrls>(
  shop: T
): Omit<T, "menuImageUrls"> & {
  hasMenuImages: boolean;
  menuImageCount: number;
} {
  const { menuImageUrls, ...rest } = shop;
  const count = menuImageUrls?.length ?? 0;
  return {
    ...rest,
    hasMenuImages: count > 0,
    menuImageCount: count,
  };
}

/** 세션 목록 등 경량 응답용 */
export const shopLiteSelect = {
  id: true,
  name: true,
  phone: true,
} as const;
