# TeamPulse (the real app)

Next.js + TypeScript, a Supabase (Postgres) database, Resend for email, hosted on Vercel.
The clickable prototype in `../prototype` is the design reference. This folder is the real thing.

## What works now (milestones 1 to 3: accounts, team, check-ins, ranks and sign-ups)

- Team leader registration with email confirmation, TeamPulse ID, sign-in with ID and password (5 wrong tries lock the account)
- Add members, welcome email with their ID, the website link and three steps; the member creates a password, uploads a picture and adds phone and city on one page
- Forgot password and leader-sent password resets; links last 7 days and work once
- Team list, network tree (fit to screen, zoom, download as PNG), member pages, profile and settings, notifications bell, account menu
- Landing page at `/`, made from `../landing/index.html` with `npm run landing`

- **Monthly check-ins** (members): earnings and orders (10th), PPV and QPV (14th), new-month plan (15th), sign-ups and step-ups (25th), monthly responsibility (28th). Each opens 2 days before its date and closes 3 days after, in the Africa/Lagos time zone. Members can change an answer until the window closes. Questions that closed before a member joined never count against them.
- **Emails by themselves**: when a question opens, and again on its last day, members who have not answered get an email. A daily job does this (`/api/cron/checkins`, run by Vercel every morning at 08:00 Lagos time). Nothing is sent twice. Leaders can also press **Remind** next to a member.
- **Leader dashboard**: check-in completion (target 75 to 80%), who has not fully replied, who has not paid, money dropping soon, team income by month, and each member's answers on their page.
- **Test clock** at `/dev/clock` (not available in production): moves "today" to watch windows open and close, and runs the daily email job by hand.

- **Rank recommendations**: from each member's reported PPV and QPV, the leader is told who qualifies for Manager (500 QPV), Senior Manager (1,000) or Executive Manager (2,000) with at least 100 PPV. The leader confirms (rank changes, the team feed shows it, rank history is kept) or dismisses (stays dismissed for that rank). The QPV worked out from the team tree ("System") is shown beside the reported one. Director follows its own rules and is never recommended.
- **Sign-up reports**: a member reports a new sign-up on any day, or by answering "Yes" in the 25th check-in. The leader reviews it: ask the member for the person's details (emailed button), add the person (form pre-filled, sponsor set to the reporting member), or dismiss. Changing the check-in answer to "No" withdraws the report if the leader has not acted.
- **Team table, tree and profiles** now show PPV and QPV, and members see their progress to the next rank.

- **Email failures are visible**: if a welcome email does not go out (for example the Resend domain is not verified yet), the leader sees a clear notice on the member-added page, a banner and a note on the dashboard, and on the member's page, with the reason in plain words and a **Send the email again** button. Registration shows an error instead of stalling if the confirmation email cannot be sent. The leader's **Send password reset** button does the same: it says whether the email went out, and the member's old password is only cleared after the email was delivered, so a failed send never locks anyone out.

- **Title versus monthly status**: a title is kept once earned; each month a member must have 100 PPV and their title's QPV to be Qualified, otherwise they are Title only (see `src/lib/ranks.ts`).
- **Date, time and calendar** in the top bar of every page (Lagos time), a month calendar with the check-in dates and windows, and a This week strip.
- **Design**: light dashboard style with a blue accent, on the app and the website.

- **Mac and Windows apps**: the website offers one download for each (`/downloads/TeamPulse-mac.zip` and `TeamPulse-windows.zip`). Both open the live site in a window of their own, with the same team and data as on a phone, and need an internet connection. The Mac app is a small native app (Intel and Apple Silicon); the Windows download is an installer script that opens the site in an Edge or Chrome app window with its own saved sign-in. Neither is signed with a paid certificate yet, so Mac and Windows show a first-time warning (the website explains the click-through). Rebuild them with `bash ../scripts/build_desktop.sh` (from the TeamPulse folder), then commit and push this folder. The Windows download has not been run on a real Windows PC.

Coming next: Resend setup for real email delivery to any address, a privacy notice, then desktop apps on the real app.

## Try it on your computer (no accounts needed)

```bash
cd web
npm install
npm run db:local        # leave this running: a small Postgres on your computer
```

In a second terminal:

```bash
cd web
cp .env.example .env.local     # then put a long random text in SESSION_SECRET (openssl rand -base64 48)
npm run db:migrate
npm run dev
```

