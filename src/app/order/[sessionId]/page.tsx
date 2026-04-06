"use client";

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
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Staff {
  id: string;
  name: string;
  department: string;
  position: string;
}

interface Orderer extends Staff {
  isManual?: boolean;
}

interface MenuItem {
  id: string;
  shopId: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  isIce: boolean;
  isHot: boolean;
}

interface Shop {
  id: string;
  name: string;
  phone: string;
  menuImageUrls: string[];
  menuItems: MenuItem[];
}

interface SessionShop {
  id: string;
  shopId: string;
  shop: Shop;
}

/** 세션에 지정된 주문 대상 (없으면 전 교직원) */
interface SessionTargetRow {
  staffId: string;
  staff: Staff;
}

/** 주문 화면 이름 피커용 맞춤 그룹 (대상과 교집합만 서버에서 내려줌) */
interface PickerGroup {
  id: string;
  name: string;
  staffIds: string[];
}

interface OrderItem {
  id: string;
  sessionId: string;
  staffId: string;
  menuItemId: string;
  quantity: number;
  options: string;
  price: number;
  staff: Staff;
  menuItem: MenuItem & { shop: { id: string; name: string } };
}

interface Session {
  id: string;
  title: string;
  date: string;
  status: "OPEN" | "CLOSED";
  sessionShops: SessionShop[];
  orders: OrderItem[];
  sessionTargets?: SessionTargetRow[];
  pickerGroups?: PickerGroup[];
}

interface CartItem {
  cartId: string;
  menuItem: MenuItem;
  shopName: string;
  quantity: number;
  options: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number) {
  return price.toLocaleString("ko-KR") + "원";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

function normalizePhoneNumber(phone: string) {
  return phone.replace(/[^0-9+]/g, "");
}

let nextCartId = 0;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [existingOrders, setExistingOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeShopIdx, setActiveShopIdx] = useState(0);
  const [completedOrdersOpen, setCompletedOrdersOpen] = useState(false);
  /** 이름 선택: 부서(학년) 묶음 vs 관리자 맞춤 그룹 */
  const [namePickerView, setNamePickerView] = useState<"dept" | "groups">(
    "dept",
  );
  const cartSectionRef = useRef<HTMLDivElement | null>(null);

  // -- data fetching --------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [sessionRes, staffRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}`, { cache: "no-store" }),
          fetch("/api/staff", { cache: "no-store" }),
        ]);

        if (cancelled) return;

        if (!sessionRes.ok) {
          const data = await sessionRes.json();
          setError(data.error || "세션을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        const sessionData: Session = await sessionRes.json();
        const staffData: Staff[] = await staffRes.json();

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
      cart.length > 0 &&
      !confirm("이름을 변경하면 장바구니가 초기화됩니다. 계속하시겠습니까?")
    ) {
      return;
    }
    setSelectedStaff(null);
    setCart([]);
    setExistingOrders([]);
    setSearchQuery("");
    setManualName("");
    setManualDepartment("");
    setActiveShopIdx(0);
    setStep(1);
  }, [cart.length]);

  const addToCart = useCallback((menuItem: MenuItem, shopName: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === menuItem.id);
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
          options: "",
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
      prev.map((c) => (c.cartId === cartId ? { ...c, options } : c)),
    );
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((c) => c.cartId !== cartId));
  }, []);

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
    if (!selectedStaff || cart.length === 0) return;
    setSubmitting(true);
    try {
      const isManual = Boolean(selectedStaff.isManual);
      const results = await Promise.all(
        cart.map((item) =>
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
              options: item.options,
              price: item.menuItem.price,
            }),
          }),
        ),
      );

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
      await fetchExistingOrders(resolvedStaff?.id ?? (isManual ? null : selectedStaff.id));
      setStep(3);
    } catch {
      toast.error("주문 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedStaff, cart, sessionId, fetchExistingOrders]);

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
        } else {
          toast.error("주문 삭제에 실패했습니다.");
        }
      } catch {
        toast.error("오류가 발생했습니다.");
      }
    },
    [selectedStaff, fetchExistingOrders],
  );

  // -- computed values ------------------------------------------------------

  const cartTotal = cart.reduce(
    (s, c) => s + c.menuItem.price * c.quantity,
    0,
  );
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

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
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-base font-semibold">{session.title}</h1>
              <p className="text-xs text-muted-foreground">
                {formatDate(session.date)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {step === 2 && cartCount > 0 && (
                <Button variant="secondary" size="sm" onClick={handleScrollToCart}>
                  <ShoppingCartIcon className="mr-1.5 size-4" />
                  장바구니 {cartCount}
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
            {step === 2 && cartCount > 0 && (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                장바구니: {cartCount}개 · {formatPrice(cartTotal)}
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {session.sessionTargets && session.sessionTargets.length > 0
                ? "이번 세션의 주문 대상만 표시됩니다. 이름을 선택하거나 직접 입력해주세요."
                : "이름을 선택하거나 직접 입력해주세요."}
            </p>

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
                        {members.map((staff) => (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => handleSelectStaff(staff)}
                            className="rounded-lg border bg-card px-3 py-2.5 text-center text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 active:scale-[0.97]"
                          >
                            {staff.name}
                          </button>
                        ))}
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
                      {g.members.map((staff) => (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => handleSelectStaff(staff)}
                          className="rounded-lg border bg-card px-3 py-2.5 text-center text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 active:scale-[0.97]"
                        >
                          {staff.name}
                        </button>
                      ))}
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

            {/* Existing orders notice */}
            {existingOrders.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    기존 주문 {existingOrders.length}건
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
                            {order.menuItem.name}
                          </span>
                          <span className="ml-1 text-muted-foreground">
                            ×{order.quantity}
                          </span>
                          {order.options && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({order.options})
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {formatPrice(order.price * order.quantity)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteOrder(order.id)}
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
                                <Image
                                  key={`${shop.id}-menu-img-${imgIdx}`}
                                  src={url}
                                  alt={`${shop.name} 메뉴판 ${imgIdx + 1}`}
                                  width={1200}
                                  height={1600}
                                  unoptimized
                                  className="max-h-[420px] w-full object-contain bg-white"
                                />
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

            {/* ─── Cart section ─────────────────────────────────────── */}
            {cart.length > 0 && (
              <>
                <Separator />
                <div ref={cartSectionRef}>
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
                                {formatPrice(c.menuItem.price)}
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
                              value={c.options}
                              onChange={(e) =>
                                updateCartOptions(c.cartId, e.target.value)
                              }
                              className="h-7 flex-1 text-xs"
                            />
                            <span className="shrink-0 text-sm font-semibold">
                              {formatPrice(c.menuItem.price * c.quantity)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* STEP 3 : Order complete                                       */}
        {/* ============================================================= */}
        {step === 3 && selectedStaff && (
          <div className="space-y-6">
            {/* Success banner */}
            <Card className="border-0 bg-gradient-to-br from-emerald-50 to-white shadow-md dark:from-emerald-950/30 dark:to-background">
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2Icon className="size-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">주문이 완료되었습니다</h2>
                <p className="mt-1 text-sm text-muted-foreground">
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
                                {order.menuItem.name}
                                <span className="ml-1 text-muted-foreground">
                                  ×{order.quantity}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {order.menuItem.shop.name}
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
      {step === 2 && cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {cartCount}개 선택
              </p>
              <p className="text-base font-bold">{formatPrice(cartTotal)}</p>
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
    </div>
  );
}
