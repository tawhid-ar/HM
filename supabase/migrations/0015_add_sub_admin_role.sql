-- Adds the staff role requested for stock/order operational access.
-- Kept in its own migration because PostgreSQL enum values must be committed
-- before a later migration can safely reference the new value.
alter type public.user_role add value if not exists 'sub_admin' after 'moderator';
