-- ============================================================
-- Migration 0017: security + consistency hardening
-- Completes the commerce enhancements without exposing exact stock to shoppers.
-- ============================================================

-- ---------- Preserve email + phone when the auth signup trigger creates a profile ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), 'New User'),
    new.email,
    nullif(btrim(new.raw_user_meta_data->>'phone'), ''),
    'user'
  );
  return new;
end;
$$;

-- ---------- Supplier/category consistency for new writes ----------
create or replace function public.validate_supplier_category_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent uuid;
begin
  select c.parent_id into v_parent
  from public.categories c
  where c.id = new.subcategory_id and c.is_active = true;

  if not found or v_parent is null or v_parent <> new.category_id then
    raise exception 'Supplier sub-category must belong to the selected active category';
  end if;

  if not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.parent_id is null and c.is_active = true
  ) then
    raise exception 'Supplier category must be an active root category';
  end if;

  if tg_op = 'UPDATE'
     and (new.category_id is distinct from old.category_id or new.subcategory_id is distinct from old.subcategory_id)
     and exists (
       select 1 from public.products p
       where p.supplier_id = new.id and p.category_id is distinct from new.subcategory_id
     ) then
    raise exception 'Move linked products before changing this supplier category';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_supplier_category on public.suppliers;
create trigger trg_validate_supplier_category
before insert or update on public.suppliers
for each row execute function public.validate_supplier_category_assignment();

create or replace function public.validate_product_supplier_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_supplier_subcategory uuid;
  v_supplier_active boolean;
begin
  if new.category_id is null then
    raise exception 'Sub-category is required';
  end if;
  if new.supplier_id is null then
    raise exception 'Supplier is required';
  end if;

  select s.subcategory_id, s.is_active
    into v_supplier_subcategory, v_supplier_active
  from public.suppliers s
  where s.id = new.supplier_id;

  if v_supplier_subcategory is null or v_supplier_active is not true then
    raise exception 'A valid active supplier is required';
  end if;
  if v_supplier_subcategory <> new.category_id then
    raise exception 'The supplier must match the selected product sub-category';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_product_supplier on public.products;
create trigger trg_validate_product_supplier
before insert or update of category_id, supplier_id on public.products
for each row execute function public.validate_product_supplier_assignment();

-- ---------- Public product catalog without exact stock ----------
-- Shoppers need to know whether a product can be ordered, but the exact
-- stock_quantity is operational data and must only be exposed to staff.
drop view if exists public.storefront_products;
create view public.storefront_products
with (security_barrier = true)
as
select
  p.id,
  p.name,
  p.slug,
  p.description,
  p.price,
  p.discount_price,
  p.category_id,
  p.images,
  p.colors,
  p.is_active,
  p.created_at,
  p.updated_at,
  (p.stock_quantity > 0) as in_stock
from public.products p
where p.is_active = true;

revoke all on public.storefront_products from public;
grant select on public.storefront_products to anon, authenticated;

-- Remove table-level SELECT so stock_quantity cannot be selected from the Data API.
-- Re-grant only the non-sensitive product columns used by the app/relationships.
revoke select on public.products from anon, authenticated;
grant select (
  id,
  name,
  slug,
  description,
  price,
  discount_price,
  category_id,
  images,
  colors,
  is_active,
  created_at,
  updated_at
) on public.products to anon, authenticated;

-- Staff-only paginated product reader. Exact stock is returned only after
-- checking the signed-in profile role inside this SECURITY DEFINER function.
create or replace function public.staff_products_page(
  p_offset integer default 0,
  p_limit integer default 20,
  p_search text default null,
  p_category_id uuid default null,
  p_low_stock_max integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 1000);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_result jsonb;
