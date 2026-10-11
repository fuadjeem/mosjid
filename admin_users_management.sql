-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- Lets admins add/remove other admins from the Settings page, instead of
-- needing direct SQL access. Safe to re-run.

-- Admins can add new admins
DROP POLICY IF EXISTS "Admins can add admin_users" ON public.admin_users;
CREATE POLICY "Admins can add admin_users"
ON public.admin_users FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

-- Admins can remove admins
DROP POLICY IF EXISTS "Admins can remove admin_users" ON public.admin_users;
CREATE POLICY "Admins can remove admin_users"
ON public.admin_users FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

-- Safety net: never allow the last remaining admin to be deleted, so nobody
-- can accidentally lock everyone (including themselves) out of the dashboard.
-- Also permanently protects the core/owner accounts from removal regardless
-- of how many admins exist.
CREATE OR REPLACE FUNCTION public.prevent_last_admin_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.email IN ('admin@bakl.org', 'fuad.bioinfo@icloud.com') THEN
        RAISE EXCEPTION 'This admin account is permanently protected and cannot be removed.';
    END IF;

    IF (SELECT count(*) FROM public.admin_users) <= 1 THEN
        RAISE EXCEPTION 'Cannot remove the last remaining admin.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_delete ON public.admin_users;
CREATE TRIGGER trg_prevent_last_admin_delete
BEFORE DELETE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_delete();

NOTIFY pgrst, 'reload schema';
