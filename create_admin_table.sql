-- Create the admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read the admin list (needed for frontend checks)
CREATE POLICY "Allow authenticated users to read admin_users" 
ON public.admin_users FOR SELECT 
TO authenticated 
USING (true);

-- Seed with current admin emails
INSERT INTO public.admin_users (email)
VALUES 
    ('admin@bakl.org'),
    ('fuadxeem@gmail.com'),
    ('fuad.bioinfo@icloud.com'),
    ('ahsan.tazbir@gmail.com')
ON CONFLICT (email) DO NOTHING;
