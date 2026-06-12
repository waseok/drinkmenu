import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/** 나눔스퀘어라운드 — 본문 가독성 (npm typeface-nanum-square-round) */
const nanumSquareRound = localFont({
  src: [
    {
      path: "../../node_modules/typeface-nanum-square-round/NanumSquareRoundL.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../node_modules/typeface-nanum-square-round/NanumSquareRoundR.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/typeface-nanum-square-round/NanumSquareRoundB.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../node_modules/typeface-nanum-square-round/NanumSquareRoundEB.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-nanum-round",
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
      className={`${nanumSquareRound.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
