"use client";

import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderDeleteButton } from "@/components/order-delete-button";

type OrderRowActionsProps = {
  order: {
    id: string;
    quantity: number;
    customItemName?: string | null;
    staff: { name: string };
    menuItem?: { name: string } | null;
  };
  isAdmin: boolean;
  deletingId: string | null;
  onDeletingChange: (id: string | null) => void;
  onDeleted: (id: string) => void;
  onEdit?: () => void;
};

export function OrderRowActions({
  order,
  isAdmin,
  deletingId,
  onDeletingChange,
  onDeleted,
  onEdit,
}: OrderRowActionsProps) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {isAdmin && onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="no-print text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          aria-label={`${order.staff.name} 주문 수정`}
        >
          <PencilIcon className="size-4" />
        </Button>
      )}
      <OrderDeleteButton
        order={order}
        deletingId={deletingId}
        onDeletingChange={onDeletingChange}
        onDeleted={onDeleted}
      />
    </div>
  );
}
