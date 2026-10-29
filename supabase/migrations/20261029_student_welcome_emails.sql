-- Student welcome email: delivery log + idempotency for send-student-welcome-email.
--
-- One row per send REQUEST. request_id is generated once per prepared guide (one set of
-- credentials + one PDF) in the admin app, so double-clicks, retries, re-renders and
-- network timeouts of the same request can never produce a second email: the Edge
-- Function claims the row before calling Brevo and a 'sent' row is final.
--
-- Stores delivery metadata only: never the password, the PDF, or the email body.
-- RLS on with no policies: only the Edge Function (service role) writes it; admins read
-- the latest status through admin_student_welcome_status().
-- Plain ASCII. Safe to re-run.

create table if not exists public.student_welcome_emails (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null,
  student_id       text not null,
  kind             text not null default 'welcome',      -- 'welcome' (new student) | 'credentials' (new password)
  recipient_email  text not null,
  status           text not null default 'sending' check (status in ('sending','sent','failed')),
  provider         text not null default 'brevo',
  brevo_message_id text,
  error_code       text,                                  -- short safe code, e.g. brevo_not_configured
  attempts         int  not null default 1,
  requested_by     uuid,                                  -- admin auth user id
  created_at       timestamptz not null default now(),
  last_attempt_at  timestamptz not null default now(),
  sent_at          timestamptz
);
create unique index if not exists student_welcome_emails_request on public.student_welcome_emails(request_id);
create index if not exists student_welcome_emails_student on public.student_welcome_emails(student_id, created_at desc);

alter table public.student_welcome_emails enable row level security;
revoke all on public.student_welcome_emails from anon, authenticated;

-- Latest welcome-email status for one student (admin only). No credentials involved.
create or replace function public.admin_student_welcome_status(p_student_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorized'; end if;
  return (
    select jsonb_build_object('status', status, 'kind', kind, 'recipient', recipient_email,
             'sentAt', sent_at, 'lastAttemptAt', last_attempt_at, 'errorCode', error_code,
             'messageId', brevo_message_id)
      from student_welcome_emails
     where student_id = p_student_id
     order by created_at desc limit 1);
end $$;

revoke all on function public.admin_student_welcome_status(text) from public, anon;
grant execute on function public.admin_student_welcome_status(text) to authenticated;
