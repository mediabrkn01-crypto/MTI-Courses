-- Quiz speed: start / answer / finish as single-round-trip Postgres RPCs.
--
-- Why: the `quiz` Edge Function runs near the student while the database is in
-- ap-southeast-2 (Sydney). Every REST call it made back to the database cost ~400 ms,
-- and it made them one after another (answer = 5 calls ~2 s, start = up to 6, finish = 7).
-- These functions do the same work inside the database in ONE request from the
-- browser (~300 ms from India), with the same rules:
--   * the learner payload never contains the answer key;
--   * each answer is graded once and locked (first answer wins, idempotent);
--   * the correct option for a question is returned only after it is answered.
--
-- Uses auth.uid() from the caller's JWT. Tables stay RLS-locked with no policies;
-- only these SECURITY DEFINER functions (and the service role) touch them.
-- Plain ASCII on purpose. Safe to re-run.

-- Same normalisation as the Edge Function: NFKC, curly quotes -> straight,
-- collapse whitespace, trim, lower-case.
create or replace function public.quiz_norm(s text)
returns text language sql immutable as $$
  select lower(btrim(regexp_replace(
    translate(normalize(coalesce(s,''), NFKC),
              chr(8216)||chr(8217)||chr(8220)||chr(8221), '''''""'),
    '\s+', ' ', 'g')))
$$;

-- Start or resume the caller's attempt for a lesson. Returns learner-visible data only.
create or replace function public.quiz_start(p_lesson int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_student text;
  v_att public.quiz_attempts;
  v_source text;
  v_questions jsonb;
  v_key jsonb;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  if p_lesson is null or p_lesson < 1 or p_lesson > 100 then raise exception 'invalid_lesson'; end if;
  select id::text into v_student from students where auth_user_id = v_uid limit 1;
  if v_student is null then raise exception 'no_student'; end if;

  -- Serialise start for this student+lesson so a background prefetch and a click
  -- can never create two open attempts.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':quiz:' || p_lesson, 0));

  select * into v_att from quiz_attempts
   where auth_user_id = v_uid and lesson_order = p_lesson and finished_at is null
   order by started_at desc limit 1;

  if not found then
    v_source := case when exists (select 1 from quiz_answers where lesson_order = p_lesson and source = 'uploaded')
                     then 'uploaded' else 'builtin' end;
    -- One pass over the key: keep only usable rows whose key text matches exactly one option.
    with r as (
      select qa.question_id, qa.prompt, qa.options, qa.hint, qa.position,
             (select min(o.ord - 1) from jsonb_array_elements_text(qa.options) with ordinality o(txt, ord)
               where quiz_norm(o.txt) = quiz_norm(qa.correct_text)) as ci
        from quiz_answers qa
       where qa.lesson_order = p_lesson and qa.source = v_source
         and qa.prompt is not null and jsonb_typeof(qa.options) = 'array' and jsonb_array_length(qa.options) >= 2
    )
    select jsonb_agg(jsonb_build_object('id', question_id, 'prompt', prompt, 'options', options, 'hint', hint)
                     order by position nulls last, question_id),
           jsonb_object_agg(question_id, jsonb_build_object('index', ci, 'text', options->>ci::int))
      into v_questions, v_key
      from r where ci is not null;

    if v_questions is null then raise exception 'no_quiz'; end if;

    insert into quiz_attempts (student_id, auth_user_id, lesson_order, source, questions, answer_key)
    values (v_student, v_uid, p_lesson, v_source, v_questions, v_key)
    returning * into v_att;
  end if;

  return jsonb_build_object(
    'attemptId', v_att.id,
    'questions', v_att.questions,
    'answers', coalesce((select jsonb_object_agg(question_id, jsonb_build_object(
                  'selectedIndex', selected_index, 'isCorrect', is_correct, 'correctIndex', correct_index))
                from quiz_attempt_answers where attempt_id = v_att.id), '{}'::jsonb));
end $$;

-- Grade ONE answer and lock it. Idempotent: a repeat or a double-click returns the
-- stored result. Does not touch any other question.
create or replace function public.quiz_answer(p_attempt uuid, p_question text, p_option_index int, p_option_text text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_att public.quiz_attempts;
  v_opts jsonb;
  v_key jsonb;
  v_sel int;
  v_ok boolean;
  v_row public.quiz_attempt_answers;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  select * into v_att from quiz_attempts where id = p_attempt and auth_user_id = v_uid;
  if not found then raise exception 'attempt_not_found'; end if;
  if v_att.finished_at is not null then raise exception 'attempt_finished'; end if;

  select q->'options' into v_opts from jsonb_array_elements(v_att.questions) q where q->>'id' = p_question limit 1;
  v_key := v_att.answer_key -> p_question;
  if v_opts is null or v_key is null then raise exception 'unknown_question'; end if;

  -- Chosen option identified by its text (stable), falling back to the index.
  if p_option_text is not null then
    select min(o.ord - 1) into v_sel from jsonb_array_elements_text(v_opts) with ordinality o(txt, ord)
     where quiz_norm(o.txt) = quiz_norm(p_option_text);
  end if;
  if v_sel is null and p_option_index is not null and p_option_index >= 0 and p_option_index < jsonb_array_length(v_opts) then
    v_sel := p_option_index;
  end if;
  if v_sel is null then raise exception 'invalid_option'; end if;

  v_ok := quiz_norm(v_opts->>v_sel) = quiz_norm(v_key->>'text');

  insert into quiz_attempt_answers (attempt_id, question_id, selected_index, selected_text, is_correct, correct_index)
  values (v_att.id, p_question, v_sel, v_opts->>v_sel, v_ok, (v_key->>'index')::int)
  on conflict (attempt_id, question_id) do nothing;

  select * into v_row from quiz_attempt_answers where attempt_id = v_att.id and question_id = p_question;
  return jsonb_build_object('questionId', p_question, 'selectedIndex', v_row.selected_index,
    'isCorrect', v_row.is_correct, 'correctIndex', v_row.correct_index, 'locked', true);
end $$;

-- Final score from the stored answers only (unanswered = wrong). Writes the same
-- quiz_scores / student_progress rows the app already reads. Repeat calls are safe.
create or replace function public.quiz_finish(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_att public.quiz_attempts;
  v_total int; v_correct int; v_pct int; v_passed boolean;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  select * into v_att from quiz_attempts where id = p_attempt and auth_user_id = v_uid for update;
  if not found then raise exception 'attempt_not_found'; end if;

  v_total := jsonb_array_length(v_att.questions);
  select count(*) filter (where is_correct) into v_correct from quiz_attempt_answers where attempt_id = v_att.id;
  v_pct := case when v_total > 0 then round(v_correct * 100.0 / v_total)::int else 0 end;
  v_passed := v_pct >= 70;

  if v_att.finished_at is null then
    update quiz_attempts set finished_at = v_now, score = v_correct, total = v_total, pct = v_pct, passed = v_passed
     where id = v_att.id;
    insert into quiz_scores (student_id, lesson_id, score, total, pct, submitted_at)
    values (v_att.student_id, 'a-' || v_att.lesson_order, v_correct, v_total, v_pct, v_now)
    on conflict (student_id, lesson_id) do update
      set score = excluded.score, total = excluded.total, pct = excluded.pct, submitted_at = excluded.submitted_at;
    insert into student_progress (student_id, lesson_id, completed_at)
    values (v_att.student_id, 'quiz_result_' || v_att.lesson_order, v_now)
    on conflict (student_id, lesson_id) do update set completed_at = excluded.completed_at;
  end if;

  return jsonb_build_object('score', v_correct, 'total', v_total, 'pct', v_pct, 'passed', v_passed);
end $$;

revoke all on function public.quiz_start(int)                    from public, anon;
revoke all on function public.quiz_answer(uuid, text, int, text) from public, anon;
revoke all on function public.quiz_finish(uuid)                  from public, anon;
grant execute on function public.quiz_start(int)                    to authenticated;
grant execute on function public.quiz_answer(uuid, text, int, text) to authenticated;
grant execute on function public.quiz_finish(uuid)                  to authenticated;
