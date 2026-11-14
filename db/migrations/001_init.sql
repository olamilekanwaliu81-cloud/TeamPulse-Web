-- TeamPulse database, step 1: accounts, teams, links, emails and the team feed.
-- Run once in the Supabase SQL editor (or with `npm run db:migrate`).
-- The app talks to this database from the server only, with the connection string in DATABASE_URL.
-- Row Level Security is switched on with no policies, so the public Supabase API can read nothing.

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  name text not null,
  email text not null,
  neo_id text not null,                      -- NeoLife ID, 063-9262173. Only the team leader can correct it.
  tp_id text not null,                       -- TeamPulse ID, 06OW674. The login name.
  status text not null default 'invited' check (status in ('invited', 'active', 'inactive')),
  pw_hash text,                              -- bcrypt. Null until the member creates a password.
  failed_tries int not null default 0,
  locked boolean not null default false,
  sponsor_id uuid references users(id) on delete set null,
  rank int not null default 0,
  first_pv int,
  phone text not null default '',
  city text not null default '',
  bio text not null default '',
  photo text,                                -- small JPEG as a data URL (resized in the browser)
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists users_tp_id_key on users (tp_id);
create unique index if not exists users_neo_id_key on users (neo_id);
create unique index if not exists users_email_key on users (lower(email));
create index if not exists users_team_idx on users (team_id);
create index if not exists users_sponsor_idx on users (sponsor_id);

-- One-time links in emails. Only a hash of the link is stored, so a leaked table cannot be used to sign in.
create table if not exists tokens (
  token_hash text primary key,
  type text not null check (type in ('verify', 'setpw', 'reset')),
  user_id uuid references users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Every email the app sends (also the test mailbox when no email service is connected).
create table if not exists mail_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  to_name text not null,
  subject text not null,
  html text not null,
  cta_label text,
  cta_url text,
  status text not null default 'logged' check (status in ('logged', 'sent', 'failed')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists feed (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  kind text not null,                        -- join, rank
  who uuid not null references users(id) on delete cascade,
  by uuid references users(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists feed_team_idx on feed (team_id, created_at desc);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table teams enable row level security;
alter table users enable row level security;
alter table tokens enable row level security;
alter table mail_log enable row level security;
alter table feed enable row level security;
alter table audit_log enable row level security;
