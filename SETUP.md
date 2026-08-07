# Kailon — Setup Guide

This gets your local copy connected to a real database and real Google login.
Everything below produces values that go into a file called `.env` in the
project root (copy `.env.example` to `.env` first — `.env` is already
git-ignored, so these secrets never get committed).

```bash
cp .env.example .env
```

You don't need to understand Supabase or Google Cloud deeply — just follow
the clicks below. Send me the values you get and I'll wire them in and
verify everything connects.

---

## 1. Supabase (database + file storage)

Supabase is just "hosted Postgres + file storage with a free tier." We use
it for two things: the database, and storing images (profile photos,
progress photos, invoice PDFs).

1. Go to https://supabase.com and sign up (GitHub login is fastest).
2. Click **New project**.
   - **Name**: `kailon` (or anything)
   - **Database password**: click "Generate a password" and **save it
     somewhere** — you'll need it below and Supabase won't show it again.
   - **Region**: pick the one closest to your gym's users (e.g. Mumbai for
     India).
   - Click **Create new project** and wait ~2 minutes for it to provision.
3. Once it's ready, go to **Project Settings → Database**.
   - Under **Connection string**, switch to the **URI** tab.
   - You'll see two connection strings you need:
     - **Transaction pooler** (port `6543`) → this is your `DATABASE_URL`
     - **Session/Direct connection** (port `5432`) → this is your `DIRECT_URL`
   - Both look like:
     `postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-xxxxx.pooler.supabase.com:6543/postgres`
   - Replace `[YOUR-PASSWORD]` with the database password from step 2.
4. Go to **Project Settings → API**.
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the **`anon` `public`** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the **`service_role`** key → `SUPABASE_SERVICE_ROLE_KEY`
     (this one is powerful — never expose it to the browser, only the
     server uses it; that's already how the code is set up)
5. Send me these four values (or paste them into `.env` yourself):
   `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Once `DATABASE_URL`/`DIRECT_URL` are set, I'll run:
```bash
npm run db:migrate   # creates every table in your new database
npm run db:seed      # loads the default subscription plan catalog
```

**Enable one Postgres extension** (needed for case-insensitive email
lookups): in the Supabase dashboard, go to **Database → Extensions**,
search for `citext`, and toggle it on. (I can also do this via a migration
if you'd rather not click through the dashboard — just let me know.)

---

## 2. Google OAuth (Trainer & Member login)

This lets trainers and members sign in with "Continue with Google" — no
password to manage for those two roles.

1. Go to https://console.cloud.google.com and sign in with any Google
   account.
2. Create a new project: top-left project dropdown → **New Project** → name
   it `Kailon` → **Create**.
3. Go to **APIs & Services → OAuth consent screen**.
   - User type: **External** → **Create**.
   - App name: `Kailon`. User support email: your email. Developer contact:
     your email. Save through the remaining steps (scopes/test users can be
     left at defaults for now).
4. Go to **APIs & Services → Credentials**.
   - Click **Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Kailon Web`.
   - Under **Authorized redirect URIs**, add:
     - `http://localhost:3000/api/auth/callback/google` (for local dev)
     - `https://YOUR-PRODUCTION-DOMAIN/api/auth/callback/google` (add this
       once you have a production URL — you can edit this later)
   - Click **Create**.
5. You'll get a **Client ID** and **Client secret** — send me both:
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

While the app is in "Testing" mode on the OAuth consent screen, only Google
accounts you explicitly add as test users can sign in. Add your own email
(and any trainer/member test accounts) under **OAuth consent screen → Test
users**, or click **Publish app** when you're ready for real gyms to use it
(no Google review is required for the basic scopes we use — just email/
profile).

---

## 3. Email — Resend (optional to start)

Used for invite emails and password resets. Without this, invite links are
just printed to the server log instead of emailed — fine for testing
everything yourself, but you'll want this before real staff/members use it.

1. Go to https://resend.com and sign up.
2. **API Keys → Create API Key** → copy it → `RESEND_API_KEY`.
3. For `EMAIL_FROM`, Resend gives you a free `onboarding@resend.dev` sender
   that works immediately with no setup — use that to start. Later, you can
   verify your own domain (e.g. `noreply@yourgym.com`) under **Domains** in
   Resend and switch `EMAIL_FROM` to it.

---

## 4. Auth secret

Run this once and paste the output into `AUTH_SECRET`:
```bash
npx auth secret
```
(This just needs to be a long random string — it's what encrypts login
sessions. Don't reuse it across other projects, and don't share it.)

---

## 5. What to send me

Once you've done the above, the fastest way to hand this off is to paste
the filled-in values (or just tell me which ones you've set) and I'll:
- run the database migration to create all the tables
- seed the default subscription plan catalog
- start the dev server and verify signup → login → Google sign-in all work

If you'd rather keep secrets out of the chat entirely, you can fill in
`.env` directly on this machine yourself — either way works, just say which
you'd prefer.

## What's already built vs. what's next

Built and working end-to-end: gym owner signup, staff invites (Google for
trainers, password for receptionists), member Google login gating,
brute-force-protected staff login, role-based dashboards, member
registration, membership plan catalog, and assign-membership-with-payment
(creates the membership + invoice + payment together). See the project's
`docs/` folder for the full spec of everything else still to build
(workouts, diet, attendance, streaks, reports, messaging, etc.) — those come
next, module by module.
