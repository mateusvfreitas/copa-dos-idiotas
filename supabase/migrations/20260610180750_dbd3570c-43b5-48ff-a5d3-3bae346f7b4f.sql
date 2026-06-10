
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  flag_emoji TEXT NOT NULL DEFAULT '🏳️',
  group_letter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teams TO anon, authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams_read_all" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_admin_write" ON public.teams FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL, -- group, r32, r16, qf, sf, third_place, final
  group_letter TEXT,
  match_number INT NOT NULL UNIQUE,
  kickoff_at TIMESTAMPTZ NOT NULL,
  home_team_id UUID REFERENCES public.teams(id),
  away_team_id UUID REFERENCES public.teams(id),
  home_label TEXT,
  away_label TEXT,
  home_score INT,
  away_score INT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matches TO anon, authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_read_all" ON public.matches FOR SELECT USING (true);
CREATE POLICY "matches_admin_write" ON public.matches FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Predictions
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score INT NOT NULL,
  away_score INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "predictions_read_authenticated" ON public.predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "predictions_insert_own" ON public.predictions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.kickoff_at > now())
  );
CREATE POLICY "predictions_update_own" ON public.predictions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.kickoff_at > now())
  );

-- Bonus predictions (one row per user)
CREATE TABLE public.bonus_predictions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  top_scorer TEXT,
  champion_team_id UUID REFERENCES public.teams(id),
  runner_up_team_id UUID REFERENCES public.teams(id),
  third_team_id UUID REFERENCES public.teams(id),
  fourth_team_id UUID REFERENCES public.teams(id),
  revelation_team_id UUID REFERENCES public.teams(id),
  best_player TEXT,
  best_attack_group_team_id UUID REFERENCES public.teams(id),
  best_defense_group_team_id UUID REFERENCES public.teams(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bonus_predictions TO authenticated;
GRANT ALL ON public.bonus_predictions TO service_role;
ALTER TABLE public.bonus_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bonus_read_authenticated" ON public.bonus_predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "bonus_insert_own" ON public.bonus_predictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bonus_update_own" ON public.bonus_predictions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bonus official results (singleton)
CREATE TABLE public.bonus_results (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  top_scorer TEXT,
  champion_team_id UUID REFERENCES public.teams(id),
  runner_up_team_id UUID REFERENCES public.teams(id),
  third_team_id UUID REFERENCES public.teams(id),
  fourth_team_id UUID REFERENCES public.teams(id),
  revelation_team_id UUID REFERENCES public.teams(id),
  best_player TEXT,
  best_attack_group_team_id UUID REFERENCES public.teams(id),
  best_defense_group_team_id UUID REFERENCES public.teams(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.bonus_results (id) VALUES (1);
GRANT SELECT ON public.bonus_results TO anon, authenticated;
GRANT ALL ON public.bonus_results TO service_role;
ALTER TABLE public.bonus_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bonus_results_read_all" ON public.bonus_results FOR SELECT USING (true);
CREATE POLICY "bonus_results_admin_write" ON public.bonus_results FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Points calculation view
CREATE OR REPLACE VIEW public.user_match_points AS
SELECT
  p.user_id,
  p.match_id,
  CASE
    WHEN m.home_score IS NULL OR m.away_score IS NULL THEN 0
    WHEN p.home_score = m.home_score AND p.away_score = m.away_score THEN 10
    WHEN sign(p.home_score - p.away_score) = sign(m.home_score - m.away_score)
         AND (p.home_score - p.away_score) = (m.home_score - m.away_score) THEN 5
    WHEN sign(p.home_score - p.away_score) = sign(m.home_score - m.away_score) THEN 3
    ELSE 0
  END AS points
FROM public.predictions p
JOIN public.matches m ON m.id = p.match_id;
GRANT SELECT ON public.user_match_points TO anon, authenticated;

CREATE OR REPLACE VIEW public.user_bonus_points AS
SELECT
  bp.user_id,
  (CASE WHEN bp.top_scorer IS NOT NULL AND lower(trim(bp.top_scorer)) = lower(trim(br.top_scorer)) THEN 20 ELSE 0 END)
  + (CASE WHEN bp.champion_team_id IS NOT NULL AND bp.champion_team_id = br.champion_team_id THEN 25 ELSE 0 END)
  + (CASE WHEN bp.runner_up_team_id IS NOT NULL AND bp.runner_up_team_id = br.runner_up_team_id THEN 15 ELSE 0 END)
  + (CASE WHEN bp.third_team_id IS NOT NULL AND bp.third_team_id = br.third_team_id THEN 10 ELSE 0 END)
  + (CASE WHEN bp.fourth_team_id IS NOT NULL AND bp.fourth_team_id = br.fourth_team_id THEN 5 ELSE 0 END)
  + (CASE WHEN bp.revelation_team_id IS NOT NULL AND bp.revelation_team_id = br.revelation_team_id THEN 15 ELSE 0 END)
  + (CASE WHEN bp.best_player IS NOT NULL AND lower(trim(bp.best_player)) = lower(trim(br.best_player)) THEN 15 ELSE 0 END)
  + (CASE WHEN bp.best_attack_group_team_id IS NOT NULL AND bp.best_attack_group_team_id = br.best_attack_group_team_id THEN 10 ELSE 0 END)
  + (CASE WHEN bp.best_defense_group_team_id IS NOT NULL AND bp.best_defense_group_team_id = br.best_defense_group_team_id THEN 10 ELSE 0 END)
  AS bonus_points
FROM public.bonus_predictions bp
CROSS JOIN public.bonus_results br
WHERE br.id = 1;
GRANT SELECT ON public.user_bonus_points TO anon, authenticated;

CREATE OR REPLACE VIEW public.rankings AS
SELECT
  pr.id AS user_id,
  pr.display_name,
  pr.avatar_url,
  COALESCE((SELECT SUM(points) FROM public.user_match_points WHERE user_id = pr.id), 0) AS match_points,
  COALESCE((SELECT bonus_points FROM public.user_bonus_points WHERE user_id = pr.id), 0) AS bonus_points,
  COALESCE((SELECT SUM(points) FROM public.user_match_points WHERE user_id = pr.id), 0)
    + COALESCE((SELECT bonus_points FROM public.user_bonus_points WHERE user_id = pr.id), 0) AS total_points
FROM public.profiles pr;
GRANT SELECT ON public.rankings TO anon, authenticated;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER predictions_touch BEFORE UPDATE ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER bonus_predictions_touch BEFORE UPDATE ON public.bonus_predictions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER bonus_results_touch BEFORE UPDATE ON public.bonus_results FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
