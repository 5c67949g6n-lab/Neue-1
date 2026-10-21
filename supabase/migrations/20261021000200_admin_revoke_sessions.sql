-- Beim Sperren eines Kontos alle Sitzungen beenden.
-- Löscht die Sessions des Nutzers; die Refresh-Tokens hängen per ON DELETE CASCADE daran.
-- Ein noch gültiges Access-Token läuft spätestens nach jwt_expiry ab – die App selbst
-- sperrt sofort, weil der DAL den Kontostatus bei jeder Anfrage liest.
create or replace function public.admin_revoke_user_sessions(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user_id;
$$;

revoke execute on function public.admin_revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_user_sessions(uuid) to service_role;
