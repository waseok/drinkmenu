export const ADMIN_AUTH_COOKIE = "school_admin_access";
export const ORDER_AUTH_COOKIE = "school_order_access";
export const SCHOOL_AUTH_TOKEN = "verified";

export const ADMIN_PASSWORD =
  process.env.SCHOOL_ADMIN_PASSWORD ?? process.env.SCHOOL_PASSWORD ?? "";
export const ORDER_PASSWORD =
  process.env.SCHOOL_ORDER_PASSWORD ?? process.env.SCHOOL_PASSWORD ?? "1234";

export type AccessScope = "admin" | "order";
