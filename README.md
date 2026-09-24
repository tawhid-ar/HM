# Hadiya Mart

## Setup

1. **Supabase প্রজেক্ট তৈরি করুন** → supabase.com এ নতুন project বানান।
2. **Schema apply করুন** (migration গুলো ক্রমানুসারে, একটার পর একটা):
   - Supabase Dashboard → SQL Editor → `supabase/migrations/` ফোল্ডারের প্রতিটা ফাইল **ক্রম অনুযায়ী** (0001 → 0002 → 0003 → 0004 → 0005 → 0006) paste করে Run করুন।
   - অথবা CLI দিয়ে: `npx supabase@latest init`, তারপর `npx supabase@latest link --project-ref <ref>` এবং `npx supabase@latest db push`
3. **Env variables সেট করুন:**
   - `.env.example` কে `.env` তে copy করুন। Vite app হওয়ায় `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` ব্যবহার করুন।
4. **Dependencies install করুন:**
   ```bash
   npm install
   npm run dev
   ```
5. **প্রথম Super Admin বানানো:**
   - App দিয়ে normal signup করুন (role default `user` হবে)।
   - Supabase SQL Editor-এ:
     ```sql
     update profiles set role = 'super_admin' where id = '<your-auth-user-id>';
     ```
   - এরপর থেকে role change শুধু `manage-role` Edge Function দিয়ে হবে (super_admin login করে)।

6. **Edge Function deploy করুন:**
   ```bash
   npx supabase@latest functions deploy manage-role --project-ref <ref>
   npx supabase@latest functions deploy manage-user --project-ref <ref>
   # Hosted Edge Functions already expose SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS
   ```
7. **Avatar storage bucket:** `20260917000004_avatar_storage.sql` migration Supabase SQL Editor-এ রান করলেই `avatars` bucket + policy তৈরি হয়ে যাবে — আলাদা কিছু করার দরকার নেই।
8. **ডেলিভারি পার্টনার যোগ করুন:** `20260917000006_delivery_partner_flow.sql` রান করার পর, Admin panel → "ডেলিভারি পার্টনার" ট্যাব থেকে অন্তত একজন courier যোগ করুন — নাহলে কোনো order-ই `confirmed` থেকে `out_for_delivery`-তে যেতে পারবে না।

## অর্ডার স্ট্যাটাস ফ্লো (migration 0005 অনুযায়ী)

```
pending → processing → confirmed → out_for_delivery → delivered
   ↓           ↓            ↓              ↓
cancelled   cancelled   cancelled      returned
                                           ↓ (delivered থেকেও)
                                       returned
```

- **pending** — কাস্টমার অর্ডার বসিয়েছে, পেমেন্ট মেথড অনুযায়ী payment_status `unpaid` (COD) বা `pending_verification` (bKash) সেট হয়।
- **processing** — স্টাফ (moderator/admin/super_admin) অর্ডারটা review করছে।
- **confirmed** — স্টাফ অর্ডার accept করেছে।
- **out_for_delivery** — **শুধুমাত্র** `assign_delivery_partner()` RPC দিয়ে সেট হয় (সরাসরি `update_order_status` দিয়ে না) — এর মানে একটা delivery partner attach না করে কোনো order out_for_delivery-তে যেতেই পারবে না। Moderator dashboard-এর order panel-এ "confirmed" order-এ এই অপশন দেখা যাবে।
- **delivered / cancelled / returned** — আগের মতোই।

`shipped` enum value টা এখনো ডাটাবেজে আছে (Postgres-এ enum value remove করা যায় না) কিন্তু নতুন কোনো অর্ডার আর ওখানে যাবে না — শুধু পুরনো row থাকলে সেটার জন্য type-compatibility রাখা হয়েছে।

## Invoice

