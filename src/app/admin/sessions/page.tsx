"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarIcon,
  CopyIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  ShoppingCartIcon,
  TrashIcon,
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

interface Shop {
  id: string;
  name: string;
}

interface SessionShop {
  id: string;
  shopId: string;
  shop: Shop;
}

interface Session {
  id: string;
  title: string;
  date: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  _count: { orders: number };
  sessionShops: SessionShop[];
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
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  function openCreateDialog() {
    setEditingSession(null);
    setTitle("");
    setDate(new Date().toISOString().split("T")[0]);
    setSelectedShopIds([]);
    setDialogOpen(true);
  }

  function openEditDialog(session: Session) {
    setEditingSession(session);
    setTitle(session.title);
    setDate(toInputDate(session.date));
    setSelectedShopIds(session.sessionShops.map((ss) => ss.shopId));
    setDialogOpen(true);
  }

  function toggleShop(shopId: string) {
    setSelectedShopIds((prev) =>
      prev.includes(shopId)
        ? prev.filter((id) => id !== shopId)
        : [...prev, shopId]
    );
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
            shopIds: selectedShopIds,
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
            shopIds: selectedShopIds,
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
          : "세션 생성에 실패했습니다."
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
          : "세션이 마감되었습니다."
      );
      await fetchSessions();
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  }

  function copyOrderLink(sessionId: string) {
    const url = `${window.location.origin}/order/${sessionId}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("주문 링크가 복사되었습니다."),
      () => toast.error("링크 복사에 실패했습니다.")
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
    0
  );

  function renderSessionCard(session: Session) {
    return (
      <Card
        key={session.id}
        className="soft-card overflow-hidden rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)]"
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="truncate">{session.title}</CardTitle>
                <Badge
                  variant={session.status === "OPEN" ? "default" : "secondary"}
                >
                  {session.status === "OPEN" ? "진행중" : "완료"}
                </Badge>
              </div>
              <CardDescription className="mt-1 flex items-center gap-1">
                <CalendarIcon className="size-3.5" />
                {formatDateKorean(session.date)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>주문 {session._count.orders}건</span>
            {session.sessionShops.length > 0 && (
              <span>
                매장: {session.sessionShops.map((ss) => ss.shop.name).join(", ")}
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-wrap gap-2 border-t bg-muted/20">
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
              <p className="mt-2 text-lg font-semibold">{closedSessions.length}</p>
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSession ? "세션 수정" : "새 주문 세션"}
              </DialogTitle>
              <DialogDescription>
                {editingSession
                  ? "세션 정보를 수정합니다."
                  : "새로운 음료 주문 세션을 생성합니다."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="session-title">세션 제목</Label>
                <Input
                  id="session-title"
                  placeholder="예: 5월 첫째주 음료 주문"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
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
            </div>
            <DialogFooter>
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
