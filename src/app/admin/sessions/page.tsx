"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarIcon,
  CopyIcon,
  ChevronDownIcon,
  CopyPlusIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  ShoppingCartIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Shop {
  id: string;
  name: string;
}

interface SessionShop {
  id: string;
  shopId: string;
  shop: Shop;
}

interface StaffLite {
  id: string;
  name: string;
  department: string;
}

interface SessionTargetRow {
  staffId: string;
  staff: StaffLite;
}

interface TargetSummary {
  targetCount: number;
  orderedCount: number;
  notOrderedCount: number;
  notOrderedStaff: StaffLite[];
}

interface Session {
  id: string;
  title: string;
  date: string;
  deadlineTime?: string | null;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  _count: { orders: number };
  sessionShops: SessionShop[];
  sessionTargets: SessionTargetRow[];
  targetSummary: TargetSummary | null;
}

interface StaffGroupRow {
  id: string;
  name: string;
  members: { staffId: string; staff: StaffLite }[];
}

function formatDateKorean(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function toInputDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  /** 세션 다이얼로그에서 선택할 전체 교직원·맞춤 그룹 (다이얼로그 열릴 때 로드) */
  const [pickerStaff, setPickerStaff] = useState<StaffLite[]>([]);
  const [staffGroups, setStaffGroups] = useState<StaffGroupRow[]>([]);
  /** 이 세션의 주문 대상 staff id 목록 (빈 배열이면 “전원 대상”) */
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [targetPickerTab, setTargetPickerTab] = useState<"dept" | "groups">(
    "dept",
  );
  const [targetSearch, setTargetSearch] = useState("");

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions(data);
    } catch {
      toast.error("세션 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShops = useCallback(async () => {
    try {
      const res = await fetch("/api/shops");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShops(data);
    } catch {
      toast.error("매장 목록을 불러오는데 실패했습니다.");
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchShops();
  }, [fetchSessions, fetchShops]);

  // 진행 중인 세션이 있을 때 30초마다 자동 갱신
  useEffect(() => {
    const hasOpen = sessions.some((s) => s.status === "OPEN");
    if (!hasOpen) return;
    const id = setInterval(() => {
      fetchSessions();
    }, 30_000);
    return () => clearInterval(id);
  }, [sessions, fetchSessions]);

  /** 대상 선택 UI용 데이터: 다이얼로그가 열릴 때만 요청 */
  useEffect(() => {
    if (!dialogOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const [sRes, gRes] = await Promise.all([
          fetch("/api/staff", { cache: "no-store" }),
          fetch("/api/staff/groups", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (sRes.ok) setPickerStaff(await sRes.json());
        if (gRes.ok) setStaffGroups(await gRes.json());
      } catch {
        if (!cancelled) toast.error("교직원·그룹 정보를 불러오지 못했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dialogOpen]);

  const staffByDept = useMemo(() => {
    const m = new Map<string, StaffLite[]>();
    for (const s of pickerStaff) {
      const d = s.department || "기타";
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(s);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "ko"));
  }, [pickerStaff]);

  const filteredStaffByDept = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return staffByDept;
    return staffByDept
      .map(([dept, members]) => {
        const filtered = members.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.department.toLowerCase().includes(q),
        );
        return [dept, filtered] as [string, StaffLite[]];
      })
      .filter(([, members]) => members.length > 0);
  }, [staffByDept, targetSearch]);

  function openCreateDialog() {
    setEditingSession(null);
    setTitle("");
    setDate(new Date().toISOString().split("T")[0]);
    setDeadlineTime("");
    setSelectedShopIds([]);
    setSelectedStaffIds([]);
    setTargetPickerTab("dept");
    setTargetSearch("");
    setDialogOpen(true);
  }

  function openEditDialog(session: Session) {
    setEditingSession(session);
    setTitle(session.title);
    setDate(toInputDate(session.date));
    setDeadlineTime(session.deadlineTime ?? "");
    setSelectedShopIds(session.sessionShops.map((ss) => ss.shopId));
    setSelectedStaffIds(
      session.sessionTargets?.length
        ? session.sessionTargets.map((t) => t.staffId)
        : [],
    );
    setTargetPickerTab("dept");
    setTargetSearch("");
    setDialogOpen(true);
  }

  function toggleShop(shopId: string) {
    setSelectedShopIds((prev) =>
      prev.includes(shopId)
        ? prev.filter((id) => id !== shopId)
        : [...prev, shopId],
    );
  }

  function toggleStaffPick(id: string) {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  /** 해당 부서(학년) 소속 전원을 대상에 추가 */
  function addDeptStaff(dept: string) {
    const ids = pickerStaff
      .filter((s) => (s.department || "기타") === dept)
      .map((s) => s.id);
    setSelectedStaffIds((prev) => [...new Set([...prev, ...ids])]);
  }

  /** 해당 부서 소속은 대상에서 제거 */
  function removeDeptStaff(dept: string) {
    const idSet = new Set(
      pickerStaff
        .filter((s) => (s.department || "기타") === dept)
        .map((s) => s.id),
    );
    setSelectedStaffIds((prev) => prev.filter((id) => !idSet.has(id)));
  }

  /** 맞춤 그룹 멤버 전원 추가 */
  function addGroupStaff(groupId: string) {
    const g = staffGroups.find((x) => x.id === groupId);
    if (!g) return;
    const ids = g.members.map((m) => m.staffId);
    setSelectedStaffIds((prev) => [...new Set([...prev, ...ids])]);
  }

  function removeGroupStaff(groupId: string) {
    const g = staffGroups.find((x) => x.id === groupId);
    if (!g) return;
    const idSet = new Set(g.members.map((m) => m.staffId));
    setSelectedStaffIds((prev) => prev.filter((id) => !idSet.has(id)));
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("세션 제목을 입력해주세요.");
      return;
    }
    if (!date) {
      toast.error("날짜를 선택해주세요.");
      return;
    }
    if (selectedShopIds.length === 0) {
      toast.error("매장을 하나 이상 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSession) {
        const res = await fetch("/api/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingSession.id,
            title: title.trim(),
            date,
            deadlineTime: deadlineTime || null,
            shopIds: selectedShopIds,
            staffIds: selectedStaffIds,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("세션이 수정되었습니다.");
      } else {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            date,
            deadlineTime: deadlineTime || null,
            shopIds: selectedShopIds,
            staffIds: selectedStaffIds,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("새 세션이 생성되었습니다.");
      }
      setDialogOpen(false);
      await fetchSessions();
    } catch {
      toast.error(
        editingSession
          ? "세션 수정에 실패했습니다."
          : "세션 생성에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(session: Session) {
    if (!confirm(`"${session.title}" 세션을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: session.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("세션이 삭제되었습니다.");
      await fetchSessions();
    } catch {
      toast.error("세션 삭제에 실패했습니다.");
    }
  }

  async function handleToggleStatus(session: Session) {
    const newStatus = session.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const res = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: session.id, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        newStatus === "OPEN"
          ? "세션이 다시 열렸습니다."
          : "세션이 마감되었습니다.",
      );
      await fetchSessions();
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  }

  function openCopyDialog(session: Session) {
    setEditingSession(null);
    setTitle(`${session.title} (복사)`);
    setDate(new Date().toISOString().split("T")[0]);
    setDeadlineTime(session.deadlineTime ?? "");
    setSelectedShopIds(session.sessionShops.map((ss) => ss.shopId));
    setSelectedStaffIds(
      session.sessionTargets?.length
        ? session.sessionTargets.map((t) => t.staffId)
        : [],
    );
    setTargetPickerTab("dept");
    setTargetSearch("");
    setDialogOpen(true);
  }

  function copyOrderLink(sessionId: string) {
    const url = `${window.location.origin}/order/${sessionId}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("주문 링크가 복사되었습니다."),
      () => toast.error("링크 복사에 실패했습니다."),
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  const openSessions = sessions.filter((session) => session.status === "OPEN");
  const closedSessions = sessions.filter((session) => session.status === "CLOSED");
  const totalOrders = sessions.reduce(
    (sum, session) => sum + session._count.orders,
    0,
  );

  function renderSessionCard(session: Session) {
    const ts = session.targetSummary;
    const isClosed = session.status === "CLOSED";

    const titleRow = (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <CardTitle className="truncate text-base sm:text-lg">
          <Link
            href={`/order/${session.id}/result`}
            className="hover:underline"
          >
            {session.title}
          </Link>
        </CardTitle>
        <Badge variant={session.status === "OPEN" ? "default" : "secondary"}>
          {session.status === "OPEN" ? "진행중" : "완료"}
        </Badge>
      </div>
    );

    const detailBlock = (
      <>
        <div
          className={
            isClosed
              ? "text-muted-foreground flex items-center gap-1 px-6 pt-0 pb-3 text-sm"
              : "hidden"
          }
        >
          <CalendarIcon className="size-3.5 shrink-0" />
          {formatDateKorean(session.date)}
        </div>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>주문 {session._count.orders}건</span>
            {session.sessionShops.length > 0 && (
              <span>
                매장:{" "}
                {session.sessionShops.map((ss) => ss.shop.name).join(", ")}
              </span>
            )}
          </div>

          {ts ? (
            <div className="rounded-xl border bg-muted/30 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-foreground flex items-center gap-1 font-medium">
                  <UsersIcon className="size-3.5" />
                  대상 {ts.targetCount}명 · 주문 {ts.orderedCount}명
                </span>
                {ts.notOrderedCount > 0 ? (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-900 dark:text-amber-200">
                    미주문 {ts.notOrderedCount}명
                  </Badge>
                ) : (
                  <Badge variant="secondary">전원 주문 완료</Badge>
                )}
              </div>
              {ts.notOrderedStaff.length > 0 && (
                <Collapsible className="mt-2">
                  <CollapsibleTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-auto w-full justify-between px-2 py-1.5 text-xs font-medium"
                      />
                    }
                  >
                    미주문 명단 보기
                    <ChevronDownIcon className="size-4 shrink-0 opacity-70" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="bg-background mt-1 max-h-40 overflow-y-auto rounded-lg border p-2">
                    <ul className="space-y-1 text-xs">
                      {ts.notOrderedStaff.map((s) => (
                        <li key={s.id} className="flex justify-between gap-2">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-muted-foreground">
                            {s.department}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              주문 대상을 지정하지 않았습니다. 주문 화면에서는 등록된 전체 교직원이
              보입니다.
            </p>
          )}
        </CardContent>
        <CardFooter className="bg-muted/20 flex-wrap gap-2 border-t">
          <Link href={`/order/${session.id}/result`}>
            <Button variant="outline" size="sm">
              <LinkIcon data-icon="inline-start" />
              주문 결과 보기
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyOrderLink(session.id)}
          >
            <CopyIcon data-icon="inline-start" />
            주문 링크 복사
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openCopyDialog(session)}
          >
            <CopyPlusIcon data-icon="inline-start" />
            세션 복사
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditDialog(session)}
          >
            <PencilIcon data-icon="inline-start" />
            수정
          </Button>
          <Button
            variant={session.status === "OPEN" ? "secondary" : "outline"}
            size="sm"
            onClick={() => handleToggleStatus(session)}
          >
            {session.status === "OPEN" ? "마감하기" : "다시 열기"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(session)}
          >
            <TrashIcon data-icon="inline-start" />
            삭제
          </Button>
        </CardFooter>
      </>
    );

    if (isClosed) {
      return (
        <Collapsible key={session.id} defaultOpen={false}>
          <Card className="soft-card overflow-hidden rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                {titleRow}
                <CollapsibleTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1"
                    />
                  }
                >
                  <span className="text-xs">상세</span>
                  <ChevronDownIcon className="size-4 opacity-70" />
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>{detailBlock}</CollapsibleContent>
          </Card>
        </Collapsible>
      );
    }

    return (
      <Card
        key={session.id}
        className="soft-card overflow-hidden rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)]"
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              {titleRow}
              <CardDescription className="mt-1 flex items-center gap-1">
                <CalendarIcon className="size-3.5" />
                {formatDateKorean(session.date)}
                {session.deadlineTime && (
                  <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    마감 {session.deadlineTime}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {detailBlock}
      </Card>
    );
  }

  return (
    <div className="page-shell max-w-6xl">
      <div className="page-hero mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
              Sessions
            </p>
            <h1 className="mt-2 text-3xl font-bold">주문 세션 관리</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              주문 링크를 만들고 마감 상태와 결과를 한 번에 관리합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border bg-background/80 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Total
              </p>
              <p className="mt-2 text-lg font-semibold">{sessions.length}</p>
            </div>
            <div className="rounded-2xl border bg-background/80 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Open
              </p>
              <p className="mt-2 text-lg font-semibold">{openSessions.length}</p>
            </div>
            <div className="rounded-2xl border bg-background/80 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Closed
              </p>
              <p className="mt-2 text-lg font-semibold">
                {closedSessions.length}
              </p>
            </div>
            <div className="rounded-2xl border bg-background/80 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Orders
              </p>
              <p className="mt-2 text-lg font-semibold">{totalOrders}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">세션 목록</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            주문 링크 공유, 결과 확인, 마감 처리를 빠르게 할 수 있습니다.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button onClick={openCreateDialog}>
                <PlusIcon data-icon="inline-start" />새 주문 세션
              </Button>
            }
          />
          <DialogContent className="flex max-h-[min(92vh,820px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="shrink-0 space-y-1 border-b px-4 pt-4 pr-12 pb-3">
              <DialogTitle>
                {editingSession ? "세션 수정" : "새 주문 세션"}
              </DialogTitle>
              <DialogDescription>
                {editingSession
                  ? "세션 정보·주문 대상을 수정합니다."
                  : "새로운 음료 주문 세션을 생성합니다."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="session-title">세션 제목</Label>
                <Input
                  id="session-title"
                  placeholder="예: 5월 첫째주 음료 주문"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="session-date">날짜</Label>
                  <Input
                    id="session-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="session-deadline">마감 시간 (선택)</Label>
                  <Input
                    id="session-deadline"
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    placeholder="예: 11:30"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>매장 선택</Label>
                {shops.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    등록된 매장이 없습니다.
                  </p>
                ) : (
                  <div className="grid gap-2 rounded-lg border p-3">
                    {shops.map((shop) => (
                      <label
                        key={shop.id}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={selectedShopIds.includes(shop.id)}
                          onCheckedChange={() => toggleShop(shop.id)}
                        />
                        <span className="text-sm">{shop.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-2 rounded-lg border border-dashed p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-base">주문 대상 교직원</Label>
                  <span className="text-xs text-muted-foreground">
                    선택 {selectedStaffIds.length}명 · 비우면 전원
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  부서(학년) 또는 맞춤 그룹으로 일괄 추가한 뒤, 체크박스로 개별
                  조정할 수 있습니다. 맞춤 그룹은 직원 관리 화면에서 만듭니다.
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={targetPickerTab === "dept" ? "default" : "outline"}
                    onClick={() => setTargetPickerTab("dept")}
                  >
                    부서별
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      targetPickerTab === "groups" ? "default" : "outline"
                    }
                    onClick={() => setTargetPickerTab("groups")}
                  >
                    맞춤 그룹
                  </Button>
                </div>

                <Input
                  placeholder="이름·부서 검색"
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  className="h-9"
                />

                <div className="max-h-[min(40vh,280px)] overflow-y-auto rounded-md border bg-muted/20 p-2">
                  {targetPickerTab === "dept" ? (
                    filteredStaffByDept.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        표시할 교직원이 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {filteredStaffByDept.map(([dept, members]) => (
                          <div key={dept}>
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {dept}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  className="h-7 text-xs"
                                  onClick={() => addDeptStaff(dept)}
                                >
                                  부서 전체 추가
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  className="h-7 text-xs"
                                  onClick={() => removeDeptStaff(dept)}
                                >
                                  부서 전체 제거
                                </Button>
                              </div>
                            </div>
                            <div className="grid gap-1.5">
                              {members.map((s) => (
                                <label
                                  key={s.id}
                                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-background/80"
                                >
                                  <Checkbox
                                    checked={selectedStaffIds.includes(s.id)}
                                    onCheckedChange={() => toggleStaffPick(s.id)}
                                  />
                                  <span className="text-sm">{s.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : staffGroups.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      등록된 맞춤 그룹이 없습니다. 직원 관리에서 그룹을
                      만드세요.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {staffGroups.map((g) => (
                        <div key={g.id}>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {g.name}
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                ({g.members.length}명)
                              </span>
                            </span>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="h-7 text-xs"
                                onClick={() => addGroupStaff(g.id)}
                              >
                                그룹 전체 추가
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="h-7 text-xs"
                                onClick={() => removeGroupStaff(g.id)}
                              >
                                그룹 전체 제거
                              </Button>
                            </div>
                          </div>
                          <div className="grid gap-1.5 pl-1">
                            {g.members.map((m) => (
                              <label
                                key={m.staffId}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-background/80"
                              >
                                <Checkbox
                                  checked={selectedStaffIds.includes(m.staffId)}
                                  onCheckedChange={() =>
                                    toggleStaffPick(m.staffId)
                                  }
                                />
                                <span className="text-sm">
                                  {m.staff.name}
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    {m.staff.department}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedStaffIds(pickerStaff.map((s) => s.id))
                    }
                  >
                    전원 선택
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStaffIds([])}
                  >
                    전체 해제
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="!mx-0 !mb-0 shrink-0 border-t bg-background px-4 py-3">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? "처리 중..."
                  : editingSession
                    ? "수정"
                    : "생성"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed bg-background/70 py-16 shadow-sm">
          <ShoppingCartIcon className="mb-4 size-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">아직 세션이 없습니다.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            새 주문 세션을 생성해보세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-8">
          <section className="grid gap-5">
            <div>
              <h2 className="text-xl font-semibold">진행 중인 세션</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                현재 주문 가능한 세션입니다.
              </p>
            </div>
            {openSessions.length === 0 ? (
              <div className="rounded-3xl border border-dashed bg-background/70 px-6 py-10 text-sm text-muted-foreground">
                진행 중인 세션이 없습니다.
              </div>
            ) : (
              openSessions.map((session) => renderSessionCard(session))
            )}
          </section>

          <section className="grid gap-5">
            <div>
              <h2 className="text-xl font-semibold">완료된 세션</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                마감된 주문 세션은 이 목록으로 이동합니다.
              </p>
            </div>
            {closedSessions.length === 0 ? (
              <div className="rounded-3xl border border-dashed bg-background/70 px-6 py-10 text-sm text-muted-foreground">
                완료된 세션이 없습니다.
              </div>
            ) : (
              closedSessions.map((session) => renderSessionCard(session))
            )}
          </section>
        </div>
      )}
    </div>
  );
}
