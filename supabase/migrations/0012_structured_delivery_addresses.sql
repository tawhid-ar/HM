-- ============================================================
-- Migration 0012: Structured Bangladesh delivery addresses
-- ============================================================
-- Keeps the existing `address` column as the human-readable snapshot while
-- adding structured fields used by the Division -> District -> Upazila/Thana
-- selector. Existing saved addresses remain valid and editable.

alter table public.user_addresses
  add column if not exists division_id text,
  add column if not exists division_name text,
  add column if not exists district_id text,
  add column if not exists district_name text,
  add column if not exists upazila_id text,
  add column if not exists upazila_name text,
  add column if not exists address_line text;

-- Legacy rows only had a free-text address. Preserve that value as the
-- editable address line until the user chooses structured location fields.
update public.user_addresses
set address_line = address
where address_line is null or btrim(address_line) = '';

-- New/updated structured addresses should stay within sensible limits.
alter table public.user_addresses
  drop constraint if exists user_addresses_address_line_length_check;
alter table public.user_addresses
  add constraint user_addresses_address_line_length_check
  check (address_line is null or char_length(btrim(address_line)) between 3 and 500);

notify pgrst, 'reload schema';