Open http://localhost:3000. With no email service connected, every email is saved and shown at http://localhost:3000/dev/mailbox, with its button, so you can walk the whole journey.

## Go live (accounts you create yourself)

1. **Supabase** (database). Create a project. Project settings > Database > Connection string > URI, choose "Transaction pooler", and copy it into `DATABASE_URL`. Then run `npm run db:migrate` once with that value in `.env.local`.
2. **Resend** (email). Create an account, add and verify your domain, make an API key. Set `RESEND_API_KEY` and `EMAIL_FROM` (for example `TeamPulse <hello@yourdomain.com>`).
3. **Vercel** (hosting). Import the GitHub repository, set **Root Directory** to `web`, and add the same variables: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL` (your site address), `RESEND_API_KEY`, `EMAIL_FROM`.

Also set `CRON_SECRET` in Vercel (any long random text, `openssl rand -base64 32`). Vercel then sends it to the daily job, and the job refuses anyone who does not have it. Vercel's free plan allows one daily job, which is all this needs.

After pulling new code, run `npm run db:migrate` again so new database changes (`002_checkins.sql`, `003_ranks_signups.sql`) reach Supabase.

Never commit `.env.local`. Keys go only into Supabase, Resend and Vercel.

## Safety notes

- The browser never talks to the database. Only the server does, so the Supabase API keys are not used at all, and row-level security is on with no policies as a second lock.
- Passwords are stored with bcrypt. Email links are stored as a hash and work once. Sign-in cookies are httpOnly.
- `/dev/mailbox` is switched off in production unless `MAILBOX_ENABLED=1`.
- Real members' personal data (names, phone numbers) will be stored. Before going public, add a privacy notice and check local data-protection rules (in Nigeria: the NDPA).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | run the app |
| `npm run build` / `npm start` | production build and run |
| `npm test` | checks the business rules |
| `npm run typecheck` / `npm run lint` | code checks |
| `npm run db:migrate` | apply database changes in `db/migrations` |
| `npm run db:local` | local test database |
| `npm run landing` | rebuild the landing page from `../landing/index.html` |

## Landing page and desktop apps

- `landing/index.html` is the source of the public landing page. `npm run landing` writes `public/landing.html`.
- `desktop/macos` is the Mac app (a small window around the live site). `desktop/windows` builds the Windows zip.
- `npm run desktop` rebuilds both zips into `public/downloads/` and refreshes the landing page.

## Sign-up links

A team leader can make a sign-up link on the Sign-ups page (`/signups`). The new person fills in the form at `/join/<token>`; it lands in "Forms from new people". The leader checks it, **chooses the sponsor** (the form never decides it) and registers them, which sends the welcome email. Links expire after 14 days and can be turned off. The leader can paste up to 25 email addresses (one per line or comma-separated) and everyone gets the same link by email. A link is either for a **new sign-up** (asks for the first order PV) or for an **existing distributor** (asks for their current title instead; the leader confirms it when registering). Tables: `invites`, `applications` (migrations 004 and 005; run `npm run db:migrate`).

## When someone does not qualify for a month

A member who is inactive, has under 100 PPV, or reported no PPV after the PPV question closed (the 17th) does not qualify as a Distributor that month. The people they sponsored are then counted under the nearest upline who did qualify, until they qualify again (`effectiveSponsors` in `src/lib/ranks.ts`). The tree and system QPV follow this. Their real sponsor never changes in the database.

## Email opens and clicks

Each email sent through Resend carries a 1-pixel image (`/t/o/<id>`, counts an open) and its button goes through `/t/c/<id>` (counts the click, then redirects to the real link saved with the email, so it cannot send anyone elsewhere). The leader sees totals on the dashboard and details at `/emails`. Counts are stored in `mail_log` (migration 006). Opens are a guide only, because mail apps may hide or preload images; clicks are reliable. Set `EMAIL_TRACKING=0` to switch it off. No tracking company is involved.

## Plans versus results (the 28th and 29th)
The 14th check-in records what a member **plans** to do (PPV and QPV). A plan never counts as done: it shows as "250 planned" and
stays pending. On the **28th** every member gets a personal question ("Have you done the 250 PPV you planned?") and on the **29th**
the same for QPV. Yes records the planned number; No asks for the number they really did. Only these confirmed numbers feed ranks,
qualification, system QPV and the dashboard. The windows never run past the last day of the month. Needs migration `007`.
