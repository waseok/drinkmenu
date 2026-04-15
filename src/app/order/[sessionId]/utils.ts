import { CartItem } from "./types";
import { GONGCHA_TOPPING_OPTIONS } from "./constants";

export function isGongchaShop(shopName: string) {
  return shopName.replace(/\s+/g, "").includes("공차");
}

export function getToppingPrice(name: string) {
  return GONGCHA_TOPPING_OPTIONS.find((x) => x.name === name)?.price ?? 0;
}

export function getCartExtraPrice(item: CartItem) {
  if (!item.gongcha) return 0;
  return (
    getToppingPrice(item.gongcha.topping1) + getToppingPrice(item.gongcha.topping2)
  );
}

export function getCartUnitPrice(item: CartItem) {
  return item.menuItem.price + getCartExtraPrice(item);
}

export function buildCartOptionsText(item: CartItem) {
  const chunks: string[] = [];
  if (item.gongcha) {
    const g = item.gongcha;
    chunks.push(`당도 ${g.sweetness}`);
    chunks.push(g.ice);
    if (g.topping1) chunks.push(`토핑 ${g.topping1}`);
    if (g.topping2) chunks.push(`추가토핑 ${g.topping2}`);
  }
  if (item.customNote.trim()) chunks.push(item.customNote.trim());
  return chunks.join(" / ");
}

export function formatPrice(price: number) {
  return price.toLocaleString("ko-KR") + "원";
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

export function normalizePhoneNumber(phone: string) {
  return phone.replace(/[^0-9+]/g, "");
}
