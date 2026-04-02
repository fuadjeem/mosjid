-- Updated dynamic RLS to use the admin_users table
-- This replaces hardcoded email lists with a lookup.

-- 1. Preparation
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can view and update all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

-- 2. Define Dynamic Admin Authorization Policies
-- PRODUCTS Table
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users))
WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

-- ORDERS Table
CREATE POLICY "Admins can view and update all orders" 
ON public.orders 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users))
WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

-- ORDER_ITEMS Table
CREATE POLICY "Admins can view all order items" 
ON public.order_items 
FOR ALL 
TO authenticated 
USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users) 
    OR EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND orders.user_id = auth.uid()
    )
);
