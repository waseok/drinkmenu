import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/** 에스코어 드림 — 큰 글씨/가독성 (woff2, 한글·영문·기호만 서브셋) */
const sCoreDream = localFont({
  src: [
    { path: "./fonts/SCoreDream-4Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/SCoreDream-6Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/SCoreDream-7ExtraBold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-score-dream",
  display: "swap",
});

export const metadata: Metadata = {
  title: "와석초 음료 주문",
  description: "와석초등학교 교직원 음료 주문 취합 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${sCoreDream.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
