import Link from "next/link";
import { Users, Store, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sections = [
  {
    title: "교직원 관리",
    description: "교직원 목록을 등록하고 관리합니다. 엑셀 업로드도 지원합니다.",
    href: "/admin/staff",
    icon: Users,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    title: "업체/메뉴 관리",
    description: "음료 업체와 메뉴를 등록하고 관리합니다.",
    href: "/admin/shops",
    icon: Store,
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    title: "주문 세션 관리",
    description:
      "주문 세션을 생성하여 교직원들의 음료 주문을 취합합니다.",
    href: "/admin/sessions",
    icon: CalendarClock,
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
];

export default function AdminDashboard() {
  return (
    <div className="page-shell max-w-6xl">
      <div className="page-hero mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              관리자 대시보드
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              교직원, 업체, 주문 세션을 빠르게 관리할 수 있는 운영 화면입니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border bg-background/80 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Staff
              </p>
              <p className="mt-2 text-sm font-medium">교직원 관리</p>
            </div>
            <div className="rounded-2xl border bg-background/80 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Shop
              </p>
              <p className="mt-2 text-sm font-medium">업체/메뉴 관리</p>
            </div>
            <div className="rounded-2xl border bg-background/80 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Session
              </p>
              <p className="mt-2 text-sm font-medium">주문 세션</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.href}
              className="soft-card group flex flex-col overflow-hidden rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_-32px_rgba(15,23,42,0.3)]"
            >
              <CardHeader className="pb-4">
                <div
                  className={`mb-3 flex size-12 items-center justify-center rounded-2xl ${section.color}`}
                >
                  <Icon className="size-5" />
                </div>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription className="leading-6">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <Link href={section.href}>
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-2xl group-hover:border-primary/30"
                  >
                    관리하기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
