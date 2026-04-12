import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const gmarketSans = localFont({
  src: [
    {
      path: "../fonts/GmarketSansLight.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/GmarketSansMedium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/GmarketSansBold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gmarket",
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
      className={`${gmarketSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
