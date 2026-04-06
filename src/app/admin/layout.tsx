import Link from "next/link";
import { Coffee } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const navLinks = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/staff", label: "교직원" },
  { href: "/admin/shops", label: "업체/메뉴" },
  { href: "/admin/sessions", label: "주문세션" },
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.08),_transparent_22%),linear-gradient(to_bottom,_rgba(255,255,255,0.6),transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.06),_transparent_24%),linear-gradient(to_bottom,_rgba(24,24,27,0.88),rgba(9,9,11,1))]">
      <header className="sticky top-0 z-40 border-b bg-white/75 backdrop-blur-xl dark:bg-zinc-950/75">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
          <Link
            href="/admin"
            className="flex items-center gap-3 font-semibold text-zinc-900 dark:text-zinc-50"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-100 shadow-inner dark:bg-amber-900/30">
              <Coffee className="size-5 text-amber-600" />
            </span>
            <span className="text-sm sm:text-base">와석초 음료 주문 관리</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 rounded-2xl bg-muted/60 p-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-background hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
            {quickExitLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border bg-background/80 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
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
