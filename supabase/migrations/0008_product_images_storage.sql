-- ============================================================
-- Product image storage
-- - Public read for storefront <img> tags
-- - Only admin/super_admin may write
-- - Server-side 500KB object limit and JPG/JPEG/PNG MIME allow-list
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  512000,
  array['image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_admin_insert" on storage.objects;
drop policy if exists "product_images_admin_update" on storage.objects;
drop policy if exists "product_images_admin_delete" on storage.objects;

create policy "product_images_public_read"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "product_images_admin_insert"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and public.get_user_role() in ('admin', 'super_admin')
);

create policy "product_images_admin_update"
on storage.objects for update
using (
  bucket_id = 'product-images'
  and public.get_user_role() in ('admin', 'super_admin')
)
with check (
  bucket_id = 'product-images'
  and public.get_user_role() in ('admin', 'super_admin')
);

create policy "product_images_admin_delete"
on storage.objects for delete
using (
  bucket_id = 'product-images'
  and public.get_user_role() in ('admin', 'super_admin')
);
