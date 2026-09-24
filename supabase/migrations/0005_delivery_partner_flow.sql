-- ============================================================
-- Migration 0005: Delivery Partner handover + checkout upgrades
-- ============================================================
-- New order flow (per business requirement):
--   pending → processing → confirmed → out_for_delivery → delivered
--   (cancelled / returned branch off as before)
--
-- - "processing"        = admin/staff is reviewing the order
-- - "confirmed"         = staff accepted the order (ready to ship)
-- - "out_for_delivery"  = a moderator/admin handed the order to a named
--                         Delivery Partner (NOT a login role — just a
--                         directory of couriers the staff assign orders to)
--
-- NOTE on enums: Postgres enum values cannot be removed or reordered once
-- added, only appended. 'shipped' stays defined for backward compatibility
-- with any historical rows, but no new order will be moved into it — the
-- app-level transition rules below simply stop offering it.

-- ---------- 1. New enum value ----------
alter type order_status add value if not exists 'out_for_delivery';

-- ============================================================
-- 2. DELIVERY PARTNERS (a managed directory, not an auth role)
-- ============================================================
create table if not exists delivery_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger trg_delivery_partners_updated before update on delivery_partners
  for each row execute function set_updated_at();

alter table delivery_partners enable row level security;

-- Any staff (moderator and up) can see the partner directory to assign orders.
create policy "delivery_partners_select_staff" on delivery_partners for select
  using (get_user_role() in ('moderator', 'admin', 'super_admin'));

-- Only admin/super_admin manage the directory itself (add/edit/deactivate couriers).
create policy "delivery_partners_insert_admin" on delivery_partners for insert
  with check (get_user_role() in ('admin', 'super_admin'));

create policy "delivery_partners_update_admin" on delivery_partners for update
  using (get_user_role() in ('admin', 'super_admin'));

-- ============================================================
-- 3. ORDERS: referral code + delivery partner handover columns
-- ============================================================
alter table orders add column if not exists referral_code text;
alter table orders add column if not exists delivery_partner_id uuid references delivery_partners(id);
alter table orders add column if not exists out_for_delivery_at timestamptz;

create index if not exists idx_orders_delivery_partner on orders(delivery_partner_id);

-- ============================================================
-- 4. place_order: add referral code + sane initial payment_status
-- ============================================================
create or replace function place_order(
  p_user_id uuid,
  p_items jsonb,
  p_shipping_address text,
  p_payment_method text default null,
  p_referral_code text default null
)
returns uuid as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_product products%rowtype;
  v_total numeric(10,2) := 0;
  v_payment_status text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Cannot place an order on behalf of another user';
  end if;

  -- bKash orders wait on gateway/manual confirmation; COD is simply unpaid
  -- until the delivery partner collects cash on handover.
  v_payment_status := case when p_payment_method = 'bkash' then 'pending_verification' else 'unpaid' end;

  v_order_number := 'HM-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into orders (
    order_number, user_id, shipping_address, payment_method, payment_status,
    referral_code, total_amount, status
  )
  values (
    v_order_number, p_user_id, p_shipping_address, p_payment_method, v_payment_status,
    nullif(trim(p_referral_code), ''), 0, 'pending'
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid
      for update;

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

  delete from cart_items where user_id = p_user_id;

  return v_order_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 5. update_order_status: new transition table, blocks the
--    'out_for_delivery' status here (must go through
--    assign_delivery_partner below, so an order can never reach
--    that state without a partner attached to it)
-- ============================================================
create or replace function update_order_status(
  p_order_id uuid,
  p_new_status order_status,
  p_changed_by uuid,
  p_note text default null
)
returns void as $$
declare
  v_caller_role user_role;
  v_current_status order_status;
  v_valid boolean := false;
begin
  select role into v_caller_role from profiles where id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('moderator', 'admin', 'super_admin') then
    raise exception 'Only moderator, admin, or super_admin can update order status';
  end if;

  if auth.uid() <> p_changed_by then
    raise exception 'p_changed_by must match the authenticated caller';
  end if;

  if p_new_status = 'out_for_delivery' then
    raise exception 'Use assign_delivery_partner() to move an order to out_for_delivery';
  end if;

  select status into v_current_status from orders where id = p_order_id for update;
  if v_current_status is null then
    raise exception 'Order % not found', p_order_id;
  end if;

  v_valid := case v_current_status
    when 'pending'          then p_new_status in ('processing', 'cancelled')
    when 'processing'       then p_new_status in ('confirmed', 'cancelled')
    when 'confirmed'        then p_new_status in ('cancelled')
    when 'out_for_delivery' then p_new_status in ('delivered', 'returned')
    when 'delivered'        then p_new_status in ('returned')
    else false
  end;

  if not v_valid then
    raise exception 'Cannot move order from % to %', v_current_status, p_new_status;
  end if;

  update orders set status = p_new_status, handled_by = p_changed_by where id = p_order_id;
  insert into order_status_history (order_id, status, changed_by, note)
  values (p_order_id, p_new_status, p_changed_by, p_note);
end;
$$ language plpgsql security definer;

-- ============================================================
-- 6. assign_delivery_partner: the only way an order can move to
--    'out_for_delivery' — requires an admin-confirmed order and an
--    active partner, and stamps out_for_delivery_at.
-- ============================================================
create or replace function assign_delivery_partner(
  p_order_id uuid,
  p_delivery_partner_id uuid,
  p_changed_by uuid,
  p_note text default null
)
returns void as $$
declare
  v_caller_role user_role;
  v_current_status order_status;
  v_partner delivery_partners%rowtype;
begin
  select role into v_caller_role from profiles where id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('moderator', 'admin', 'super_admin') then
    raise exception 'Only moderator, admin, or super_admin can hand orders to a delivery partner';
  end if;

  if auth.uid() <> p_changed_by then
    raise exception 'p_changed_by must match the authenticated caller';
  end if;

  select status into v_current_status from orders where id = p_order_id for update;
  if v_current_status is null then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_current_status <> 'confirmed' then
    raise exception 'Order must be confirmed before handover to a delivery partner (currently %)', v_current_status;
  end if;

  select * into v_partner from delivery_partners where id = p_delivery_partner_id;
  if v_partner.id is null or not v_partner.is_active then
    raise exception 'Delivery partner not found or inactive';
  end if;

  update orders
    set status = 'out_for_delivery',
        delivery_partner_id = v_partner.id,
        out_for_delivery_at = now(),
        handled_by = p_changed_by
    where id = p_order_id;

  insert into order_status_history (order_id, status, changed_by, note)
  values (
    p_order_id, 'out_for_delivery', p_changed_by,
    coalesce(p_note, '') || ' [Handed over to ' || v_partner.name || ' — ' || v_partner.phone || ']'
  );
end;
$$ language plpgsql security definer;
