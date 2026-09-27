# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Bike Maintenance Tracker: a mobile-first React PWA for tracking maintenance across a fleet of bikes. Users log service tasks (chain lube, brake pads, etc.), and the app computes `OK` / `Due soon` / `Overdue` / `Not tracked` status for each task from mileage and/or elapsed time. A scheduled Supabase Edge Function sends Web Push notifications when a task becomes due. Single-user-per-account; no sharing between users.

`README.md` covers Supabase setup, VAPID keys, cron scheduling and deployment in detail. `bike-maintenance-app-plan.md` is the original product plan (MVP scope and deferred features).

## Commands

```bash
npm run dev       # Vite dev server on :5173 (also defined in .claude/launch.json as "dev")
npm run build     # tsc -b type-check + vite build → dist/
npm run lint      # oxlint (config in .oxlintrc.json)
npm run preview   # serve the production build
```

There is no test suite. Verify changes with `npm run build` (the type-check is the main safety net) and `npm run lint`, and by running the app for UI changes.

Env vars live in `.env.local` (copy `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`. `src/lib/supabase.ts` throws at startup if the Supabase ones are missing.

## Stack

- React 19 + TypeScript (strict unused-locals/params, `verbatimModuleSyntax`, so use `import type` for types), Vite 8
- Tailwind CSS v4 via `@tailwindcss/vite`; no `tailwind.config`. Dark mode is class-based (`@custom-variant dark` in `src/index.css`)
- React Router v7 (`react-router-dom`), `date-fns`, `lucide-react` icons
- Supabase (`@supabase/supabase-js`): Postgres, email/password Auth, Row Level Security
- `vite-plugin-pwa` in `injectManifest` mode with a custom service worker (`src/sw.ts`)
- Supabase Edge Function (Deno) in `supabase/functions/send-reminders`
- Deployed as a static SPA to Netlify (`netlify.toml`: build + `/* → /index.html` redirect)

## Architecture

### Frontend (`src/`)

```
main.tsx            React root
App.tsx             Provider tree + routes
contexts/
  ThemeContext      light/dark/system, persisted in localStorage ('bike-maintenance-theme')
  AuthContext       Supabase session, user, profile (unit preference)
  DataContext       ALL app data + ALL mutations (see below)
lib/
  supabase.ts       the single Supabase client
  reminders.ts      status computation (pure functions)
  push.ts           Web Push subscribe/unsubscribe helpers
pages/              one file per screen
components/         Layout, BikeCard, StatusBadge, ProtectedRoute, LoadingSpinner
types/index.ts      shared row types mirroring the DB schema
sw.ts               service worker: Workbox precache + push/notificationclick handlers
```

Provider order: `ThemeProvider > BrowserRouter > AuthProvider > DataProvider > Routes`. Every route except `/sign-in` is wrapped in `<ProtectedRoute><Layout>…</Layout></ProtectedRoute>`.

Routes: `/` Dashboard, `/bikes/new`, `/bikes/:id`, `/bikes/:id/edit` (shares `AddEditBike`), `/log` LogTask, `/task-types`, `/settings`, `/sign-in`.

**Data flow.** `DataContext` loads every table the user can see (`bikes`, `task_types`, `maintenance_logs`, `reminder_rules`) up front and holds them in state. Pages read via `useData()` and derive everything client-side. Every mutation writes to Supabase and then calls `refresh()` to reload everything. There is no per-query caching layer or optimistic updates. Keep new data access in `DataContext` rather than calling `supabase` from pages. (Exceptions today: `Settings` updates `profiles` and `push.ts` manages `push_subscriptions` directly.)

**Layout** is responsive: bottom tab bar on phones, icon rail at `md`, full labelled sidebar at `lg` (`components/Layout.tsx`).

### Domain model

- **Bike**: has `current_mileage` (updated manually by the user), optional `unit_override`, `archived` flag.
- **TaskType**: per-user copy of a maintenance task with default interval (`mileage` / `time` / `both`). `positions` (e.g. `['Front','Rear']`) means the task is tracked separately per position; null/empty means a single item.
- **Preset task types** (`is_preset = true`) are copied from `task_type_presets` by a signup trigger. They are **read-only**: enforced both by RLS (update/delete policies require `not is_preset`) and in `DataContext` (`updateTaskType`/`deleteTaskType` throw). Users create their own custom task types instead.
- **ReminderRule**: one per (bike, task type, position); `position` is `''` (not null) for position-less tasks, and the unique key is `(bike_id, task_type_id, position)`. A rule's existence means "this bike tracks this task". `interval_miles` / `interval_days` override the task type defaults. `last_notified_status` is written only by the edge function.
- **MaintenanceLog**: a service event. `position = null` means the whole task and counts towards **every** position (`logCoversPosition` in `reminders.ts`).

Behaviours in `DataContext` worth knowing:
- `createLogs` inserts several logs at once (one per ticked position) and auto-creates any missing reminder rules using the task type defaults, so logging a task starts tracking it.
- `updateTaskType` with changed `positions` calls `syncRulePositions`: adds rules for new positions on every bike that already tracks the task (copying that bike's interval), deletes rules for removed positions.

### Reminder status logic

`computeTaskStatus` in `src/lib/reminders.ts`: take the most recent log covering the rule's position; effective interval is rule override ?? task type default. Overdue if miles or days remaining ≤ 0; due soon if within 10% of the interval (`DUE_SOON_THRESHOLD`); `not_tracked` if no log or no interval.

**This logic is duplicated in `supabase/functions/send-reminders/index.ts`** (the edge function runs in Deno and can't import from `src/`). Any change to status rules, thresholds or position matching must be made in both places so pushes agree with the UI.

### Backend (`supabase/`)

- `schema.sql`: full schema for fresh installs: tables, indexes, RLS policies (every table scoped to `auth.uid()`, child tables via their bike), `handle_new_user` trigger (creates profile + copies presets), and the preset seed data.
- `migrations/NNN_*.sql`: upgrades for databases created from an older `schema.sql`, run manually in order in the SQL Editor. **When changing the schema, update `schema.sql` (so fresh installs are correct) and add a new numbered migration** that brings existing databases to the same state, including data fixups where needed (see `002_task_positions.sql`).
- `functions/send-reminders`: invoked daily by `pg_cron` + `pg_net` with the service role key. Recomputes every rule's status, pushes only on a transition into `due_soon`/`overdue`, stores `last_notified_status`, and deletes subscriptions that return 404/410.

There is no Supabase CLI local stack configured; schema changes are applied by hand in the dashboard.

### PWA / push

`src/sw.ts` is compiled by `vite-plugin-pwa` (`injectManifest`, `devOptions.enabled` so the SW also runs in dev). Push payloads are `{ title, body, url, tag }`; clicking a notification navigates to `url` (the bike's detail page). Manifest and icons are configured in `vite.config.ts` / `public/icons/`. iOS push only works from the home-screen-installed app (iOS 16.4+).

## Conventions

- Function components, named exports for pages/components (`export function Dashboard()`); `App` is the default export.
- Styling is inline Tailwind utility classes with `dark:` variants on every colour; slate neutrals, blue accent. No CSS modules or component library.
- No semicolons, single quotes, 2-space indent, trailing commas (Prettier-style, though no formatter is configured). Match surrounding code.
- Row types in `src/types/index.ts` mirror DB columns in snake_case; keep them in sync with `schema.sql`.
- Mileage values are stored as plain numbers with no unit conversion; the unit (`mi`/`km`) is display-only. Column names say `miles` regardless of unit.
- UI copy and preset names use US spelling ("Tire").

## Out of scope (per the MVP plan)

Photos on logs, offline sync, parts/component inventory, CSV export, shareable history links, cost tracking. Check with the user before building any of these.
