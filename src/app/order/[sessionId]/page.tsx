"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { use, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  SearchIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
  ShoppingCartIcon,
  CheckCircle2Icon,
  ArrowLeftIcon,
  Loader2Icon,
  AlertCircleIcon,
  Trash2Icon,
  StoreIcon,
  HomeIcon,
  ListRestartIcon,
  PhoneIcon,
  CopyIcon,
  HistoryIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";
import {
  Staff,
  Orderer,
  MenuItem,
  Shop,
  SessionShop,
  SessionTargetRow,
  PickerGroup,
  OrderItem,
  Session,
  CartItem,
  StaffHistoryOrder,
  CustomLineOrder,
} from "./types";
import { GONGCHA_TOPPING_OPTIONS } from "./constants";
import {
  isGongchaShop,
  getToppingPrice,
  getCartExtraPrice,
  getCartUnitPrice,
  buildCartOptionsText,
  formatPrice,
  formatDate,
  normalizePhoneNumber,
} from "./utils";

let nextCartId = 0;

const MenuLightboxDialog = dynamic(
  () => import("./menuLightbox").then((mod) => mod.MenuLightboxDialog),
  { ssr: false, loading: () => null }
);

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function OrderPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  // -- state ----------------------------------------------------------------

  const [step, setStep] = useState(1);
  const [session, setSession] = useState<Session | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Orderer | null>(null);
  const [lastStaff, setLastStaff] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customLines, setCustomLines] = useState<CustomLineOrder[]>([]);
  const [customDraftName, setCustomDraftName] = useState("");
  const [customDraftQty, setCustomDraftQty] = useState("1");
  const [customDraftPrice, setCustomDraftPrice] = useState("");
  const [customDraftOptions, setCustomDraftOptions] = useState("");
  const [existingOrders, setExistingOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeShopIdx, setActiveShopIdx] = useState(0);
  const [completedOrdersOpen, setCompletedOrdersOpen] = useState(false);
  const [orderedStaffIds, setOrderedStaffIds] = useState<string[]>([]);
  const [staffHistoryMap, setStaffHistoryMap] = useState<
    Record<string, StaffHistoryOrder[]>
  >({});
  const [staffHistoryLoadingMap, setStaffHistoryLoadingMap] = useState<
    Record<string, boolean>
  >({});
  /** 이름 선택: 부서(학년) 묶음 vs 관리자 맞춤 그룹 */
  const [namePickerView, setNamePickerView] = useState<"dept" | "groups">(
    "dept",
  );
  /** 메뉴판 이미지 전체 화면 확대 */
  const [menuLightbox, setMenuLightbox] = useState<{
    urls: string[];
    index: number;
    shopName: string;
  } | null>(null);
  /** 메뉴판 라이트박스 배율 100~300% (25% 단계) */
  const [lightboxZoom, setLightboxZoom] = useState(100);
  const cartSectionRef = useRef<HTMLDivElement | null>(null);

  /** 라이트박스를 열거나 다른 이미지로 바꿀 때 배율 초기화 */
  useEffect(() => {
    if (menuLightbox) setLightboxZoom(100);
  }, [menuLightbox]);

  /** 세션 전체 주문 목록만 다시 받아 이름 선택 화면의 '주문함' 표시를 최신으로 유지 */
  const fetchOrderedStaffIds = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/orders?sessionId=${encodeURIComponent(sessionId)}&summary=staffIds`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { staffIds?: string[] };
      setOrderedStaffIds(Array.isArray(data.staffIds) ? data.staffIds : []);
    } catch {
      /* 무시: 보조 갱신 */
    }
  }, [sessionId]);

  const refreshSessionOrders = useCallback(async () => {
    void fetchOrderedStaffIds();
  }, [fetchOrderedStaffIds]);

  // -- data fetching --------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [sessionRes, staffRes, orderedIdsRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}?includeOrders=false`, {
            cache: "no-store",
          }),
          fetch("/api/staff", { cache: "no-store" }),
          fetch(
            `/api/orders?sessionId=${encodeURIComponent(sessionId)}&summary=staffIds`,
            { cache: "no-store" },
          ),
        ]);

        if (cancelled) return;

        if (!sessionRes.ok) {
          const data = await sessionRes.json().catch(() => ({}));
          setError(
            (data as { error?: string }).error || "세션을 찾을 수 없습니다.",
          );
          setLoading(false);
          return;
        }

        if (!staffRes.ok) {
          const data = await staffRes.json().catch(() => ({}));
          setError(
            (data as { error?: string }).error ||
              "교직원 목록을 불러오는데 실패했습니다.",
          );
          setLoading(false);
          return;
        }

        const sessionData: Session = await sessionRes.json();
        const staffData: Staff[] = await staffRes.json();
        if (orderedIdsRes.ok) {
          const orderedData = (await orderedIdsRes.json()) as {
            staffIds?: string[];
          };
          setOrderedStaffIds(
            Array.isArray(orderedData.staffIds) ? orderedData.staffIds : [],
          );
        } else {
          setOrderedStaffIds([]);
        }

        if (sessionData.status === "CLOSED") {
          setError("마감된 주문입니다. 더 이상 주문할 수 없습니다.");
          setSession(sessionData);
          setLoading(false);
          return;
        }

        // 세션에 주문 대상이 지정된 경우, 이름 목록을 그 교직원만으로 제한
        const targetIds = new Set(
          (sessionData.sessionTargets ?? []).map((t) => t.staffId),
        );
        const hasTargets = targetIds.size > 0;
        const filteredStaff = hasTargets
          ? staffData.filter((s) => targetIds.has(s.id))
          : staffData;

        setSession(sessionData);
        setStaffList(filteredStaff);
        setNamePickerView("dept");

        // localStorage에서 마지막 선택 직원 복원
        try {
          const savedId = localStorage.getItem("drinkmenu_last_staff_id");
          if (savedId) {
            const found = filteredStaff.find((s) => s.id === savedId);
            if (found) setLastStaff(found);
          }
        } catch {
          /* localStorage 접근 불가 환경 무시 */
        }
      } catch {
        if (!cancelled) setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const fetchExistingOrders = useCallback(
    async (staffId: string | null) => {
      if (!staffId) {
        setExistingOrders([]);
        return;
      }
      try {
        const res = await fetch(`/api/orders?sessionId=${sessionId}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const all: OrderItem[] = await res.json();
          setExistingOrders(all.filter((o) => o.staffId === staffId));
        }
      } catch {
        /* ignore */
      }
    },
    [sessionId],
  );

  // -- handlers -------------------------------------------------------------

  const handleSelectStaff = useCallback(
    (staff: Staff) => {
      setSelectedStaff(staff);
      setStep(2);
      fetchExistingOrders(staff.id);
      // 마지막 선택 직원 저장
      try {
        localStorage.setItem("drinkmenu_last_staff_id", staff.id);
      } catch {
        /* ignore */
      }
    },
    [fetchExistingOrders],
  );

  const handleSelectManualStaff = useCallback(() => {
    const name = manualName.trim();
    const department = manualDepartment.trim() || "직접입력";

    if (!name) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    setSelectedStaff({
      id: `manual:${name}:${department}`,
      name,
      department,
      position: "",
      isManual: true,
    });
    setExistingOrders([]);
    setStep(2);
  }, [manualDepartment, manualName]);

  const handleChangeStaff = useCallback(() => {
    if (
      (cart.length > 0 || customLines.length > 0) &&
      !confirm(
        "이름을 변경하면 장바구니와 직접 입력 항목이 초기화됩니다. 계속하시겠습니까?",
      )
    ) {
      return;
    }
    setSelectedStaff(null);
    setCart([]);
    setCustomLines([]);
    setCustomDraftName("");
    setCustomDraftQty("1");
    setCustomDraftPrice("");
    setCustomDraftOptions("");
    setExistingOrders([]);
    setSearchQuery("");
    setManualName("");
    setManualDepartment("");
    setActiveShopIdx(0);
    setStep(1);
  }, [cart.length, customLines.length]);

  const addToCart = useCallback((menuItem: MenuItem, shopName: string) => {
    const useGongchaOption = isGongchaShop(shopName);
    setCart((prev) => {
      const existing = prev.find(
        (c) => c.menuItem.id === menuItem.id && !useGongchaOption,
      );
      if (existing) {
        return prev.map((c) =>
          c.cartId === existing.cartId
            ? { ...c, quantity: c.quantity + 1 }
            : c,
        );
      }
      return [
        ...prev,
        {
          cartId: `cart-${++nextCartId}`,
          menuItem,
          shopName,
          quantity: 1,
          customNote: "",
          gongcha: useGongchaOption
            ? {
                sweetness: "100%",
                ice: "얼음 보통",
                topping1: "",
                topping2: "",
              }
            : undefined,
        },
      ];
    });
    toast.success(`${menuItem.name} 추가됨`);
  }, []);

  const updateCartQty = useCallback((cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.cartId === cartId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  }, []);

  const updateCartOptions = useCallback((cartId: string, options: string) => {
    setCart((prev) =>
      prev.map((c) => (c.cartId === cartId ? { ...c, customNote: options } : c)),
    );
  }, []);

  const updateGongchaOption = useCallback(
    (
      cartId: string,
      key: "sweetness" | "ice" | "topping1" | "topping2",
      value: string,
    ) => {
      setCart((prev) =>
        prev.map((c) => {
          if (c.cartId !== cartId || !c.gongcha) return c;
          return {
            ...c,
            gongcha: {
              ...c.gongcha,
              [key]: value,
            } as CartItem["gongcha"],
          };
        }),
      );
    },
    [],
  );

  const removeFromCart = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((c) => c.cartId !== cartId));
  }, []);

  const updateCustomLineQty = useCallback((id: string, delta: number) => {
    setCustomLines((prev) =>
      prev
        .map((c) =>
          c.id === id
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  }, []);

  const updateCustomLineUnitPrice = useCallback((id: string, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const v = digits === "" ? 0 : parseInt(digits, 10);
    setCustomLines((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, unitPrice: Number.isFinite(v) ? Math.max(0, v) : 0 }
          : c,
      ),
    );
  }, []);

  const removeCustomLine = useCallback((id: string) => {
    setCustomLines((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addCustomLineFromDraft = useCallback(() => {
    const name = customDraftName.trim();
    if (!name) {
      toast.error("음료명을 입력해주세요.");
      return;
    }
    const quantity = Math.max(
      1,
      parseInt(String(customDraftQty).replace(/\D/g, ""), 10) || 1,
    );
    const pRaw = String(customDraftPrice).replace(/\D/g, "");
    const unitPrice = pRaw === "" ? 0 : Math.max(0, parseInt(pRaw, 10) || 0);
    setCustomLines((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        quantity,
        unitPrice,
        options: customDraftOptions.trim(),
      },
    ]);
    setCustomDraftName("");
    setCustomDraftQty("1");
    setCustomDraftPrice("");
    setCustomDraftOptions("");
  }, [customDraftName, customDraftQty, customDraftPrice, customDraftOptions]);

  const handleScrollToCart = useCallback(() => {
    cartSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const handleCopyPhone = useCallback(async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("전화번호가 복사되었습니다.");
    } catch {
      toast.error("전화번호 복사에 실패했습니다.");
    }
  }, []);

  const handleSubmitOrder = useCallback(async () => {
    if (!selectedStaff || (cart.length === 0 && customLines.length === 0)) return;
    if (!session) return;
    setSubmitting(true);
    try {
      const isManual = Boolean(selectedStaff.isManual);
      const shopLabel =
        session.sessionShops[activeShopIdx]?.shop?.name ??
        session.sessionShops[0]?.shop?.name ??
        undefined;
      const results = await Promise.all([
        ...cart.map((item) =>
          fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              staffId: isManual ? undefined : selectedStaff.id,
              staffName: selectedStaff.name,
              staffDepartment: selectedStaff.department,
              menuItemId: item.menuItem.id,
              quantity: item.quantity,
              options: buildCartOptionsText(item),
              price: getCartUnitPrice(item),
            }),
          }),
        ),
        ...customLines.map((item) =>
          fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              staffId: isManual ? undefined : selectedStaff.id,
              staffName: selectedStaff.name,
              staffDepartment: selectedStaff.department,
              customItemName: item.name,
              quantity: item.quantity,
              options: item.options,
              price: item.unitPrice,
              ...(shopLabel ? { customShopName: shopLabel } : {}),
            }),
          }),
        ),
      ]);

      if (!results.every((r) => r.ok)) {
        toast.error("일부 주문이 실패했습니다. 다시 시도해주세요.");
        return;
      }

      const createdOrders = (await Promise.all(results.map((r) => r.json()))) as OrderItem[];
      const resolvedStaff = createdOrders[0]?.staff;

      if (resolvedStaff) {
        setSelectedStaff(resolvedStaff);
      }

      toast.success("주문이 완료되었습니다!");
      setCompletedOrdersOpen(false);
      setCart([]);
      setCustomLines([]);
      setCustomDraftName("");
      setCustomDraftQty("1");
      setCustomDraftPrice("");
      setCustomDraftOptions("");
      await fetchExistingOrders(resolvedStaff?.id ?? (isManual ? null : selectedStaff.id));
      void refreshSessionOrders();
      setStep(3);
    } catch {
      toast.error("주문 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedStaff,
    cart,
    customLines,
    sessionId,
    session,
    activeShopIdx,
    fetchExistingOrders,
    refreshSessionOrders,
  ]);

  const handleUpdateOrderQty = useCallback(
    async (orderId: string, newQty: number) => {
      if (newQty <= 0) {
        if (!confirm("수량을 0으로 줄이면 이 주문이 삭제됩니다. 계속하시겠습니까?")) return;
        // 0 이하면 삭제
        try {
          const res = await fetch("/api/orders", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: orderId }),
          });
          if (res.ok) {
            toast.success("주문이 삭제되었습니다.");
            if (selectedStaff) await fetchExistingOrders(selectedStaff.id);
            void refreshSessionOrders();
          } else {
            toast.error("주문 삭제에 실패했습니다.");
          }
        } catch {
          toast.error("오류가 발생했습니다.");
        }
        return;
      }
      try {
        const res = await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: orderId, quantity: newQty }),
        });
        if (res.ok) {
          toast.success("수량이 변경되었습니다.");
          if (selectedStaff) await fetchExistingOrders(selectedStaff.id);
        } else {
          toast.error("수량 변경에 실패했습니다.");
        }
      } catch {
        toast.error("오류가 발생했습니다.");
      }
    },
    [selectedStaff, fetchExistingOrders, refreshSessionOrders],
  );

  const handleDeleteOrder = useCallback(
    async (orderId: string) => {
      if (!confirm("이 주문을 삭제하시겠습니까?")) return;
      try {
        const res = await fetch("/api/orders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: orderId }),
        });
        if (res.ok) {
          toast.success("주문이 삭제되었습니다.");
          if (selectedStaff) await fetchExistingOrders(selectedStaff.id);
          void refreshSessionOrders();
        } else {
          toast.error("주문 삭제에 실패했습니다.");
        }
      } catch {
        toast.error("오류가 발생했습니다.");
      }
    },
    [selectedStaff, fetchExistingOrders, refreshSessionOrders],
  );

  const fetchStaffHistory = useCallback(async (staffId: string) => {
    if (staffHistoryMap[staffId] || staffHistoryLoadingMap[staffId]) return;

    setStaffHistoryLoadingMap((prev) => ({ ...prev, [staffId]: true }));
    try {
      const res = await fetch(
        `/api/orders?staffId=${encodeURIComponent(staffId)}&limit=8`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("history fetch failed");
      const data = (await res.json()) as StaffHistoryOrder[];
      setStaffHistoryMap((prev) => ({ ...prev, [staffId]: data }));
    } catch {
      setStaffHistoryMap((prev) => ({ ...prev, [staffId]: [] }));
    } finally {
      setStaffHistoryLoadingMap((prev) => ({ ...prev, [staffId]: false }));
    }
  }, [staffHistoryMap, staffHistoryLoadingMap]);

  // -- computed values ------------------------------------------------------

  const cartTotal = cart.reduce((s, c) => s + getCartUnitPrice(c) * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const customLinesSubtotal = customLines.reduce(
    (s, c) => s + c.unitPrice * c.quantity,
    0,
  );
  const customLineQtySum = customLines.reduce((s, c) => s + c.quantity, 0);
  const checkoutTotal = cartTotal + customLinesSubtotal;

  // 마감 시간까지 남은 시간 계산
  const [deadlineCountdown, setDeadlineCountdown] = useState<string | null>(null);
  useEffect(() => {
    if (!session?.deadlineTime || session.status !== "OPEN") {
      setDeadlineCountdown(null);
      return;
    }
    function calcCountdown() {
      const now = new Date();
      const [hh, mm] = session!.deadlineTime!.split(":").map(Number);
      const deadline = new Date(session!.date);
      deadline.setHours(hh, mm, 0, 0);
      const diff = deadline.getTime() - now.getTime();
      if (diff <= 0) {
        setDeadlineCountdown("마감됨");
        return;
      }
      const totalMin = Math.floor(diff / 60000);
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      setDeadlineCountdown(hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`);
    }
    calcCountdown();
    const id = setInterval(calcCountdown, 60_000);
    return () => clearInterval(id);
  }, [session?.deadlineTime, session?.date, session?.status]);

  const groupedStaff = staffList.reduce<Record<string, Staff[]>>(
    (groups, s) => {
      const dept = s.department || "기타";
      (groups[dept] ??= []).push(s);
      return groups;
    },
    {},
  );

  const filteredGroups = Object.entries(groupedStaff).reduce<
    [string, Staff[]][]
  >((result, [dept, members]) => {
    const q = searchQuery.toLowerCase();
    const filtered = members.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q),
    );
    if (filtered.length > 0) result.push([dept, filtered]);
    return result;
  }, []);

  /** 맞춤 그룹별로 필터·검색 적용 (세션에 pickerGroups가 있을 때만 사용) */
  const filteredPickerGroups = useMemo(() => {
    const groups = session?.pickerGroups;
    if (!groups?.length) return [];
    const q = searchQuery.toLowerCase();
    return groups
      .map((g) => {
        const members = staffList.filter((s) => g.staffIds.includes(s.id));
        const filtered = members.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.department.toLowerCase().includes(q),
        );
        return { id: g.id, name: g.name, members: filtered };
      })
      .filter((g) => g.members.length > 0);
  }, [session?.pickerGroups, staffList, searchQuery]);

  const hasCustomPickerGroups =
    (session?.pickerGroups?.length ?? 0) > 0;
  const targetGroupNames = useMemo(
    () => (session?.pickerGroups ?? []).map((g) => g.name),
    [session?.pickerGroups],
  );
  const targetStaffCount = session?.sessionTargets?.length ?? 0;

  /** 이번 세션에서 한 건이라도 주문한 교직원 id (이름 선택 단계에서 음영 표시) */
  const staffIdsWithOrders = useMemo(() => {
    return new Set(orderedStaffIds);
  }, [orderedStaffIds]);

  // -- early returns --------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <AlertCircleIcon className="size-12 text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">접근할 수 없습니다</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            {session && (
              <p className="text-xs text-muted-foreground">
                {session.title} · {formatDate(session.date)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) return null;

  function historyItemTitle(item: StaffHistoryOrder) {
    const base = item.menuItem?.name ?? item.customItemName ?? "직접 입력";
    const qty = item.quantity > 1 ? ` x${item.quantity}` : "";
    return `${base}${qty}`;
  }

  function renderStaffPickerButton(staff: Staff) {
    const isOrdered = staffIdsWithOrders.has(staff.id);
    const history = staffHistoryMap[staff.id];
    const isHistoryLoading = staffHistoryLoadingMap[staff.id];

    return (
      <HoverCard
        key={staff.id}
        onOpenChange={(open) => {
          if (open) void fetchStaffHistory(staff.id);
        }}
      >
        <HoverCardTrigger
          type="button"
          onClick={() => handleSelectStaff(staff)}
          className={staffPickerButtonClass(staff.id)}
        >
          <span className="block leading-tight">{staff.name}</span>
          {isOrdered && (
            <span className="mt-1 block text-[10px] font-normal text-muted-foreground/90">
              주문함
            </span>
          )}
        </HoverCardTrigger>
        <HoverCardContent className="w-80 rounded-xl p-3">
          <div className="mb-2 flex items-center gap-2">
            <HistoryIcon className="size-4 text-amber-600" />
            <p className="text-sm font-semibold text-foreground">
              {staff.name} 님 최근 주문
            </p>
          </div>
          {isHistoryLoading ? (
            <p className="text-xs text-muted-foreground">불러오는 중...</p>
          ) : !history || history.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              최근 주문 내역이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border bg-muted/30 px-2.5 py-2"
                >
                  <p className="text-xs font-semibold text-foreground">
                    {historyItemTitle(item)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {item.menuItem?.shop?.name ?? "직접 입력"} · {item.session.title}
                  </p>
                  {item.options && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      옵션: {item.options}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            급할 때 대리 주문 참고용으로 확인할 수 있어요.
          </p>
        </HoverCardContent>
      </HoverCard>
    );
  }

  /** 이름 선택 버튼: 이미 주문한 사람은 음영 + '주문함' 표시 (추가 주문 가능) */
  function staffPickerButtonClass(staffId: string) {
    return cn(
      "rounded-lg border px-2 py-2 text-center text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 active:scale-[0.97]",
      staffIdsWithOrders.has(staffId)
        ? "border-muted-foreground/25 bg-muted/50 text-muted-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] hover:bg-muted/65 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
        : "bg-card",
    );
  }

  // -- step indicator -------------------------------------------------------

  const stepsMeta = [
    { n: 1, label: "이름 선택" },
    { n: 2, label: "음료 선택" },
    { n: 3, label: "주문 완료" },
  ];

  const activeShop = session.sessionShops[activeShopIdx]?.shop ?? null;

  // -- group menu items by category -----------------------------------------

  function groupByCategory(items: MenuItem[]) {
    return items.reduce<Record<string, MenuItem[]>>((g, item) => {
      const cat = item.category || "기타";
      (g[cat] ??= []).push(item);
      return g;
    }, {});
  }

  // -- render ---------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-background to-background pb-32">
      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-amber-100/60 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-lg font-bold">{session.title}</h1>
              <p className="text-sm font-light text-muted-foreground">
                {formatDate(session.date)}
                {session.deadlineTime && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    마감 {session.deadlineTime}
                    {deadlineCountdown && ` · ${deadlineCountdown} 남음`}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {step === 2 && (cartCount > 0 || customLines.length > 0) && (
                <Button variant="secondary" size="sm" onClick={handleScrollToCart}>
                  <ShoppingCartIcon className="mr-1.5 size-4" />
                  담은 품목 {cartCount + customLineQtySum}
                </Button>
              )}
              <Link href="/order">
                <Button variant="outline" size="sm">
                  <ListRestartIcon className="mr-1.5 size-4" />
                  주문 목록
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <HomeIcon className="mr-1.5 size-4" />
                  메인
                </Button>
              </Link>
              <LogoutButton />
            </div>
          </div>

          {/* Steps */}
          <div className="mt-3 flex items-center">
            {stepsMeta.map((s, i) => (
              <div key={s.n} className="flex items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      "mx-1.5 h-px w-5 sm:w-8",
                      step >= s.n ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      step > s.n
                        ? "bg-primary text-primary-foreground"
                        : step === s.n
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {step > s.n ? "✓" : s.n}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs sm:inline",
                      step >= s.n
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedStaff && (
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                주문자: {selectedStaff.name}
              </Badge>
            )}
            {step === 2 && activeShop && (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                현재 업체: {activeShop.name}
              </Badge>
            )}
            {step === 2 && activeShop?.phone && (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                전화: {activeShop.phone}
              </Badge>
            )}
            {step === 2 && (cartCount > 0 || customLines.length > 0) && (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                합계: {cartCount + customLineQtySum}잔 · {formatPrice(checkoutTotal)}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="mx-auto max-w-3xl px-4 py-4">
        {/* ============================================================= */}
        {/* STEP 1 : Select name                                          */}
        {/* ============================================================= */}
        {step === 1 && (
          <div className="space-y-5">
            <p className="text-base font-light text-muted-foreground">
              {session.sessionTargets && session.sessionTargets.length > 0
                ? "이번 세션의 주문 대상만 표시됩니다. 이름을 선택하거나 직접 입력해주세요."
                : "이름을 선택하거나 직접 입력해주세요."}
            </p>
            {targetStaffCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {targetGroupNames.length > 0 ? (
                  <>
                    대상자 그룹:{" "}
                    <span className="font-medium text-foreground">
                      {targetGroupNames.join(", ")}
                    </span>
                  </>
                ) : (
                  <>
                    대상자 지정:{" "}
                    <span className="font-medium text-foreground">
                      {targetStaffCount}명 (개별 지정)
                    </span>
                  </>
                )}
              </p>
            )}

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base">직접 입력</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="이름 입력"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
                <Input
                  placeholder="부서 입력 (선택)"
                  value={manualDepartment}
                  onChange={(e) => setManualDepartment(e.target.value)}
                />
                <Button onClick={handleSelectManualStaff} className="w-full">
                  직접 입력으로 주문하기
                </Button>
              </CardContent>
            </Card>

            {/* 최근 선택 직원 빠른 선택 */}
            {lastStaff && (
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/25">
                <div className="text-sm">
                  <span className="text-xs text-muted-foreground">최근 선택 · </span>
                  <span className="font-medium">
                    {lastStaff.department} / {lastStaff.name}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="ml-3 shrink-0 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200"
                  onClick={() => handleSelectStaff(lastStaff)}
                >
                  바로 선택
                </Button>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="이름 또는 부서 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {hasCustomPickerGroups && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={namePickerView === "dept" ? "default" : "outline"}
                  onClick={() => setNamePickerView("dept")}
                >
                  부서별 보기
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={namePickerView === "groups" ? "default" : "outline"}
                  onClick={() => setNamePickerView("groups")}
                >
                  맞춤 그룹별 보기
                </Button>
              </div>
            )}

            {/* Staff list: 부서별 또는 맞춤 그룹별 */}
            {namePickerView === "dept" ? (
              filteredGroups.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredGroups.map(([dept, members]) => (
                    <div key={dept}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {dept}
                      </h3>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {members.map((staff) => renderStaffPickerButton(staff))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : filteredPickerGroups.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                검색 결과가 없거나, 이 세션 대상에 속한 맞춤 그룹 인원이 없습니다.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredPickerGroups.map((g) => (
                  <div key={g.id}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {g.name}
                    </h3>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {g.members.map((staff) => renderStaffPickerButton(staff))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* STEP 2 : Select drinks                                        */}
        {/* ============================================================= */}
        {step === 2 && selectedStaff && (
          <div className="space-y-4">
            {/* Selected staff badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedStaff.name}
                </span>
                <Badge variant="secondary">{selectedStaff.department}</Badge>
                {selectedStaff.isManual && (
                  <Badge variant="outline">직접 입력</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleChangeStaff}>
                <ArrowLeftIcon className="mr-1 size-3.5" />
                변경
              </Button>
            </div>

            <Separator />

            {/* Existing orders (editable) */}
            {existingOrders.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-amber-800 dark:text-amber-200">
                    <span>기존 주문 {existingOrders.length}건</span>
                    <span className="text-xs font-normal text-muted-foreground">수량 변경 가능</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {existingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">
                            {order.menuItem?.name ?? order.customItemName ?? "직접 입력"}
                          </span>
                          {order.options && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({order.options})
                            </span>
                          )}
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {order.menuItem?.shop?.name ?? order.customShopName ?? "직접 입력"}
                            {" · "}
                            {formatPrice(order.price)} × {order.quantity} ={" "}
                            {formatPrice(order.price * order.quantity)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => handleUpdateOrderQty(order.id, order.quantity - 1)}
                          >
                            <MinusIcon className="size-3" />
                          </Button>
                          <span className="w-5 text-center text-sm font-semibold">{order.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => handleUpdateOrderQty(order.id, order.quantity + 1)}
                          >
                            <PlusIcon className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="ml-1"
                          >
                            <Trash2Icon className="size-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shop selector */}
            {session.sessionShops.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                이 세션에 등록된 매장이 없습니다.
              </p>
            ) : (
              <>
                <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-muted/70 p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {session.sessionShops.map((ss, i) => (
                    <button
                      key={ss.id}
                      onClick={() => setActiveShopIdx(i)}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
                        activeShopIdx === i
                          ? "bg-background text-foreground shadow-sm ring-1 ring-amber-200"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <StoreIcon className="size-3.5" />
                      <div className="text-left">
                        <div>{ss.shop.name}</div>
                        {ss.shop.phone && (
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {ss.shop.phone}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Menu items for active shop */}
                {(() => {
                  const shop = session.sessionShops[activeShopIdx]?.shop;
                  if (!shop) return null;
                  const categories = groupByCategory(shop.menuItems);
                  const catEntries = Object.entries(categories);

                  if (
                    catEntries.length === 0 &&
                    (!shop.menuImageUrls || shop.menuImageUrls.length === 0)
                  ) {
                    return (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        등록된 메뉴가 없습니다.
                      </p>
                    );
                  }

                  return (
                    <ScrollArea className="max-h-[58vh] overflow-y-auto">
                      <div className="space-y-5">
                        {shop.menuImageUrls && shop.menuImageUrls.length > 0 && (
                          <Card className="overflow-hidden border-0 shadow-md">
                            <CardHeader className="border-b bg-background/90">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <CardTitle className="text-base">
                                    {shop.name} 메뉴판
                                    {shop.menuImageUrls.length > 1 && (
                                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                                        ({shop.menuImageUrls.length}장)
                                      </span>
                                    )}
                                  </CardTitle>
                                  {shop.phone && (
                                    <p className="text-xs font-normal text-muted-foreground">
                                      전화 주문: {shop.phone}
                                    </p>
                                  )}
                                </div>
                                {shop.phone && (
                                  <div className="flex flex-wrap gap-2">
                                    <a
                                      href={`tel:${normalizePhoneNumber(shop.phone)}`}
                                      className={buttonVariants({
                                        variant: "outline",
                                        size: "sm",
                                      })}
                                    >
                                      <PhoneIcon className="mr-1.5 size-4" />
                                      전화하기
                                    </a>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCopyPhone(shop.phone)}
                                    >
                                      <CopyIcon className="mr-1.5 size-4" />
                                      번호 복사
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="divide-y p-0">
                              {shop.menuImageUrls.map((url, imgIdx) => (
                                <button
                                  key={`${shop.id}-menu-img-${imgIdx}`}
                                  type="button"
                                  className="relative block w-full cursor-zoom-in border-0 bg-white p-0 text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                                  aria-label={`${shop.name} 메뉴판 ${imgIdx + 1} 확대 보기`}
                                  onClick={() =>
                                    setMenuLightbox({
                                      urls: shop.menuImageUrls,
                                      index: imgIdx,
                                      shopName: shop.name,
                                    })
                                  }
                                >
                                  <Image
                                    src={url}
                                    alt={`${shop.name} 메뉴판 ${imgIdx + 1}`}
                                    width={1200}
                                    height={1600}
                                    unoptimized
                                    className="pointer-events-none max-h-[420px] w-full object-contain bg-white"
                                  />
                                  <span className="pointer-events-none absolute right-2 bottom-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                                    탭하여 확대
                                  </span>
                                </button>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                        {catEntries.map(([cat, items]) => (
                          <div key={cat}>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {cat}
                            </h4>
                            <div className="grid gap-2">
                              {items.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => addToCart(item, shop.name)}
                                  className="flex items-center justify-between rounded-2xl border bg-card/90 p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-medium">
                                        {item.name}
                                      </span>
                                      {item.isIce && (
                                        <Badge
                                          variant="outline"
                                          className="border-sky-300 text-sky-600 dark:border-sky-700 dark:text-sky-400"
                                        >
                                          ICE
                                        </Badge>
                                      )}
                                      {item.isHot && (
                                        <Badge
                                          variant="outline"
                                          className="border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400"
                                        >
                                          HOT
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <span className="ml-3 shrink-0 text-sm font-semibold">
                                    {formatPrice(item.price)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  );
                })()}
              </>
            )}

            {/* ─── 직접 입력 + 메뉴 장바구니 (스크롤 앵커) ───────────────── */}
            <div ref={cartSectionRef} className="space-y-4 scroll-mt-28">
            <Separator />
            <div>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <PlusIcon className="size-4" />
                직접 입력
                <span className="text-xs font-normal text-muted-foreground">
                  (메뉴판에 없을 때 음료명·수량·가격)
                </span>
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                위에서 고른 매장(
                {activeShop?.name ?? "—"}
                )으로 취합됩니다. 다른 매장이면 탭을 먼저 바꿔 주세요.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-xs">
                  <span className="text-muted-foreground">음료명</span>
                  <Input
                    placeholder="예: 아이스 아메리카노"
                    value={customDraftName}
                    onChange={(e) => setCustomDraftName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  <span className="text-muted-foreground">단가(원)</span>
                  <Input
                    inputMode="numeric"
                    placeholder="4500"
                    value={customDraftPrice}
                    onChange={(e) => setCustomDraftPrice(e.target.value)}
                    className="h-9 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  <span className="text-muted-foreground">수량</span>
                  <Input
                    inputMode="numeric"
                    placeholder="1"
                    value={customDraftQty}
                    onChange={(e) => setCustomDraftQty(e.target.value)}
                    className="h-9 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs sm:col-span-2">
                  <span className="text-muted-foreground">옵션·메모 (선택)</span>
                  <Input
                    placeholder="예: 샷 추가, 덜 달게"
                    value={customDraftOptions}
                    onChange={(e) => setCustomDraftOptions(e.target.value)}
                    className="h-9 text-sm"
                  />
                </label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={addCustomLineFromDraft}
              >
                장바구니에 담기
              </Button>

              {customLines.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    직접 입력 품목 ({customLineQtySum}잔)
                  </p>
                  {customLines.map((line) => (
                    <Card
                      key={line.id}
                      size="sm"
                      className="border-dashed border-amber-200/80 bg-amber-50/20 dark:border-amber-900 dark:bg-amber-950/15"
                    >
                      <CardContent className="space-y-2 pt-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{line.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {activeShop?.name ?? "매장 미지정"} · 단가 수정 가능
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            type="button"
                            onClick={() => removeCustomLine(line.id)}
                          >
                            <XIcon className="size-3.5" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1 rounded-md border bg-background">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => updateCustomLineQty(line.id, -1)}
                            >
                              <MinusIcon className="size-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">
                              {line.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => updateCustomLineQty(line.id, 1)}
                            >
                              <PlusIcon className="size-3" />
                            </Button>
                          </div>
                          <label className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">단가</span>
                            <Input
                              inputMode="numeric"
                              className="h-8 w-24 text-right text-xs"
                              value={String(line.unitPrice)}
                              onChange={(e) =>
                                updateCustomLineUnitPrice(line.id, e.target.value)
                              }
                            />
                            <span className="text-muted-foreground">원</span>
                          </label>
                          <span className="ml-auto text-sm font-semibold">
                            {formatPrice(line.unitPrice * line.quantity)}
                          </span>
                        </div>
                        {line.options ? (
                          <p className="text-xs text-muted-foreground">
                            옵션: {line.options}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                    <ShoppingCartIcon className="size-4" />
                    장바구니
                    <Badge variant="secondary">{cartCount}개</Badge>
                  </h3>

                  <div className="space-y-3">
                    {cart.map((c) => (
                      <Card key={c.cartId} size="sm" className="border-0 shadow-sm">
                        <CardContent className="space-y-2">
                          {/* Top row: name + price + remove */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {c.menuItem.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {c.shopName} ·{" "}
                                {formatPrice(getCartUnitPrice(c))}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => removeFromCart(c.cartId)}
                            >
                              <XIcon className="size-3.5" />
                            </Button>
                          </div>

                          {/* Quantity + options row */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded-md border">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => updateCartQty(c.cartId, -1)}
                              >
                                <MinusIcon className="size-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">
                                {c.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => updateCartQty(c.cartId, 1)}
                              >
                                <PlusIcon className="size-3" />
                              </Button>
                            </div>
                            <Input
                              placeholder="옵션 (예: 샷 추가, 덜 달게)"
                              value={c.customNote}
                              onChange={(e) =>
                                updateCartOptions(c.cartId, e.target.value)
                              }
                              className="h-7 flex-1 text-xs"
                            />
                            <span className="shrink-0 text-sm font-semibold">
                              {formatPrice(getCartUnitPrice(c) * c.quantity)}
                            </span>
                          </div>

                          {c.gongcha && (
                            <div className="grid gap-2 rounded-md border bg-muted/25 p-2 sm:grid-cols-2">
                              <label className="grid gap-1 text-xs">
                                <span className="text-muted-foreground">당도</span>
                                <select
                                  value={c.gongcha.sweetness}
                                  onChange={(e) =>
                                    updateGongchaOption(
                                      c.cartId,
                                      "sweetness",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 rounded-md border bg-background px-2"
                                >
                                  <option value="0%">0%</option>
                                  <option value="30%">30%</option>
                                  <option value="50%">50%</option>
                                  <option value="70%">70%</option>
                                  <option value="100%">100%</option>
                                </select>
                              </label>
                              <label className="grid gap-1 text-xs">
                                <span className="text-muted-foreground">얼음</span>
                                <select
                                  value={c.gongcha.ice}
                                  onChange={(e) =>
                                    updateGongchaOption(c.cartId, "ice", e.target.value)
                                  }
                                  className="h-8 rounded-md border bg-background px-2"
                                >
                                  <option value="따뜻한 음료">따뜻한 음료</option>
                                  <option value="얼음 적게">얼음 적게</option>
                                  <option value="얼음 보통">얼음 보통</option>
                                  <option value="얼음 많게">얼음 많게</option>
                                </select>
                              </label>
                              <label className="grid gap-1 text-xs">
                                <span className="text-muted-foreground">토핑</span>
                                <select
                                  value={c.gongcha.topping1}
                                  onChange={(e) =>
                                    updateGongchaOption(
                                      c.cartId,
                                      "topping1",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 rounded-md border bg-background px-2"
                                >
                                  {GONGCHA_TOPPING_OPTIONS.map((t) => (
                                    <option key={`t1-${t.name || "none"}`} value={t.name}>
                                      {t.name ? `${t.name} (+${formatPrice(t.price)})` : "선택 안 함"}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="grid gap-1 text-xs">
                                <span className="text-muted-foreground">추가토핑</span>
                                <select
                                  value={c.gongcha.topping2}
                                  onChange={(e) =>
                                    updateGongchaOption(
                                      c.cartId,
                                      "topping2",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 rounded-md border bg-background px-2"
                                >
                                  {GONGCHA_TOPPING_OPTIONS.map((t) => (
                                    <option key={`t2-${t.name || "none"}`} value={t.name}>
                                      {t.name ? `${t.name} (+${formatPrice(t.price)})` : "선택 안 함"}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <p className="text-right text-xs font-medium sm:col-span-2">
                                옵션 추가금: {formatPrice(getCartExtraPrice(c))}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* STEP 3 : Order complete                                       */}
        {/* ============================================================= */}
        {step === 3 && selectedStaff && (
          <div className="space-y-6">
            {/* Success banner */}
            <Card className="border-0 bg-gradient-to-br from-emerald-50 via-white to-amber-50/20 shadow-lg dark:from-emerald-950/30 dark:to-background rounded-[2rem]">
              <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20">
                <CheckCircle2Icon className="size-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">주문이 완료되었습니다</h2>
                <p className="mt-2 text-base font-light text-muted-foreground">
                  {selectedStaff.name}님의 주문이 정상 접수되었습니다.
                </p>
              </div>
              </CardContent>
            </Card>

            {/* All orders for this staff */}
            {existingOrders.length > 0 && (
              <Card>
                <Collapsible
                  open={completedOrdersOpen}
                  onOpenChange={setCompletedOrdersOpen}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-sm">
                        완료된 내 주문 ({existingOrders.length}건)
                      </CardTitle>
                      <CollapsibleTrigger
                        render={<Button variant="outline" size="sm" />}
                      >
                        {completedOrdersOpen ? "접기" : "펼치기"}
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-3">
                        {existingOrders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between gap-2 rounded-md border p-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {order.menuItem?.name ?? order.customItemName ?? "직접 입력"}
                                <span className="ml-1 text-muted-foreground">
                                  ×{order.quantity}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {order.menuItem?.shop?.name ??
                                  order.customShopName ??
                                  "직접 입력"}
                                {order.options && ` · ${order.options}`}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className="text-sm font-semibold">
                                {formatPrice(order.price * order.quantity)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDeleteOrder(order.id)}
                              >
                                <Trash2Icon className="size-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <Separator />
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span>합계</span>
                          <span>
                            {formatPrice(
                              existingOrders.reduce(
                                (s, o) => s + o.price * o.quantity,
                                0,
                              ),
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setCart([]);
                  setCustomLines([]);
                  setCustomDraftName("");
                  setCustomDraftQty("1");
                  setCustomDraftPrice("");
                  setCustomDraftOptions("");
                  setStep(2);
                }}
                className="w-full"
              >
                <PlusIcon className="mr-1.5 size-4" />
                추가 주문하기
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStaff(null);
                  setCart([]);
                  setCustomLines([]);
                  setCustomDraftName("");
                  setCustomDraftQty("1");
                  setCustomDraftPrice("");
                  setCustomDraftOptions("");
                  setExistingOrders([]);
                  setSearchQuery("");
                  setManualName("");
                  setManualDepartment("");
                  setActiveShopIdx(0);
                  setStep(1);
                }}
                className="w-full"
              >
                다른 사람으로 주문하기
              </Button>
              <Link href="/order">
                <Button variant="outline" className="w-full">
                  <ListRestartIcon className="mr-1.5 size-4" />
                  주문 목록으로 이동
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <HomeIcon className="mr-1.5 size-4" />
                  메인으로 돌아가기
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ── Sticky bottom bar (cart summary) ───────────────────────────── */}
      {step === 2 && (cart.length > 0 || customLines.length > 0) && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {cartCount + customLineQtySum}잔 · {cart.length + customLines.length}줄
              </p>
              <p className="text-base font-bold">{formatPrice(checkoutTotal)}</p>
            </div>
            <Button
              onClick={handleSubmitOrder}
              disabled={submitting}
              size="lg"
              className="min-w-[120px]"
            >
              {submitting ? (
                <>
                  <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "주문 완료"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 메뉴판 이미지 확대 (라이트박스) */}
      <MenuLightboxDialog
        menuLightbox={menuLightbox}
        setMenuLightbox={setMenuLightbox}
        lightboxZoom={lightboxZoom}
        setLightboxZoom={setLightboxZoom}
      />

    </div>
  );
}
