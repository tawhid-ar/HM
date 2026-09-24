-- ============================================================
-- Migration 0006: QA fixes
-- ============================================================
-- Found during a full security/correctness review. The main issue:
-- `profiles.is_active` was written by every "deactivate account" button
-- in the app (Super Admin + Admin panels, and the manage-user Edge
-- Function) but never actually READ anywhere — not in RLS, not in the
-- SECURITY DEFINER functions, not in the client. A deactivated account
-- could keep logging in and doing everything it could before. This
-- migration makes the flag actually take effect, and fixes a couple of
-- smaller edge cases found alongside it.

-- ============================================================
-- 1. get_user_role(): the single choke point almost every RLS policy in
--    this schema calls. Making it return NULL for a deactivated profile
--    instantly cuts off every 'moderator'/'admin'/'super_admin' privilege
--    check throughout the whole schema (products, categories, orders,
--    delivery_partners, audit_logs, etc.) without having to touch each
--    policy individually.
-- ============================================================
create or replace function get_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid() and is_active = true;
$$ language sql security definer stable;

-- ============================================================
-- 2. Plain 'user' writes (cart / orders / requests) don't go through
--    get_user_role() at all — they're gated by `auth.uid() = user_id`
--    directly, which is unaffected by an is_active flag. Add an explicit
--    active check so a deactivated shopper can't keep adding to cart or
--    placing orders either.
-- ============================================================
create or replace function is_current_user_active()
returns boolean as $$
  select coalesce((select is_active from profiles where id = auth.uid()), false);
$$ language sql security definer stable;

drop policy if exists "cart_insert_own" on cart_items;
create policy "cart_insert_own" on cart_items for insert
  with check (auth.uid() = user_id and is_current_user_active());

drop policy if exists "cart_update_own" on cart_items;
create policy "cart_update_own" on cart_items for update
  using (auth.uid() = user_id and is_current_user_active());

drop policy if exists "product_requests_insert_own" on product_requests;
create policy "product_requests_insert_own" on product_requests for insert
  with check (auth.uid() = user_id and is_current_user_active());

drop policy if exists "orders_insert_own" on orders;
create policy "orders_insert_own" on orders for insert
  with check (auth.uid() = user_id and is_current_user_active());
-- (place_order() is the real, intended path for creating an order and is
-- SECURITY DEFINER, so it bypasses this policy entirely and has its own
-- is_active check in section 3 below — this just backstops a raw
-- `.from('orders').insert(...)` call bypassing the RPC.)

-- ============================================================
-- 3. The SECURITY DEFINER order functions read auth.uid()'s role via a
--    direct `select ... from profiles`, NOT via get_user_role() — so
--    fix #1 above does not cover them. Each needs its own is_active check.
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
  v_is_active boolean;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Cannot place an order on behalf of another user';
  end if;

  select is_active into v_is_active from profiles where id = p_user_id;
  if v_is_active is not true then
    raise exception 'This account has been deactivated and cannot place orders';
  end if;

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

create or replace function update_order_status(
  p_order_id uuid,
  p_new_status order_status,
  p_changed_by uuid,
  p_note text default null
)
returns void as $$
declare
  v_caller_role user_role;
  v_caller_active boolean;
  v_current_status order_status;
  v_valid boolean := false;
begin
  select role, is_active into v_caller_role, v_caller_active from profiles where id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('moderator', 'admin', 'super_admin') then
    raise exception 'Only moderator, admin, or super_admin can update order status';
  end if;
  if v_caller_active is not true then
    raise exception 'This staff account has been deactivated';
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

create or replace function assign_delivery_partner(
  p_order_id uuid,
  p_delivery_partner_id uuid,
  p_changed_by uuid,
  p_note text default null
)
returns void as $$
declare
  v_caller_role user_role;
  v_caller_active boolean;
  v_current_status order_status;
  v_partner delivery_partners%rowtype;
begin
  select role, is_active into v_caller_role, v_caller_active from profiles where id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('moderator', 'admin', 'super_admin') then
    raise exception 'Only moderator, admin, or super_admin can hand orders to a delivery partner';
  end if;
  if v_caller_active is not true then
    raise exception 'This staff account has been deactivated';
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

-- ============================================================
-- 4. prevent_self_role_change trigger: fail-closed on NULL.
--    get_user_role() now returns NULL for a deactivated caller, and in
--    plpgsql `if <NULL> then` is treated as FALSE — silently skipping the
--    exception instead of raising it. This trigger's whole documented
--    purpose is to be a safety net independent of RLS, so it needs to
--    raise on NULL too, not just on an explicit non-match.
-- ============================================================
create or replace function prevent_self_role_change()
returns trigger as $$
begin
  if new.role <> old.role and coalesce(get_user_role()::text, '') <> 'super_admin' then
    raise exception 'Only super_admin can change roles';
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 5. A super_admin's direct-client is_active toggle (profiles_update_super_admin
--    has no with_check) had no self-deactivation guard — only a disabled
--    button in the UI, nothing stopping a raw API call. The manage-user
--    Edge Function path already blocks this for admin-initiated toggles;
--    this closes the same hole for super_admin's direct RLS-permitted path.
--    Also guards against deactivating the very last active super_admin,
--    which would otherwise lock everyone out of the Super Admin panel
--    with no remaining way back in.
-- ============================================================
create or replace function prevent_unsafe_deactivation()
returns trigger as $$
declare
  v_remaining_super_admins int;
begin
  if new.is_active = old.is_active then
    return new;
  end if;

  if new.is_active = false and new.id = auth.uid() then
    raise exception 'You cannot deactivate your own account';
  end if;

  if new.is_active = false and old.role = 'super_admin' then
    select count(*) into v_remaining_super_admins
      from profiles where role = 'super_admin' and is_active = true and id <> new.id;
    if v_remaining_super_admins = 0 then
      raise exception 'Cannot deactivate the last active super_admin';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_unsafe_deactivation on profiles;
create trigger trg_prevent_unsafe_deactivation
  before update on profiles
  for each row execute function prevent_unsafe_deactivation();

-- ============================================================
-- 6. Hardening: Postgres grants EXECUTE on new functions to PUBLIC by
--    default, which includes the anon (unauthenticated) role. The
--    internal auth.uid() checks in these functions already make that
--    safe (anon has no auth.uid(), so every call fails closed), but
--    there's no reason to leave the grant wider than it needs to be.
-- ============================================================
revoke execute on function place_order(uuid, jsonb, text, text, text) from public;
revoke execute on function update_order_status(uuid, order_status, uuid, text) from public;
revoke execute on function assign_delivery_partner(uuid, uuid, uuid, text) from public;
grant execute on function place_order(uuid, jsonb, text, text, text) to authenticated;
grant execute on function update_order_status(uuid, order_status, uuid, text) to authenticated;
grant execute on function assign_delivery_partner(uuid, uuid, uuid, text) to authenticated;
