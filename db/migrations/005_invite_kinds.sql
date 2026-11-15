-- TeamPulse database, step 5: two kinds of sign-up link.
-- "new" asks for the first order. "existing" is for distributors who already hold a title and asks for it instead.

alter table invites add column if not exists kind text not null default 'new' check (kind in ('new', 'existing'));
alter table applications add column if not exists kind text not null default 'new' check (kind in ('new', 'existing'));
alter table applications add column if not exists claimed_rank int not null default 0 check (claimed_rank between 0 and 4);
alter table applications alter column first_pv drop not null;