প্রতিটা অর্ডারের জন্য `/orders/:id/invoice` route-এ on-screen invoice দেখা যায় (order history পেইজ থেকে "ইনভয়েস" লিংক), সাথে "PDF ডাউনলোড করুন" বাটন (client-side `jspdf` দিয়ে তৈরি, কোনো server call লাগে না)। **উল্লেখ্য:** jsPDF-এর built-in ফন্ট বাংলা glyph সাপোর্ট করে না, তাই PDF-টা ইংরেজি লেবেলে বানানো — on-screen ভার্সন সম্পূর্ণ বাংলা। বাংলা টেক্সট PDF দরকার হলে পরে একটা বাংলা `.ttf` embed করতে হবে (`src/features/orders/invoicePdf.ts`-এর কমেন্টে বিস্তারিত)।

## এখন পর্যন্ত যা আছে

- ✅ Full DB schema + RLS policies (`20260917000001_init.sql` → `20260917000006_delivery_partner_flow.sql`)
- ✅ Atomic `place_order` function (race-condition-safe stock deduction, referral code) + server-side validated `update_order_status` + `assign_delivery_partner` (caller-role + status-transition checks — see migrations 0003, 0005)
- ✅ React app scaffold: routing, auth context, role-based protected routes
- ✅ Paginated + cached product listing (`useProducts`) + category filter on Home
- ✅ Order placement hook (`usePlaceOrder`), on-screen + downloadable-PDF invoice (`/orders/:id/invoice`)
- ✅ `manage-role` Edge Function — super_admin has full control; admin can only move `user <-> moderator`; CORS-safe; blocks self-role-change server-side
- ✅ `manage-user` Edge Function — used by both Super Admin's "নতুন অ্যাকাউন্ট" form and Admin's "মডারেটর ও ইউজার" tab (create account, edit details, activate/deactivate, email change, password reset); uses the Admin API (service-role only); an `admin` caller is server-side restricted to `user`/`moderator` targets only, `super_admin` has no restriction; every action logs to `audit_logs`
- ✅ **Super Admin:** Overview stats, full user management (search/filter/role-change/activate-deactivate), audit log viewer
- ✅ **Admin:** Product CRUD (add/edit/soft-delete), quick inline stock editing, category filter, **direct moderator/user account creation + edit ("মডারেটর ও ইউজার" tab)**, moderator-request approval, **delivery partner directory** (add/deactivate couriers)
- ✅ **Moderator:** order queue (filter/search/status update + history), **hand a confirmed order to a delivery partner**, read-only stock view, "request new moderator" form
- ✅ **User-side storefront:** sign up / sign in, product browsing + detail page, cart (add/update qty/remove), checkout (COD or bKash + optional referral code) → `place_order` → invoice, order history + read-only tracking timeline (shows referral code + assigned delivery partner), profile edit (name/phone/address) + avatar upload to Supabase Storage, product request form + own-request status list
- ✅ Shared storefront header/nav (`StorefrontLayout`) wrapping Home / Product detail / Cart / Orders / Profile / Product request — kept out of the admin/moderator/super-admin bundles on purpose (see code-splitting note below)

## পরবর্তী ধাপ (TODO)

- [ ] Admin: product image upload to Supabase Storage (currently a comma-separated URL field — fine for now, swap in an upload widget later)
- [ ] Real bKash/SSLCommerz gateway callback — Cart currently records `payment_method` + `payment_status` (`pending_verification` for bKash) on the order, but nothing calls a real gateway or verifies the referral code yet. `process-payment-webhook` from the original design doc is still just a placeholder — wire it up as an Edge Function once you have gateway credentials.
- [ ] Categories management UI (table exists + RLS ready, no admin screen yet — currently seed via SQL)
- [ ] Realtime order-status updates on the user's tracking view (currently manual refetch via React Query invalidation on mutation; Realtime subscribe would push updates when *staff* changes status while the customer's tab is open)
- [ ] Bengali-text invoice PDF (currently English labels — see `invoicePdf.ts` comment, needs an embedded Bengali TTF)
- [ ] Load testing with k6 before launch

