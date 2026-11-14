# TeamPulse (the real app)

Next.js + TypeScript, a Supabase (Postgres) database, Resend for email, hosted on Vercel.
The clickable prototype in `../prototype` is the design reference. This folder is the real thing.

## What works now (milestones 1 and 2: accounts, team and monthly check-ins)

- Team leader registration with email confirmation, TeamPulse ID, sign-in with ID and password (5 wrong tries lock the account)
- Add members, welcome email with their ID, the website link and three steps; the member creates a password, uploads a picture and adds phone and city on one page
- Forgot password and leader-sent password resets; links last 7 days and work once
- Team list, network tree (fit to screen, zoom, download as PNG), member pages, profile and settings, notifications bell, account menu
- Landing page at `/`, made from `../landing/index.html` with `npm run landing`

- **Monthly check-ins** (members): earnings and orders (10th), PPV and QPV (14th), new-month plan (15th), sign-ups and step-ups (25th), monthly responsibility (28th). Each opens 2 days before its date and closes 3 days after, in the Africa/Lagos time zone. Members can change an answer until the window closes. Questions that closed before a member joined never count against them.
- **Emails by themselves**: when a question opens, and again on its last day, members who have not answered get an email. A daily job does this (`/api/cron/checkins`, run by Vercel every morning at 08:00 Lagos time). Nothing is sent twice. Leaders can also press **Remind** next to a member.
- **Leader dashboard**: check-in completion (target 75 to 80%), who has not fully replied, who has not paid, money dropping soon, team income by month, and each member's answers on their page.
- **Test clock** at `/dev/clock` (not available in production): moves "today" to watch windows open and close, and runs the daily email job by hand.

Coming next: PPV and QPV rank recommendations, sign-up reports from the 25th check-in to the leader, then desktop apps.

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

After pulling new code, run `npm run db:migrate` again so new database changes (for example `002_checkins.sql`) reach Supabase.

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
