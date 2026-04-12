import Link from "next/link";
import { Coffee } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const navLinks = [
  { href: "/admin", label: "주문 현황" },
  { href: "/admin/staff", label: "교직원 관리" },
  { href: "/admin/shops", label: "음료 업체" },
  { href: "/admin/sessions", label: "음료 취합 만들기" },
];

const quickExitLinks = [
  { href: "/order", label: "주문 화면" },
  { href: "/", label: "메인으로" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.10),_transparent_28%),linear-gradient(to_bottom,_rgba(255,253,247,0.9),transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.06),_transparent_24%),linear-gradient(to_bottom,_rgba(24,24,27,0.88),rgba(9,9,11,1))]">
      <header className="sticky top-0 z-40 border-b border-amber-100/60 bg-white/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/75">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-8">
          <Link
            href="/admin"
            className="flex items-center gap-3 font-bold text-zinc-900 dark:text-zinc-50"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 shadow-sm dark:from-amber-900/30 dark:to-orange-900/20">
              <Coffee className="size-6 text-amber-600" />
            </span>
            <span className="text-lg font-bold sm:text-xl">와석초 음료 주문</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-amber-50/80 p-1.5 dark:bg-zinc-800/60">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-4 py-2.5 text-base font-medium text-zinc-600 transition-all hover:bg-white hover:text-zinc-900 hover:shadow-sm dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            {quickExitLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-amber-100/60 bg-white/80 px-4 py-2.5 text-base font-medium text-zinc-600 transition-all hover:bg-amber-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                {link.label}
              </Link>
            ))}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