## Code-splitting note

`features/products` and `features/orders` intentionally duplicate a couple of small things that already exist in `features/admin` / `features/moderator` (a `useCategories` hook, order status labels/colors, an order-detail-style query). This is deliberate, not an oversight: those two folders are part of the public/storefront bundle that ships to every visitor, while `features/admin` and `features/moderator` only load for staff via their own lazy route chunks. Importing across that boundary would leak staff-only code into the customer-facing bundle.

## Security review notes (this pass)

Full read-through of every migration, RLS policy, the Edge Function, and every hook that mutates data. Two real bugs found and fixed, plus the delivery-partner flow's own hardening:

1. **`manage-role` Edge Function had no CORS headers.** It never handled the browser's `OPTIONS` preflight request, so `supabase.functions.invoke('manage-role', ...)` would have failed silently for *every* browser call once deployed — role changes only ever worked from curl/Postman. Fixed by adding `Access-Control-Allow-*` headers and an `OPTIONS` handler.
2. **Role changes are backend-only.** The DB trigger blocks role changes from normal browser sessions, while the `manage-role` Edge Function uses the trusted secret/service-role context after checking the caller's role. The function also blocks self-role changes to prevent accidental self-lockout.
3. **`out_for_delivery` can only be reached through `assign_delivery_partner()`**, never through the generic `update_order_status()` (that RPC explicitly rejects it). This means it's impossible — even via a raw `supabase.rpc()` call bypassing the UI — for an order to end up "out for delivery" without a real, active delivery partner attached to it.
4. Everything already in place from the earlier review stands: RLS enabled on every table, `role` column never client-writable, stock deduction is row-locked (`for update`) inside `place_order` to prevent overselling, `service_role` key never leaves the Edge Function.

Nothing here was tested end-to-end against a live Supabase project or run through `tsc`/`npm run build` — this sandbox has no network access, so `npm install` isn't possible here. Please run `npm install && npx tsc --noEmit && npm run build` locally before deploying; flag anything that doesn't come up clean and I'll fix it.

## Full QA pass (this session) — migration 0006

A systematic read of the entire schema, every RLS policy, both Edge Functions, and every hook that touches the database. `npm install`, `npx tsc -b`, and `npm run build` all run clean in this pass (this sandbox does have build tooling, just no access to the live Supabase project — so DB-side fixes are reviewed carefully but not executed against real Postgres). Found and fixed:

