"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Store,
  Loader2,
  Download,
  ImagePlus,
  X,
} from "lucide-react";

interface MenuItem {
  id: string;
  shopId: string;
  name: string;
  price: number;
  category: string;
  sortOrder: number;
  isAvailable: boolean;
  isIce: boolean;
  isHot: boolean;
}

interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  category: string;
  naverPlaceId: string;
  menuImageUrls: string[];
  menuItems: MenuItem[];
}

interface CrawlResult {
  place_name: string;
  address_name: string;
  phone: string;
  category_name: string;
  naverPlaceId: string;
}

interface CrawledMenuItem {
  name: string;
  price: number | null;
  description?: string;
  selected?: boolean;
}

const MENU_CATEGORIES = ["커피", "논커피", "티", "스무디", "에이드", "기타"] as const;
const MAX_MENU_IMAGE_SIZE_MB = 4;
const MAX_MENU_IMAGES = 3;

/** 배너·뱃지·구분선 등 메뉴 행이 아닌 줄 */
function shouldSkipBulkPasteLine(line: string): boolean {
  const t = line.trim();
  if (t.length > 100) return true;
  if (/^[-_=·.~\s│|]+$/.test(t)) return true;
  return (
    t === "섬네일" ||
    t.startsWith("주문 ") ||
    t.startsWith("신규") ||
    t.startsWith("인기") ||
    t.startsWith("대표") ||
    /^베스트|^HOT\s|^NEW\s|^MD\s|^세트/i.test(t) ||
    !!t.match(/^\d+%/) ||
    t.startsWith("[") ||
    t.startsWith("(") && t.endsWith(")") && t.length <= 6
  );
}

/**
 * 메뉴 설명·안내 문구로 보이는 줄 (메뉴명으로 오인하지 않음)
 */
function isLikelyMenuDescriptionLine(line: string): boolean {
  const t = line.normalize("NFKC").trim();
  if (t.length <= 1) return false;
  if (t.length >= 50) return true;

  if (
    /(합니다|습니다|드립니다|되어\s*있습니다|가능합니다|주세요|해주세요|드세요|참고|원산지|알레르기|이미지는\s*참고|실제와\s*다를|매장별로\s*다를|판매\s*가격|영업시간|문의|주의|당부)/.test(
      t
    )
  ) {
    return true;
  }

  if (/※|⍟|★{2,}|☆{2,}|\*{3,}|•{2,}/.test(t)) return true;

  if ((t.match(/,/g) ?? []).length >= 2) return true;
  if ((t.match(/·|∙/g) ?? []).length >= 3) return true;

  if (
    t.length >= 10 &&
    /(입니다|습니까|해요|에요|예요|죠요|거예요|네요|지만요|어요)\s*$/.test(t)
  ) {
    return true;
  }

  if (
    t.length >= 14 &&
    /(부드러운|진한|깊은|풍부한|상큼한|달콤한|고소한|시원한|따뜻한).+(와|과|와\s*함께|를\s*곁들|의\s*조화)/.test(
      t
    )
  ) {
    return true;
  }

  if (
    t.length >= 16 &&
    /\s(및|또는|그리고|함께\s*즐|곁들여|올린|듯한)\s/.test(t)
  ) {
    return true;
  }

  if (t.length >= 20 && /[.!?…]/.test(t)) return true;

  return false;
}

