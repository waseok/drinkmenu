"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SessionOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  sessionTitle: string | null;
  /** 주문 삭제 후 세션 목록 갱신 */
  onOrdersChanged?: () => void;
}

interface AdminOrderRow {
  id: string;
  quantity: number;
  options: string;
  price: number;
  customItemName?: string | null;
  customShopName?: string | null;
  staff: { name: string; department: string };
  menuItem: {
    name: string;
    shop: { name: string };
  } | null;
}

function formatPrice(price: number) {
  return price.toLocaleString("ko-KR") + "원";
}

function menuLabel(order: AdminOrderRow) {
  return order.menuItem?.name ?? order.customItemName?.trim() ?? "직접 입력";
}

function shopLabel(order: AdminOrderRow) {
  return (
    order.menuItem?.shop.name ?? order.customShopName ?? "직접 입력"
  );
}

export function SessionOrdersDialog({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
  onOrdersChanged,
}: SessionOrdersDialogProps) {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadOrders = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?sessionId=${sessionId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as AdminOrderRow[];
      setOrders(data);
    } catch {
      toast.error("주문 목록을 불러오는데 실패했습니다.");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [sessionId, onOpenChange]);

  useEffect(() => {
    if (open && sessionId) {
      setSearch("");
      void loadOrders();
    } else if (!open) {
      setOrders([]);
    }
  }, [open, sessionId, loadOrders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const hay = [
        o.staff.name,
        o.staff.department,
        menuLabel(o),
        shopLabel(o),
        o.options,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, search]);

  async function handleDeleteOrder(order: AdminOrderRow) {
    const label = `${order.staff.name} · ${menuLabel(order)} ×${order.quantity}`;
    if (!confirm(`다음 주문을 삭제할까요?\n\n${label}`)) return;

    setDeletingId(order.id);
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("주문을 삭제했습니다.");
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      onOrdersChanged?.();
    } catch {
      toast.error("주문 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-4 pt-4 pb-3">
          <DialogTitle>주문 관리</DialogTitle>
          <DialogDescription>
            {sessionTitle ? (
              <>
                <span className="font-medium text-foreground">
                  {sessionTitle}
                </span>
                {" · "}잘못 입력된 주문을 개별 삭제할 수 있습니다.
              </>
            ) : (
              "세션 주문 목록"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b px-4 py-3">
          <Input
            placeholder="이름·부서·메뉴·업체로 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            총 {orders.length}건
            {search.trim() ? ` · 표시 ${filteredOrders.length}건` : null}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              불러오는 중…
            </div>
          ) : filteredOrders.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {orders.length === 0
                ? "등록된 주문이 없습니다."
                : "검색 결과가 없습니다."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-start gap-3 rounded-xl border bg-card/80 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold">
                        {order.staff.name}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {order.staff.department}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm">
                      {menuLabel(order)}
                      <span className="ml-1 text-muted-foreground">
                        ×{order.quantity}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {shopLabel(order)}
                      {order.options.trim() && ` · ${order.options.trim()}`}
                    </p>
                    <p className="mt-1 text-xs font-medium">
                      {formatPrice(order.price * order.quantity)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deletingId === order.id}
                    onClick={() => handleDeleteOrder(order)}
                    aria-label={`${order.staff.name} 주문 삭제`}
                  >
                    {deletingId === order.id ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <TrashIcon className="size-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-4 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
