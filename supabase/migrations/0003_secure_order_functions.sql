-- ============================================================
-- Security hardening for SECURITY DEFINER functions
-- ============================================================
-- IMPORTANT CONTEXT: `place_order` and `update_order_status` are
-- `security definer`, which means they run with the *function owner's*
-- privileges and BYPASS row-level security entirely — RLS policies on
-- `orders` do NOT protect these functions. As originally written, any
-- authenticated user could call `update_order_status` directly via
-- `supabase.rpc(...)` and mark ANY order as 'delivered', or call
-- `place_order` with someone else's `p_user_id` to place orders on their
-- behalf. This migration adds the missing checks inside the functions
-- themselves, which is the only place they can be enforced once RLS is
-- bypassed.

-- ---------- place_order: caller must be placing their OWN order ----------
create or replace function place_order(
  p_user_id uuid,
  p_items jsonb,
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
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Cannot place an order on behalf of another user';
  end if;

  v_order_number := 'HM-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into orders (order_number, user_id, shipping_address, payment_method, total_amount, status)
  values (v_order_number, p_user_id, p_shipping_address, p_payment_method, 0, 'pending')
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

-- ---------- update_order_status: caller must be moderator/admin/super_admin ----------
-- also validates the status transition server-side so a moderator can't
-- e.g. jump a 'pending' order straight to 'delivered' by editing the request.
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

  select status into v_current_status from orders where id = p_order_id for update;
  if v_current_status is null then
    raise exception 'Order % not found', p_order_id;
  end if;

  v_valid := case v_current_status
    when 'pending'     then p_new_status in ('confirmed', 'cancelled')
    when 'confirmed'   then p_new_status in ('processing', 'cancelled')
    when 'processing'  then p_new_status in ('shipped', 'cancelled')
    when 'shipped'     then p_new_status in ('delivered', 'returned')
    when 'delivered'   then p_new_status in ('returned')
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
