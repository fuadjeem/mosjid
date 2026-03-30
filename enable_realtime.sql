-- Enable Realtime for the orders table
-- Run this in your Supabase SQL Editor

-- 1. Create a replication slot for real-time if not exists
-- (This is usually handled by Supabase, but manually adding the table to the publication ensures it works)
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items; -- also items if needed

-- 2. Verify Row Level Security (RLS) policies allow service role or authenticated to read
-- (Since admin needs to read all orders, ensure a policy exists)
create policy "Admins can read all orders" on orders
  for select
  using ( (select auth.email()) = 'admin@bakl.org' );

-- 3. Ensure full replication for updates/deletes
alter table orders replica identity full;
