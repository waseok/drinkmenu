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
      <div className="page-hero mb-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-base font-bold text-amber-700 dark:text-amber-300">
              Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-5xl">
              관리자 대시보드
            </h1>
            <p className="mt-3 text-lg font-light leading-7 text-muted-foreground">
              교직원, 업체, 주문 세션을 빠르게 관리할 수 있는 운영 화면입니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-[1.5rem] border border-amber-100/60 bg-gradient-to-br from-background/80 to-amber-50/30 px-5 py-4 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Staff
              </p>
              <p className="mt-2 text-base font-medium">교직원 관리</p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-100/60 bg-gradient-to-br from-background/80 to-amber-50/30 px-5 py-4 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Shop
              </p>
              <p className="mt-2 text-base font-medium">업체/메뉴 관리</p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-100/60 bg-gradient-to-br from-background/80 to-amber-50/30 px-5 py-4 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Session
              </p>
              <p className="mt-2 text-base font-medium">주문 세션</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.href}
              className="soft-card group flex flex-col overflow-hidden rounded-[2rem] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_-28px_rgba(217,119,6,0.22)]"
            >
              <CardHeader className="pb-5">
                <div
                  className={`mb-4 flex size-14 items-center justify-center rounded-[1.25rem] ${section.color}`}
                >
                  <Icon className="size-6" />
                </div>
                <CardTitle className="text-2xl font-bold">{section.title}</CardTitle>
                <CardDescription className="text-base font-light leading-7">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <Link href={section.href}>
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-2xl text-base font-medium group-hover:border-primary/30"
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
