# Status Window

A personal, RPG-style life-gamification habit tracker. Log real tasks (thesis
work, freelance work, exercise, prayer, study, chores…), earn points across
eight life stats, and build streaks — without a punishing design. This is
**Phase 1** of the multi-phase build described in the product spec: core
stats, a radar-chart stat wheel, flexible logging (duration, count, word
count, or project stages), streaks with freezes/grace, history, template
management, and a light/dark theme. Evidence uploads, AI auto-scoring, and
quests come in later phases.

**Logging isn't just minutes.** Each task template picks how it's measured:
- **Duration** — minutes (workouts, freelance sessions…)
- **Count** — a plain count (glasses of water, prayers, pages of Quran, meals…)
- **Words** — word count (thesis writing measured by output, not time)
- **Stage** — a milestone from an ordered list (a project moving through
  Research → Draft → Revision → Submitted); points are the difference
  between the stage you just reached and the highest one before it, so
  skipping ahead still awards correctly and re-logging the same stage doesn't
  double-count.

## Stack

- React + Vite + Tailwind CSS (frontend)
- Supabase — Postgres + Auth + Realtime (backend/sync)
- Recharts for the radar/spider stat chart
- Installable PWA (works on iPad, Mac, Android via the browser's
  "Add to Home Screen" / install prompt)
- Light/dark theme, toggled from the sun/moon button (top of Dashboard or
  Settings), defaults to your system preference, persisted locally
- Deploys to Vercel or Netlify for free

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, go to **SQL Editor**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   the `stats`, `task_templates`, `logs`, and `streaks` tables, turns on
   row-level security so only you can read/write your own rows, and sets up
   a trigger that seeds your 8 stats (including Religion) + starter task
   templates covering every metric type the moment you sign up. If you'd
   already run an earlier version of this file, it's safe to re-run — it
   migrates existing columns forward instead of dropping anything.
3. Go to **Authentication > Providers** and make sure **Email** is enabled.
   Since this is a single-user personal app, you can also turn off "Confirm
   email" under **Authentication > Settings** so you can sign in immediately
   after creating your account (optional, just convenience).
4. Go to **Settings > API** and copy your **Project URL** and **anon public
   key** — you'll need them next.

## 2. Configure the app

```bash
cp .env.example .env
```

Open `.env` and paste in your Project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is safe to ship to the browser — row-level security in
`schema.sql` is what actually protects your data.

## 3. Run it locally

```bash
npm install
npm run dev
```

Open the printed local URL, click **Create account**, sign in, and you
should land on the dashboard with your 8 stats, a radar chart, and a handful
of starter templates already seeded — one per metric type — so you can see
how duration/count/words/stage logging differ (feel free to edit or delete
them in Settings, they're just a starting point).

## 4. Deploy

Push this folder to a GitHub repo, then import it into
[Vercel](https://vercel.com) (or Netlify). Set the same two environment
variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the project's
dashboard settings, deploy, and open the URL on your phone/iPad/Mac to
install it as a PWA ("Add to Home Screen" on iOS/Android, the install icon
in the address bar on desktop Chrome/Edge).

**Note on icons:** the app ships with a single scalable SVG icon
(`public/icon.svg`), which is enough for Android and desktop installs. iOS's
home-screen icon rendering is more reliable with a real PNG — if the iPad
icon looks off, export `icon.svg` to a 512×512 PNG and point
`apple-touch-icon` in `index.html` at it.

## How the pieces fit together

- **`src/lib/scoring.js`** — the points formulas. `amountFactor()` handles
  duration/count/words tasks alike (it's genuinely the same rise-to-optimal
  / diminishing-returns curve regardless of whether the unit is minutes,
  glasses, or words) and is the piece Phase 4 ("overdoing penalty curves")
  will replace. `calculateStagePoints()` is the separate, simpler formula
  for milestone/project tasks.
- **`src/lib/streaks.js`** — pure functions for streak advancement, freezes,
  and the 2-day grace window. No Supabase calls in here, so the rules are
  easy to tweak and unit-test in isolation.
- **`src/lib/submitLog.js`** — ties scoring + stats + streaks together.
  `submitLog()` handles duration/count/words; `submitStageLog()` handles
  stage tasks (it also updates the template's `stage_index` so progress
  persists). This is the natural spot to hook in Phase 2 (evidence URLs are
  already a field on `logs`) and Phase 3 (swap the client-computed
  `points`/`stat_split` for an AI-suggested one before insert).
- **`src/context/ThemeContext.jsx`** — light/dark state, persisted to
  `localStorage`, toggled via `<ThemeToggle />`. Colors themselves live as
  CSS variables in `src/index.css` (`:root` = dark, `.light` = overrides) so
  adding a third theme later is a matter of adding another variable block.
- **`supabase/schema.sql`** — single source of truth for the data model.
  Re-run it any time; it's idempotent.
- **Stat colors/icons/level curve** live in `src/lib/statMeta.js` — change
  the level curve or add an 8th stat there and it propagates everywhere.

## Roadmap (from the product spec)

1. Done — Core loop: stats, manual quick-log, streaks, cloud sync, dashboard
2. Evidence-based logging — attach a YouTube link or course/article link
3. AI auto-scoring — LLM scores evidence against a fixed rubric, manual override
4. Overdoing penalty curves — replace the soft plateau with a real penalty
5. Quests & boss battles
6. Seasons/sprints aligned to the academic calendar
7. Rewards & avatar
8. Analytics & reflection dashboard
9. Calendar/fitness-tracker integrations

Build, use, and stress-test each phase before starting the next — that's
the whole philosophy behind keeping `submitLog.js` and `scoring.js` as thin,
swappable seams rather than baking everything into one big function now.
