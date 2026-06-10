
ALTER VIEW public.user_match_points SET (security_invoker = true);
ALTER VIEW public.user_bonus_points SET (security_invoker = true);
ALTER VIEW public.rankings SET (security_invoker = true);

ALTER FUNCTION public.touch_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
