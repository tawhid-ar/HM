-- ============================================================
-- Hadiya Mart — Initial Schema Migration
-- Run this in Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------- ENUM TYPES ----------
create type user_role as enum ('user', 'moderator', 'admin', 'super_admin');
create type order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
create type request_status as enum ('pending', 'approved', 'rejected');

-- ============================================================
-- TABLES
-- ============================================================

-- ---------- PROFILES ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  address text,
  avatar_url text,
  role user_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- CATEGORIES ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  parent_id uuid references categories(id),
  created_at timestamptz default now()
);

-- ---------- PRODUCTS ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(10,2) not null check (price >= 0),
  discount_price numeric(10,2),
  category_id uuid references categories(id),
  images text[] default '{}',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  sku text unique,
  is_active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_products_category on products(category_id);
create index idx_products_active on products(is_active) where is_active = true;
create index idx_products_name_search on products using gin(to_tsvector('english', name));

-- ---------- CART ----------
create table cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- ---------- ORDERS ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references profiles(id),
  status order_status not null default 'pending',
  total_amount numeric(10,2) not null,
  shipping_address text not null,
  payment_method text,
  payment_status text default 'unpaid',
  handled_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_orders_user on orders(user_id);
create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  price numeric(10,2) not null,
  quantity integer not null
);

create index idx_order_items_order on order_items(order_id);

-- ---------- ORDER STATUS HISTORY ----------
create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  status order_status not null,
  note text,
  changed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ---------- PRODUCT REQUESTS ----------
create table product_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  product_name text not null,
  description text,
  status request_status default 'pending',
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ---------- MODERATOR REQUESTS ----------
create table moderator_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references profiles(id),
  candidate_email text not null,
  candidate_name text,
  reason text,
  status request_status default 'pending',
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ---------- AUDIT LOGS ----------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  meta jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns the role of the currently authenticated user
create or replace function get_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Auto-create profile row when a new auth user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New User'), 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-update updated_at columns
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table product_requests enable row level security;
alter table moderator_requests enable row level security;
alter table audit_logs enable row level security;

-- ---------- PROFILES ----------
create policy "profiles_select_own_or_staff" on profiles for select
  using (auth.uid() = id or get_user_role() in ('moderator','admin','super_admin'));

create policy "profiles_update_own" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));
  -- ⚠️ user can update their own row but NOT change their own role (role excluded from check via trigger below)

create policy "profiles_update_super_admin" on profiles for update
  using (get_user_role() = 'super_admin');

-- Extra safety net: prevent role escalation even if a policy is misconfigured later
create or replace function prevent_self_role_change()
returns trigger as $$
begin
  if new.role <> old.role and get_user_role() <> 'super_admin' then
    raise exception 'Only super_admin can change roles';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_prevent_role_escalation
  before update on profiles
  for each row execute function prevent_self_role_change();

-- ---------- CATEGORIES ----------
create policy "categories_select_all" on categories for select using (true);
create policy "categories_write_admin" on categories for insert
  with check (get_user_role() in ('admin','super_admin'));
create policy "categories_update_admin" on categories for update
  using (get_user_role() in ('admin','super_admin'));
create policy "categories_delete_admin" on categories for delete
  using (get_user_role() in ('admin','super_admin'));

-- ---------- PRODUCTS ----------
create policy "products_select_active_or_staff" on products for select
  using (is_active = true or get_user_role() in ('moderator','admin','super_admin'));

create policy "products_insert_admin" on products for insert
  with check (get_user_role() in ('admin','super_admin'));

create policy "products_update_admin" on products for update
  using (get_user_role() in ('admin','super_admin'));

create policy "products_delete_admin" on products for delete
  using (get_user_role() in ('admin','super_admin'));

-- ---------- CART ITEMS ----------
create policy "cart_select_own" on cart_items for select using (auth.uid() = user_id);
create policy "cart_insert_own" on cart_items for insert with check (auth.uid() = user_id);
create policy "cart_update_own" on cart_items for update using (auth.uid() = user_id);
create policy "cart_delete_own" on cart_items for delete using (auth.uid() = user_id);

-- ---------- ORDERS ----------
create policy "orders_select_own_or_staff" on orders for select
  using (auth.uid() = user_id or get_user_role() in ('moderator','admin','super_admin'));

create policy "orders_insert_own" on orders for insert
  with check (auth.uid() = user_id);

