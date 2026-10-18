-- Orders can only be created through place_order() (place_order_function.sql),
-- which requires login, checks stock and takes prices from the database.
-- Direct inserts from the browser are no longer allowed for non-admins.

-- 1. Nobody but admins may add products (this rule allowed anyone, even logged out)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;

-- 2. Remove direct order inserts (anon, guest and logged-in)
DROP POLICY IF EXISTS "Allow anon to insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated to insert manual orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;

DROP POLICY IF EXISTS "Allow anon to insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow authenticated to insert manual order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;

-- 3. This FOR ALL rule also let customers insert/update/delete items on their own orders.
--    Replace it with an admin-only rule; customers keep read access via
--    "Users can view their own order items".
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can manage order items" ON public.order_items
    FOR ALL TO authenticated
    USING ((SELECT auth.jwt() ->> 'email') IN (SELECT email FROM public.admin_users))
    WITH CHECK ((SELECT auth.jwt() ->> 'email') IN (SELECT email FROM public.admin_users));

-- 4. Admin cancel: marks the order Cancelled and puts its items back into stock.
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.jwt() ->> 'email') THEN
        RAISE EXCEPTION 'NOT_ADMIN: Only admins can cancel orders.';
    END IF;

    SELECT lower(coalesce(status, '')) INTO v_status
    FROM public.orders WHERE id = p_order_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Order not found.';
    END IF;
    IF v_status = 'cancelled' THEN
        RAISE EXCEPTION 'ALREADY_CANCELLED: This order is already cancelled.';
    END IF;
    IF v_status IN ('delivered', 'picked up') THEN
        RAISE EXCEPTION 'COMPLETED: This order is already completed and cannot be cancelled.';
    END IF;

    UPDATE public.products p SET stock = p.stock + oi.qty
    FROM (
        SELECT product_id, SUM(quantity) AS qty
        FROM public.order_items WHERE order_id = p_order_id
        GROUP BY product_id
    ) oi
    WHERE p.id = oi.product_id;

    UPDATE public.orders SET status = 'Cancelled' WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated;
