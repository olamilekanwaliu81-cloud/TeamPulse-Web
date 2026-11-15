-- TeamPulse database, step 4: sign-up links. A leader shares a link, the new person fills in a form,
-- and the leader checks it, chooses the sponsor and registers them.

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  created_by uuid not null references users(id) on delete cascade,
  token text not null unique,                 -- random, in the link. Only lets someone send the form, nothing else.
  sponsor_id uuid references users(id) on delete set null,  -- the leader's suggestion; they confirm when registering
  note text not null default '',
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists invites_team_idx on invites (team_id);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  invite_id uuid references invites(id) on delete set null,
  name text not null,
  email text not null,
  phone text not null default '',
  neo_id text not null,
  first_pv int not null,
  state text not null default 'new' check (state in ('new', 'added', 'dismissed')),
  member_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists applications_team_state_idx on applications (team_id, state);

alter table invites enable row level security;
alter table applications enable row level security;
