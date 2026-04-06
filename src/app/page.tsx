import Link from "next/link";
import { Coffee, ShoppingBag, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_28%)]" />
      <div className="page-shell relative flex min-h-screen items-center justify-center py-12">
        <div className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-stretch">
          <section className="page-hero flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <Coffee className="size-4" />
              와석초등학교 교직원 전용
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex size-20 items-center justify-center rounded-3xl bg-amber-100 shadow-inner dark:bg-amber-900/30">
                <Coffee className="size-10 text-amber-700 dark:text-amber-400" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
                와석초 음료 주문
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400 sm:text-lg">
                주문 링크 공유부터 메뉴 수집, 업체별 주문 요약까지 한 번에
                정리하는 교직원 음료 주문 취합 시스템입니다.
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  주문
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  진행 중인 세션에서 바로 음료 선택
                </p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  관리
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  교직원, 업체, 메뉴, 세션을 한 화면에서 관리
                </p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  정리
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  전화 주문용 요약과 결과 화면 제공
                </p>
              </div>
            </div>
          </section>

          <section className="flex w-full flex-col gap-4 lg:max-w-md">
            <Link href="/order" className="group">
              <Card className="soft-card h-full overflow-hidden rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_-32px_rgba(37,99,235,0.35)]">
                <CardHeader className="pb-4">
                  <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-blue-100 transition-colors group-hover:bg-blue-200 dark:bg-blue-900/30 dark:group-hover:bg-blue-900/50">
                    <ShoppingBag className="size-7 text-blue-700 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl">주문하기</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    진행 중인 주문 세션으로 들어가 음료를 선택하고 주문 상태를
                    확인합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button className="h-11 w-full rounded-2xl" size="lg">
                    주문 페이지로 이동
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin" className="group">
              <Card className="soft-card h-full overflow-hidden rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_-32px_rgba(39,39,42,0.35)]">
                <CardHeader className="pb-4">
                  <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
                    <Settings className="size-7 text-zinc-700 dark:text-zinc-400" />
                  </div>
                  <CardTitle className="text-2xl">관리자</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    교직원, 업체, 메뉴, 주문 세션을 관리하고 결과를 정리합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-2xl"
                    size="lg"
                  >
                    관리 페이지로 이동
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
