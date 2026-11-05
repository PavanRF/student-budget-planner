# Student Budget Planner

Create SBP — Student Budget Planner, a full-stack, desktop-first personal finance web application tailored for university students. 

## 1. Product Philosophy & Core Rules
- Tone: Calm, editorial, honest, and non-judgmental. It never lectures students about money or uses patronizing warnings.
- Zero Sample Data: Every figure on screen must compute strictly from the signed-in student's live database records. Show clean empty states when no data exists.
- Core Loop: Log income → log expenses by category → set monthly category limits → automate recurring rent/allowance → fund savings goals → review spending pace → read an AI-written monthly review.
- Currency & Numbers: Default currency INR (₹), switchable in Settings (INR, USD, EUR, GBP, AUD, CAD, SGD, AED). Format all UI figures using Intl.NumberFormat with zero decimals and tabular numerals (`font-variant-numeric: tabular-nums`). Export CSVs with two decimal places.

---

## 2. Tech Stack & Architecture
- Framework: React 19 + TypeScript + Vite + Tailwind CSS with TanStack Start / Router.
- Database & Auth: Supabase (Postgres with Row-Level Security, Auth, Storage, and server functions).
- AI Engine: Lovable AI Gateway invoked via secure server functions (`createServerFn`), ensuring zero API keys or secrets reach the browser.
- Icons: Remix Icon CDN (`<link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />`). Render icons as `<i className="ri-xxx-line" />` inside `<span className="flex h-4 w-4 items-center justify-center">`. Do not install icon packages.
- UX & States: Every page and data widget must handle 3 states: Loading Skeleton, Error with Retry Button, and a friendly Empty State with a call to action. No browser `alert()` or `confirm()`—use toast notifications and custom dialogs.

---

## 3. Design System & Theme Tokens
Use a 5-role semantic palette defined in CSS variables using OKLCH channel scales (50→950):
- `background`: Page base, cards, panels, and muted containers.
- `foreground`: Neutral text, strong headers, and borders.
- `primary`: Money received, positive balances, spending less than last month, healthy pace.
- `accent`: Spending ahead of pace, budget overruns, warning thresholds, destructive actions.
- `secondary`: Neutral informational chips, suggestions, and supporting badges.
- Layout: Max-width 1240px container, stacked sections with 20px–24px gaps.
- Micro-labels: `text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/60`.
- Shape tokens: Rounded cards (`rounded-xl`), rounded inputs (`rounded-lg`), subtle card shadows, and backdrop blur on sticky navigation headers.

---

