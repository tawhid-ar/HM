-- ============================================================
-- Migration 0016: Hadiya Mart commerce/admin enhancements
-- ============================================================

-- ---------- Signup profile metadata ----------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), 'New User'),
    nullif(btrim(new.raw_user_meta_data->>'phone'), ''),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- Product colours + suppliers ----------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  institution_name text not null,
  address text not null,
  phone text not null,
  contact_person_name text not null,
  contact_person_role text not null,
  category_id uuid not null references public.categories(id),
  subcategory_id uuid not null references public.categories(id),
  note text not null check (char_length(btrim(note)) >= 3),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_active on public.suppliers(is_active, institution_name);
create index if not exists idx_suppliers_category on public.suppliers(category_id, subcategory_id);

drop trigger if exists trg_suppliers_updated on public.suppliers;
create trigger trg_suppliers_updated before update on public.suppliers
for each row execute function public.set_updated_at();

alter table public.products add column if not exists colors jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists supplier_id uuid references public.suppliers(id);

alter table public.products drop constraint if exists products_colors_max_8;
alter table public.products add constraint products_colors_max_8
check (jsonb_typeof(colors) = 'array' and jsonb_array_length(colors) <= 8);

-- Replace previous 3 x 50KB rule with 8 x 40KB.
update storage.buckets
set file_size_limit = 40960,
    allowed_mime_types = array['image/jpeg', 'image/png']::text[]
where id = 'product-images';

alter table public.products drop constraint if exists products_images_max_3;
alter table public.products drop constraint if exists products_images_max_8;
alter table public.products add constraint products_images_max_8
check (coalesce(cardinality(images), 0) <= 8);

-- Supplier stock ledger. Rows are immutable history of stock received from a supplier.
create table if not exists public.supplier_stock_entries (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id),
  product_id uuid not null references public.products(id),
  quantity_added integer not null check (quantity_added > 0),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_supplier_stock_supplier on public.supplier_stock_entries(supplier_id, created_at desc);
create index if not exists idx_supplier_stock_product on public.supplier_stock_entries(product_id, created_at desc);

-- Central product save function: validates required supplier/category/subcategory,
-- applies product edits and records ONLY positive stock additions against supplier.
create or replace function public.save_product_with_supplier(
  p_product_id uuid,
  p_payload jsonb
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_active boolean;
  v_product public.products%rowtype;
  v_existing public.products%rowtype;
  v_category_id uuid;
  v_supplier_id uuid;
  v_stock integer;
  v_delta integer;
  v_parent uuid;
begin
  select role, is_active into v_role, v_active from public.profiles where id = auth.uid();
  if v_active is not true or v_role not in ('admin','super_admin') then
    raise exception 'Only active admin or super_admin can save products';
  end if;

  v_category_id := nullif(p_payload->>'category_id', '')::uuid;
  v_supplier_id := nullif(p_payload->>'supplier_id', '')::uuid;
  v_stock := greatest(0, coalesce((p_payload->>'stock_quantity')::integer, 0));

  if v_category_id is null then raise exception 'Sub-category is required'; end if;
  if v_supplier_id is null then raise exception 'Supplier is required'; end if;

  select parent_id into v_parent from public.categories where id = v_category_id and is_active = true;
  if not found or v_parent is null then
    raise exception 'A valid sub-category is required';
  end if;
  if not exists (select 1 from public.suppliers where id = v_supplier_id and is_active = true) then
    raise exception 'A valid active supplier is required';
  end if;

  if p_product_id is null then
    insert into public.products (
      name, slug, description, price, discount_price, category_id, images, colors,
      stock_quantity, sku, supplier_id, is_active, created_by
    ) values (
      btrim(coalesce(p_payload->>'name','')),
      btrim(coalesce(p_payload->>'slug','')),
      nullif(p_payload->>'description',''),
      (p_payload->>'price')::numeric,
      nullif(p_payload->>'discount_price','')::numeric,
      v_category_id,
      coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'images','[]'::jsonb))), '{}'::text[]),
      coalesce(p_payload->'colors','[]'::jsonb),
      v_stock,
      nullif(btrim(coalesce(p_payload->>'sku','')), ''),
      v_supplier_id,
      coalesce((p_payload->>'is_active')::boolean, true),
      auth.uid()
    ) returning * into v_product;

    if v_stock > 0 then
      insert into public.supplier_stock_entries(supplier_id, product_id, quantity_added, note, created_by)
      values (v_supplier_id, v_product.id, v_stock, 'Initial product stock', auth.uid());
    end if;
  else
    select * into v_existing from public.products where id = p_product_id for update;
    if not found then raise exception 'Product not found'; end if;
    v_delta := v_stock - v_existing.stock_quantity;

    update public.products set
      name = btrim(coalesce(p_payload->>'name', name)),
      slug = btrim(coalesce(p_payload->>'slug', slug)),
      description = nullif(p_payload->>'description',''),
      price = (p_payload->>'price')::numeric,
      discount_price = nullif(p_payload->>'discount_price','')::numeric,
      category_id = v_category_id,
      images = coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'images','[]'::jsonb))), '{}'::text[]),
      colors = coalesce(p_payload->'colors','[]'::jsonb),
      stock_quantity = v_stock,
      sku = nullif(btrim(coalesce(p_payload->>'sku','')), ''),
      supplier_id = v_supplier_id,
      is_active = coalesce((p_payload->>'is_active')::boolean, is_active)
    where id = p_product_id
    returning * into v_product;

    if v_delta > 0 then
      insert into public.supplier_stock_entries(supplier_id, product_id, quantity_added, note, created_by)
      values (v_supplier_id, v_product.id, v_delta, 'Stock added from product edit', auth.uid());
    end if;
  end if;

  return v_product;
