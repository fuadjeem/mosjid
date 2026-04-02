-- 1. Create the News table
CREATE TABLE IF NOT EXISTS public.news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- 3. Allow public to view news
CREATE POLICY "Public can view news" 
ON public.news FOR SELECT 
USING (true);

-- 4. Allow specific admins to insert, update, delete
CREATE POLICY "Admins can manage news" 
ON public.news FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users))
WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));
