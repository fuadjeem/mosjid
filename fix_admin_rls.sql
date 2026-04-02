-- Fix for "new row violates row-level security policy"
-- This script is idempotent (safe to run multiple times)

-- 1. Preparation: Drop existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can view and update all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

-- 2. Enable RLS on all tables (if not already enabled)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 3. Define Admin Authorization Policies
-- We check the user's email from the JWT against our admin list.
-- Admin Emails: 'admin@bakl.org', 'fuadxeem@gmail.com', 'fuad.bioinfo@icloud.com'

-- PRODUCTS Table
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' IN ('admin@bakl.org', 'fuadxeem@gmail.com', 'fuad.bioinfo@icloud.com'))
WITH CHECK (auth.jwt() ->> 'email' IN ('admin@bakl.org', 'fuadxeem@gmail.com', 'fuad.bioinfo@icloud.com'));

-- ORDERS Table
CREATE POLICY "Admins can view and update all orders" 
ON public.orders 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' IN ('admin@bakl.org', 'fuadxeem@gmail.com', 'fuad.bioinfo@icloud.com'))
WITH CHECK (auth.jwt() ->> 'email' IN ('admin@bakl.org', 'fuadxeem@gmail.com', 'fuad.bioinfo@icloud.com'));

-- ORDER_ITEMS Table
CREATE POLICY "Admins can view all order items" 
ON public.order_items 
FOR ALL 
TO authenticated 
USING (
    auth.jwt() ->> 'email' IN ('admin@bakl.org', 'fuadxeem@gmail.com', 'fuad.bioinfo@icloud.com') 
    OR EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND orders.user_id = auth.uid()
    )
);
