-- supabase_storage_setup.sql
-- Run this in the Supabase SQL Editor

-- 1. Create the bucket (if it doesn't exist)
-- Use the storage extension schema for bucket operations
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Clear existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

-- 3. Define Storage RLS Policies
-- Allow anyone to see images (SELECT)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Allow Admins to upload images (INSERT)
CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images' 
    AND (auth.jwt() ->> 'email') IN (SELECT email FROM public.admin_users)
);

-- Allow Admins to update images (UPDATE)
CREATE POLICY "Admin Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images' 
    AND (auth.jwt() ->> 'email') IN (SELECT email FROM public.admin_users)
)
WITH CHECK (
    bucket_id = 'product-images' 
    AND (auth.jwt() ->> 'email') IN (SELECT email FROM public.admin_users)
);

-- Allow Admins to delete images (DELETE)
CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images' 
    AND (auth.jwt() ->> 'email') IN (SELECT email FROM public.admin_users)
);
