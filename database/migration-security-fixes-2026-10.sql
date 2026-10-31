-- Security fixes 31 okt 2026 (rode + oranje bevindingen security-check)

-- 1. Activatiecodes: policy "Service role full access" gold voor iedereen (qual true).
--    Service role omzeilt RLS al, dus de policies kunnen gewoon weg -> geen toegang voor anon/authenticated.
DROP POLICY IF EXISTS "Service role full access activation_codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Service role full access activation_code_usages" ON public.activation_code_usages;

-- 3. is_admin() vertrouwde user_metadata.role (door gebruiker zelf aan te passen) en '%@admin.local'.
--    Nu: zelfde bron als is_current_user_admin() (student_profiles.is_admin, beschermd door trigger).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.student_profiles WHERE auth_user_id = auth.uid() LIMIT 1),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.student_profiles WHERE auth_user_id = auth.uid() LIMIT 1),
    FALSE
  );
$$;

--    student_progress policies op basis van user_metadata.name (vervalsbaar) verwijderen;
--    de user_id-gebaseerde policies blijven.
DROP POLICY IF EXISTS "Students can insert own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Students can read own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Students can update own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Admins can read all progress" ON public.student_progress;
CREATE POLICY "Admins can read all progress" ON public.student_progress
  FOR SELECT TO authenticated USING (public.is_current_user_admin());

-- 4. Storage: alleen admins mogen werkbladen/afbeeldingen uploaden, wijzigen of verwijderen.
DROP POLICY IF EXISTS "Authenticated users can upload worksheets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete worksheets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update worksheets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete 65gcvh_0" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload 65gcvh_0" ON storage.objects;

CREATE POLICY "Admins can upload exam files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('exam-worksheets', 'exam-image') AND public.is_current_user_admin());
CREATE POLICY "Admins can update exam files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('exam-worksheets', 'exam-image') AND public.is_current_user_admin());
CREATE POLICY "Admins can delete exam files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('exam-worksheets', 'exam-image') AND public.is_current_user_admin());

-- 5. student_profiles: alleen eigen profiel (of admin) lezen.
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.student_profiles;
CREATE POLICY "Users can read own profile, admins read all" ON public.student_profiles
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_current_user_admin());

-- 8. questions: alleen lezen met geldig abonnement/proefperiode (zelfde logica als /api/check-subscription) of als admin.
CREATE OR REPLACE FUNCTION public.has_active_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE lower(s.user_email) = lower(auth.jwt() ->> 'email')
      AND (
        (s.status = 'trial' AND s.trial_ends_at > now())
        OR (s.status = 'active' AND s.current_period_end > now())
        OR (s.status = 'cancelled' AND (s.trial_ends_at > now() OR s.current_period_end > now()))
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_active_access() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_active_access() TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can read questions" ON public.questions;
CREATE POLICY "Subscribers and admins can read questions" ON public.questions
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin() OR public.has_active_access());
