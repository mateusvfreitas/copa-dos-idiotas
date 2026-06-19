DROP FUNCTION IF EXISTS public.get_rankings();
DROP FUNCTION IF EXISTS public.get_started_match_predictions(uuid);

CREATE OR REPLACE FUNCTION public.get_rankings()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  match_points bigint,
  bonus_points bigint,
  total_points bigint,
  exact_count bigint,
  winner_gd_count bigint,
  winner_only_count bigint,
  miss_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH per_match AS (
    SELECT
      p.user_id,
      CASE
        WHEN m.home_score IS NULL OR m.away_score IS NULL THEN NULL
        WHEN p.home_score = m.home_score AND p.away_score = m.away_score THEN 10
        WHEN sign((p.home_score - p.away_score)::float) = sign((m.home_score - m.away_score)::float)
             AND (p.home_score - p.away_score) = (m.home_score - m.away_score) THEN 5
        WHEN sign((p.home_score - p.away_score)::float) = sign((m.home_score - m.away_score)::float) THEN 3
        ELSE 0
      END AS pts
    FROM public.predictions p
    JOIN public.matches m ON m.id = p.match_id
  ),
  mp AS (
    SELECT
      user_id,
      COALESCE(SUM(pts), 0)::bigint AS pts,
      COUNT(*) FILTER (WHERE pts = 10)::bigint AS exact_count,
      COUNT(*) FILTER (WHERE pts = 5)::bigint AS winner_gd_count,
      COUNT(*) FILTER (WHERE pts = 3)::bigint AS winner_only_count,
      COUNT(*) FILTER (WHERE pts = 0)::bigint AS miss_count
    FROM per_match
    WHERE pts IS NOT NULL
    GROUP BY user_id
  ),
  bp AS (
    SELECT bp.user_id, (
        (CASE WHEN bp.top_scorer IS NOT NULL AND lower(trim(bp.top_scorer)) = lower(trim(br.top_scorer)) THEN 20 ELSE 0 END)
      + (CASE WHEN bp.champion_team_id IS NOT NULL AND bp.champion_team_id = br.champion_team_id THEN 25 ELSE 0 END)
      + (CASE WHEN bp.runner_up_team_id IS NOT NULL AND bp.runner_up_team_id = br.runner_up_team_id THEN 15 ELSE 0 END)
      + (CASE WHEN bp.third_team_id IS NOT NULL AND bp.third_team_id = br.third_team_id THEN 10 ELSE 0 END)
      + (CASE WHEN bp.fourth_team_id IS NOT NULL AND bp.fourth_team_id = br.fourth_team_id THEN 5 ELSE 0 END)
      + (CASE WHEN bp.revelation_team_id IS NOT NULL AND bp.revelation_team_id = br.revelation_team_id THEN 15 ELSE 0 END)
      + (CASE WHEN bp.top_assists IS NOT NULL AND lower(trim(bp.top_assists)) = lower(trim(br.top_assists)) THEN 15 ELSE 0 END)
      + (CASE WHEN bp.best_attack_group_team_id IS NOT NULL AND bp.best_attack_group_team_id = br.best_attack_group_team_id THEN 10 ELSE 0 END)
      + (CASE WHEN bp.best_defense_group_team_id IS NOT NULL AND bp.best_defense_group_team_id = br.best_defense_group_team_id THEN 10 ELSE 0 END)
    )::bigint AS pts
    FROM public.bonus_predictions bp
    LEFT JOIN public.bonus_results br ON br.id = 1
  )
  SELECT
    pr.id,
    pr.display_name,
    pr.avatar_url,
    COALESCE(mp.pts, 0),
    COALESCE(bp.pts, 0),
    COALESCE(mp.pts, 0) + COALESCE(bp.pts, 0),
    COALESCE(mp.exact_count, 0),
    COALESCE(mp.winner_gd_count, 0),
    COALESCE(mp.winner_only_count, 0),
    COALESCE(mp.miss_count, 0)
  FROM public.profiles pr
  LEFT JOIN mp ON mp.user_id = pr.id
  LEFT JOIN bp ON bp.user_id = pr.id
  ORDER BY (COALESCE(mp.pts, 0) + COALESCE(bp.pts, 0)) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_started_match_predictions(p_match_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  home_score int,
  away_score int,
  points_earned int
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
    p.home_score,
    p.away_score,
    CASE
      WHEN m.kickoff_at > now() THEN 0
      WHEN m.home_score IS NULL OR m.away_score IS NULL THEN 0
      WHEN p.home_score = m.home_score AND p.away_score = m.away_score THEN 10
      WHEN sign((p.home_score - p.away_score)::float) = sign((m.home_score - m.away_score)::float)
           AND (p.home_score - p.away_score) = (m.home_score - m.away_score) THEN 5
      WHEN sign((p.home_score - p.away_score)::float) = sign((m.home_score - m.away_score)::float) THEN 3
      ELSE 0
    END AS points_earned
  FROM public.predictions p
  JOIN public.matches m ON m.id = p.match_id
  JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.match_id = p_match_id
    AND m.kickoff_at <= now()
  ORDER BY points_earned DESC, pr.display_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_rankings() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_started_match_predictions(uuid) TO authenticated;