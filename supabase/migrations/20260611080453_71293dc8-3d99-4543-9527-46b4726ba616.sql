ALTER TABLE public.bonus_predictions RENAME COLUMN best_player TO top_assists;
ALTER TABLE public.bonus_results RENAME COLUMN best_player TO top_assists;

DROP VIEW IF EXISTS public.rankings;
DROP VIEW IF EXISTS public.user_bonus_points;

CREATE VIEW public.user_bonus_points AS
SELECT bp.user_id,
  (
    (CASE WHEN bp.top_scorer IS NOT NULL AND lower(trim(bp.top_scorer)) = lower(trim(br.top_scorer)) THEN 20 ELSE 0 END)
    + (CASE WHEN bp.champion_team_id IS NOT NULL AND bp.champion_team_id = br.champion_team_id THEN 25 ELSE 0 END)
    + (CASE WHEN bp.runner_up_team_id IS NOT NULL AND bp.runner_up_team_id = br.runner_up_team_id THEN 15 ELSE 0 END)
    + (CASE WHEN bp.third_team_id IS NOT NULL AND bp.third_team_id = br.third_team_id THEN 10 ELSE 0 END)
    + (CASE WHEN bp.fourth_team_id IS NOT NULL AND bp.fourth_team_id = br.fourth_team_id THEN 5 ELSE 0 END)
    + (CASE WHEN bp.revelation_team_id IS NOT NULL AND bp.revelation_team_id = br.revelation_team_id THEN 15 ELSE 0 END)
    + (CASE WHEN bp.top_assists IS NOT NULL AND lower(trim(bp.top_assists)) = lower(trim(br.top_assists)) THEN 15 ELSE 0 END)
    + (CASE WHEN bp.best_attack_group_team_id IS NOT NULL AND bp.best_attack_group_team_id = br.best_attack_group_team_id THEN 10 ELSE 0 END)
    + (CASE WHEN bp.best_defense_group_team_id IS NOT NULL AND bp.best_defense_group_team_id = br.best_defense_group_team_id THEN 10 ELSE 0 END)
  ) AS bonus_points
FROM public.bonus_predictions bp
CROSS JOIN public.bonus_results br
WHERE br.id = 1;

GRANT SELECT ON public.user_bonus_points TO authenticated;

CREATE VIEW public.rankings AS
SELECT
  p.id AS user_id,
  p.display_name,
  p.avatar_url,
  COALESCE((SELECT SUM(points) FROM public.user_match_points ump WHERE ump.user_id = p.id), 0) AS match_points,
  COALESCE((SELECT bonus_points FROM public.user_bonus_points ubp WHERE ubp.user_id = p.id), 0) AS bonus_points,
  COALESCE((SELECT SUM(points) FROM public.user_match_points ump WHERE ump.user_id = p.id), 0)
    + COALESCE((SELECT bonus_points FROM public.user_bonus_points ubp WHERE ubp.user_id = p.id), 0) AS total_points
FROM public.profiles p;

GRANT SELECT ON public.rankings TO authenticated, anon;