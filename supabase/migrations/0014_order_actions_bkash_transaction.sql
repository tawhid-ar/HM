-- ============================================================
-- Migration 0014: simpler moderator order actions + mandatory bKash TrxID
-- ============================================================

-- Store the customer-provided bKash transaction ID separately from the
-- optional referral code.
alter table public.orders
  add column if not exists payment_transaction_id text;

-- Enforce the bKash requirement for every NEW order, including any raw insert
-- that bypasses the normal place_order RPC. This is INSERT-only so historical
-- bKash orders created before this migration can still have their status
-- updated even if they do not have a transaction ID recorded.
create or replace function public.enforce_bkash_transaction_id_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.payment_method = 'bkash'
     and nullif(btrim(coalesce(new.payment_transaction_id, '')), '') is null then
    raise exception 'bKash transaction ID is required';
  end if;

  if new.payment_transaction_id is not null then
    new.payment_transaction_id := nullif(btrim(new.payment_transaction_id), '');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_require_bkash_transaction on public.orders;
create trigger trg_orders_require_bkash_transaction
before insert on public.orders
for each row
execute function public.enforce_bkash_transaction_id_on_insert();

-- Replace the old five-argument RPC with a six-argument version. The frontend
-- always sends p_transaction_id explicitly, including NULL for COD.
drop function if exists public.place_order(uuid, jsonb, text, text, text);
drop function if exists public.place_order(uuid, jsonb, text, text, text, text);

create function public.place_order(
  p_user_id uuid,
  p_items jsonb,
  p_shipping_address text,
  p_payment_method text default null,
  p_referral_code text default null,
  p_transaction_id text default null
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
  v_transaction_id text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Cannot place an order on behalf of another user';
  end if;

  select is_active into v_is_active from profiles where id = p_user_id;
  if v_is_active is not true then
    raise exception 'This account has been deactivated and cannot place orders';
  end if;

  v_transaction_id := nullif(btrim(coalesce(p_transaction_id, '')), '');

  if p_payment_method = 'bkash' and v_transaction_id is null then
    raise exception 'bKash transaction ID is required';
  end if;

  v_payment_status := case
    when p_payment_method = 'bkash' then 'pending_verification'
    else 'unpaid'
  end;

  v_order_number := 'HM-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into orders (
    order_number,
    user_id,
    shipping_address,
    payment_method,
    payment_status,
    payment_transaction_id,
    referral_code,
    total_amount,
    status
  )
  values (
    v_order_number,
    p_user_id,
    p_shipping_address,
    p_payment_method,
    v_payment_status,
    v_transaction_id,
    nullif(btrim(coalesce(p_referral_code, '')), ''),
    0,
    'pending'
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product
      from products
      where id = (v_item->>'product_id')::uuid
      for update;

    if v_product.id is null then
      raise exception 'Product % not found', v_item->>'product_id';
    end if;

    if v_product.stock_quantity < (v_item->>'quantity')::int then
      raise exception 'Insufficient stock for product %', v_product.name;
    end if;

    update products
      set stock_quantity = stock_quantity - (v_item->>'quantity')::int
      where id = v_product.id;

    insert into order_items (order_id, product_id, product_name, price, quantity)
    values (
      v_order_id,
      v_product.id,
      v_product.name,
      coalesce(v_product.discount_price, v_product.price),
      (v_item->>'quantity')::int
    );

    v_total := v_total + (
      coalesce(v_product.discount_price, v_product.price) * (v_item->>'quantity')::int
    );
  end loop;

  update orders set total_amount = v_total where id = v_order_id;

  insert into order_status_history (order_id, status, changed_by, note)
  values (v_order_id, 'pending', p_user_id, 'Order placed');

  delete from cart_items where user_id = p_user_id;

  return v_order_id;
end;
$$ language plpgsql security definer;

revoke execute on function public.place_order(uuid, jsonb, text, text, text, text) from public;
grant execute on function public.place_order(uuid, jsonb, text, text, text, text) to authenticated;

-- Keep the existing secure staff checks, but allow a moderator/admin to
-- confirm a newly placed order directly. "processing" is retained for old
-- orders/backward compatibility, but the simplified UI no longer requires the
-- extra pending -> processing click.
create or replace function public.update_order_status(
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
  select role, is_active
    into v_caller_role, v_caller_active
    from profiles
    where id = auth.uid();

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

  select status into v_current_status
    from orders
    where id = p_order_id
    for update;

  if v_current_status is null then
    raise exception 'Order % not found', p_order_id;
  end if;

  v_valid := case v_current_status
    when 'pending'          then p_new_status in ('processing', 'confirmed', 'cancelled')
    when 'processing'       then p_new_status in ('confirmed', 'cancelled')
    when 'confirmed'        then p_new_status in ('cancelled')
    when 'out_for_delivery' then p_new_status in ('delivered', 'returned')
    when 'delivered'        then p_new_status in ('returned')
    else false
  end;

  if not v_valid then
    raise exception 'Cannot move order from % to %', v_current_status, p_new_status;
  end if;

  update orders
    set status = p_new_status,
        handled_by = p_changed_by
    where id = p_order_id;

  insert into order_status_history (order_id, status, changed_by, note)
  values (p_order_id, p_new_status, p_changed_by, p_note);
end;
$$ language plpgsql security definer;

revoke execute on function public.update_order_status(uuid, order_status, uuid, text) from public;
grant execute on function public.update_order_status(uuid, order_status, uuid, text) to authenticated;

notify pgrst, 'reload schema';
