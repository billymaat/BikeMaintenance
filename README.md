# Bike Maintenance Tracker

A mobile-first React PWA for tracking maintenance across a fleet of bikes, with mileage/time-based reminders and push notifications. Backed by Supabase (Postgres + Auth + Row Level Security).

## Stack

- React + TypeScript + Vite, Tailwind CSS v4
- React Router
- Supabase (`@supabase/supabase-js`) for auth, database, and RLS
- `vite-plugin-pwa` (injectManifest) for installability + a custom service worker that handles Web Push
- Supabase Edge Function (`supabase/functions/send-reminders`) to send push notifications on a schedule

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in real values, see setup below
npm run dev
```

```bash
npm run build      # type-check + production build
npm run lint        # oxlint
```

---

## Supabase setup

### 1. Create a project

Go to [supabase.com](https://supabase.com), create a new project, and wait for it to finish provisioning.

### 2. Get your API keys

In your project: **Settings → API**. Copy the **Project URL** and the **anon public** key into `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the database schema

Open **SQL Editor → New query** in the Supabase dashboard, paste in the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates:

- `profiles`, `bikes`, `task_types`, `maintenance_logs`, `reminder_rules`, `push_subscriptions` tables
- Row Level Security policies so each user only ever sees their own data
- A trigger that, on signup, creates a profile and copies a starter list of preset task types into the new user's account. Some presets are tracked per position, e.g. tyres and brake pads per Front / Rear, and cables per Front brake / Rear brake / Front shift / Rear shift

Feel free to edit the `insert into public.task_type_presets` block at the bottom before running it if you want different presets/intervals — it only affects *future* signups (existing users can always edit their own task types in the app).

**Upgrading an existing database?** Run the files in [`supabase/migrations/`](supabase/migrations) in order instead of re-running `schema.sql`. `002_task_positions.sql` adds per-position tracking. It also splits existing users' preset tyre, brake pad and cable tasks into positions, carrying over each bike's interval. Existing logs count towards every position, so no history is lost.

### 4. Configure email auth

Auth is email/password via Supabase Auth, enabled by default. Two things worth checking under **Authentication → Providers → Email**:

- **Confirm email** is on by default, meaning new users must click a confirmation link before they can sign in. For a small private app this is usually fine (Supabase's default email sending works out of the box, just rate-limited); turn it off there if you'd rather skip that step entirely.
- If you keep confirmations on, set **Authentication → URL Configuration → Site URL** to wherever you deploy the app (e.g. your Vercel URL), so confirmation links redirect correctly.

### 5. Push notifications (optional, but in the MVP scope)

Push needs a VAPID key pair (identifies your server to push services).

**Generate a key pair:**

```bash
npx web-push generate-vapid-keys
```

This prints a public and private key.

**Frontend:** add the public key to `.env.local`:

```
VITE_VAPID_PUBLIC_KEY=<the public key>
```

**Edge Function:** deploy `send-reminders` and give it all three VAPID values as secrets:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase functions deploy send-reminders

npx supabase secrets set VAPID_PUBLIC_KEY=<the public key>
npx supabase secrets set VAPID_PRIVATE_KEY=<the private key>
npx supabase secrets set VAPID_SUBJECT=mailto:you@example.com
```

**Schedule it to run periodically** (e.g. daily) so it can notice when a task crosses into "due soon" or "overdue" and push a notification. The simplest way is `pg_cron` + `pg_net`, both available on every Supabase plan:

1. Dashboard → **Database → Extensions** → enable `pg_cron` and `pg_net`.
2. SQL Editor, run (swap in your project ref and the **service role key** from Settings → API):

```sql
select cron.schedule(
  'send-maintenance-reminders',
  '0 14 * * *', -- daily at 14:00 UTC — adjust to taste
  $$
  select net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

You can test the function directly first with `npx supabase functions invoke send-reminders`.

**iOS note:** push only works on iOS 16.4+, and only if the app has been added to the home screen first (Share → Add to Home Screen) — a Safari tab can't receive pushes. Enable notifications from **Settings** inside the installed app.

### 6. Deploy the frontend

Any static host works (Vercel, Netlify, etc.) — it's a standard Vite build (`npm run build` → `dist/`). Set the same three `VITE_*` env vars in your host's dashboard that you put in `.env.local`. PWA installability (and iOS push) requires HTTPS, which these hosts provide by default.

---

## Project structure

```
src/
  components/    shared UI (nav, status badges, bike cards, protected route)
  contexts/      AuthContext, ThemeContext, DataContext (all app data + mutations)
  lib/           supabase client, reminder-status calculation, push helpers
  pages/         one file per screen
  sw.ts          service worker source (precaching + push handling)
supabase/
  schema.sql               tables, RLS policies, new-user seeding trigger
  migrations/              upgrades for databases created from an older schema.sql
  functions/send-reminders/  edge function that sends push notifications
```

Reminder status (`OK` / `Due soon` / `Overdue` / `Not tracked`) is computed client-side in [`src/lib/reminders.ts`](src/lib/reminders.ts) from each bike's current mileage plus the most recent log for a task, and mirrored server-side in the edge function so scheduled pushes agree with what the app shows.

## Not in this MVP

Per the original plan, these are intentionally deferred: photos on log entries, offline support/background sync, parts/component tracking, CSV export, shareable read-only history links, and cost tracking.
