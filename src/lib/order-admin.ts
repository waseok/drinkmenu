/** 주문 행 표시·삭제 공통 유틸 */

export function orderMenuLabel(order: {
  menuItem?: { name: string } | null;
  customItemName?: string | null;
}) {
  return order.menuItem?.name ?? order.customItemName?.trim() ?? "직접 입력";
}

export function orderShopLabel(order: {
  menuItem?: { shop: { name: string } } | null;
  customShopName?: string | null;
}) {
  return order.menuItem?.shop.name ?? order.customShopName ?? "직접 입력";
}

export async function deleteOrderById(id: string): Promise<boolean> {
  const res = await fetch("/api/orders", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return res.ok;
}

export function confirmDeleteOrderMessage(order: {
  staff: { name: string };
  quantity: number;
  menuItem?: { name: string } | null;
  customItemName?: string | null;
}) {
  const label = `${order.staff.name} · ${orderMenuLabel(order)} ×${order.quantity}`;
  return `다음 주문을 삭제할까요?\n\n${label}`;
}
