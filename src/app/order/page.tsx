"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarIcon, Coffee, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SessionShop {
  id: string;
  shopId: string;
  shop: { id: string; name: string };
}

interface Session {
  id: string;
  title: string;
  date: string;
  status: "OPEN" | "CLOSED";
  sessionShops: SessionShop[];
  targetGroupNames?: string[];
  targetSummary: {
    targetCount: number;
    orderedCount: number;
    notOrderedCount: number;
  } | null;
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

export default function OrderPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("/api/sessions", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data: Session[] = await res.json();
        setSessions(data.filter((s) => s.status === "OPEN"));
      } catch {
        toast.error("음료 취합 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Coffee className="size-8 animate-pulse text-amber-600" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-orange-50/20 to-white px-5 py-10 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-amber-100 to-orange-100 dark:from-blue-900/30 dark:to-blue-800/20">
            <ShoppingBag className="size-8 text-amber-700 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            음료 주문
          </h1>
          <p className="mt-2 text-lg font-light text-muted-foreground">
            진행 중인 음료 취합을 선택하세요
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-amber-200/60 bg-amber-50/20 py-20">
            <Coffee className="mb-5 size-14 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">
              현재 진행 중인 주문이 없습니다
            </p>
            <p className="mt-2 text-base font-light text-muted-foreground/70">
              관리자가 음료 취합을 시작하면 여기에 표시됩니다.
            </p>
            <Link href="/" className="mt-6">
              <Button variant="outline">홈으로 돌아가기</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/order/${session.id}`}
                onMouseEnter={() => {
                  router.prefetch(`/order/${session.id}`);
                }}
              >
                <Card className="rounded-[1.5rem] border-amber-100/50 bg-gradient-to-br from-card/95 to-amber-50/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(217,119,6,0.25)]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold">
                        {session.title}
                      </CardTitle>
                      <Badge variant="default" className="rounded-full px-3 py-1 text-sm font-medium">진행중</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 text-base font-light">
                      <CalendarIcon className="size-4" />
                      {formatDateKorean(session.date)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-base font-light text-muted-foreground">
                        <Store className="size-4" />
                        <span>
                          {session.sessionShops.length > 0
                            ? session.sessionShops
                                .map((ss) => ss.shop.name)
                                .join(", ")
                            : "매장 미지정"}
                        </span>
                      </div>
                      {session.targetSummary && (
                        <div className="text-sm text-muted-foreground">
                          {session.targetGroupNames && session.targetGroupNames.length > 0 ? (
                            <>
                              대상자 그룹:{" "}
                              <span className="font-medium text-foreground">
                                {session.targetGroupNames.join(", ")}
                              </span>
                            </>
                          ) : (
                            <>
                              대상자 지정:{" "}
                              <span className="font-medium text-foreground">
                                {session.targetSummary.targetCount}명
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
