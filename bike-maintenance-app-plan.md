# Bike Maintenance Tracker — App Plan

## 1. Overview

A mobile-first web app (installable PWA) for logging maintenance across a fleet of bikes (4+), with mileage/time-based reminders delivered via push notification, synced across devices via separate user accounts.

---

## 2. Core Data Model

**Users**
- id, email/auth, unit preference (miles/km, used as default for new bikes)

**Bikes** (belongs to a user)
- id, user_id, name/nickname, bike type (road/gravel/MTB/etc.), photo (optional), current mileage, unit override (miles/km, defaults to account setting), freeform notes (specs, tire pressure, reminders to self), date added, archived flag

**Maintenance Logs**
- id, bike_id, task_type_id, date performed, mileage at time of service, performed_by (DIY / Shop), notes, photo (Phase 2)

**Task Types** (preset list, user-editable/extendable)
- id, name (e.g. "Chain replacement", "Brake pads", "Tire replacement", "Full tune-up", "Bearing service", "Cable replacement"), default interval type (mileage/time/both), default interval value, is_preset flag

**Reminder Rules**
- id, bike_id, task_type_id, interval (miles and/or days) — defaults from task type, overridable per bike
- computed status: OK / Due soon / Overdue

---

## 3. Core Features (MVP)

1. **Accounts** — separate login per person, each user sees only their own fleet (multi-tenant)
2. **Add/edit/archive/delete bikes** — name, type, photo (optional), current mileage, unit (mi/km), freeform notes
3. **Log a maintenance task** — single form: bike, task type (from editable preset list), date, mileage, DIY or shop, notes
4. **Update bike mileage** — quick "update odometer" action per bike (manual entry)
5. **Dashboard** — all bikes at a glance, Due/Overdue/OK badges per tracked task
6. **Push notifications** — alert when a task becomes due (see notes on iOS below)
7. **Per-bike history** — chronological log, with **search/filter by task type and date range**
8. **Light/dark theme**

## 4. Phase 2

- Photos on log entries
- Offline support (PWA caching + background sync for logging with no signal)
- Parts/component tracking (separate layer: track individual components like chain/cassette/tires by install date + cumulative mileage, independent of logged tasks)

## 5. Phase 3

- CSV/data export (backup or migrate elsewhere)
- Shareable read-only bike history link (e.g. when selling a bike)
- Cost tracking (currently out of scope, easy to bolt on later if you change your mind)

---

## 6. How Reminders Work

For each (bike, task_type) with a rule:
- `next_due_mileage = last_service_mileage + interval_miles` (if mileage-based)
- `next_due_date = last_service_date + interval_days` (if time-based)
- Status = **Overdue** if either threshold passed, **Due soon** if within ~10% of threshold, else **OK**
- Never-logged tasks show as "Not tracked" until a baseline is set

**Push delivery:** works reliably on Android/desktop. On iOS, requires iOS 16.4+ and the app added to the home screen (a browser tab won't receive pushes) — worth testing early if you're on iPhone.

---

## 7. Screens

1. **Dashboard** — bikes with due/overdue status summary
2. **Bike detail** — info, current mileage + update button, tracked tasks with status, notes field, full searchable/filterable history
3. **Log a task** — bike, task type, date, mileage, DIY/shop, notes
4. **Task types** — manage preset list (edit/add/remove), set default intervals, per-bike overrides
5. **Add/edit bike** — including archive and full delete
6. **Sign in / account** — unit preference setting
7. **Settings** — theme toggle, notification preferences

---

## 8. Suggested Tech Stack

- **Frontend:** React, mobile-first responsive design, PWA (installable, required for iOS push)
- **Backend/DB/Auth:** Supabase — Postgres database, built-in auth with row-level security (needed for separate per-user accounts), JS client for sync
- **Push notifications:** Web Push API + service worker; Supabase Edge Functions (or a small serverless function) to trigger sends when a reminder crosses its threshold
- **Hosting:** Vercel or Netlify

---

## 9. Build Phases Summary

1. **Phase 1 (MVP):** Auth (multi-user), bike CRUD, task logging (with DIY/shop + notes), dashboard status badges, push notifications, searchable per-bike history, light/dark theme
2. **Phase 2:** Photos, offline support, parts/component tracking
3. **Phase 3:** Export, shareable history link, optional cost tracking

---

## 10. Prompt to Give Claude When You're Ready to Build

> Build me a mobile-first React PWA for tracking bicycle maintenance across a fleet of bikes, for multiple separate user accounts (each user only sees their own bikes). Use Supabase for auth (with row-level security) and Postgres data storage.
>
> Data model: Users (unit preference), Bikes (name, type, photo, current mileage, unit override, notes, archived flag), Maintenance Logs (bike, task type, date, mileage, performed_by DIY/Shop, notes), Task Types (name, default interval in miles/days, editable preset list), Reminder Rules (per bike+task type interval, computed Due/Overdue/OK status).
>
> Screens: Dashboard (bikes with due/overdue badges), Bike detail (mileage update, tracked tasks with status, notes, searchable/filterable history), Log task form, Task type management, Add/edit bike (with archive + delete), Sign in, Settings (theme toggle, unit preference, notifications).
>
> Include push notifications for due/overdue tasks (Web Push API + service worker) and light/dark theme support.
>
> Start with the MVP: auth, bike CRUD, task logging, dashboard status badges, push notifications, searchable history, theme toggle. Leave photos, offline support, and parts tracking as a clearly separated Phase 2 in the code structure.

---

*Phases 2 and 3 are documented here so you don't lose the ideas, but handing Claude just the Phase 1 scope first is the lower-risk way to get a working app quickly.*