begin
  v_role := public.get_user_role();
  if v_role is null or v_role not in ('sub_admin', 'moderator', 'admin', 'super_admin') then
    raise exception 'Staff access required';
  end if;

  select jsonb_build_object(
    'total', (
      select count(*)
      from public.products p
      where (v_search is null or p.name ilike '%' || v_search || '%')
        and (p_category_id is null or p.category_id = p_category_id)
        and (p_low_stock_max is null or p.stock_quantity <= p_low_stock_max)
    ),
    'products', coalesce((
      select jsonb_agg(to_jsonb(page_rows) order by page_rows.created_at desc)
      from (
        select p.*
        from public.products p
        where (v_search is null or p.name ilike '%' || v_search || '%')
          and (p_category_id is null or p.category_id = p_category_id)
          and (p_low_stock_max is null or p.stock_quantity <= p_low_stock_max)
        order by p.created_at desc
        offset v_offset
        limit v_limit
      ) page_rows
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.staff_products_page(integer, integer, text, uuid, integer) from public;
grant execute on function public.staff_products_page(integer, integer, text, uuid, integer) to authenticated;

-- ---------- Cart API that validates stock without exposing the quantity ----------
create or replace function public.get_my_cart()
returns table (
  id uuid,
  user_id uuid,
  product_id uuid,
  quantity integer,
  created_at timestamptz,
  product_name text,
  product_slug text,
  product_price numeric,
  product_discount_price numeric,
  product_images text[],
  product_is_active boolean,
  product_in_stock boolean,
  quantity_available boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    c.id,
    c.user_id,
    c.product_id,
    c.quantity,
    c.created_at,
    p.name,
    p.slug,
    p.price,
    p.discount_price,
    p.images,
    p.is_active,
    (p.stock_quantity > 0),
    (p.is_active and c.quantity <= p.stock_quantity)
  from public.cart_items c
  join public.products p on p.id = c.product_id
  where c.user_id = auth.uid()
  order by c.created_at desc;
end;
$$;

create or replace function public.add_to_cart_secure(
  p_product_id uuid,
  p_quantity integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_cart_id uuid;
  v_current integer := 0;
  v_target integer;
begin
  if auth.uid() is null or public.is_current_user_active() is not true then
    raise exception 'Active account required';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if v_product.id is null or v_product.is_active is not true then
    raise exception 'This product is no longer available';
  end if;

  select c.id, c.quantity into v_cart_id, v_current
  from public.cart_items c
  where c.user_id = auth.uid() and c.product_id = p_product_id
  for update;

  v_current := coalesce(v_current, 0);
  v_target := v_current + p_quantity;
  if v_target > v_product.stock_quantity then
    raise exception 'The requested quantity is not available';
  end if;

  if v_cart_id is null then
    insert into public.cart_items(user_id, product_id, quantity)
    values (auth.uid(), p_product_id, v_target);
  else
    update public.cart_items set quantity = v_target where id = v_cart_id;
  end if;

  return v_target;
end;
$$;

create or replace function public.set_cart_quantity_secure(
  p_cart_item_id uuid,
  p_quantity integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_product_id uuid;
begin
  if auth.uid() is null or public.is_current_user_active() is not true then
    raise exception 'Active account required';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select c.product_id into v_product_id
  from public.cart_items c
  where c.id = p_cart_item_id and c.user_id = auth.uid()
  for update;

  if v_product_id is null then
    raise exception 'Cart item not found';
  end if;

  select * into v_product
  from public.products
  where id = v_product_id
  for update;

  if v_product.id is null or v_product.is_active is not true then
    raise exception 'This product is no longer available';
  end if;
  if p_quantity > v_product.stock_quantity then
    raise exception 'The requested quantity is not available';
  end if;

  update public.cart_items
  set quantity = p_quantity
  where id = p_cart_item_id and user_id = auth.uid();

  return p_quantity;
end;
$$;

revoke execute on function public.get_my_cart() from public;
revoke execute on function public.add_to_cart_secure(uuid, integer) from public;
revoke execute on function public.set_cart_quantity_secure(uuid, integer) from public;
grant execute on function public.get_my_cart() to authenticated;
grant execute on function public.add_to_cart_secure(uuid, integer) to authenticated;
grant execute on function public.set_cart_quantity_secure(uuid, integer) to authenticated;

-- ---------- Accurate period sales/return report ----------
-- A sale belongs to the period when it reaches `delivered`; a return belongs
-- to the period when it is actually returned. This avoids moving an older sale
-- into a later month just because that order was returned later.
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
  with sold as (
    select
      oi.product_id,
      max(oi.product_name) as product_name,
      sum(oi.quantity)::bigint as quantity,
      sum(oi.price * oi.quantity)::numeric as value
    from public.order_status_history h
    join public.order_items oi on oi.order_id = h.order_id
    where h.status = 'delivered'
      and h.created_at >= p_from::timestamptz
      and h.created_at < (p_to + 1)::timestamptz
    group by oi.product_id
  ), returned as (
    select
      oi.product_id,
      max(oi.product_name) as product_name,
      sum(oi.quantity)::bigint as quantity,
      sum(oi.price * oi.quantity)::numeric as value
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.status = 'returned'
      and o.returned_at >= p_from::timestamptz
      and o.returned_at < (p_to + 1)::timestamptz
    group by oi.product_id
  )
  select
    coalesce(s.product_id, r.product_id) as product_id,
    coalesce(s.product_name, r.product_name) as product_name,
    coalesce(s.quantity, 0)::bigint as gross_sold_quantity,
    coalesce(r.quantity, 0)::bigint as returned_quantity,
    (coalesce(s.quantity, 0) - coalesce(r.quantity, 0))::bigint as net_sold_quantity,
    coalesce(s.value, 0)::numeric as gross_sales,
    coalesce(r.value, 0)::numeric as returned_value,
    (coalesce(s.value, 0) - coalesce(r.value, 0))::numeric as net_sales
  from sold s
  full join returned r on r.product_id = s.product_id
  where public.get_user_role() in ('admin', 'super_admin')
  order by coalesce(s.product_name, r.product_name);
$$;

revoke execute on function public.sales_report(date, date) from public;
grant execute on function public.sales_report(date, date) to authenticated;

-- ---------- Customer order history: never return delivery-partner notes ----------
-- Staff keep direct history access. Shoppers use the safe RPC below.
drop policy if exists "order_history_select" on public.order_status_history;
drop policy if exists "order_history_select_staff" on public.order_status_history;
create policy "order_history_select_staff" on public.order_status_history for select
using (public.get_user_role() in ('sub_admin', 'moderator', 'admin', 'super_admin'));

create or replace function public.get_my_order_tracking(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select o.user_id into v_owner from public.orders o where o.id = p_order_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Order not found';
  end if;

  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.id)
      from public.order_items i
      where i.order_id = p_order_id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', h.id,
          'status', h.status,
          'note', case when h.status = 'out_for_delivery' then null else h.note end,
          'created_at', h.created_at
        ) order by h.created_at
      )
      from public.order_status_history h
      where h.order_id = p_order_id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_my_order_tracking(uuid) from public;
grant execute on function public.get_my_order_tracking(uuid) to authenticated;

-- Existing historical handover notes may contain partner identity from the old
-- function. Remove that detail now; the user UI only needs the handover event.
update public.order_status_history
set note = 'Handed over to delivery partner'
where status = 'out_for_delivery'
  and note is distinct from 'Handed over to delivery partner';

notify pgrst, 'reload schema';
