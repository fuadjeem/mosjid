# Mosjid - Storefront & Admin Dashboard

A grocery storefront and admin dashboard for **BAK Linz** (Bangladesh Asiatische Kulturzentrum Linz), live at **https://shop.bakl.org**.

Customers browse products, add to cart and place an order for **Local Pickup** (Fridays only) or **Home Delivery**. There is no online payment: customers pay at pickup or delivery. Admins manage products, orders, news and site settings.

## Current state (as of 2026-10-19)

**Working:**
- Storefront with product filters, cart and checkout (login required to order).
- Pickup orders choose one of the next 4 Fridays. Delivery orders have **no date**: the shop arranges it with the customer.
- Home delivery is only offered above the free-delivery threshold (default EUR 30, editable in Settings); smaller carts are pickup only.
- Atomic checkout: stock is checked and reduced in the same transaction as the order (`place_order()`), so the last items cannot be oversold. Prices and totals come from the database, not the browser.
- Admin order details: pickup orders show a blue **Mark as Picked Up** button, delivery orders a green **Mark as Delivered** button. Both count as "completed". Admins can also **Cancel Order**, which returns the items to stock (`cancel_order()`).
- Admin pages: inventory, orders, order dashboard, news, settings (homepage text, delivery threshold, admin user management).
- Cancelled orders show a red badge; the cart page tells customers an order may be cancelled if an item is unavailable.

**Not done yet (next up):**
- **Customer emails.** Customers get no email on order or cancellation. Plan: a Supabase Edge Function `send-order-email` using Resend (secret `RESEND_API_KEY`), called from `cancel_order()` and `place_order()`. Login emails (signup/reset) already work through Resend SMTP configured in Supabase (Authentication > SMTP). That Resend account is the one under the project owner's other Gmail login; the verified sender domain belongs to a different project, so order emails would come from that domain until `bakl.org` is verified in Resend.
- Admin stock numbers are too high for any orders placed before the `place_order()` change (the old browser-side stock update never worked because of RLS). Correct stock by hand in Inventory.
- Resend's free plan is roughly 100 emails/day and is shared with the other project: watch this on announcement day.

**Decisions:**
- Staying on Supabase + Cloudflare Pages (free). WooCommerce was considered and rejected: no online payments are wanted, so it would add hosting cost and maintenance for little gain.

## Architecture

- **Frontend**: static HTML, vanilla JavaScript, Tailwind CSS (Play CDN). No build step. Hosted on **Cloudflare Pages** (`wrangler.toml`, `_headers`).
- **Backend**: **Supabase** project `BAKZ Project` (region eu-west-1, free plan): Postgres, Auth, Storage (`product-images`), Realtime (orders on the admin page).
- **Cache busting**: scripts are loaded as `js/app.js?v=YYYYMMDDx`. **Bump the version in every HTML file that includes a changed JS file**, otherwise Cloudflare may serve old code. Current: `app.js` and `admin.js` at `20261018b`.
- **Languages**: UI is mostly Bangla with some English.

### Key files
- `index.html`, `cart.html`, `profile.html`, `news.html`, `login.html`, `register.html`, `reset-password.html`: customer pages.
- `admin.html`, `inventory.html`, `orders.html`, `order_dashboard.html`, `admin-news.html`, `settings.html`: admin pages (access checked against the `admin_users` table).
- `js/app.js`: storefront (products, cart, checkout, Friday pickup dropdown).
- `js/admin.js`: admin logic (inventory, orders, mark delivered / picked up / cancel, settings, admin users).
- `js/auth.js`: Supabase client setup and login/admin checks. `js/config.js`: shared helpers.
- `legacy`: `functions/api/*` and `wrangler.toml` (KV-based API from an earlier version). **The site does not use them.** See known issues.

### Order data model
- `orders.status`: `pending_delivery` (default for new orders, both modes), `Delivered`, `Picked Up`, `Cancelled`. Completed = Delivered or Picked Up.
- `orders.delivery_info` (JSON): `customer`, `email`, `phone`, `address` ("Pickup in Store" for pickup), `delivery_mode` (`Local Pickup` | `Home Delivery`), `date` (pickup Friday as `YYYY-MM-DD`, `null` for delivery).
- Orders created before the pickup/delivery change may lack `delivery_mode`; the admin UI treats those as deliveries.

## Database setup

Run in the Supabase SQL editor, in this order for a fresh project:
1. `init_db.sql`, `schema_update.sql`: tables.
2. `create_admin_table.sql`, `admin_users_management.sql`, `fix_admin_rls.sql`: admin list and access rules.
3. `news_setup.sql`, `site_settings_setup.sql`, `storage_setup.sql`, `enable_realtime.sql`.
4. `place_order_function.sql`: atomic checkout function.
5. `lock_down_orders.sql`: removes direct-insert rules and adds `cancel_order()`.

Security model (important):
- Customers **cannot** insert orders or order items directly. Orders only come from `place_order()` (logged-in users only).
- Customers can read only their own orders. Only admins (emails in `admin_users`) can write products, orders, order items, news and settings.
- Core admin accounts are protected from deletion by a database trigger (`prevent_last_admin_delete`).
- Supabase's anon key in `js/auth.js` is public by design; the database rules above are what protect the data. Never put the service-role key or `RESEND_API_KEY` in frontend code.

## Setup for contributors
- `git clone https://github.com/fuadjeem/mosjid.git`
- Serve locally with any static server (`python3 -m http.server`) or open `index.html`. For Cloudflare behaviour use `npx wrangler pages dev .`.
- Python helper scripts (seeding/uploading products) need an `ADMIN_TOKEN` environment variable.

## Testing a change
- Place a pickup order (check the Friday dropdown) and a delivery order (cart at or above the threshold: no date field).
- In `orders.html` open each order: only the correct button shows; stock drops after an order and rises after a cancel.

## Known issues
- `functions/api/*` and the `wrangler.toml` settings are unused legacy code from an earlier version and should be removed (delete `functions/` and the `STORE_KV` / `ADMIN_PASSWORD` entries) after checking that Cloudflare has no secrets set for them.
- Tailwind is loaded from the Play CDN in the browser, which is slow on cheap phones. A build step producing a static CSS file would fix it.
- Supabase advisor warnings (RLS policies re-evaluating `auth.*` per row, duplicate policies, missing indexes) are harmless at this size but worth cleaning if the catalogue or order history grows into the thousands.
- Leaked-password protection is off in Supabase Auth settings.
- Some existing product images are large (up to ~1.8 MB); new uploads are resized to 1000px / JPEG 0.8.
- Free-plan Supabase pauses a project after 7 days of inactivity.

## Contribution guidelines
- Create a branch per feature or fix and open a PR to `main`.
- Follow the "No-Line" UI aesthetic using Tailwind tonal layering (e.g. `bg-surface-container-low`, `border-outline-variant`).

---
**Questions/Problems?** Contact the leads:
- Nazmus Shakib Beg
- Fuad Sarker Jeem
