import Image from "next/image";
import { Dispatch, SetStateAction, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface MenuLightboxState {
  urls: string[];
  index: number;
  shopName: string;
}

interface MenuLightboxDialogProps {
  menuLightbox: MenuLightboxState | null;
  setMenuLightbox: Dispatch<SetStateAction<MenuLightboxState | null>>;
  lightboxZoom: number;
  setLightboxZoom: Dispatch<SetStateAction<number>>;
}

export function MenuLightboxDialog({
  menuLightbox,
  setMenuLightbox,
  lightboxZoom,
  setLightboxZoom,
}: MenuLightboxDialogProps) {
  const lightboxScrollRef = useRef<HTMLDivElement | null>(null);
  const lightboxDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  if (!menuLightbox) return null;

  return (
    <Dialog
      open={!!menuLightbox}
      onOpenChange={(open) => {
        if (!open) setMenuLightbox(null);
      }}
    >
      <DialogContent
        showCloseButton
        className="max-h-[min(96dvh,100vh)] w-[min(96vw,100vw)] max-w-[min(96vw,100vw)] gap-0 border-zinc-700 bg-zinc-950 p-3 text-white sm:max-w-[min(96vw,100vw)] [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10"
      >
        <>
          <DialogTitle className="sr-only">
            {menuLightbox.shopName} 메뉴판{" "}
            {menuLightbox.index + 1} / {menuLightbox.urls.length}
          </DialogTitle>
          <p className="mb-2 text-center text-xs text-zinc-400">
            {menuLightbox.shopName} · {menuLightbox.index + 1} /{" "}
            {menuLightbox.urls.length}
          </p>
          {/* 100~300% 배율 (25% 단계), 스크롤로 확대된 부분 탐색 */}
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-white hover:bg-white/15 disabled:opacity-40"
              aria-label="축소"
              disabled={lightboxZoom <= 100}
              onClick={() =>
                setLightboxZoom((z) => Math.max(100, z - 25))
              }
            >
              <MinusIcon className="size-4" />
              축소
            </Button>
            <span className="min-w-[4rem] text-center text-xs font-medium tabular-nums text-zinc-300">
              {lightboxZoom}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-white hover:bg-white/15 disabled:opacity-40"
              aria-label="확대"
              disabled={lightboxZoom >= 300}
              onClick={() =>
                setLightboxZoom((z) => Math.min(300, z + 25))
              }
            >
              확대
              <PlusIcon className="size-4" />
            </Button>
          </div>
          {(() => {
            const scale = lightboxZoom / 100;
            return (
              <div className="flex max-h-[min(82dvh,86vh)] w-full items-stretch justify-center gap-1 sm:gap-2">
                {menuLightbox.urls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-auto min-h-[2.5rem] w-9 shrink-0 self-center text-white hover:bg-white/15 sm:w-10"
                    aria-label="이전 이미지"
                    onClick={() =>
                      setMenuLightbox((prev) => {
                        if (!prev) return prev;
                        const n = prev.urls.length;
                        return {
                          ...prev,
                          index: (prev.index - 1 + n) % n,
                        };
                      })
                    }
                  >
                    <ChevronLeftIcon className="size-6" />
                  </Button>
                )}
                <div
                  ref={lightboxScrollRef}
                  className={cn(
                    "max-h-[min(78dvh,80vh)] min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain rounded-md border border-zinc-800 bg-zinc-900/40",
                    lightboxZoom > 100 ? "cursor-grab active:cursor-grabbing" : "",
                  )}
                  onMouseDown={(e) => {
                    if (lightboxZoom <= 100 || !lightboxScrollRef.current) return;
                    lightboxDragRef.current = {
                      active: true,
                      startX: e.clientX,
                      startY: e.clientY,
                      scrollLeft: lightboxScrollRef.current.scrollLeft,
                      scrollTop: lightboxScrollRef.current.scrollTop,
                    };
                  }}
                  onMouseMove={(e) => {
                    const drag = lightboxDragRef.current;
                    const box = lightboxScrollRef.current;
                    if (!drag?.active || !box) return;
                    box.scrollLeft = drag.scrollLeft - (e.clientX - drag.startX);
                    box.scrollTop = drag.scrollTop - (e.clientY - drag.startY);
                  }}
                  onMouseUp={() => {
                    if (lightboxDragRef.current) lightboxDragRef.current.active = false;
                  }}
                  onMouseLeave={() => {
                    if (lightboxDragRef.current) lightboxDragRef.current.active = false;
                  }}
                >
                  <div
                    className="flex items-center justify-center p-3 sm:p-4"
                    style={{
                      minWidth:
                        scale <= 1 ? "100%" : `${Math.min(scale * 100, 400)}%`,
                      minHeight:
                        scale <= 1
                          ? "min(72dvh, 70vh)"
                          : `${Math.min(70 * scale, 210)}vh`,
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: "center center",
                      }}
                    >
                      <Image
                        src={menuLightbox.urls[menuLightbox.index]!}
                        alt={`${menuLightbox.shopName} 메뉴판 ${menuLightbox.index + 1}`}
                        width={1600}
                        height={2000}
                        unoptimized
                        className="max-h-[65dvh] w-auto max-w-[min(88vw,920px)] object-contain"
                      />
                    </div>
                  </div>
                </div>
                {menuLightbox.urls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-auto min-h-[2.5rem] w-9 shrink-0 self-center text-white hover:bg-white/15 sm:w-10"
                    aria-label="다음 이미지"
                    onClick={() =>
                      setMenuLightbox((prev) => {
                        if (!prev) return prev;
                        const n = prev.urls.length;
                        return {
                          ...prev,
                          index: (prev.index + 1) % n,
                        };
                      })
                    }
                  >
                    <ChevronRightIcon className="size-6" />
                  </Button>
                )}
              </div>
            );
          })()}
        </>
      </DialogContent>
    </Dialog>
  );
}
