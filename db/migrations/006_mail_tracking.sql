-- TeamPulse database, step 6: email opens and clicks. Our own tracking, no third party.
alter table mail_log add column if not exists team_id uuid references teams(id) on delete set null;
alter table mail_log add column if not exists open_count int not null default 0;
alter table mail_log add column if not exists first_opened_at timestamptz;
alter table mail_log add column if not exists click_count int not null default 0;
alter table mail_log add column if not exists first_clicked_at timestamptz;
create index if not exists mail_log_team_idx on mail_log (team_id, created_at desc);
