-- ============================================================
-- Migration 0013: Category management UI support
-- ============================================================
-- Existing RLS already permits admin/super_admin to INSERT/UPDATE/DELETE
-- categories. This migration only adds an explicit active/inactive flag so
-- admins can hide a category from the customer-facing category selector
-- without deleting it or breaking products already assigned to it.

alter table public.categories
  add column if not exists is_active boolean not null default true;

create index if not exists idx_categories_active
  on public.categories (is_active, name);

comment on column public.categories.is_active is
  'Whether the category appears in customer-facing category selectors.';
