// Hand-written types matching the Supabase migrations in this project.
// Tip: once the hosted schema is stable, generate this automatically with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts

export type UserRole = 'user' | 'sub_admin' | 'moderator' | 'admin' | 'super_admin';
export type AddressType = 'home' | 'office';
export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  /** @deprecated historical rows only */
  | 'shipped';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserAddress = {
  id: string;
  user_id: string;
  address_type: AddressType;
  address: string;
  division_id: string | null;
  division_name: string | null;
  district_id: string | null;
  district_name: string | null;
  upazila_id: string | null;
  upazila_name: string | null;
  area_id: string | null;
  area_name: string | null;
  address_line: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductColor = {
  name: string;
  hex: string;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  category_id: string | null;
  images: string[];
  colors: ProductColor[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  in_stock: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  category_id: string | null;
  images: string[];
  colors: ProductColor[];
  stock_quantity: number;
  sku: string | null;
  supplier_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address: string;
  payment_method: string | null;
  payment_status: string;
  payment_transaction_id: string | null;
  referral_code: string | null;
  delivery_partner_id: string | null;
  out_for_delivery_at: string | null;
  handled_by: string | null;
  returned_at: string | null;
  return_processed_by: string | null;
  return_note: string | null;
  stock_restored_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeliveryPartner = {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type Supplier = {
  id: string;
  institution_name: string;
  address: string;
  phone: string;
  contact_person_name: string;
  contact_person_role: string;
  category_id: string;
  subcategory_id: string;
  note: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SupplierStockEntry = {
  id: string;
  supplier_id: string;
  product_id: string;
  quantity_added: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type StoreSettings = {
  id: number;
  ticker_enabled: boolean;
  ticker_text_en: string;
  ticker_text_bn: string;
  updated_by: string | null;
  updated_at: string;
};

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
};

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

export type ProductRequest = {
  id: string;
  user_id: string;
  product_name: string;
  description: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
  created_at: string;
};

export type ModeratorRequest = {
  id: string;
  requested_by: string;
  candidate_email: string;
  candidate_name: string | null;
  reason: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

type TableDef<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type ViewDef<Row> = { Row: Row; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      user_addresses: TableDef<UserAddress>;
      products: TableDef<Product>;
      categories: TableDef<Category>;
      suppliers: TableDef<Supplier>;
      supplier_stock_entries: TableDef<SupplierStockEntry>;
      store_settings: TableDef<StoreSettings>;
      cart_items: TableDef<CartItem>;
      orders: TableDef<Order>;
      order_items: TableDef<OrderItem>;
      order_status_history: TableDef<OrderStatusHistory>;
      product_requests: TableDef<ProductRequest>;
      moderator_requests: TableDef<ModeratorRequest>;
      audit_logs: TableDef<AuditLog>;
      delivery_partners: TableDef<DeliveryPartner>;
    };
    Views: {
      storefront_products: ViewDef<StorefrontProduct>;
    };
    Functions: {
      get_user_role: { Args: Record<string, never>; Returns: UserRole };
      place_order: {
        Args: {
          p_user_id: string;
          p_items: { product_id: string; quantity: number }[];
          p_shipping_address: string;
          p_payment_method?: string | null;
          p_referral_code?: string | null;
          p_transaction_id?: string | null;
        };
        Returns: string;
      };
      update_order_status: {
        Args: {
          p_order_id: string;
          p_new_status: OrderStatus;
          p_changed_by: string;
          p_note?: string | null;
        };
        Returns: void;
      };
      assign_delivery_partner: {
        Args: {
          p_order_id: string;
          p_delivery_partner_id: string;
          p_changed_by: string;
          p_note?: string | null;
        };
        Returns: void;
      };
      save_product_with_supplier: {
        Args: { p_product_id: string | null; p_payload: Record<string, unknown> };
        Returns: Product;
      };
      adjust_product_stock: {
        Args: { p_product_id: string; p_new_quantity: number; p_supplier_id?: string | null };
        Returns: Product;
      };
      sales_report: {
        Args: { p_from: string; p_to: string };
        Returns: Array<{
          product_id: string;
          product_name: string;
          gross_sold_quantity: number;
          returned_quantity: number;
          net_sold_quantity: number;
          gross_sales: number;
          returned_value: number;
          net_sales: number;
        }>;
      };
      staff_products_page: {
        Args: { p_offset?: number; p_limit?: number; p_search?: string | null; p_category_id?: string | null; p_low_stock_max?: number | null };
        Returns: { products: Product[]; total: number };
      };
      get_my_cart: {
        Args: Record<string, never>;
        Returns: Array<{
          id: string; user_id: string; product_id: string; quantity: number; created_at: string;
          product_name: string; product_slug: string; product_price: number; product_discount_price: number | null;
          product_images: string[]; product_is_active: boolean; product_in_stock: boolean; quantity_available: boolean;
        }>;
      };
      add_to_cart_secure: { Args: { p_product_id: string; p_quantity: number }; Returns: number };
      set_cart_quantity_secure: { Args: { p_cart_item_id: string; p_quantity: number }; Returns: number };
      get_my_order_tracking: { Args: { p_order_id: string }; Returns: { items: OrderItem[]; history: Array<{ id: string; status: OrderStatus; note: string | null; created_at: string }> } };
    };
  };
};
