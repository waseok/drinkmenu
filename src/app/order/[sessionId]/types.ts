// Types for order page
export interface Staff {
  id: string;
  name: string;
  department: string;
  position: string;
}

export interface Orderer extends Staff {
  isManual?: boolean;
}

export interface MenuItem {
  id: string;
  shopId: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  isIce: boolean;
  isHot: boolean;
}

export interface Shop {
  id: string;
  name: string;
  phone: string;
  menuImageUrls: string[];
  menuItems: MenuItem[];
}

export interface SessionShop {
  id: string;
  shopId: string;
  shop: Shop;
}

export interface SessionTargetRow {
  staffId: string;
  staff: Staff;
}

export interface PickerGroup {
  id: string;
  name: string;
  staffIds: string[];
}

export interface OrderItem {
  id: string;
  sessionId: string;
  staffId: string;
  menuItemId: string | null;
  customItemName?: string | null;
  customShopName?: string | null;
  quantity: number;
  options: string;
  price: number;
  staff: Staff;
  menuItem: (MenuItem & { shop: { id: string; name: string } }) | null;
}

export interface Session {
  id: string;
  title: string;
  date: string;
  deadlineTime?: string | null;
  status: "OPEN" | "CLOSED";
  sessionShops: SessionShop[];
  orders?: OrderItem[];
  sessionTargets?: SessionTargetRow[];
  pickerGroups?: PickerGroup[];
}

export interface StaffHistoryOrder {
  id: string;
  customItemName?: string | null;
  quantity: number;
  options: string;
  createdAt: string;
  session: {
    id: string;
    title: string;
    date: string;
  };
  menuItem: {
    id: string;
    name: string;
    shop: { id: string; name: string };
  } | null;
}

export interface CustomLineOrder {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options: string;
}

export interface CartItem {
  cartId: string;
  menuItem: MenuItem;
  shopName: string;
  quantity: number;
  customNote: string;
  gongcha?: {
    sweetness: "0%" | "30%" | "50%" | "70%" | "100%";
    ice: "따뜻한 음료" | "얼음 적게" | "얼음 보통" | "얼음 많게";
    topping1: string;
    topping2: string;
  };
}
