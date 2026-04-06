"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyholeIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccessScope } from "@/lib/school-auth";

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/admin";
  }

  if (nextPath.startsWith("//")) {
    return "/admin";
  }

  return nextPath;
}

function sanitizeScope(scope: string | null): AccessScope {
  return scope === "admin" ? "admin" : "order";
}

export default function AccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get("next")),
    [searchParams]
  );
  const scope = useMemo(
    () => sanitizeScope(searchParams.get("scope")),
    [searchParams]
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!password.trim()) {
      toast.error("비밀번호를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/school-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, scope }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "비밀번호가 올바르지 않습니다.");
      }

      toast.success("인증되었습니다.");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "인증에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 via-background to-background px-4 py-10">
      <Card className="w-full max-w-sm border-0 shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100">
            <LockKeyholeIcon className="size-7 text-amber-700" />
          </div>
          <div>
            <CardTitle className="text-2xl">학교 비밀번호</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {scope === "admin"
                ? "관리자 전용 비밀번호를 입력하세요."
                : "주문 전용 비밀번호를 입력하세요."}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="school-password">비밀번호</Label>
              <Input
                id="school-password"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "확인 중..." : "입장하기"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
