import Link from "next/link";
import { Coffee, ShoppingBag, Settings, ClipboardList, LayoutDashboard, FileText } from "lucide-react";
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
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_30%)]" />
      {/* Subtle coffee-toned decorative circles */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-amber-100/30 blur-3xl dark:bg-amber-900/10" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-blue-100/20 blur-3xl dark:bg-blue-900/10" />

      <div className="page-shell relative flex min-h-screen items-center justify-center py-12">
        <div className="flex w-full max-w-5xl flex-col gap-10 lg:flex-row lg:items-stretch">
          {/* Hero section */}
          <section className="page-hero flex-1 animate-slide-up text-left">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-gradient-to-r from-amber-100/90 to-orange-100/70 px-4 py-1.5 text-base font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <Coffee className="size-5 shrink-0" />
              와석초등학교 교직원 전용
            </div>
            <div className="mt-8 space-y-5">
              <div className="flex size-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-amber-100 to-orange-100 shadow-sm dark:from-amber-900/30 dark:to-orange-900/20">
                <Coffee className="size-12 text-amber-700 dark:text-amber-400" />
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
                와석초 음료 주문
              </h1>
              <p className="max-w-xl text-base font-light leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
                링크 공유·메뉴 수집·업체별 요약까지 한 번에 정리하는 교직원 음료
                주문 취합 시스템입니다.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="min-h-[5.5rem] rounded-[1.5rem] border border-blue-100/60 bg-gradient-to-br from-background/80 to-blue-50/30 p-5">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <ClipboardList className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  주문
                </p>
                <p className="mt-1.5 text-sm font-light leading-snug text-muted-foreground sm:text-base">
                  진행 세션에서 바로 음료를 고릅니다.
                </p>
              </div>
              <div className="min-h-[5.5rem] rounded-[1.5rem] border border-emerald-100/60 bg-gradient-to-br from-background/80 to-emerald-50/30 p-5">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <LayoutDashboard className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  관리
                </p>
                <p className="mt-1.5 text-sm font-light leading-snug text-muted-foreground sm:text-base">
                  교직원·업체·메뉴·세션을 한 화면에서 다룹니다.
                </p>
              </div>
              <div className="min-h-[5.5rem] rounded-[1.5rem] border border-violet-100/60 bg-gradient-to-br from-background/80 to-violet-50/30 p-5">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                  <FileText className="size-5 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  정리
                </p>
                <p className="mt-1.5 text-sm font-light leading-snug text-muted-foreground sm:text-base">
                  전화 주문용 요약과 결과 화면을 제공합니다.
                </p>
              </div>
            </div>
          </section>

          {/* CTA cards */}
          <section className="flex w-full flex-col gap-5 lg:max-w-md animate-slide-up" style={{ animationDelay: "80ms" }}>
            <Link href="/order" className="group">
              <Card className="soft-card h-full overflow-hidden rounded-[2rem] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_-28px_rgba(217,119,6,0.35)]">
                <CardHeader className="pb-5">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-amber-100 to-orange-100 transition-colors group-hover:from-amber-200 group-hover:to-orange-200 dark:from-amber-900/30 dark:to-orange-900/20">
                    <ShoppingBag className="size-8 text-amber-700 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-3xl font-bold">주문하기</CardTitle>
                  <CardDescription className="text-base font-light leading-relaxed">
                    진행 중인 취합에 참여해 음료를 고르고 주문합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button className="h-13 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-lg font-bold text-white shadow-md hover:from-amber-600 hover:to-orange-600 dark:from-amber-600 dark:to-orange-600" size="lg">
                    주문 페이지로 이동
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin" className="group">
              <Card className="soft-card h-full overflow-hidden rounded-[2rem] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_-28px_rgba(39,39,42,0.30)]">
                <CardHeader className="pb-5">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-zinc-100 to-stone-100 transition-colors group-hover:from-zinc-200 group-hover:to-stone-200 dark:from-zinc-800 dark:to-stone-800">
                    <Settings className="size-8 text-zinc-700 dark:text-zinc-400" />
                  </div>
                  <CardTitle className="text-3xl font-bold">관리자</CardTitle>
                  <CardDescription className="text-base font-light leading-relaxed">
                    교직원·업체·메뉴·취합 세션을 관리하고 결과를 정리합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    variant="outline"
                    className="h-13 w-full rounded-2xl text-lg font-bold"
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
