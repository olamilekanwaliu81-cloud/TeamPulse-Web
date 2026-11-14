-- TeamPulse database, step 2: monthly check-in answers and the emails sent about them.

create table if not exists checkin_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  occ text not null,                          -- one question on one date, for example earn@2026-11-10
  key text not null check (key in ('earn', 'ppv', 'plan', 'paid', 'signup')),
  month date not null,                        -- first day of the calendar month the question belongs to
  answers jsonb not null,
  answered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, occ)
);
create index if not exists checkin_answers_team_month_idx on checkin_answers (team_id, month);

-- Remembers which emails went out, so nobody gets the same one twice.
create table if not exists checkin_mail (
  user_id uuid not null references users(id) on delete cascade,
  occ text not null,
  kind text not null,                         -- open, last, nudge:2026-11-12
  sent_at timestamptz not null default now(),
  primary key (user_id, occ, kind)
);

alter table checkin_answers enable row level security;
alter table checkin_mail enable row level security;
