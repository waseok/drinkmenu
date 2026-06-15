"use client";

import { Loader2Icon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmDeleteOrderMessage, deleteOrderById } from "@/lib/order-admin";

type OrderDeleteButtonProps = {
  order: {
    id: string;
    quantity: number;
    customItemName?: string | null;
    staff: { name: string };
    menuItem?: { name: string } | null;
  };
  deletingId: string | null;
  onDeletingChange: (id: string | null) => void;
  onDeleted: (id: string) => void;
  /** 인쇄·이미지 저장 시 숨김 (기본 true) */
  hideOnPrint?: boolean;
};

export function OrderDeleteButton({
  order,
  deletingId,
  onDeletingChange,
  onDeleted,
  hideOnPrint = true,
}: OrderDeleteButtonProps) {
  async function handleClick() {
    if (!confirm(confirmDeleteOrderMessage(order))) return;

    onDeletingChange(order.id);
    try {
      const ok = await deleteOrderById(order.id);
      if (!ok) throw new Error();
      toast.success("주문을 삭제했습니다.");
      onDeleted(order.id);
    } catch {
      toast.error("주문 삭제에 실패했습니다.");
    } finally {
      onDeletingChange(null);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={
        hideOnPrint
          ? "no-print text-destructive hover:bg-destructive/10 hover:text-destructive"
          : "text-destructive hover:bg-destructive/10 hover:text-destructive"
      }
      disabled={deletingId === order.id}
      onClick={handleClick}
      aria-label={`${order.staff.name} 주문 삭제`}
    >
      {deletingId === order.id ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <TrashIcon className="size-4" />
      )}
    </Button>
  );
}