## 4. Database Schema (Postgres + RLS)
Enable Row-Level Security (RLS) on all tables with owner-only policies (`auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE):

1. `profiles`:
   - `id` (UUID, PK, references `auth.users(id)` ON DELETE CASCADE)
   - `full_name` (text), `currency` (text, default 'INR'), `monthly_budget` (numeric, default 0)
   - `created_at`, `updated_at` (timestamptz)

2. `income`:
   - `id` (UUID, PK, default `gen_random_uuid()`)
   - `user_id` (UUID, references `auth.users(id)` ON DELETE CASCADE)
   - `amount` (numeric, not null), `source` (text, not null), `description` (text)
   - `transaction_date` (date, not null), `is_recurring` (boolean, default false)
   - `created_at`, `updated_at` (timestamptz)

3. `expenses`:
   - `id` (UUID, PK, default `gen_random_uuid()`)
   - `user_id` (UUID, references `auth.users(id)` ON DELETE CASCADE)
   - `amount` (numeric, not null), `category` (text, not null), `description` (text)
   - `transaction_date` (date, not null), `is_recurring` (boolean, default false)
   - `created_at`, `updated_at` (timestamptz)

4. `budgets`:
   - `id` (UUID, PK, default `gen_random_uuid()`)
   - `user_id` (UUID, references `auth.users(id)` ON DELETE CASCADE)
   - `month` (date, not null, stored as first of month `YYYY-MM-01`)
   - `category` (text, not null), `limit_amount` (numeric, not null)
   - Unique constraint on `(user_id, month, category)`
   - `created_at`, `updated_at` (timestamptz)

5. `savings_goals`:
   - `id` (UUID, PK, default `gen_random_uuid()`)
   - `user_id` (UUID, references `auth.users(id)` ON DELETE CASCADE)
   - `name` (text, not null), `target_amount` (numeric, not null)
   - `saved_amount` (numeric, default 0), `target_date` (date)
   - `created_at`, `updated_at` (timestamptz)

6. `savings_contributions`:
   - `id` (UUID, PK, default `gen_random_uuid()`)
   - `user_id` (UUID, references `auth.users(id)` ON DELETE CASCADE)
   - `goal_id` (UUID, references `savings_goals(id)` ON DELETE CASCADE)
   - `amount` (numeric, not null), `note` (text), `contributed_on` (date, not null)
   - `created_at` (timestamptz)

7. `recurring_rules`:
   - `id` (UUID, PK, default `gen_random_uuid()`)
   - `user_id` (UUID, references `auth.users(id)` ON DELETE CASCADE)
   - `type` (text, check in ('income', 'expense'))
   - `amount` (numeric, not null), `category_or_source` (text, not null)
   - `description` (text), `day_of_month` (integer, check between 1 and 31)
   - `is_active` (boolean, default true), `last_logged_date` (date)
   - `created_at`, `updated_at` (timestamptz)

8. `ai_insights`:
   - `id` (UUID, PK, default `gen_random_uuid()`)
   - `user_id` (UUID, references `auth.users(id)` ON DELETE CASCADE)
   - `prompt` (text), `response` (jsonb), `kind` (text, check in ('analysis', 'question'))
   - `created_at` (timestamptz)

---

## 5. Fixed Vocabularies & Icons
- Expense Categories (8):
  - Food: `ri-restaurant-2-line`
  - Transportation: `ri-bus-2-line`
  - Education: `ri-book-open-line`
  - Shopping: `ri-shopping-bag-3-line`
  - Entertainment: `ri-film-line`
  - Accommodation: `ri-home-4-line`
  - Health: `ri-heart-pulse-line`
  - Other: `ri-more-2-line`
- Income Sources (5):
  - Pocket money: `ri-wallet-3-line`
  - Scholarship: `ri-award-line`
  - Part-time job: `ri-briefcase-line`
  - Freelancing: `ri-macbook-line`
  - Other income: `ri-add-circle-line`

---

## 6. App Shell & Navigation
- Fixed 264px Dark Sidebar (or mobile slide-out drawer):
  - Brand header: SBP wallet mark + "Student Budget Planner".
  - Section label: "Workspace".
  - Navigation links with Remix Icons: Dashboard (`/`), Income (`/income`), Expenses (`/expenses`), Recurring (`/recurring`), Budgets (`/budgets`), Savings Goals (`/savings`), Statement (`/statement`), AI Coach (`/assistant`), Settings (`/settings`).
  - Active item styled with solid primary highlight.
  - Bottom Account Card: User monogram avatar, full name, email, and sign-out button.
- Sticky Blurred Header: Displays active section name, current calendar month, "Live data" status badge, and student avatar.
- Automated Recurring Engine: On app entry, check active `recurring_rules` whose `day_of_month <= current_day` and haven't logged for this month; automatically insert transactions tagged with `is_recurring: true`.

---

## 7. Detailed Screen Specifications

### 7.1 Authentication (`/login`, `/signup`, `/forgot-password`, `/reset-password`)
- Clean, centered card layout.
- Support Email/Password, Google OAuth, and Lovable Auth.
- On user signup or first session, upsert a default row into `public.profiles` with `currency: 'INR'`.

### 7.2 Dashboard (`/`)
1. Greeting: Time-of-day greeting ("Good morning, [Name]") with month micro-label and quick-action buttons ("+ Add Income", "+ Add Expense").
2. First-Run Setup Card: Displayed when no records exist, guiding the student to add initial income and set budget limits.
3. Summary Strip (4 Cards):
   - Monthly Income (total inflows this month)
   - Monthly Expenses (total outflows this month with category count)
   - Net Remaining (income - expenses; styled accent when negative)
   - Total Savings (sum of all saved goals with active goals count)
4. Spending Pace Engine Card:
   - Header: "Day X of Y · Z% of month elapsed"
   - Status Chip: "₹X under pace" (primary) / "₹X ahead of pace" (accent) / "Right on pace"
   - Visual comparison: "Should be at" (Plan × day/days_in_month) vs "You're at" (actual spend).
   - Plan Source: Sum of active category budgets → fallback to profile `monthly_budget` → fallback to month's total income.
   - Progress bar with a 2px vertical pace pin showing today's position.
   - Footer: "Leaves ₹X/day for remaining Y days" or "Over by ₹X/day".
5. Analytics Charts:
   - Income vs. Expenses Bar Chart (6-month historical comparison).
   - Category Distribution Chart ("Where it went" breakdown for current month).
6. Budget Utilisation Card:
   - Overall percentage bar, spent vs limits, and top 4 category progress bars with quick link to `/budgets`.
7. Savings Goal Rings:
   - Radial progress rings for active savings goals with goal titles and completion percentages, linking to `/savings`.
8. Recent Transactions:
   - Merged list of latest 6 income and expense rows for the month, sorted newest first with category icon, note, date, and signed amount.
9. Month-over-Month Comparison Strip:
   - High-level delta vs last month.
   - Category grid showing spend delta with badges: up-arrow % (accent), down-arrow % (primary), "New", or "None".

### 7.3 Income Page (`/income`)
- Header with "Export CSV" and "+ Add Income" button.
- 4 Stat tiles: Filtered total, Entry count, Average entry, All-time income.
- Filter toolbar: Search (source, description, amount), Month dropdown, Source filter.
- Transactions list: Source icon, source name, description, date, amount, edit/delete actions.
- Add/Edit modal and confirmation dialog for deletions.

### 7.4 Expenses Page (`/expenses`)
- Header with "Export CSV" and "+ Add Expense" button.
- 4 Stat tiles: Filtered total, Entry count, Largest expense, Top category.
- Filter toolbar: Search (category, description, amount), Month dropdown, Category filter.
- Transactions list: Category icon, category name, description, date, amount, edit/delete actions.
- Add/Edit modal and confirmation dialog for deletions.

### 7.5 Budgets Page (`/budgets`)
- Month selector (last 6 months) and "Add limit" modal.
- 4 Stat tiles: Total limits set, Total spent, Remaining budget, Unbudgeted spend (expenses in categories without limits).
- Monthly limits card:
  - Overall progress bar.
  - Month-over-month summary: e.g. "vs [Prev Month] · 2 raised · 1 cut · 1 new · 3 unchanged".
  - Category list with limit vs spent, percentage bar (turns accent when > 100%), and remaining/over balance.

### 7.6 Savings Goals (`/savings`)
- Summary tiles: Total saved, Total targets, Active goals, Monthly contributions.
- Goals Grid:
  - Card per goal with circular progress ring, saved amount vs target, target date countdown badge.
  - "+ Add money" button opening contribution modal (amount, note, date).
- Goal Detail View:
  - Drawer or modal showing contribution timeline with delete/edit options.

### 7.7 Recurring Transactions (`/recurring`)
- Summary header showing total monthly recurring commitments and net recurring balance.
- Rule list / table: Type (Income/Expense), Category or Source, Description, Amount, Day of month (1–31), Active toggle, Last logged date, Edit/Delete actions.
- Add/Edit Recurring Rule modal.

### 7.8 Print-Friendly Monthly Statement (`/statement`)
- Month picker and "Print / Save PDF" button calling `window.print()`.
- Dedicated `@media print` styling: hides sidebar and navigation, formats content for clean A4 printing.
- Executive summary: Inflow, Outflow, Net Saved, Budget Adherence %.
- Detailed itemized tables: Categorized Incomes, Categorized Expenses, Budget vs Actual Variance, Savings Contributions.

### 7.9 AI Financial Coach (`/assistant`)
- Structured Monthly Review:
  - Button to analyze selected month.
  - Aggregates user's financial telemetry and calls Lovable AI Gateway via server function.
  - Returns structured response: `headline`, `highlights` (3 bullets), `pacing_note`, and `recommended_action`.
- Interactive Financial Q&A:
  - Freeform chat prompt (e.g. "Can I afford dinner out this Friday?").
  - AI calculates real-time remaining budget headroom and replies objectively without lecturing.
  - Saves exchange history to `ai_insights`.

### 7.10 Settings Page (`/settings`)
- Profile details: Full name update and avatar monogram.
- Currency selection: Switch between INR, USD, EUR, GBP, AUD, CAD, SGD, AED.
- Default monthly target budget setting.
- Data export: Single-click export of all transactions as combined CSV or JSON.
- Sign out with confirmation dialog.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c9c7b54e-6fed-4b7b-ab11-e6921446146a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
