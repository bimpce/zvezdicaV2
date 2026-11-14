revoke select on public.children from authenticated;
grant select (id, family_id, name, avatar, created_at) on public.children to authenticated;