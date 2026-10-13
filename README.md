# Hourbase

Time tracking and project profitability for freelancers, designers, consultants and small studios.
Hourbase answers four questions: where does my time go, what do I earn per hour, which projects are
running over, and which projects are actually worth it.

- **Demo mode** (no setup): realistic example data, stored only in your browser.
- **Supabase mode**: accounts, a Postgres database and Row Level Security, enabled by two env variables.

---

## Quick start

Requires Node.js 20.9+ (tested on Node 24).

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no Supabase variables set, the app runs in demo mode. No sign-in is
needed, and a banner makes clear that data never leaves the browser.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit tests + database schema/RLS tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

---

## Features

| Area | What's there |
| --- | --- |
| **Overview** | Time-aware greeting; today, this-week, active-project and revenue-per-hour cards; working-hours chart (week / 7 days / month / 30 days); time by project; recent entries; a live card for the active timer; quick actions |
| **Time Tracker** | Start, pause, resume, stop & save, and discard. Choose client → project, add a description, notes and billable status, and edit them while the timer runs. Manual entries with date, start/end, breaks and overnight sessions. Edit and delete entries, "continue" a past task, plus search, project filter and paging |
| **Projects** | Card and list views, search, filters (status, client, budget), sorting. Hourly or fixed price, rate, fee, estimate, currency, color, dates and notes. Complete, archive and reactivate. Delete is offered only when a project has no time. Detail page with estimate use, budget, revenue, effective rate, a 12-week chart and sessions |
| **Clients** | Search, active/archived filter, sorting, create/edit, and archive/restore. Delete is offered only when a client has no projects. Detail page with projects, hours, revenue and recent time |
| **Reports** | Today / this week / this month / last month / custom range, plus client, project and billable filters. Hours over time; hours by project and by client; billable split; estimated vs actual; revenue by project; profitability table; CSV export (detailed entries and per-project summary) |
| **Settings** | Display name, preferred currency, default hourly rate, time zone, week start, date and time formats, theme (dark default / light / system). Demo: remove example data, reset demo. Supabase: password reset email |
| **Auth** (Supabase) | Sign up, sign in, sign out, forgot/reset password, email-link callback, protected routes |

Mobile layouts use a bottom tab bar and bottom-sheet dialogs. Desktop layouts use a persistent sidebar.
The running timer is always visible in the top bar and in the browser tab title.

---

## How the timer stays accurate

The timer never counts interval ticks. It stores timestamps and derives elapsed time from them:

```
elapsed = accumulatedMs + (status === "running" ? now − segmentStartedAt : 0)
```

- **Pause** folds the current segment into `accumulatedMs` and records `pausedAt`.
- **Resume** starts a new segment.
- **Stop** saves an entry spanning `startedAt → now` (or `→ pausedAt` if paused). All paused time is
  stored as `breakSeconds`, so `duration = span − break = active time` exactly.
- Refreshing, closing the tab, or a throttled background tab never loses time. The once-per-second
  interval only re-renders the display.

**Multiple tabs and devices.** Each account has one active timer.
- **Demo mode:** every write re-reads storage first, and other tabs update instantly through the
  `storage` event. Starting a second timer is rejected.
- **Supabase mode:** `active_timers.user_id` is `UNIQUE`, so a second timer cannot exist. Same-browser
  tabs sync through `BroadcastChannel`, and other devices resync on focus. Stopping goes through the
  `finish_timer` SQL function, which deletes the timer and inserts the entry in one transaction, so a
  session can't be saved twice.
- If a tab acts on a timer that was already stopped elsewhere, it resyncs and explains what happened.

Pure timer logic lives in `src/lib/timer.ts` and is unit-tested.

---

## How revenue is calculated

These definitions are also shown in-app (Reports → "How revenue is calculated", plus tooltips).

| Term | Hourly project | Fixed-price project |
| --- | --- | --- |
| **Agreed fee** | — | The contract value |
| **Estimated revenue** | estimated hours × rate | the agreed fee |
| **Recorded (earned) revenue** | billable hours × rate | the fee, spread over tracked hours (below) |
| **Effective rate** | recorded revenue ÷ *all* tracked hours | agreed fee ÷ *all* tracked hours |

- The rate is the project's own rate, or your default rate if the project has none.
- Non-billable hours earn nothing, but they count as worked time. On hourly projects they lower the
  effective rate below the billing rate. On fixed projects they dilute the fee like any other hour.
- **Period revenue for fixed projects:** hours in the period × (fee ÷ lifetime project hours). All
  periods add up to exactly the agreed fee, so revenue is never double-counted. A period's share shifts
  as more hours are logged, which is intended: overruns show up as a lower rate.
- Estimates are never added to recorded revenue.
- **Not tracked:** payments received, invoices, expenses and taxes. Recorded revenue is not profit, and
  the UI never calls it that.
- **Currencies are never converted.** Totals show your preferred currency first, then any others
  separately (e.g. `$4,082 + €1,200`). Revenue per hour is computed per currency.
- **Periods:** an entry counts toward the day it *starts*, in your configured time zone.

The logic lives in `src/lib/calculations.ts` and is unit-tested.