create policy "orders_update_staff_only" on orders for update
  using (get_user_role() in ('moderator','admin','super_admin'));

-- ---------- ORDER ITEMS ----------
create policy "order_items_select" on order_items for select
  using (
    exists (select 1 from orders o where o.id = order_id and
      (o.user_id = auth.uid() or get_user_role() in ('moderator','admin','super_admin')))
  );

create policy "order_items_insert_own" on order_items for insert
  with check (
    exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ---------- ORDER STATUS HISTORY ----------
create policy "order_history_select" on order_status_history for select
  using (
    exists (select 1 from orders o where o.id = order_id and
      (o.user_id = auth.uid() or get_user_role() in ('moderator','admin','super_admin')))
  );

create policy "order_history_insert_staff" on order_status_history for insert
  with check (get_user_role() in ('moderator','admin','super_admin'));

-- ---------- PRODUCT REQUESTS ----------
create policy "product_requests_select" on product_requests for select
  using (auth.uid() = user_id or get_user_role() in ('admin','super_admin'));

create policy "product_requests_insert_own" on product_requests for insert
  with check (auth.uid() = user_id);

create policy "product_requests_update_admin" on product_requests for update
  using (get_user_role() in ('admin','super_admin'));

-- ---------- MODERATOR REQUESTS ----------
create policy "moderator_requests_select" on moderator_requests for select
  using (auth.uid() = requested_by or get_user_role() in ('admin','super_admin'));

create policy "moderator_requests_insert_mod" on moderator_requests for insert
  with check (get_user_role() in ('moderator','admin','super_admin'));

create policy "moderator_requests_update_admin" on moderator_requests for update
  using (get_user_role() in ('admin','super_admin'));

-- ---------- AUDIT LOGS ----------
create policy "audit_logs_select_admin" on audit_logs for select
  using (get_user_role() in ('admin','super_admin'));

create policy "audit_logs_insert_system" on audit_logs for insert
  with check (auth.uid() is not null);

-- ============================================================
-- BUSINESS LOGIC FUNCTIONS (RPC — called from Edge Functions)
-- ============================================================

-- Atomic order placement: validates stock, deducts it, creates order + items
create or replace function place_order(
  p_user_id uuid,
  p_items jsonb,          -- [{ "product_id": "...", "quantity": 2 }, ...]
  p_shipping_address text,
  p_payment_method text default null
)
returns uuid as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_product products%rowtype;
  v_total numeric(10,2) := 0;
begin
  v_order_number := 'HM-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into orders (order_number, user_id, shipping_address, payment_method, total_amount, status)
  values (v_order_number, p_user_id, p_shipping_address, p_payment_method, 0, 'pending')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid
      for update; -- row lock prevents race condition on concurrent orders

    if v_product.id is null then
      raise exception 'Product % not found', v_item->>'product_id';
    end if;

    if v_product.stock_quantity < (v_item->>'quantity')::int then
      raise exception 'Insufficient stock for product %', v_product.name;
    end if;

    update products set stock_quantity = stock_quantity - (v_item->>'quantity')::int
      where id = v_product.id;

    insert into order_items (order_id, product_id, product_name, price, quantity)
    values (v_order_id, v_product.id, v_product.name,
            coalesce(v_product.discount_price, v_product.price), (v_item->>'quantity')::int);

    v_total := v_total + (coalesce(v_product.discount_price, v_product.price) * (v_item->>'quantity')::int);
  end loop;

  update orders set total_amount = v_total where id = v_order_id;

  insert into order_status_history (order_id, status, changed_by, note)
  values (v_order_id, 'pending', p_user_id, 'Order placed');

  -- clear the user's cart after successful order
  delete from cart_items where user_id = p_user_id;

  return v_order_id;
end;
$$ language plpgsql security definer;

-- Update order status + write history (called by moderator/admin via Edge Function)
create or replace function update_order_status(
  p_order_id uuid,
  p_new_status order_status,
  p_changed_by uuid,
  p_note text default null
)
returns void as $$
begin
  update orders set status = p_new_status, handled_by = p_changed_by where id = p_order_id;
  insert into order_status_history (order_id, status, changed_by, note)
  values (p_order_id, p_new_status, p_changed_by, p_note);
end;
$$ language plpgsql security definer;

-- ============================================================
-- SEED: promote the first user to super_admin manually after signup, e.g.:
-- update profiles set role = 'super_admin' where id = '<your-auth-user-id>';
-- ============================================================
