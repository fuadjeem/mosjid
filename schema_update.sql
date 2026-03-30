-- 1. Create the Products table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY, -- Matches the KV product IDs
    name TEXT NOT NULL,
    category TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    expiry TEXT, -- Keeping as text to match current KV data format
    image_url TEXT,
    status TEXT DEFAULT 'Available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Modify Orders table for Guest Checkout
-- Make user_id nullable
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Add a display name/email/phone for guest orders (if not already in delivery_info JSON)
-- The current schema uses delivery_info JSONB, which is fine.

-- 3. Update RLS Policies

-- Allow everyone (including guests) to see products
CREATE POLICY "Allow public read of products"
ON public.products FOR SELECT
TO anon, authenticated
USING (true);

-- Allow admins (using service role or specific check) to manage products
-- Note: Service role (used by workers/admin keys) bypasses RLS.
-- For frontend-based admin management, we can add a policy if the user has an 'admin' claim.
-- For now, I'll assume the admin uses a service role or we can use a simpler policy if needed.

-- Allow anyone to insert into products (temporary for seeding if needed)
-- CREATE POLICY "Allow public insert of products" ON public.products FOR INSERT WITH CHECK (true);

-- 4. Update Orders RLS for Guests
-- Allow guests (anon) to insert orders
CREATE POLICY "Allow anon to insert orders"
ON public.orders FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Allow guests (anon) to insert order items
CREATE POLICY "Allow anon to insert order items"
ON public.order_items FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND orders.user_id IS NULL
    )
);

-- 5. Existing RLS for authenticated users remains active.
