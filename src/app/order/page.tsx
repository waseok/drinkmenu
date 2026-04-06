"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
        toast.error("주문 세션을 불러오는데 실패했습니다.");
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white px-4 py-8 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
            <ShoppingBag className="size-7 text-blue-700 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            음료 주문
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            진행 중인 주문 세션을 선택하세요
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
            <Coffee className="mb-4 size-12 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">
              현재 진행 중인 주문이 없습니다
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              관리자가 새로운 주문 세션을 열면 여기에 표시됩니다.
            </p>
            <Link href="/" className="mt-6">
              <Button variant="outline">홈으로 돌아가기</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <Link key={session.id} href={`/order/${session.id}`}>
                <Card className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {session.title}
                      </CardTitle>
                      <Badge variant="default">진행중</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5" />
                      {formatDateKorean(session.date)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Store className="size-3.5" />
                      <span>
                        {session.sessionShops.length > 0
                          ? session.sessionShops
                              .map((ss) => ss.shop.name)
                              .join(", ")
                          : "매장 미지정"}
                      </span>
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