---

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema, using either:
   - the SQL editor: paste and run `supabase/migrations/20261012000000_initial_schema.sql`, or
   - the CLI: `supabase link --project-ref <ref>` then `supabase db push`.
3. **Authentication → URL Configuration:**
   - Set **Site URL** to your app URL (e.g. `http://localhost:3000`).
   - Add `http://localhost:3000/auth/callback` (and your production equivalent) to **Redirect URLs**.
4. Copy `.env.example` to `.env.local` and fill in:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # or the legacy anon key
   ```
5. Restart `npm run dev`. You'll be sent to `/login`. Create an account (confirm the email if
   confirmations are on).

> Never put the `service_role` / secret key in this app. It isn't needed, and anything prefixed
> `NEXT_PUBLIC_` is shipped to the browser.

**What the schema enforces** (verified by `supabase/tests/schema.test.ts` against real Postgres via PGlite):
- RLS on every user-owned table. Users only see and change their own rows, and anonymous users get nothing.
- Composite foreign keys `(parent_id, user_id)`, so an entry can only reference the user's own
  project, and a project only their own client.
- `ON DELETE RESTRICT`: deleting a client with projects, or a project with time, fails. The UI offers
  archiving instead. History is never silently removed.
- Check constraints for end > start, break < span, positive rates, fixed projects needing a fee,
  deadline ≥ start, and consistent timer states. Plus one active timer per user.
- `duration_seconds` is a generated column (derived, not duplicated state). No other totals are stored.
- A sign-up trigger creates the `profiles` row that holds preferences.

---

## Architecture

```
src/
  app/
    (app)/            overview, tracker, projects[/id], clients[/id], reports, settings
    (auth)/           login, signup, forgot-password, auth/update-password
    auth/callback/    email-link code exchange (route handler)
  components/
    ui/               Button, Field/Input/Select, Modal (<dialog>), Toast, Confirm, Menu, Segmented, Switch, InfoTip…
    layout/           AppShell, Sidebar, MobileNav, TopBar, ActiveTimerPill, DemoBanner, withData
    providers/        DataProvider (state + mutations), AppActions (global dialogs), ThemeController
    charts/           HoursChart (Recharts), BarList, BillableSplit, EstimateBullets
    tracker/ entries/ projects/ clients/ reports/ shared/ auth/ brand/
  hooks/              useNow, useRevenueContext / useProjectStats / useLookups
  lib/
    data/             repository.ts (interface), local-repository.ts, supabase-repository.ts, seed.ts
    supabase/         config, browser/server clients, session proxy
    timer.ts time.ts calculations.ts reports.ts validation.ts format.ts csv.ts colors.ts brand.ts
  proxy.ts            refreshes the Supabase session and protects routes (Next 16 "proxy", formerly middleware)
supabase/
  migrations/         schema, constraints, indexes, RLS, finish_timer()
  tests/              schema + RLS tests on PGlite
```

- **One data contract.** `DataRepository` is the only persistence API the UI uses. `LocalRepository`
  and `SupabaseRepository` both implement it. The adapter is chosen once, based on whether the Supabase
  env vars are present.
- **Computed, never stored.** Every dashboard number is derived from clients, projects and entries in
  memory, so edits and deletes update every metric immediately.
- **Time zones.** All ranges (today, week, month) are computed in the user's configured zone with
  `@date-fns/tz`. Entries are stored as UTC instants.
- **Rebranding.** Change `src/lib/brand.ts`, the `LogoMark` SVG, `src/app/icon.svg`, and the color
  tokens in `src/app/globals.css`.

## Deployment

Works on any Next.js host (Vercel, Netlify, Node server):

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the host's environment.
   Omit both to deploy a public demo.
2. Add `https://your-domain/auth/callback` to Supabase redirect URLs and set the Site URL.
3. Build command `npm run build`, start command `npm start`, or the platform default for Next.js.

---

## Product decisions

- **A project is required to track time.** Every hour belongs to something billable or internal.
  Internal projects (no client) cover admin and business development.
- **Overlapping manual entries are allowed but flagged.** Some freelancers bill parallel work, so
  overlaps are warned about rather than blocked. Only *active* timers are strictly limited to one.
- **Overnight manual entries:** an end time earlier than the start time means the next day.
- **Archived clients and completed or archived projects** keep all history in reports, but drop out of
  pickers for new time.
- **Demo data** is generated relative to today, so the current week always has data. Example records
  carry an "Example" badge and can be removed without touching your own records.
- **Data loading:** all of a user's records are loaded at once. That's fine for years of freelance
  data, but large teams would need server-side pagination and aggregation.

## Not included yet / needs configuration

- **Supabase** must be configured (above) for accounts and cloud storage. Without it, data stays in
  one browser.
- **Payments, invoices, expenses and taxes aren't tracked**, so revenue is never presented as profit.
  The data model leaves room for `payments` and `expenses` tables.
- **No currency conversion.** Mixed currencies are reported separately.
- **Cross-device timer sync** happens on window focus, not via Supabase Realtime. Supabase Realtime
  would make it instant.
- **No team or multi-user workspaces.** Each account is a single user.
- **No OAuth / magic-link sign-in.** Email + password only; adding providers is a Supabase dashboard
  change plus a button.
- **No PDF reports.** Export is CSV.
