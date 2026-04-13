# Household Ledger

[한국어](README.ko.md)

> A personal finance app built with Rails 8 — zero external dependencies, SPA-level UX, no JavaScript framework.

## Highlights

- **Zero infrastructure** — SQLite + Solid Trifecta (Queue, Cache, Cable). No Redis, no npm, no separate DB server.
- **SPA without the SPA** — Hotwire (Turbo + Stimulus) delivers real-time updates, modals, and partial page swaps with zero JavaScript framework.
- **Credit card installment auto-splitting** — Enter a 12-month installment once; the app generates all 12 payment entries with correct billing dates.
- **Giving/receiving event tags** — Track who you gave gifts to or received from, with calendar dot indicators. A feature no commercial app offers.
- **Full Korean localization** — Dates, currency, UI labels, Pretendard font. Built for daily use in Korean.
- **Migrated from React + FastAPI + PostgreSQL** — Collapsed a 3-server stack into a single `bin/dev` process.

<!-- TODO: Add screenshots -->

## Why I Built This

I tried multiple finance apps, but none had everything I wanted in one place — automatic installment splitting, giving/receiving event tagging, purchase-date vs. payment-date statistics toggle. Features existed across different apps, but never together.

The first version was built with React + FastAPI + PostgreSQL — I was using React at work but knew nothing about it, so I learned step by step while building this app. Later, I heard about Rails 8's Solid Trifecta (Queue, Cache, Cable) — queue, cache, and WebSocket support without Redis. I wanted to broaden my language horizons, and a Rails monolith felt like a better fit for maintaining a personal project. So I **migrated entirely to Rails 8**.

## Features

| Area | Capabilities |
|------|-------------|
| **Transactions** | Income/expense CRUD, confirmed/scheduled/pending status, hierarchical categories (2-level), drag-and-drop reordering, custom icons & colors |
| **Credit Cards** | Card registration, default card, installment auto-splitting (UUID grouping), billing-day-based date calculation, purchase vs. payment date toggle |
| **Tags** | General / giving / receiving types, link to transactions or record standalone, calendar color dots, last-usage tracking |
| **Recurring** | Weekly/monthly/yearly templates, variable amounts, soft delete for history |
| **Statistics** | Category pie/bar charts, 6-month rolling trends, parent category grouping, purchase/payment date toggle |
| **Assets** | Reconcile recorded vs. actual balances, classify as missing income or expense |
| **UX** | Dark mode (system + toggle), responsive (mobile tabs + desktop sidebar), Turbo Frame modals, real-time Turbo Stream updates |

## Tech Stack

| Area | Technology | Notes |
|------|-----------|-------|
| **Framework** | Ruby on Rails 8.1 | Fullstack monolith |
| **Language** | Ruby 3.3+ | rbenv managed |
| **Database** | SQLite | File-based, no server |
| **Auth** | Devise | Email/password |
| **Frontend** | ERB + Hotwire | Turbo + Stimulus |
| **CSS** | Tailwind CSS + Propshaft | Utility-first |
| **JS** | importmap-rails | No npm needed |
| **Jobs / Cache / WS** | Solid Queue / Cache / Cable | DB-backed, no Redis |
| **Charts** | Chartkick + Groupdate | |
| **Deployment** | Kamal + Docker | |

## Architecture

```
Browser Request
    -> Router (config/routes.rb)
        -> Controller (app/controllers/)
            -> Model (app/models/)        <- ActiveRecord ORM
            -> View (app/views/)          <- ERB templates
        -> Response (HTML or Turbo Stream)
            -> Turbo Frame swap (partial update)
            -> Stimulus Controller (client interaction)
```

## Data Model

```
User (Devise)
 |-- has_many :categories
 |    +-- parent_id (self-ref, 2-level hierarchy)
 |-- has_many :transactions
 |    |-- belongs_to :category
 |    |-- belongs_to :credit_card (optional)
 |    |-- belongs_to :recurring_transaction (optional)
 |    |-- has_many :taggings
 |    +-- installment_group (UUID for installment grouping)
 |-- has_many :tags
 |    +-- tag_type: general / giving / receiving
 |-- has_many :taggings
 |    |-- belongs_to :tag
 |    +-- belongs_to :transaction (optional, standalone allowed)
 |-- has_many :credit_cards
 |    +-- payment_day (1-28), is_default
 |-- has_many :recurring_transactions (soft delete)
 |    +-- frequency: weekly / monthly / yearly
 +-- has_many :asset_adjustments
      +-- adjustment_type: income_missing / expense_missing
```

### Design Decisions

- **STI Avoidance** — Uses `transaction_type`, `adjustment_type` instead of Rails' reserved `type` column
- **Soft Delete** — `discard` gem with `discarded_at` column
- **Multi-user** — All tables scoped via `user_id` FK
- **Installment Grouping** — UUID `installment_group` tracks split payments across months
- **Flexible Tagging** — Tags attach to transactions or stand alone as independent events

## Screens

| Screen | Path | Description |
|--------|------|-------------|
| **Dashboard** | `/` | Monthly calendar + income/expense/asset summary |
| **Daily Detail** | `/dashboard/daily_transactions` | Transaction list + category breakdown |
| **Transaction Entry** | `/transactions/new` | Modal form with category tree, tags, installments |
| **Categories** | `/categories` | Drag-and-drop sorting, icon/color editing |
| **Tags** | `/tags` | Type-grouped display, last usage date |
| **Statistics** | `/statistics/:id` | Category pie chart + monthly trends |
| **Credit Cards** | `/credit_cards` | Card registration, billing day |
| **Recurring** | `/recurring_transactions` | Template CRUD |

<!-- TODO: Add screenshots -->

## Setup

**Requirements:** Ruby 3.3+ (rbenv recommended), SQLite 3

```bash
bundle install
bin/rails db:create db:migrate
bin/dev
# -> http://localhost:3000
```

## Documentation

Project documentation is split by authorship:

| Path | Content |
|------|---------|
| [`docs/`](docs/README.md) | Claude-authored phase specs, guides, backend snapshot |
| [`docs/backend-overview.md`](docs/backend-overview.md) | Current Rails backend snapshot — routes, models, controllers, gems, TODOs |
| [`docs/phases/`](docs/phases/) | Phase-by-phase learning specs (populated as Rails 8 study proceeds) |
| [`docs/plans/`](docs/plans/) | `/tdd-plan` and other design docs (optional) |
| [`learnings/`](learnings/README.md) | User-authored Q&A, retrospectives, cross-cutting topics |
| [`learnings/retrospectives/rails-migration.md`](learnings/retrospectives/rails-migration.md) | Full narrative of the React + FastAPI → Rails 8 rewrite (Devise, Solid Queue, i18n, data migration) |

## Migration Story

**Before:** React SPA + FastAPI + PostgreSQL — 3 servers, CORS headaches, client state complexity.

**After:** Rails 8 monolith — single process, SQLite file, Solid Trifecta (no Redis), Hotwire (no JS framework).

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Rails init + Devise auth | Done |
| 2 | Data models + migrations | Done |
| 3 | Core CRUD + dashboard | Done |
| 4 | Calendar view + statistics | Done |
| 5 | Credit cards + installments | Done |
| 6 | Tagging system | Done |
| 7 | Recurring transaction scheduler | -- |
| 8 | Data migration (596 records) | -- |
| 9 | Docker deployment | -- |

> Legacy code preserved on the `legacy/react-fastapi` branch.

## License

This project is licensed under the [MIT License](LICENSE).
