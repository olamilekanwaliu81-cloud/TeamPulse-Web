-- TeamPulse database, step 7: two end-of-month questions that confirm what was planned on the 14th.
-- ppvdone (28th): did you do the PPV you planned?  qpvdone (29th): did your team reach the QPV you planned?
alter table checkin_answers drop constraint if exists checkin_answers_key_check;
alter table checkin_answers add constraint checkin_answers_key_check
  check (key in ('earn', 'ppv', 'plan', 'paid', 'signup', 'ppvdone', 'qpvdone'));
