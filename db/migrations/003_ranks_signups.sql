-- TeamPulse database, step 3: rank changes and sign-up reports.

-- Every rank change a team leader confirmed.
create table if not exists rank_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  from_rank int not null,
  to_rank int not null,
  confirmed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists rank_events_user_idx on rank_events (user_id, created_at desc);

-- A recommendation the leader said no to. It stays dismissed for that rank, and a higher rank can still be recommended later.
create table if not exists rank_dismissals (
  user_id uuid not null references users(id) on delete cascade,
  to_rank int not null,
  dismissed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, to_rank)
);

-- A member tells the team leader about someone new. The leader decides who joins.
create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  by_user uuid not null references users(id) on delete cascade,
  count int not null default 1 check (count between 1 and 50),
  who text not null default '',
  state text not null default 'review' check (state in ('review', 'details_asked', 'ready', 'added', 'dismissed')),
  details jsonb,                              -- name, email, phone, neo, pv, filled in by the member when asked
  occ text,                                   -- set when the report came from a check-in answer, so it is made once
  member_id uuid references users(id) on delete set null,  -- the person who was added
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists claims_checkin_once on claims (by_user, occ) where occ is not null;
create index if not exists claims_team_state_idx on claims (team_id, state);

alter table rank_events enable row level security;
alter table rank_dismissals enable row level security;
alter table claims enable row level security;
