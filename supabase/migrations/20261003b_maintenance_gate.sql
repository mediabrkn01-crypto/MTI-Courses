-- Maintenance mode: server-side gate.
--
-- course_config row 'maintenance_mode' (written by Admin > Settings) holds:
--   { enabled: bool, message: text, bypass_auth_user_id: uuid,
--     bypass_student_name: text, bypass_student_email: text }
--
-- While enabled, ONLY these can read/write student data:
--   • admins            (public.is_admin())
--   • the bypass account (auth.uid() = bypass_auth_user_id — the Supabase Auth user id,
--                         never name or email)
-- Everyone else (other students, anonymous/demo visitors) gets no rows back, even if the
-- frontend is modified. The 'maintenance_mode' row itself stays readable so the login
-- page can show the notice.
--
-- Safe / additive:
--   • RESTRICTIVE policies only AND-gate the existing permissive policies — they never
--     grant new access. When maintenance is off they are a no-op.
--   • No table, column or data changes; RLS is not newly enabled on any table.
--   • Service-role Edge Functions (admin tools, demo links) are unaffected.
--   • To undo: drop the four "maintenance_gate" policies and the function.

create or replace function public.maintenance_allows_me()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select lower(c.data->>'enabled') = 'true'
                from public.course_config c where c.id = 'maintenance_mode'), false) = false
    or public.is_admin()
    or (auth.uid() is not null
        and auth.uid()::text = (select c.data->>'bypass_auth_user_id'
                                  from public.course_config c where c.id = 'maintenance_mode'));
$$;

grant execute on function public.maintenance_allows_me() to anon, authenticated;

-- (select …) makes Postgres evaluate the check once per query, not once per row.
drop policy if exists "maintenance_gate" on public.students;
create policy "maintenance_gate" on public.students
  as restrictive for all to anon, authenticated
  using ((select public.maintenance_allows_me()))
  with check ((select public.maintenance_allows_me()));

drop policy if exists "maintenance_gate" on public.student_progress;
create policy "maintenance_gate" on public.student_progress
  as restrictive for all to anon, authenticated
  using ((select public.maintenance_allows_me()))
  with check ((select public.maintenance_allows_me()));

-- quiz_scores: only takes effect if RLS is already enabled on it (it is not enabled here).
drop policy if exists "maintenance_gate" on public.quiz_scores;
create policy "maintenance_gate" on public.quiz_scores
  as restrictive for all to anon, authenticated
  using ((select public.maintenance_allows_me()))
  with check ((select public.maintenance_allows_me()));

-- course_config: lesson videos, quizzes, unlock state… The maintenance row stays readable.
drop policy if exists "maintenance_gate" on public.course_config;
create policy "maintenance_gate" on public.course_config
  as restrictive for all to anon, authenticated
  using (id = 'maintenance_mode' or (select public.maintenance_allows_me()))
  with check ((select public.maintenance_allows_me()));
