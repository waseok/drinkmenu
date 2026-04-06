"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import {
  CameraIcon,
  ClipboardCopyIcon,
  PrinterIcon,
  StoreIcon,
  HomeIcon,
  ListRestartIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/logout-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Staff {
  id: string;
  name: string;
  department: string;
}

interface Shop {
  id: string;
  name: string;
  phone: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  shop: Shop;
}

interface Order {
  id: string;
  sessionId: string;
  staffId: string;
  menuItemId: string;
  quantity: number;
  options: string;
  price: number;
  createdAt: string;
  staff: Staff;
  menuItem: MenuItem;
}

interface Session {
  id: string;
  title: string;
  date: string;
  status: "OPEN" | "CLOSED";
}

function formatPrice(price: number) {
  return price.toLocaleString("ko-KR") + "원";
}

function formatDateKorean(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const exportRef = useRef<HTMLDivElement>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [sessionRes, ordersRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`, { cache: "no-store" }),
        fetch(`/api/orders?sessionId=${sessionId}`, { cache: "no-store" }),
      ]);

      if (!sessionRes.ok || !ordersRes.ok) throw new Error();

      const sessionData = await sessionRes.json();
      const ordersData: Order[] = await ordersRes.json();

      setSession(sessionData);

      const sorted = [...ordersData].sort((a, b) => {
        const deptCmp = a.staff.department.localeCompare(
          b.staff.department,
          "ko"
        );
        if (deptCmp !== 0) return deptCmp;
        return a.staff.name.localeCompare(b.staff.name, "ko");
      });
      setOrders(sorted);
    } catch {
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const shopGroups = orders.reduce<Record<string, Order[]>>((acc, order) => {
    const shopName = order.menuItem.shop.name;
    if (!acc[shopName]) acc[shopName] = [];
    acc[shopName].push(order);
    return acc;
  }, {});

  const shopSubtotals = Object.entries(shopGroups).map(
    ([shopName, shopOrders]) => ({
      shopName,
      orders: shopOrders,
      phone: shopOrders[0]?.menuItem.shop.phone || "",
      subtotal: shopOrders.reduce((sum, o) => sum + o.price * o.quantity, 0),
      count: shopOrders.reduce((sum, o) => sum + o.quantity, 0),
    })
  );

  const grandTotal = orders.reduce((sum, o) => sum + o.price * o.quantity, 0);
  const totalCount = orders.reduce((sum, o) => sum + o.quantity, 0);

  async function handleExportImage() {
    if (!exportRef.current) return;
    try {
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${session?.title || "주문결과"}_${new Date().toISOString().split("T")[0]}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("이미지가 저장되었습니다.");
    } catch {
      toast.error("이미지 저장에 실패했습니다.");
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleCopyClipboard() {
    if (!session) return;

    const lines: string[] = [
      `📋 ${session.title}`,
      `📅 ${formatDateKorean(session.date)}`,
      "",
      "─".repeat(40),
      ...orders.map(
        (o, i) =>
          `${i + 1}. ${o.staff.department} ${o.staff.name} | ${o.menuItem.shop.name} - ${o.menuItem.name}${o.quantity > 1 ? ` x${o.quantity}` : ""}${o.options ? ` (${o.options})` : ""} | ${formatPrice(o.price * o.quantity)}`
      ),
      "─".repeat(40),
      "",
      "[ 업체별 소계 ]",
      ...shopSubtotals.map(
        (s) => `  ${s.shopName}: ${s.count}건 / ${formatPrice(s.subtotal)}`
      ),
      "",
      `합계: ${totalCount}건 / ${formatPrice(grandTotal)}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("클립보드에 복사되었습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }

  async function handleCopyOrderSummary() {
    if (!session || orders.length === 0) return;

    const lines: string[] = [
      `[${session.title}] 업체별 주문 요약`,
      formatDateKorean(session.date),
      "",
    ];

    for (const group of shopSubtotals) {
      const aggregated = new Map<
        string,
        {
          menuName: string;
          options: string;
          quantity: number;
          customers: string[];
        }
      >();

      for (const order of group.orders) {
        const key = `${order.menuItem.name}__${order.options || ""}`;
        const existing = aggregated.get(key);
        const customerLabel = `${order.staff.department} ${order.staff.name}${
          order.quantity > 1 ? ` x${order.quantity}` : ""
        }`;

        if (existing) {
          existing.quantity += order.quantity;
          existing.customers.push(customerLabel);
        } else {
          aggregated.set(key, {
            menuName: order.menuItem.name,
            options: order.options || "",
            quantity: order.quantity,
            customers: [customerLabel],
          });
        }
      }

      lines.push(
        `[${group.shopName}]${group.phone ? ` ${group.phone}` : ""}`,
        ...Array.from(aggregated.values()).map((item, index) => {
          const optionLabel = item.options ? ` (${item.options})` : "";
          const customerLine = `- 요청자: ${item.customers.join(", ")}`;
          return `${index + 1}. ${item.menuName}${optionLabel} x${item.quantity}\n${customerLine}`;
        }),
        `소계: ${group.count}잔 / ${formatPrice(group.subtotal)}`,
        ""
      );
    }

    lines.push(`총합: ${totalCount}잔 / ${formatPrice(grandTotal)}`);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("업체별 주문 요약이 복사되었습니다.");
    } catch {
      toast.error("주문 요약 복사에 실패했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">세션을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #export-area, #export-area * { visibility: visible; }
          #export-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="no-print sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-semibold">{session.title}</h1>
            <p className="text-xs text-muted-foreground">
              {formatDateKorean(session.date)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/order">
              <Button variant="outline" size="sm">
                <ListRestartIcon data-icon="inline-start" />
                주문 목록
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                <HomeIcon data-icon="inline-start" />
                메인
              </Button>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header & Action Buttons */}
        <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{session.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateKorean(session.date)}
              <Badge variant="secondary" className="ml-2">
                {session.status === "OPEN" ? "진행중" : "마감"}
              </Badge>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportImage}>
              <CameraIcon data-icon="inline-start" />
              이미지 저장
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <PrinterIcon data-icon="inline-start" />
              인쇄
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyClipboard}>
              <ClipboardCopyIcon data-icon="inline-start" />
              클립보드 복사
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyOrderSummary}>
              <ClipboardCopyIcon data-icon="inline-start" />
              주문용 요약 복사
            </Button>
          </div>
        </div>

        {/* Exportable Area */}
        <div
          id="export-area"
          ref={exportRef}
          className="rounded-xl bg-white p-6"
        >
          {/* Title (visible in export/print) */}
          <div className="mb-4 hidden print:block">
            <h2 className="text-xl font-bold">{session.title}</h2>
            <p className="text-sm text-gray-500">
              {formatDateKorean(session.date)}
            </p>
          </div>

          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>주문 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  주문 내역이 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead>업체</TableHead>
                      <TableHead>메뉴</TableHead>
                      <TableHead className="text-center">수량</TableHead>
                      <TableHead>옵션</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order, idx) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-center text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.staff.name}
                        </TableCell>
                        <TableCell>{order.staff.department}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {order.menuItem.shop.name}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.menuItem.name}</TableCell>
                        <TableCell className="text-center">
                          {order.quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.options || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(order.price * order.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {orders.length > 0 && (
            <>
              {/* Totals */}
              <Card className="mt-4">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      업체별 소계
                    </h3>
                    {shopSubtotals.map((s) => (
                      <div
                        key={s.shopName}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <StoreIcon className="size-3.5 text-muted-foreground" />
                          {s.shopName}
                          <span className="text-muted-foreground">
                            ({s.count}건)
                          </span>
                        </span>
                        <span className="font-medium">
                          {formatPrice(s.subtotal)}
                        </span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        합계
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({totalCount}건)
                        </span>
                      </span>
                      <span className="text-lg font-bold">
                        {formatPrice(grandTotal)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Per-shop breakdown */}
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold">업체별 주문 내역</h3>
                {shopSubtotals.map((group) => (
                  <Card key={group.shopName}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <StoreIcon className="size-4" />
                          {group.shopName}
                        </CardTitle>
                        <div className="flex items-center gap-3 text-sm">
                          <Badge variant="secondary">{group.count}건</Badge>
                          <span className="font-semibold">
                            {formatPrice(group.subtotal)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">
                              #
                            </TableHead>
                            <TableHead>이름</TableHead>
                            <TableHead>부서</TableHead>
                            <TableHead>메뉴</TableHead>
                            <TableHead className="text-center">수량</TableHead>
                            <TableHead>옵션</TableHead>
                            <TableHead className="text-right">금액</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.orders.map((order, idx) => (
                            <TableRow key={order.id}>
                              <TableCell className="text-center text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-medium">
                                {order.staff.name}
                              </TableCell>
                              <TableCell>{order.staff.department}</TableCell>
                              <TableCell>{order.menuItem.name}</TableCell>
                              <TableCell className="text-center">
                                {order.quantity}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {order.options || "-"}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatPrice(order.price * order.quantity)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