/** 가격만 있는 줄 (숫자 + 선택적 원) */
function parseStandalonePriceLine(line: string): number | null {
  const m = line.trim().match(/^([\d,]+)원?\s*$/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * "메뉴명만 있는 줄" 후보 — 너무 길거나 문장형이면 제외
 */
function isPlausibleMenuNameOnlyLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 2 || t.length > 44) return false;
  if (/^\d/.test(t)) return false;
  if (t.split(/\s+/).length > 7) return false;
  return true;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  // Naver search
  const [keyword, setKeyword] = useState("와석초 카페");
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [showCrawl, setShowCrawl] = useState(false);

  // Shop dialog
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [shopForm, setShopForm] = useState({
    name: "",
    address: "",
    phone: "",
    category: "",
    menuImageUrls: [] as string[],
  });

  // Menu dialog
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuTargetShopId, setMenuTargetShopId] = useState("");
  const [menuForm, setMenuForm] = useState({
    name: "",
    price: 0,
    category: "커피",
    isIce: true,
    isHot: true,
  });

  // Menu crawl dialog
  const [menuCrawlDialogOpen, setMenuCrawlDialogOpen] = useState(false);
  const [menuCrawlShop, setMenuCrawlShop] = useState<Shop | null>(null);
  const [crawledMenuItems, setCrawledMenuItems] = useState<CrawledMenuItem[]>([]);
  const [menuCrawlLoading, setMenuCrawlLoading] = useState(false);
  const [menuCrawlSaving, setMenuCrawlSaving] = useState(false);

  // Bulk text input dialog
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkShop, setBulkShop] = useState<Shop | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkParsed, setBulkParsed] = useState<CrawledMenuItem[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [expandedShops, setExpandedShops] = useState<Set<string>>(new Set());

  const fetchShops = useCallback(async () => {
    try {
      const res = await fetch("/api/shops");
      if (!res.ok) throw new Error("업체 목록을 불러오지 못했습니다.");
      const data = await res.json();
      setShops(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  // --- Naver search ---
  const handleCrawl = async () => {
    if (!keyword.trim()) {
      toast.error("검색어를 입력해주세요.");
      return;
    }
    setCrawlLoading(true);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      if (!res.ok) throw new Error("검색에 실패했습니다.");
      const data = await res.json();
      if (data.success) {
        setCrawlResults(data.places || []);
        if ((data.places || []).length === 0) toast.info("검색 결과가 없습니다.");
      } else {
        toast.error(data.error || "검색에 실패했습니다.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "검색 오류");
    } finally {
      setCrawlLoading(false);
    }
  };

  const handleAddFromCrawl = async (result: CrawlResult) => {
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.place_name,
          address: result.address_name,
          phone: result.phone,
          category: result.category_name,
          naverPlaceId: result.naverPlaceId,
        }),
      });
      if (!res.ok) throw new Error("업체 추가에 실패했습니다.");
      toast.success(`${result.place_name} 추가 완료`);
      fetchShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가 오류");
    }
  };

  // --- Shop CRUD ---
  const openAddShopDialog = () => {
    setEditingShop(null);
    setShopForm({
      name: "",
      address: "",
      phone: "",
      category: "",
      menuImageUrls: [],
    });
    setShopDialogOpen(true);
  };

  const openEditShopDialog = (shop: Shop) => {
    setEditingShop(shop);
    setShopForm({
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      category: shop.category,
      menuImageUrls: Array.isArray(shop.menuImageUrls)
        ? shop.menuImageUrls.slice(0, MAX_MENU_IMAGES)
        : [],
    });
    setShopDialogOpen(true);
  };

  const handleShopMenuImageAdd = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_MENU_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`이미지는 ${MAX_MENU_IMAGE_SIZE_MB}MB 이하만 업로드할 수 있습니다.`);
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setShopForm((prev) => {
        if (prev.menuImageUrls.length >= MAX_MENU_IMAGES) {
          toast.error(`메뉴 사진은 최대 ${MAX_MENU_IMAGES}장까지 등록할 수 있습니다.`);
          return prev;
        }
        return { ...prev, menuImageUrls: [...prev.menuImageUrls, dataUrl] };
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이미지 처리에 실패했습니다.");
    } finally {
      event.target.value = "";
    }
  };

  const removeShopMenuImageAt = (index: number) => {
    setShopForm((prev) => ({
      ...prev,
      menuImageUrls: prev.menuImageUrls.filter((_, i) => i !== index),
    }));
  };

  const handleSaveShop = async () => {
    if (!shopForm.name.trim()) {
      toast.error("업체명을 입력해주세요.");
      return;
    }
    try {
      if (editingShop) {
        const res = await fetch("/api/shops", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingShop.id, ...shopForm }),
        });
        if (!res.ok) throw new Error("업체 수정에 실패했습니다.");
        toast.success("업체 정보가 수정되었습니다.");
      } else {
        const res = await fetch("/api/shops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shopForm),
        });
        if (!res.ok) throw new Error("업체 추가에 실패했습니다.");
        toast.success("업체가 추가되었습니다.");
      }
      setShopDialogOpen(false);
      fetchShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 오류");
    }
  };

  const handleDeleteShop = async (shop: Shop) => {
    if (!confirm(`"${shop.name}" 업체를 삭제하시겠습니까? 메뉴도 모두 삭제됩니다.`))
      return;
    try {
      const res = await fetch("/api/shops", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: shop.id }),
      });
      if (!res.ok) throw new Error("업체 삭제에 실패했습니다.");
      toast.success("업체가 삭제되었습니다.");
      fetchShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 오류");
    }
  };

  // --- Menu CRUD ---
  const openAddMenuDialog = (shopId: string) => {
    setEditingMenuItem(null);
    setMenuTargetShopId(shopId);
    setMenuForm({ name: "", price: 0, category: "커피", isIce: true, isHot: true });
    setMenuDialogOpen(true);
  };

  const openEditMenuDialog = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuTargetShopId(item.shopId);
    setMenuForm({
      name: item.name,
      price: item.price,
      category: item.category,
      isIce: item.isIce,
      isHot: item.isHot,
    });
    setMenuDialogOpen(true);
  };

  const handleSaveMenu = async () => {
    if (!menuForm.name.trim()) {
      toast.error("메뉴명을 입력해주세요.");
      return;
    }
    if (menuForm.price <= 0) {
      toast.error("가격을 입력해주세요.");
      return;
    }
    try {
      if (editingMenuItem) {
        const res = await fetch(`/api/shops/${menuTargetShopId}/menu`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingMenuItem.id, ...menuForm }),
        });
        if (!res.ok) throw new Error("메뉴 수정에 실패했습니다.");
        toast.success("메뉴가 수정되었습니다.");
      } else {
        const res = await fetch(`/api/shops/${menuTargetShopId}/menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(menuForm),
        });
        if (!res.ok) throw new Error("메뉴 추가에 실패했습니다.");
        toast.success("메뉴가 추가되었습니다.");
      }
      setMenuDialogOpen(false);
      fetchShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "메뉴 저장 오류");
    }
  };

  const handleDeleteMenu = async (shopId: string, menuId: string) => {
    if (!confirm("이 메뉴를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/shops/${shopId}/menu`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: menuId }),
      });
      if (!res.ok) throw new Error("메뉴 삭제에 실패했습니다.");
      toast.success("메뉴가 삭제되었습니다.");
      fetchShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 오류");
    }
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/shops/${item.shopId}/menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isAvailable: !item.isAvailable }),
      });
      if (!res.ok) throw new Error("상태 변경에 실패했습니다.");
      fetchShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상태 변경 오류");
    }
  };

  /** 현재 목록 순서대로 sortOrder를 0부터 다시 저장합니다. */
  async function persistMenuOrder(shopId: string, orderedIds: string[]) {
    const res = await fetch(`/api/shops/${shopId}/menu`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "순서 저장에 실패했습니다.");
    }
  }

  async function handleMoveMenu(shop: Shop, index: number, delta: -1 | 1) {
    const items = [...shop.menuItems];
    const next = index + delta;
    if (next < 0 || next >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    const orderedIds = reordered.map((i) => i.id);
    try {
      await persistMenuOrder(shop.id, orderedIds);
      fetchShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "순서 변경 오류");
    }
  }

  // --- Menu Crawling ---
  const openMenuCrawlDialog = async (shop: Shop) => {
    setMenuCrawlShop(shop);
    setCrawledMenuItems([]);
    setMenuCrawlDialogOpen(true);
    setMenuCrawlLoading(true);

    try {
      const res = await fetch("/api/crawl/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: shop.name,
          naverPlaceId: shop.naverPlaceId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.menuItems?.length > 0) {
        setCrawledMenuItems(
          data.menuItems.map((item: CrawledMenuItem) => ({
            ...item,
            selected: true,
          }))
        );
        toast.success(`${data.menuItems.length}개 메뉴를 찾았습니다!`);
      } else {
        toast.warning(data.message || "메뉴를 가져올 수 없습니다.");
      }
    } catch {
      toast.error("메뉴 크롤링에 실패했습니다.");
    } finally {
      setMenuCrawlLoading(false);
    }
  };

  const toggleCrawledItem = (index: number) => {
    setCrawledMenuItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleAllCrawledItems = (selected: boolean) => {
    setCrawledMenuItems((prev) => prev.map((item) => ({ ...item, selected })));
  };

  const handleSaveCrawledMenus = async () => {
    if (!menuCrawlShop) return;
    const selected = crawledMenuItems.filter((item) => item.selected);
    if (selected.length === 0) {
      toast.error("저장할 메뉴를 선택해주세요.");
      return;
    }

    setMenuCrawlSaving(true);
    let successCount = 0;

    for (const item of selected) {
      try {
        const res = await fetch(`/api/shops/${menuCrawlShop.id}/menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            price: item.price || 0,
            category: "기타",
            isIce: true,
            isHot: true,
          }),
        });
        if (res.ok) successCount++;
      } catch {
        // continue with next item
      }
    }

    setMenuCrawlSaving(false);
    toast.success(`${successCount}개 메뉴가 저장되었습니다.`);
    setMenuCrawlDialogOpen(false);
    fetchShops();
  };

  // --- Bulk text input ---
  const openBulkDialog = (shop: Shop) => {
    setBulkShop(shop);
    setBulkText("");
    setBulkParsed([]);
    setBulkDialogOpen(true);
  };

  const parseBulkText = (text: string) => {
    setBulkText(text);
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const items: CrawledMenuItem[] = [];
    /** 직전에 읽은 메뉴명 후보 — 반드시 다음에 오는 가격 줄과만 짝지음 (설명 줄은 건너뜀) */
    let pendingName: string | null = null;

    const attachPriceToLastOrphan = (price: number) => {
      if (items.length === 0) return;
      const last = items[items.length - 1];
      if (last.price === null || last.price === undefined) {
        last.price = price;
      }
    };

    for (const line of lines) {
      if (shouldSkipBulkPasteLine(line)) continue;

      const standalonePrice = parseStandalonePriceLine(line);
      if (standalonePrice !== null) {
        if (pendingName) {
          items.push({
            name: pendingName,
            price: standalonePrice,
            selected: true,
          });
          pendingName = null;
        } else {
          attachPriceToLastOrphan(standalonePrice);
        }
        continue;
      }

      if (isLikelyMenuDescriptionLine(line)) {
        continue;
      }

      const namePrice = line.match(/^(.+?)\s+([\d,]+)원?\s*$/);
      if (namePrice) {
        const namePart = namePrice[1].trim();
        const priceNum =
          parseInt(namePrice[2].replace(/,/g, ""), 10) || null;
        if (isLikelyMenuDescriptionLine(namePart)) continue;
        pendingName = null;
        items.push({
          name: namePart,
          price: priceNum,
          selected: true,
        });
        continue;
      }

      const priceName = line.match(/^([\d,]+)원?\s+(.+)$/);
      if (priceName) {
        const namePart = priceName[2].trim();
        if (isLikelyMenuDescriptionLine(namePart)) continue;
        pendingName = null;
        items.push({
          name: namePart,
          price: parseInt(priceName[1].replace(/,/g, ""), 10) || null,
          selected: true,
        });
        continue;
      }

      if (
        isPlausibleMenuNameOnlyLine(line) &&
        !isLikelyMenuDescriptionLine(line)
      ) {
        pendingName = line;
        continue;
      }

      if (line.length > 36) {
        pendingName = null;
      }
    }

    const valid = items.filter((i) => i.price && i.price > 0);
    setBulkParsed(valid);
  };

  const handleSaveBulkMenus = async () => {
    if (!bulkShop) return;
    const selected = bulkParsed.filter((i) => i.selected);
    if (selected.length === 0) {
      toast.error("저장할 메뉴가 없습니다.");
      return;
    }

    setBulkSaving(true);
    let successCount = 0;

    for (const item of selected) {
      try {
        const res = await fetch(`/api/shops/${bulkShop.id}/menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            price: item.price || 0,
            category: "기타",
            isIce: true,
            isHot: true,
          }),
        });
        if (res.ok) successCount++;
      } catch {
        // continue
      }
    }

    setBulkSaving(false);
    toast.success(`${successCount}개 메뉴가 저장되었습니다.`);
    setBulkDialogOpen(false);
    fetchShops();
  };

  const toggleExpanded = (shopId: string) => {
    setExpandedShops((prev) => {
      const next = new Set(prev);
      if (next.has(shopId)) next.delete(shopId);
      else next.add(shopId);
      return next;
    });
  };

  const formatPrice = (price: number) =>
    price.toLocaleString("ko-KR") + "원";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-background to-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 rounded-3xl border bg-background/80 p-6 shadow-sm backdrop-blur">
        <p className="text-sm font-medium text-amber-700">Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">업체 &amp; 메뉴 관리</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          네이버 메뉴를 가져오고, 메뉴 사진과 함께 더 보기 좋게 관리할 수 있습니다.
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-8 border-0 shadow-md">
        <Collapsible open={showCrawl} onOpenChange={setShowCrawl}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="size-4" />
                네이버 업체 검색
              </CardTitle>
              <CollapsibleTrigger
                render={<Button variant="outline" size="sm" />}
              >
                <ChevronDown
                  className={`size-4 transition-transform ${showCrawl ? "rotate-180" : ""}`}
                />
                {showCrawl ? "닫기" : "열기"}
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="예: 메가커피 파주, 공차 야당"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
                  className="flex-1"
                />
                <Button onClick={handleCrawl} disabled={crawlLoading}>
                  {crawlLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  검색
                </Button>
              </div>

              {crawlResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    검색 결과: {crawlResults.length}건
                  </p>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {crawlResults.map((result, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-2xl border bg-muted/20 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{result.place_name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {result.address_name}
                          </p>
                          {result.phone && (
                            <p className="text-sm text-muted-foreground">
                              {result.phone}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddFromCrawl(result)}
                          className="ml-3 shrink-0"
                        >
                          <Plus className="size-4" />
                          추가
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Shop List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            등록된 업체 ({shops.length})
          </h2>
          <Button onClick={openAddShopDialog}>
            <Plus className="size-4" />
            업체 직접 추가
          </Button>
        </div>

        {shops.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Store className="mx-auto mb-3 size-10 opacity-40" />
              <p>등록된 업체가 없습니다.</p>
              <p className="text-sm">
                위 검색으로 업체를 찾거나, 직접 추가해주세요.
              </p>
            </CardContent>
          </Card>
        ) : (
          shops.map((shop) => (
            <Card key={shop.id} className="overflow-hidden border-0 shadow-md">
              <Collapsible
                open={expandedShops.has(shop.id)}
                onOpenChange={() => toggleExpanded(shop.id)}
              >
                <CardHeader>
                  {(shop.menuImageUrls ?? []).length > 0 && (
                    <div className="mb-4 grid grid-cols-3 gap-1 overflow-hidden rounded-2xl border bg-muted/30 sm:gap-2">
                      {(shop.menuImageUrls ?? [])
                        .slice(0, MAX_MENU_IMAGES)
                        .map((url, idx) => (
                        <div
                          key={`${shop.id}-thumb-${idx}`}
                          className="relative aspect-[4/3] min-h-0"
                        >
                          <Image
                            src={url}
                            alt={`${shop.name} 메뉴 사진 ${idx + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="(max-width: 640px) 33vw, 200px"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                        {shop.name}
                        {shop.category && (
                          <Badge variant="secondary" className="text-xs">
                            {shop.category}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          메뉴 {shop.menuItems.length}개
                        </Badge>
                      </CardTitle>
                      <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                        {shop.address && <p>{shop.address}</p>}
                        {shop.phone && <p>{shop.phone}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMenuCrawlDialog(shop);
                        }}
                        title="네이버에서 메뉴 가져오기"
                      >
                        <Download className="size-4" />
                        네이버
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBulkDialog(shop);
                        }}
                        title="텍스트로 메뉴 일괄 입력"
                      >
                        <Plus className="size-4" />
                        일괄입력
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditShopDialog(shop)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteShop(shop)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <CollapsibleTrigger
                        render={<Button variant="outline" size="sm" />}
                      >
                        <ChevronDown
                          className={`size-4 transition-transform ${
                            expandedShops.has(shop.id) ? "rotate-180" : ""
                          }`}
                        />
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {(shop.menuImageUrls ?? []).length > 0 && (
                      <div className="overflow-hidden rounded-2xl border bg-muted/20">
                        <div className="border-b bg-background/80 px-4 py-2 text-sm font-medium">
                          메뉴 사진 ({(shop.menuImageUrls ?? []).length}장)
                        </div>
                        <div className="divide-y bg-white">
                          {(shop.menuImageUrls ?? []).map((url, idx) => (
                            <Image
                              key={`${shop.id}-full-${idx}`}
                              src={url}
                              alt={`${shop.name} 메뉴 사진 ${idx + 1}`}
                              width={1200}
                              height={1600}
                              unoptimized
                              className="max-h-[420px] w-full object-contain"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">
                          메뉴 ({shop.menuItems.length})
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          순서 열의 위·아래 버튼으로 주문 화면에 보이는 메뉴 순서를 맞출 수 있습니다.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openAddMenuDialog(shop.id)}
                      >
                        <Plus className="size-4" />
                        메뉴 수동 추가
                      </Button>
                    </div>

                    {shop.menuItems.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        <p>등록된 메뉴가 없습니다.</p>
                        <p className="mt-1">
                          &quot;메뉴 가져오기&quot;로 네이버에서 자동으로 가져오거나,
                          수동으로 추가해주세요.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[88px] text-center">
                                순서
                              </TableHead>
                              <TableHead>메뉴명</TableHead>
                              <TableHead>가격</TableHead>
                              <TableHead>카테고리</TableHead>
                              <TableHead>ICE/HOT</TableHead>
                              <TableHead>판매</TableHead>
                              <TableHead className="text-right">관리</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {shop.menuItems.map((item, menuIndex) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-center">
                                  <div className="flex justify-center gap-0.5">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      className="size-7"
                                      disabled={menuIndex === 0}
                                      title="위로"
                                      onClick={() =>
                                        handleMoveMenu(shop, menuIndex, -1)
                                      }
                                    >
                                      <ChevronUp className="size-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      className="size-7"
                                      disabled={
                                        menuIndex === shop.menuItems.length - 1
                                      }
                                      title="아래로"
                                      onClick={() =>
                                        handleMoveMenu(shop, menuIndex, 1)
                                      }
                                    >
                                      <ChevronDown className="size-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {item.name}
                                </TableCell>
                                <TableCell>{formatPrice(item.price)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{item.category}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {item.isIce && (
                                      <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">
                                        ICE
                                      </Badge>
                                    )}
                                    {item.isHot && (
                                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                                        HOT
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={item.isAvailable}
                                    onCheckedChange={() =>
                                      handleToggleAvailable(item)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditMenuDialog(item)}
                                    >
                                      <Pencil className="size-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() =>
                                        handleDeleteMenu(shop.id, item.id)
                                      }
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      {/* Shop Add/Edit Dialog */}
      <Dialog open={shopDialogOpen} onOpenChange={setShopDialogOpen}>
        <DialogContent className="flex max-h-[min(90vh,760px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 space-y-1 border-b px-4 pt-4 pr-12 pb-3">
            <DialogTitle>
              {editingShop ? "업체 정보 수정" : "업체 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="shop-name">업체명 *</Label>
              <Input
                id="shop-name"
                placeholder="예: 메가커피 와석점"
                value={shopForm.name}
                onChange={(e) =>
                  setShopForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shop-address">주소</Label>
              <Input
                id="shop-address"
                value={shopForm.address}
                onChange={(e) =>
                  setShopForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shop-phone">전화번호</Label>
              <Input
                id="shop-phone"
                value={shopForm.phone}
                onChange={(e) =>
                  setShopForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shop-category">카테고리</Label>
              <Input
                id="shop-category"
                placeholder="예: 카페, 음료"
                value={shopForm.category}
                onChange={(e) =>
                  setShopForm((f) => ({ ...f, category: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shop-menu-image">메뉴 사진 (최대 {MAX_MENU_IMAGES}장)</Label>
              <p className="text-xs text-muted-foreground">
                주문 화면에 메뉴판 이미지로 표시됩니다. 장당 최대{" "}
                {MAX_MENU_IMAGE_SIZE_MB}MB.
              </p>
              {shopForm.menuImageUrls.map((url, idx) => (
                <div
                  key={`preview-${idx}`}
                  className="overflow-hidden rounded-2xl border bg-muted/20"
                >
                  <div className="relative h-40 w-full sm:h-48">
                    <Image
                      src={url}
                      alt={`메뉴 사진 ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="100vw"
                    />
                  </div>
                  <div className="flex justify-end border-t bg-background/80 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => removeShopMenuImageAt(idx)}
                    >
                      <X className="size-4" />
                      이 사진 제거
                    </Button>
                  </div>
                </div>
              ))}
              {shopForm.menuImageUrls.length < MAX_MENU_IMAGES && (
                <>
                  <label
                    htmlFor="shop-menu-image"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/20 px-4 py-6 text-center transition-colors hover:bg-muted/40"
                  >
                    <ImagePlus className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        사진 추가 (
                        {shopForm.menuImageUrls.length}/{MAX_MENU_IMAGES})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG 등 이미지 파일
                      </p>
                    </div>
                  </label>
                  <Input
                    id="shop-menu-image"
                    type="file"
                    accept="image/*"
                    onChange={handleShopMenuImageAdd}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>
          <DialogFooter className="!mx-0 !mb-0 shrink-0 border-t bg-background px-4 py-3">
            <Button variant="outline" onClick={() => setShopDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveShop}>
              {editingShop ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Add/Edit Dialog */}
      <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMenuItem ? "메뉴 수정" : "메뉴 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="menu-name">메뉴명 *</Label>
              <Input
                id="menu-name"
                placeholder="예: 아메리카노"
                value={menuForm.name}
                onChange={(e) =>
                  setMenuForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-price">가격 (원) *</Label>
              <Input
                id="menu-price"
                type="number"
                placeholder="2000"
                value={menuForm.price || ""}
                onChange={(e) =>
                  setMenuForm((f) => ({
                    ...f,
                    price: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>카테고리</Label>
              <Select
                value={menuForm.category}
                onValueChange={(val) =>
                  setMenuForm((f) => ({ ...f, category: val ?? f.category }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {MENU_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="menu-ice"
                  checked={menuForm.isIce}
                  onCheckedChange={(checked) =>
                    setMenuForm((f) => ({ ...f, isIce: !!checked }))
                  }
                />
                <Label htmlFor="menu-ice">ICE</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="menu-hot"
                  checked={menuForm.isHot}
                  onCheckedChange={(checked) =>
                    setMenuForm((f) => ({ ...f, isHot: !!checked }))
                  }
                />
                <Label htmlFor="menu-hot">HOT</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMenuDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveMenu}>
              {editingMenuItem ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Crawl Dialog */}
      <Dialog open={menuCrawlDialogOpen} onOpenChange={setMenuCrawlDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {menuCrawlShop?.name} - 네이버 메뉴 가져오기
            </DialogTitle>
          </DialogHeader>

          {menuCrawlLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                네이버 플레이스에서 메뉴를 가져오는 중...
              </p>
            </div>
          ) : crawledMenuItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>메뉴를 자동으로 가져올 수 없습니다.</p>
              <p className="mt-1 text-sm">수동으로 메뉴를 추가해주세요.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b pb-2">
                <p className="text-sm text-muted-foreground">
                  {crawledMenuItems.length}개 메뉴 발견 /{" "}
                  {crawledMenuItems.filter((i) => i.selected).length}개 선택됨
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllCrawledItems(true)}
                  >
                    전체 선택
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllCrawledItems(false)}
                  >
                    전체 해제
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">선택</TableHead>
                      <TableHead>메뉴명</TableHead>
                      <TableHead className="text-right">가격</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crawledMenuItems.map((item, idx) => (
                      <TableRow
                        key={idx}
                        className={item.selected ? "" : "opacity-50"}
                      >
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleCrawledItem(idx)}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.price ? formatPrice(item.price) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMenuCrawlDialogOpen(false)}
            >
              {crawledMenuItems.length === 0 ? "닫기" : "취소"}
            </Button>
            {crawledMenuItems.length > 0 && (
              <Button onClick={handleSaveCrawledMenus} disabled={menuCrawlSaving}>
                {menuCrawlSaving && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                선택한 메뉴 저장 (
                {crawledMenuItems.filter((i) => i.selected).length}개)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk Text Input Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {bulkShop?.name} - 메뉴 일괄 입력
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <Label>메뉴 텍스트 붙여넣기</Label>
              <p className="text-xs text-muted-foreground mb-2">
                배달앱·메뉴판에서 복사한 텍스트를 붙여넣으세요.{" "}
                <strong>메뉴명 3,500원</strong> 한 줄 형식, 또는{" "}
                <strong>메뉴명 다음 줄에 가격</strong> 형식을 권장합니다. 메뉴
                아래에 붙는 설명 문장은 자동으로 건너뜁니다.
              </p>
              <textarea
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={"아메리카노\n3,500원\n카페라떼\n4,000원\n\n또는\n\n아메리카노 3500원\n카페라떼 4000원"}
                value={bulkText}
                onChange={(e) => parseBulkText(e.target.value)}
              />
            </div>

            {bulkParsed.length > 0 && (
              <div className="flex-1 overflow-y-auto max-h-[35vh] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">선택</TableHead>
                      <TableHead>메뉴명</TableHead>
                      <TableHead className="text-right">가격</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkParsed.map((item, idx) => (
                      <TableRow key={idx} className={item.selected ? "" : "opacity-50"}>
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() =>
                              setBulkParsed((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, selected: !p.selected } : p
                                )
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">
                          {item.price ? formatPrice(item.price) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-muted-foreground">
                {bulkParsed.length > 0
                  ? `${bulkParsed.filter((i) => i.selected).length}개 메뉴 인식됨`
                  : "텍스트를 붙여넣으면 자동으로 파싱됩니다"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                  취소
                </Button>
                {bulkParsed.length > 0 && (
                  <Button onClick={handleSaveBulkMenus} disabled={bulkSaving}>
                    {bulkSaving && <Loader2 className="size-4 animate-spin" />}
                    저장 ({bulkParsed.filter((i) => i.selected).length}개)
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
