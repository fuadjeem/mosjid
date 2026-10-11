-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- Lets admins edit homepage text (hero title/subtitle) without touching code.

CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (including guests) can read site settings — needed to render the homepage
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view site settings"
ON public.site_settings FOR SELECT
USING (true);

-- Only admins can change them
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings"
ON public.site_settings FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users))
WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

-- Ensure anon/authenticated roles can actually reach this table via the Data API
-- (RLS alone doesn't expose a table — PostgREST also needs the GRANT)
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;

-- Seed with the current homepage hero text so nothing changes until edited
INSERT INTO public.site_settings (key, value) VALUES
    ('homepage_hero_title', '৩০ ইউরোর বেশি অর্ডারে ফ্রি হোম ডেলিভারি'),
    ('homepage_hero_subtitle', 'আপনার পছন্দের সকল গ্রোসারি পণ্য এখন অনলাইনে। ৩০ ইউরোর বেশি বাজার করলেই পাচ্ছেন ফ্রি হোম ডেলিভারি সুবিধা (শুধুমাত্র লিন্জ শহরের জন্য)।'),
    ('free_delivery_threshold', '30')
ON CONFLICT (key) DO NOTHING;

-- Force PostgREST to pick up the new table immediately instead of waiting
-- for its next automatic schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Already ran this file before? Re-running is safe (IF NOT EXISTS / DROP+CREATE / ON CONFLICT DO NOTHING),
-- so just re-run it whenever a new setting key is added.