**Critical — `is_active` was never actually enforced.** Every "deactivate account" button in the app (Super Admin panel, Admin's staff panel, the `manage-user` Edge Function) wrote `profiles.is_active = false`, but nothing anywhere ever *read* it — not RLS, not the SECURITY DEFINER order functions, not the client. A deactivated account — including a deactivated moderator or admin — could keep logging in, browsing, ordering, and (if staff) managing orders/products with zero restriction. Fixed in migration `0006_qa_fixes.sql`:
- `get_user_role()` now returns `NULL` for a deactivated profile, which cuts off every `get_user_role() in (...)` check across the entire schema in one place (products, categories, orders, delivery_partners, audit_logs, etc.).
- `place_order`, `update_order_status`, and `assign_delivery_partner` read the caller's role via a direct table lookup (not through `get_user_role()`), so each got its own explicit `is_active` check.
- Plain-user writes that don't go through `get_user_role()` either (`cart_items` insert/update, `orders` insert, `product_requests` insert) got a new `is_current_user_active()` check added to their RLS policies.
- Both Edge Functions (`manage-role`, `manage-user`) now also check the caller's `is_active` before doing anything — previously a deactivated admin/super_admin could still call them directly.
- `AuthContext` now force-signs-out and shows a message the moment it learns an account is deactivated. This is a UX nicety, not the real boundary — the JWT itself stays valid until it expires, so the actual enforcement is everywhere above, not here.

**Found alongside it, same root cause (trusting a null/edge case that shouldn't be trusted):**
- `ProtectedRoute` only redirected role-gated routes away when `profile` was truthy — if `session` existed but `profile` was still `null` (a real, reachable state: profile loads async right after session resolves, and it's also what a deactivated account now looks like for one render) it silently fell through and rendered the protected page. Fixed to treat a missing profile as "not authorized yet," not "let it through."
- `prevent_self_role_change`'s trigger condition used `get_user_role() <> 'super_admin'` — in Postgres, `NULL <> 'super_admin'` is `NULL`, and `if NULL then` is treated as false in PL/pgSQL, so after the `get_user_role()` change a deactivated super_admin's role-change attempt would silently *not* raise the exception this trigger exists to guarantee. Changed to `coalesce(get_user_role()::text, '') <> 'super_admin'` so it fails closed.
- Super Admin's own account-deactivation button had no server-side self-lockout guard (only a disabled button client-side) and no "don't deactivate the last super_admin" guard either. Added a trigger (`prevent_unsafe_deactivation`) covering both, independent of which code path the update comes through.

**Other bugs fixed:**
- **PostgREST filter injection via search boxes.** `useAllUsers` and the new `useAdminStaffUsers` built `.or(\`full_name.ilike.%${search}%,email.ilike.%${search}%\`)` by directly interpolating the search box into PostgREST's filter-list syntax, where commas and parentheses are structurally meaningful. A search term containing either would at best 500 the query, at worst let someone craft extra OR-conditions into the filter (RLS still bounds what's visible either way, so this was breakage more than a privilege hole — but breakage on a comma in someone's search is still a real bug). Added `src/lib/postgrestSafe.ts` and sanitize the term before it ever reaches `.or()`.
- **Cart quantity had no server-side stock ceiling.** `useAddToCart`/`useUpdateCartQuantity` would happily set a cart line past the product's actual stock; it was only ever caught at final checkout in `place_order`. Not exploitable (checkout still blocks it) but confusing — "added to cart" would toast success for a quantity that could never actually be ordered. Both hooks now re-check live stock and quantity-in-cart before writing, with a clear error instead of a false-success toast.
- **Stale query cache after approving a moderator request.** `useApproveModeratorRequest` invalidated `admin-users` (Super Admin's list) but not `admin-staff-users` (Admin's own staff list, added this session) — a freshly-promoted moderator wouldn't show up on Admin's own "মডারেটর ও ইউজার" page without a manual refresh.
- **`invoicePdf.ts`** imported and computed two Bengali label variables purely to immediately discard them (`void paymentLabel; void paymentStatusLabel;`) — dead code left over from an earlier pass; removed.
- **`useProducts`'s full-text search** called `.textSearch('name', search, { type: 'websearch' })` without a `config`, which silently falls back to the database's default text-search config. The `idx_products_name_search` GIN index is built specifically on `to_tsvector('english', name)` — if the project's default config ever isn't `'english'`, search quietly stops using that index (still correct results, just a full scan). Made the config explicit so this can't drift.
- **Unused `zustand` dependency** — not imported anywhere in the codebase; removed from `package.json` and the lockfile.

**Hardening (not bugs, just tightened while in there):** `place_order`/`update_order_status`/`assign_delivery_partner` are `SECURITY DEFINER` and Postgres grants `EXECUTE` on new functions to `PUBLIC` by default, which technically includes the unauthenticated `anon` role. Every function already fails closed on a missing `auth.uid()`, so this was never actually callable by an anonymous request — but there's no reason to leave the grant wider than it needs to be, so `0006` revokes `PUBLIC` and grants `authenticated` explicitly.

**Re-run after pulling this update:** apply `0006_qa_fixes.sql` (SQL Editor or `db push`), then redeploy both Edge Functions since their caller-permission check changed:
```bash
npx supabase@latest functions deploy manage-role --project-ref <ref>
npx supabase@latest functions deploy manage-user --project-ref <ref>
```
