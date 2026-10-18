-- Atomic checkout: creates the order, its items, and reduces stock in one transaction.
-- Rows are locked while checking stock, so two simultaneous orders can't both take the last items.
-- Prices and total are taken from the products table, not from the browser.

CREATE OR REPLACE FUNCTION public.place_order(p_delivery_info jsonb, p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_order_id uuid;
    v_total numeric := 0;
    v_item record;
    v_product record;
    v_lines jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_LOGGED_IN: You must be logged in to place an order.';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: Your cart is empty.';
    END IF;

    -- Merge duplicate lines, then lock products in id order (avoids deadlocks between concurrent checkouts)
    SELECT jsonb_agg(jsonb_build_object('product_id', product_id, 'qty', qty) ORDER BY product_id)
    INTO v_lines
    FROM (
        SELECT (i->>'id') AS product_id, SUM((i->>'qty')::int) AS qty
        FROM jsonb_array_elements(p_items) AS i
        GROUP BY 1
    ) merged;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_lines) AS l(product_id text, qty int) LOOP
        IF v_item.qty IS NULL OR v_item.qty < 1 THEN
            RAISE EXCEPTION 'BAD_QTY: Invalid quantity.';
        END IF;

        SELECT id, name, price, stock INTO v_product
        FROM public.products WHERE id = v_item.product_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: A product in your cart is no longer available.';
        END IF;
        IF v_product.stock < v_item.qty THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Only % left of "%".', GREATEST(v_product.stock, 0), v_product.name;
        END IF;

        v_total := v_total + v_product.price * v_item.qty;
    END LOOP;

    INSERT INTO public.orders (user_id, total_amount, status, delivery_info)
    VALUES (v_user_id, v_total, 'pending_delivery', p_delivery_info)
    RETURNING id INTO v_order_id;

    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, price)
    SELECT v_order_id, p.id, p.name, l.qty, p.price
    FROM jsonb_to_recordset(v_lines) AS l(product_id text, qty int)
    JOIN public.products p ON p.id = l.product_id;

    UPDATE public.products p SET stock = p.stock - l.qty
    FROM jsonb_to_recordset(v_lines) AS l(product_id text, qty int)
    WHERE p.id = l.product_id;

    RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb) TO authenticated;