end;
$$;

create or replace function public.adjust_product_stock(
  p_product_id uuid,
  p_new_quantity integer,
  p_supplier_id uuid default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_active boolean;
  v_product public.products%rowtype;
  v_delta integer;
begin
  select role, is_active into v_role, v_active from public.profiles where id = auth.uid();
  if v_active is not true or v_role not in ('admin','super_admin') then
    raise exception 'Only active admin or super_admin can adjust stock';
  end if;
  if p_new_quantity < 0 then raise exception 'Stock cannot be negative'; end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  v_delta := p_new_quantity - v_product.stock_quantity;

  if v_delta > 0 then
    if p_supplier_id is null or not exists (select 1 from public.suppliers where id = p_supplier_id and is_active = true) then
      raise exception 'Select an active supplier when adding stock';
    end if;
    update public.products set stock_quantity = p_new_quantity, supplier_id = p_supplier_id where id = p_product_id returning * into v_product;
    insert into public.supplier_stock_entries(supplier_id, product_id, quantity_added, note, created_by)
    values (p_supplier_id, p_product_id, v_delta, 'Quick stock addition', auth.uid());
  else
    update public.products set stock_quantity = p_new_quantity where id = p_product_id returning * into v_product;
  end if;

  return v_product;
end;
$$;

revoke execute on function public.save_product_with_supplier(uuid, jsonb) from public;
revoke execute on function public.adjust_product_stock(uuid, integer, uuid) from public;
grant execute on function public.save_product_with_supplier(uuid, jsonb) to authenticated;
grant execute on function public.adjust_product_stock(uuid, integer, uuid) to authenticated;

-- ---------- Store ticker ----------
create table if not exists public.store_settings (
  id smallint primary key default 1 check (id = 1),
  ticker_enabled boolean not null default false,
  ticker_text_en text not null default '',
  ticker_text_bn text not null default '',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
insert into public.store_settings(id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_store_settings_updated on public.store_settings;
create trigger trg_store_settings_updated before update on public.store_settings
for each row execute function public.set_updated_at();

-- ---------- Structured address area/union ----------
alter table public.user_addresses add column if not exists area_id text;
alter table public.user_addresses add column if not exists area_name text;

-- ---------- Product request description requirement ----------
create or replace function public.enforce_product_request_description()
returns trigger
language plpgsql
as $$
begin
  if nullif(btrim(coalesce(new.description, '')), '') is null or char_length(btrim(new.description)) < 3 then
    raise exception 'Product request description is required';
  end if;
  new.description := btrim(new.description);
  return new;
end;
$$;

drop trigger if exists trg_product_request_description on public.product_requests;
create trigger trg_product_request_description
before insert on public.product_requests
for each row execute function public.enforce_product_request_description();

-- ---------- Returns: restore stock exactly once and retain reporting fields ----------
alter table public.orders add column if not exists returned_at timestamptz;
alter table public.orders add column if not exists return_processed_by uuid references public.profiles(id);
alter table public.orders add column if not exists return_note text;
alter table public.orders add column if not exists stock_restored_at timestamptz;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_new_status public.order_status,
  p_changed_by uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role public.user_role;
  v_caller_active boolean;
  v_current_status public.order_status;
  v_valid boolean := false;
  v_stock_restored_at timestamptz;
begin
  select role, is_active into v_caller_role, v_caller_active from public.profiles where id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('sub_admin','moderator','admin','super_admin') then
    raise exception 'Only staff can update order status';
  end if;
  if v_caller_active is not true then raise exception 'This staff account has been deactivated'; end if;
  if auth.uid() <> p_changed_by then raise exception 'p_changed_by must match the authenticated caller'; end if;
  if p_new_status = 'out_for_delivery' then raise exception 'Use assign_delivery_partner() to move an order to out_for_delivery'; end if;

  select status, stock_restored_at into v_current_status, v_stock_restored_at
  from public.orders where id = p_order_id for update;
  if v_current_status is null then raise exception 'Order % not found', p_order_id; end if;

  v_valid := case v_current_status
    when 'pending'          then p_new_status in ('processing', 'confirmed', 'cancelled')
    when 'processing'       then p_new_status in ('confirmed', 'cancelled')
    when 'confirmed'        then p_new_status in ('cancelled')
    when 'out_for_delivery' then p_new_status in ('delivered', 'returned')
    when 'delivered'        then p_new_status in ('returned')
    when 'shipped'          then p_new_status in ('delivered', 'returned')
    else false
  end;
  if not v_valid then raise exception 'Cannot move order from % to %', v_current_status, p_new_status; end if;

  if p_new_status = 'returned' and v_stock_restored_at is null then
    update public.products p
      set stock_quantity = p.stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.product_id = p.id;
  end if;

  update public.orders set
    status = p_new_status,
    handled_by = p_changed_by,
    returned_at = case when p_new_status = 'returned' then now() else returned_at end,
    return_processed_by = case when p_new_status = 'returned' then p_changed_by else return_processed_by end,
    return_note = case when p_new_status = 'returned' then nullif(btrim(coalesce(p_note,'')), '') else return_note end,
    stock_restored_at = case when p_new_status = 'returned' and v_stock_restored_at is null then now() else stock_restored_at end
  where id = p_order_id;

  insert into public.order_status_history(order_id, status, changed_by, note)
  values (p_order_id, p_new_status, p_changed_by, p_note);
end;
$$;

-- Handover history deliberately does not expose partner identity to customer history.
create or replace function public.assign_delivery_partner(
  p_order_id uuid,
  p_delivery_partner_id uuid,
  p_changed_by uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role public.user_role;
  v_caller_active boolean;
  v_current_status public.order_status;
  v_partner public.delivery_partners%rowtype;
begin
  select role, is_active into v_caller_role, v_caller_active from public.profiles where id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('sub_admin','moderator','admin','super_admin') then
    raise exception 'Only staff can hand orders to a delivery partner';
  end if;
  if v_caller_active is not true then raise exception 'This staff account has been deactivated'; end if;
  if auth.uid() <> p_changed_by then raise exception 'p_changed_by must match the authenticated caller'; end if;

  select status into v_current_status from public.orders where id = p_order_id for update;
  if v_current_status is null then raise exception 'Order % not found', p_order_id; end if;
  if v_current_status <> 'confirmed' then raise exception 'Order must be confirmed before handover'; end if;

  select * into v_partner from public.delivery_partners where id = p_delivery_partner_id;
  if v_partner.id is null or not v_partner.is_active then raise exception 'Delivery partner not found or inactive'; end if;

  update public.orders set status = 'out_for_delivery', delivery_partner_id = v_partner.id,
    out_for_delivery_at = now(), handled_by = p_changed_by where id = p_order_id;
  insert into public.order_status_history(order_id, status, changed_by, note)
  values (p_order_id, 'out_for_delivery', p_changed_by, coalesce(nullif(btrim(coalesce(p_note,'')), ''), 'Handed over to delivery partner'));
end;
$$;

revoke execute on function public.update_order_status(uuid, public.order_status, uuid, text) from public;
revoke execute on function public.assign_delivery_partner(uuid, uuid, uuid, text) from public;
grant execute on function public.update_order_status(uuid, public.order_status, uuid, text) to authenticated;
grant execute on function public.assign_delivery_partner(uuid, uuid, uuid, text) to authenticated;

-- ---------- Sales report ----------
create or replace function public.sales_report(p_from date, p_to date)
returns table (
  product_id uuid,
  product_name text,
  gross_sold_quantity bigint,
  returned_quantity bigint,
  net_sold_quantity bigint,
  gross_sales numeric,
  returned_value numeric,
  net_sales numeric
)
language sql
security definer
set search_path = public
as $$
  select
    oi.product_id,
    max(oi.product_name) as product_name,
    sum(oi.quantity)::bigint as gross_sold_quantity,
    sum(case when o.status = 'returned' then oi.quantity else 0 end)::bigint as returned_quantity,
    sum(case when o.status = 'delivered' then oi.quantity else 0 end)::bigint as net_sold_quantity,
    sum(oi.price * oi.quantity)::numeric as gross_sales,
    sum(case when o.status = 'returned' then oi.price * oi.quantity else 0 end)::numeric as returned_value,
    sum(case when o.status = 'delivered' then oi.price * oi.quantity else 0 end)::numeric as net_sales
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.status in ('delivered','returned')
    and o.created_at >= p_from::timestamptz
    and o.created_at < (p_to + 1)::timestamptz
    and public.get_user_role() in ('admin','super_admin')
  group by oi.product_id
  order by max(oi.product_name);
$$;
revoke execute on function public.sales_report(date, date) from public;
grant execute on function public.sales_report(date, date) to authenticated;

-- ---------- RLS ----------
alter table public.suppliers enable row level security;
alter table public.supplier_stock_entries enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists "suppliers_select_staff" on public.suppliers;
create policy "suppliers_select_staff" on public.suppliers for select
using (public.get_user_role() in ('sub_admin','moderator','admin','super_admin'));
drop policy if exists "suppliers_write_admin" on public.suppliers;
create policy "suppliers_write_admin" on public.suppliers for all
using (public.get_user_role() in ('admin','super_admin'))
with check (public.get_user_role() in ('admin','super_admin'));

drop policy if exists "supplier_stock_select_staff" on public.supplier_stock_entries;
create policy "supplier_stock_select_staff" on public.supplier_stock_entries for select
using (public.get_user_role() in ('sub_admin','moderator','admin','super_admin'));

drop policy if exists "store_settings_select_all" on public.store_settings;
create policy "store_settings_select_all" on public.store_settings for select using (true);
drop policy if exists "store_settings_update_admin" on public.store_settings;
create policy "store_settings_update_admin" on public.store_settings for update
using (public.get_user_role() in ('admin','super_admin'))
with check (public.get_user_role() in ('admin','super_admin'));

grant select, insert, update on public.suppliers to authenticated;
grant select on public.supplier_stock_entries to authenticated;
grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;

-- Refresh staff policies so sub_admin has operational read/update access.
drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff" on public.profiles for select
using (auth.uid() = id or public.get_user_role() in ('sub_admin','moderator','admin','super_admin'));

drop policy if exists "products_select_active_or_staff" on public.products;
create policy "products_select_active_or_staff" on public.products for select
using (is_active = true or public.get_user_role() in ('sub_admin','moderator','admin','super_admin'));

drop policy if exists "orders_select_own_or_staff" on public.orders;
create policy "orders_select_own_or_staff" on public.orders for select
using (auth.uid() = user_id or public.get_user_role() in ('sub_admin','moderator','admin','super_admin'));

drop policy if exists "orders_update_staff_only" on public.orders;
create policy "orders_update_staff_only" on public.orders for update
using (public.get_user_role() in ('sub_admin','moderator','admin','super_admin'));

drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items for select
using (exists (
  select 1 from public.orders o where o.id = order_id and
  (o.user_id = auth.uid() or public.get_user_role() in ('sub_admin','moderator','admin','super_admin'))
));

drop policy if exists "order_history_select" on public.order_status_history;
create policy "order_history_select" on public.order_status_history for select
using (exists (
  select 1 from public.orders o where o.id = order_id and
  (o.user_id = auth.uid() or public.get_user_role() in ('sub_admin','moderator','admin','super_admin'))
));

drop policy if exists "order_history_insert_staff" on public.order_status_history;
create policy "order_history_insert_staff" on public.order_status_history for insert
with check (public.get_user_role() in ('sub_admin','moderator','admin','super_admin'));

drop policy if exists "delivery_partners_select_staff" on public.delivery_partners;
create policy "delivery_partners_select_staff" on public.delivery_partners for select
using (public.get_user_role() in ('sub_admin','moderator','admin','super_admin'));

notify pgrst, 'reload schema';
