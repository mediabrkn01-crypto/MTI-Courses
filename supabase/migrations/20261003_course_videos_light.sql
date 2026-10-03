-- course_videos_light(): the course_config 'videos' row WITHOUT the base64 thumbnails.
--
-- Why: the 'videos' row stores every class thumbnail inline (~4.5 MB). Admin > Classes &
-- Videos only needs src / duration / title, but PostgREST JSON-path selects re-read the
-- whole value per expression and time out past ~30 fields. This reads the row once and
-- strips 'thumb' server-side (~10 KB response).
--
-- Safe / additive: no table, column, policy or data change. SECURITY INVOKER, so the
-- existing course_config RLS read policy still decides who can see the row.
create or replace function public.course_videos_light()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_object_agg(e.key, e.value - 'thumb'), '{}'::jsonb)
  from public.course_config c
  cross join lateral jsonb_each(c.data) as e(key, value)
  where c.id = 'videos' and jsonb_typeof(e.value) = 'object';
$$;

grant execute on function public.course_videos_light() to anon, authenticated;
