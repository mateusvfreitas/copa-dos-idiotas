-- Tighten SELECT policies: users see only their own predictions/bonus_predictions.
DROP POLICY IF EXISTS predictions_read_authenticated ON public.predictions;
CREATE POLICY predictions_read_own ON public.predictions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bonus_read_authenticated ON public.bonus_predictions;
CREATE POLICY bonus_read_own ON public.bonus_predictions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Profiles: restrict to authenticated users (leaderboard requires sign-in).
DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
CREATE POLICY profiles_read_authenticated ON public.profiles FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.profiles FROM anon;