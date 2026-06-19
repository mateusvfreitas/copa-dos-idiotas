-- Missing on new Supabase project: RPC for "Palpites dos idiotas" tab.

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

GRANT EXECUTE ON FUNCTION public.get_started_match_predictions(uuid) TO authenticated;
