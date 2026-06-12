"use client";

import { useEffect, useMemo, useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { GONGCHA_TOPPING_OPTIONS } from "./constants";
import { CartItem, DrinkTemperature, MenuItem } from "./types";
import {
  formatPrice,
  getToppingPrice,
  isGongchaShop,
} from "./utils";

export type PendingDrinkPick = Omit<CartItem, "cartId">;

type DrinkOptionDrawerProps = {
  open: boolean;
  menuItem: MenuItem | null;
  shopName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (item: PendingDrinkPick) => void;
};

function defaultTemperature(item: MenuItem): DrinkTemperature {
  if (item.isHot && !item.isIce) return "핫";
  return "아이스";
}

function temperatureOptions(item: MenuItem): DrinkTemperature[] {
  if (item.isIce && item.isHot) return ["아이스", "핫"];
  if (item.isHot) return ["핫"];
  return ["아이스"];
}

export function DrinkOptionDrawer({
  open,
  menuItem,
  shopName,
  onOpenChange,
  onConfirm,
}: DrinkOptionDrawerProps) {
  const useGongcha = menuItem ? isGongchaShop(shopName) : false;
  const temps = useMemo<DrinkTemperature[]>(
    () => (menuItem ? temperatureOptions(menuItem) : ["아이스"]),
    [menuItem],
  );

  const [quantity, setQuantity] = useState(1);
  const [temperature, setTemperature] = useState<DrinkTemperature>("아이스");
  const [customNote, setCustomNote] = useState("");
  const [gongcha, setGongcha] = useState<CartItem["gongcha"]>();
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (!open || !menuItem) {
      setContentVisible(false);
      return;
    }
    const defaultTemp = defaultTemperature(menuItem);
    setQuantity(1);
    setTemperature(temps.includes(defaultTemp) ? defaultTemp : temps[0]!);
    setCustomNote("");
    setGongcha(
      useGongcha
        ? {
            sweetness: "100%",
            ice: "얼음 보통",
            topping1: "",
            topping2: "",
          }
        : undefined,
    );
    const id = requestAnimationFrame(() => setContentVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open, menuItem, shopName, useGongcha, temps]);

  if (!menuItem) return null;

  const extraPrice = gongcha
    ? getToppingPrice(gongcha.topping1) + getToppingPrice(gongcha.topping2)
    : 0;
  const unitPrice = menuItem.price + extraPrice;

  const updateGongcha = (
    key: "sweetness" | "ice" | "topping1" | "topping2",
    value: string,
  ) => {
    setGongcha((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <div
          className={cn(
            "flex max-h-[inherit] flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            contentVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-6 opacity-0",
          )}
        >
          <DrawerHeader className="border-b border-amber-100/80 pb-4 text-left dark:border-amber-900/40">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              옵션 선택
            </p>
            <DrawerTitle className="font-heading text-xl font-extrabold tracking-tight">
              {menuItem.name}
            </DrawerTitle>
            <DrawerDescription className="text-sm">
              {shopName} · 기본 {formatPrice(menuItem.price)}
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="grid gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                온도
              </span>
              <div
                className={cn(
                  "grid gap-1 rounded-xl bg-muted/60 p-1",
                  temps.length === 2 ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                {temps.map((temp) => (
                  <button
                    key={temp}
                    type="button"
                    onClick={() => setTemperature(temp)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                      temperature === temp
                        ? "bg-background text-foreground shadow-sm ring-1 ring-amber-200 scale-[1.02]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {temp}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card/80 p-3">
              <span className="text-sm font-semibold">수량</span>
              <div className="flex items-center gap-1 rounded-lg border bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <MinusIcon className="size-4" />
                </Button>
                <span className="w-8 text-center text-base font-bold">
                  {quantity}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>
            </div>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                옵션·메모 (선택)
              </span>
              <Input
                placeholder="예: 샷 추가, 덜 달게"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="h-10"
              />
            </label>

            {useGongcha && gongcha && (
              <div className="grid gap-3 rounded-xl border border-amber-200/70 bg-amber-50/40 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  공차 옵션
                </p>
                <label className="grid gap-1 text-xs">
                  <span className="text-muted-foreground">당도</span>
                  <select
                    value={gongcha.sweetness}
                    onChange={(e) => updateGongcha("sweetness", e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    <option value="0%">0%</option>
                    <option value="30%">30%</option>
                    <option value="50%">50%</option>
                    <option value="70%">70%</option>
                    <option value="100%">100%</option>
                  </select>
                </label>
                {temperature === "아이스" && (
                  <label className="grid gap-1 text-xs">
                    <span className="text-muted-foreground">얼음</span>
                    <select
                      value={gongcha.ice}
                      onChange={(e) => updateGongcha("ice", e.target.value)}
                      className="h-9 rounded-md border bg-background px-2"
                    >
                      <option value="얼음 적게">얼음 적게</option>
                      <option value="얼음 보통">얼음 보통</option>
                      <option value="얼음 많게">얼음 많게</option>
                    </select>
                  </label>
                )}
                <label className="grid gap-1 text-xs">
                  <span className="text-muted-foreground">토핑</span>
                  <select
                    value={gongcha.topping1}
                    onChange={(e) => updateGongcha("topping1", e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    {GONGCHA_TOPPING_OPTIONS.map((t) => (
                      <option key={`drawer-t1-${t.name || "none"}`} value={t.name}>
                        {t.name
                          ? `${t.name} (+${formatPrice(t.price)})`
                          : "선택 안 함"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs">
                  <span className="text-muted-foreground">추가토핑</span>
                  <select
                    value={gongcha.topping2}
                    onChange={(e) => updateGongcha("topping2", e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    {GONGCHA_TOPPING_OPTIONS.map((t) => (
                      <option key={`drawer-t2-${t.name || "none"}`} value={t.name}>
                        {t.name
                          ? `${t.name} (+${formatPrice(t.price)})`
                          : "선택 안 함"}
                      </option>
                    ))}
                  </select>
                </label>
                {extraPrice > 0 && (
                  <p className="text-right text-xs font-medium text-muted-foreground">
                    옵션 추가금 +{formatPrice(extraPrice)}
                  </p>
                )}
              </div>
            )}
          </div>

          <DrawerFooter className="border-t bg-background/95 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-2xl text-base font-bold shadow-md transition-transform active:scale-[0.98]"
              onClick={() => {
                onConfirm({
                  menuItem,
                  shopName,
                  quantity,
                  temperature,
                  customNote,
                  gongcha: useGongcha ? gongcha : undefined,
                });
                onOpenChange(false);
              }}
            >
              장바구니에 담기 · {formatPrice(unitPrice * quantity)}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
