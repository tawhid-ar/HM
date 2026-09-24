-- ============================================================
-- Product image hard limits
-- - Maximum 3 image URLs per product
-- - Maximum 50KB per stored image object
-- - 3 x 50KB = maximum 150KB of product-image objects per product
-- ============================================================

update storage.buckets
set file_size_limit = 51200,
    allowed_mime_types = array['image/jpeg', 'image/png']::text[]
where id = 'product-images';

-- Bring any legacy rows from the previous 4-image rule down to the new limit.
-- The file objects remain in Storage if they are no longer referenced; this
-- migration only normalizes the product record safely.
update public.products
set images = images[1:3]
where coalesce(cardinality(images), 0) > 3;

alter table public.products
  drop constraint if exists products_images_max_4;

alter table public.products
  drop constraint if exists products_images_max_3;

alter table public.products
  add constraint products_images_max_3
  check (coalesce(cardinality(images), 0) <= 3);

notify pgrst, 'reload schema';
