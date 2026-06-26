-- Admin-only view of all bonus predictions (bypasses bonus_read_own RLS).
CREATE OR REPLACE FUNCTION public.get_admin_bonus_predictions()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  has_prediction boolean,
  top_scorer text,
  top_assists text,
  champion_team_id uuid,
  runner_up_team_id uuid,
  third_team_id uuid,
  fourth_team_id uuid,
  revelation_team_id uuid,
  best_attack_group_team_id uuid,
  best_defense_group_team_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pr.id,
    pr.display_name,
    pr.avatar_url,
    (bp.user_id IS NOT NULL) AS has_prediction,
    bp.top_scorer,
    bp.top_assists,
    bp.champion_team_id,
    bp.runner_up_team_id,
    bp.third_team_id,
    bp.fourth_team_id,
    bp.revelation_team_id,
    bp.best_attack_group_team_id,
    bp.best_defense_group_team_id
  FROM public.profiles pr
  LEFT JOIN public.bonus_predictions bp ON bp.user_id = pr.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY pr.display_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_bonus_predictions() TO authenticated;
