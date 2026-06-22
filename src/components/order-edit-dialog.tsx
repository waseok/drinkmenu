"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { orderMenuLabel, orderShopLabel, updateOrderById } from "@/lib/order-admin";

export type EditableOrderRow = {
  id: string;
  quantity: number;
  options: string;
  price: number;
  menuItemId?: string | null;
  customItemName?: string | null;
  customShopName?: string | null;
  staff: { name: string; department: string };
  menuItem?: {
    name: string;
    shop: { name: string };
  } | null;
};

type OrderEditDialogProps = {
  order: EditableOrderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 직접 입력 주문의 업체 선택·자동완성용 */
  sessionShopNames?: string[];
  onUpdated: (order: EditableOrderRow & Record<string, unknown>) => void;
};

export function OrderEditDialog({
  order,
  open,
  onOpenChange,
  sessionShopNames = [],
  onUpdated,
}: OrderEditDialogProps) {
  const [quantity, setQuantity] = useState("1");
  const [options, setOptions] = useState("");
  const [price, setPrice] = useState("0");
  const [customItemName, setCustomItemName] = useState("");
  const [customShopName, setCustomShopName] = useState("");
  const [saving, setSaving] = useState(false);

  const isCustomOrder = Boolean(order && !order.menuItemId);

  useEffect(() => {
    if (!order || !open) return;
    setQuantity(String(order.quantity));
    setOptions(order.options ?? "");
    setPrice(String(order.price));
    setCustomItemName(order.customItemName?.trim() ?? "");
    setCustomShopName(order.customShopName?.trim() ?? "");
  }, [order, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;

    const qty = Number(quantity);
    const unitPrice = Number(price);

    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("수량은 1 이상의 정수여야 합니다.");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error("단가는 0 이상이어야 합니다.");
      return;
    }
    if (isCustomOrder && !customItemName.trim()) {
      toast.error("음료명을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: order.id,
        quantity: qty,
        options: options.trim(),
        price: Math.round(unitPrice),
        ...(isCustomOrder
          ? {
              customItemName: customItemName.trim(),
              customShopName: customShopName.trim() || null,
            }
          : {}),
      };

      const res = await updateOrderById(payload);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "수정 실패");
      }

      const updated = (await res.json()) as EditableOrderRow &
        Record<string, unknown>;
      toast.success("주문을 수정했습니다.");
      onUpdated(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "주문 수정에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>주문 수정</DialogTitle>
          <DialogDescription>
            {order ? (
              <>
                <span className="font-medium text-foreground">
                  {order.staff.name}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · {order.staff.department}
                </span>
              </>
            ) : (
              "주문 정보를 수정합니다."
            )}
          </DialogDescription>
        </DialogHeader>

        {order && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isCustomOrder ? (
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <p className="font-medium">{orderMenuLabel(order)}</p>
                <p className="text-xs text-muted-foreground">
                  {orderShopLabel(order)}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-custom-item">음료명</Label>
                  <Input
                    id="edit-custom-item"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="음료명"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-custom-shop">업체</Label>
                  <Input
                    id="edit-custom-shop"
                    list="edit-session-shops"
                    value={customShopName}
                    onChange={(e) => setCustomShopName(e.target.value)}
                    placeholder="업체명"
                  />
                  {sessionShopNames.length > 0 && (
                    <datalist id="edit-session-shops">
                      {sessionShopNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-qty">수량</Label>
                <Input
                  id="edit-qty"
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">단가 (원)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min={0}
                  step={100}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-options">옵션</Label>
              <Input
                id="edit-options"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="예: ICE, 샷 추가, 당도 50%"
              />
              <p className="text-xs text-muted-foreground">
                옵션이 없으면 비워 두세요.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                취소
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    저장 중…
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
