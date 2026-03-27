# Household Ledger (가계부)

> Ruby on Rails 8 기반 개인 재무 관리 풀스택 애플리케이션

React + FastAPI + PostgreSQL 아키텍처에서 **Rails 모놀리스**로 전면 이관한 프로젝트입니다.
SPA 없이도 SPA 수준의 인터랙티브 UX를 Hotwire(Turbo + Stimulus)로 구현하며, Rails 8의 Solid Trifecta(Queue, Cache, Cable)를 활용하여 **Redis 없이 완전한 기능**을 제공합니다.

---

## 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [아키텍처](#아키텍처)
- [데이터 모델](#데이터-모델)
- [화면 구성](#화면-구성)
- [개발 환경 설정](#개발-환경-설정)
- [마이그레이션 스토리](#마이그레이션-스토리)

---

## 주요 기능

### 거래 관리
- 수입/지출 CRUD (확인됨/예정/보류 상태 관리)
- 카테고리 분류 (2단계 계층: 부모 → 하위 카테고리)
- 카테고리별 아이콘 및 색상 커스터마이징 (Lucide Icons)
- 드래그 앤 드롭 카테고리 순서 변경

### 신용카드 결제
- 신용카드 등록 및 기본 카드 설정
- 할부 결제 자동 분할 (UUID 그룹핑)
- 결제일 기반 자동 날짜 계산
- 구매일 vs 결제일 기준 통계 전환

### 태깅 시스템
- 범용 / 베푼 것 / 받은 것 3가지 태그 유형
- 거래에 연결하거나 독립 이벤트로 기록 가능
- 달력에 태그별 색상 도트 표시
- 마지막 사용일 추적

### 반복 거래
- 주간/월간/연간 반복 템플릿
- 변동 금액 지원 (매번 금액 입력)
- Soft Delete로 이력 보존

### 통계 및 시각화
- 카테고리별 지출 파이/바 차트 (Chartkick)
- 월별 트렌드 비교 (6개월 롤링)
- 부모 카테고리 기준 그룹화
- 구매일/결제일 기준 전환

### 자산 보정
- 실제 자산과 기록 차이 조정
- 누락 수입/지출 유형 분류

### UX
- 다크 모드 (시스템 연동 + localStorage 토글)
- 반응형 레이아웃 (모바일 하단 탭 + 데스크톱 사이드바)
- Turbo Frame 기반 모달 시스템
- 실시간 Turbo Stream 업데이트 (페이지 새로고침 없음)
- 한국어 완전 로컬라이징 (날짜, 통화, UI 전체)
- Pretendard 폰트 (한국어 최적화)

---

## 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| **프레임워크** | Ruby on Rails 8.1 | 풀스택 모놀리스 |
| **언어** | Ruby 3.3+ | rbenv 관리 |
| **데이터베이스** | SQLite | 파일 기반, 서버 불필요 |
| **인증** | Devise + devise-i18n | 이메일/비밀번호, Session/Cookie |
| **프론트엔드** | ERB + Hotwire (Turbo + Stimulus) | SPA 없이 SPA 같은 UX |
| **CSS** | Tailwind CSS + Propshaft | 유틸리티 우선 + 모던 에셋 파이프라인 |
| **JS 관리** | importmap-rails | npm/bundler 불필요, ES 모듈 |
| **백그라운드 작업** | Solid Queue | DB 기반 Job 큐 (Rails 8 내장) |
| **캐싱** | Solid Cache | DB 기반 캐시 (Redis 불필요) |
| **WebSocket** | Solid Cable | DB 기반 ActionCable |
| **차트** | Chartkick + Groupdate | 데이터 시각화 |
| **달력** | simple_calendar | 월별 캘린더 뷰 |
| **Soft Delete** | discard | `discarded_at` 기반 |
| **배포** | Kamal + Docker | 컨테이너 배포 |
| **아이콘** | Lucide Icons | CDN 제공 |

---

## 아키텍처

### Rails MVC + Hotwire

```
브라우저 요청
    → Router (config/routes.rb)
        → Controller (app/controllers/)
            → Model (app/models/)        ← ActiveRecord ORM
            → View (app/views/)          ← ERB 템플릿
        → 응답 (HTML 또는 Turbo Stream)
            → Turbo Frame 교체 (부분 갱신)
            → Stimulus Controller (클라이언트 인터랙션)
```

### 프로젝트 구조

```
household_ledger/
├── app/
│   ├── controllers/          # 10개 컨트롤러 (~1,500 LOC)
│   │   ├── dashboard_controller.rb       # 월별 달력 + 일별 상세
│   │   ├── transactions_controller.rb    # 거래 CRUD + 할부 처리
│   │   ├── categories_controller.rb      # 계층형 카테고리 관리
│   │   ├── tags_controller.rb            # 태깅 시스템
│   │   ├── credit_cards_controller.rb    # 신용카드 관리
│   │   ├── statistics_controller.rb      # 차트 데이터
│   │   └── recurring_transactions_controller.rb
│   │
│   ├── models/               # 8개 모델 (~500 LOC)
│   │   ├── user.rb           # Devise 인증 + 기본 카테고리/태그 자동 생성
│   │   ├── transaction.rb    # 수입/지출, 상태, 할부 그룹
│   │   ├── category.rb       # 2단계 계층 (parent → child)
│   │   ├── tag.rb            # general/giving/receiving 유형
│   │   ├── tagging.rb        # 태그 ↔ 거래 다대다 (독립 가능)
│   │   ├── credit_card.rb    # 결제일, 기본 카드
│   │   ├── recurring_transaction.rb  # 반복 템플릿 + Soft Delete
│   │   └── asset_adjustment.rb       # 자산 보정
│   │
│   ├── views/                # ERB 템플릿 (~2,500 LOC)
│   │   ├── layouts/          # 사이드바, 네비게이션, 모달 프레임
│   │   ├── dashboard/        # 달력 뷰 + 요약 카드
│   │   ├── transactions/     # 폼 + Turbo Stream 응답
│   │   ├── statistics/       # 차트 + 트렌드
│   │   └── ...
│   │
│   ├── javascript/controllers/   # 21개 Stimulus 컨트롤러 (~1,500 LOC)
│   │   ├── calendar_controller.js
│   │   ├── category_selector_controller.js
│   │   ├── card_payment_controller.js
│   │   ├── sortable_controller.js
│   │   └── ...
│   │
│   └── helpers/
│       └── application_helper.rb  # 통화 포맷, 아이콘, 배지
│
├── config/
│   ├── routes.rb             # RESTful 라우팅
│   └── locales/ko.yml        # 한국어 완전 로컬라이징
│
├── db/
│   └── migrate/              # 13개 마이그레이션 (Feb~Mar 2026)
│
└── docs/
    └── rails-migration-guide.md  # 9-Phase 마이그레이션 가이드
```

---

## 데이터 모델

```
User (Devise)
 ├── has_many :categories
 │    └── parent_id (self-ref, 2단계 계층)
 ├── has_many :transactions
 │    ├── belongs_to :category
 │    ├── belongs_to :credit_card (optional)
 │    ├── belongs_to :recurring_transaction (optional)
 │    ├── has_many :taggings
 │    └── installment_group (UUID, 할부 그룹핑)
 ├── has_many :tags
 │    └── tag_type: general / giving / receiving
 ├── has_many :taggings
 │    ├── belongs_to :tag
 │    └── belongs_to :transaction (optional, 독립 태그 가능)
 ├── has_many :credit_cards
 │    └── payment_day (1-28), is_default
 ├── has_many :recurring_transactions (soft delete)
 │    └── frequency: weekly / monthly / yearly
 └── has_many :asset_adjustments
      └── adjustment_type: income_missing / expense_missing
```

### 설계 특징

- **STI 회피**: Rails의 `type` 예약어 대신 `transaction_type`, `adjustment_type` 사용
- **Soft Delete**: `discard` gem으로 `discarded_at` 기반 소프트 삭제
- **다중 사용자**: 모든 테이블이 `user_id` FK로 스코핑
- **할부 그룹핑**: UUID `installment_group`으로 분할 결제 추적
- **유연한 태깅**: 거래에 연결하거나 독립 이벤트로 기록 가능

---

## 화면 구성

| 화면 | 경로 | 설명 |
|------|------|------|
| **대시보드** | `/` | 월별 캘린더 + 수입/지출/자산 요약 카드 |
| **일별 상세** | `/dashboard/daily_transactions` | 선택 날짜의 거래 목록 + 카테고리 비율 |
| **거래 입력** | `/transactions/new` | 모달 폼 (카테고리 트리, 태그 선택, 카드 할부) |
| **카테고리 관리** | `/categories` | 드래그 앤 드롭 정렬, 아이콘/색상 편집 |
| **태그 관리** | `/tags` | 유형별 그룹, 마지막 사용일 표시 |
| **통계** | `/statistics/:id` | 카테고리 파이차트 + 월별 트렌드 |
| **신용카드** | `/credit_cards` | 카드 등록, 결제일 설정 |
| **반복 거래** | `/recurring_transactions` | 템플릿 CRUD |

---

## 개발 환경 설정

### 요구사항

- Ruby 3.3+ (rbenv 권장)
- SQLite 3

### 실행

```bash
# 의존성 설치
bundle install

# DB 생성 및 마이그레이션
bin/rails db:create db:migrate

# 개발 서버 시작 (Rails + Tailwind CSS watch)
bin/dev

# 접속: http://localhost:3000
```

### 주요 명령어

```bash
bin/rails console       # Rails 콘솔
bin/rails routes        # 라우트 확인
bin/rails db:migrate    # 마이그레이션 실행
bin/rails test          # 테스트 실행
```

---

## 마이그레이션 스토리

### Before: React + FastAPI + PostgreSQL

- React SPA (프론트엔드) + FastAPI (백엔드 API) + PostgreSQL (DB)
- 3개 서버/프로세스 관리 필요
- CORS 설정, API 직렬화, 상태 관리 복잡도

### After: Rails 8 모놀리스

- **단일 프로세스**로 프론트엔드 + 백엔드 + DB 통합
- SQLite 파일 하나로 DB 관리 (서버 불필요)
- Solid Trifecta로 **Redis 없이** 큐, 캐시, WebSocket 지원
- Hotwire로 SPA급 UX 유지 (JavaScript 프레임워크 불필요)

### 이관 현황

| Phase | 설명 | 상태 |
|-------|------|------|
| 1 | Rails 초기화 + Devise 인증 | ✅ |
| 2 | 데이터 모델 + 마이그레이션 | ✅ |
| 3 | 핵심 CRUD + 대시보드 | ✅ |
| 4 | 달력 뷰 + 통계 차트 | ✅ |
| 5 | 신용카드 + 할부 결제 | ✅ |
| 6 | 태깅 시스템 | ✅ |
| 7 | 반복 거래 스케줄러 | - |
| 8 | 데이터 이관 (596건) | - |
| 9 | Docker 배포 | - |

> 기존 코드는 `legacy/react-fastapi` 브랜치에 보존되어 있습니다.

---

---

# English

> A fullstack personal finance management app built with Ruby on Rails 8

Migrated from a React + FastAPI + PostgreSQL architecture to a **Rails monolith**.
Delivers SPA-level interactive UX through Hotwire (Turbo + Stimulus) without any JavaScript framework, and leverages Rails 8's Solid Trifecta (Queue, Cache, Cable) for **full functionality without Redis**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack-1)
- [Architecture](#architecture-1)
- [Data Model](#data-model)
- [Screens](#screens)
- [Development Setup](#development-setup)
- [Migration Story](#migration-story)

---

## Features

### Transaction Management
- Income/expense CRUD with status tracking (confirmed/scheduled/pending)
- Hierarchical categories (2-level: parent → subcategory)
- Custom icons and colors per category (Lucide Icons)
- Drag-and-drop category reordering

### Credit Card Payments
- Credit card registration with default card setting
- Automatic installment splitting (UUID-based grouping)
- Payment date calculation based on card's billing day
- Purchase date vs. payment date statistics toggle

### Tagging System
- Three tag types: general / giving / receiving
- Link tags to transactions or record as standalone events
- Color-coded dots on calendar view
- Last usage tracking per tag

### Recurring Transactions
- Weekly/monthly/yearly recurring templates
- Variable amount support (enter amount each time)
- Soft delete for history preservation

### Statistics & Visualization
- Category-based pie/bar charts (Chartkick)
- Monthly trend comparison (6-month rolling)
- Parent category grouping
- Purchase date / payment date toggle

### Asset Adjustments
- Reconcile recorded vs. actual asset differences
- Classify as missing income or missing expense

### UX
- Dark mode (system preference + localStorage toggle)
- Responsive layout (mobile bottom tabs + desktop sidebar)
- Turbo Frame-based modal system
- Real-time Turbo Stream updates (no page reloads)
- Full Korean localization (dates, currency, entire UI)
- Pretendard font (optimized for Korean typography)

---

## Tech Stack

| Area | Technology | Notes |
|------|-----------|-------|
| **Framework** | Ruby on Rails 8.1 | Fullstack monolith |
| **Language** | Ruby 3.3+ | Managed via rbenv |
| **Database** | SQLite | File-based, no server needed |
| **Auth** | Devise + devise-i18n | Email/password, session/cookie |
| **Frontend** | ERB + Hotwire (Turbo + Stimulus) | SPA-like UX without SPA |
| **CSS** | Tailwind CSS + Propshaft | Utility-first + modern asset pipeline |
| **JS Management** | importmap-rails | No npm/bundler needed |
| **Background Jobs** | Solid Queue | DB-backed job queue (Rails 8 built-in) |
| **Caching** | Solid Cache | DB-backed cache (no Redis) |
| **WebSocket** | Solid Cable | DB-backed ActionCable |
| **Charts** | Chartkick + Groupdate | Data visualization |
| **Calendar** | simple_calendar | Month view rendering |
| **Soft Delete** | discard | `discarded_at` based |
| **Deployment** | Kamal + Docker | Containerized deployment |
| **Icons** | Lucide Icons | CDN-delivered |

---

## Architecture

### Rails MVC + Hotwire

```
Browser Request
    → Router (config/routes.rb)
        → Controller (app/controllers/)
            → Model (app/models/)        ← ActiveRecord ORM
            → View (app/views/)          ← ERB templates
        → Response (HTML or Turbo Stream)
            → Turbo Frame swap (partial update)
            → Stimulus Controller (client interaction)
```

### Project Structure

```
household_ledger/
├── app/
│   ├── controllers/          # 10 controllers (~1,500 LOC)
│   ├── models/               # 8 models (~500 LOC)
│   ├── views/                # ERB templates (~2,500 LOC)
│   ├── javascript/controllers/   # 21 Stimulus controllers (~1,500 LOC)
│   └── helpers/
├── config/
│   ├── routes.rb             # RESTful routing
│   └── locales/ko.yml        # Full Korean localization
├── db/
│   └── migrate/              # 13 migrations (Feb-Mar 2026)
└── docs/
    └── rails-migration-guide.md  # 9-phase migration guide
```

---

## Data Model

```
User (Devise)
 ├── has_many :categories
 │    └── parent_id (self-ref, 2-level hierarchy)
 ├── has_many :transactions
 │    ├── belongs_to :category
 │    ├── belongs_to :credit_card (optional)
 │    ├── belongs_to :recurring_transaction (optional)
 │    ├── has_many :taggings
 │    └── installment_group (UUID for installment grouping)
 ├── has_many :tags
 │    └── tag_type: general / giving / receiving
 ├── has_many :taggings
 │    ├── belongs_to :tag
 │    └── belongs_to :transaction (optional, standalone allowed)
 ├── has_many :credit_cards
 │    └── payment_day (1-28), is_default
 ├── has_many :recurring_transactions (soft delete)
 │    └── frequency: weekly / monthly / yearly
 └── has_many :asset_adjustments
      └── adjustment_type: income_missing / expense_missing
```

### Design Decisions

- **STI Avoidance**: Uses `transaction_type`, `adjustment_type` instead of Rails' reserved `type` column
- **Soft Delete**: `discard` gem with `discarded_at` column
- **Multi-user**: All tables scoped via `user_id` FK
- **Installment Grouping**: UUID `installment_group` to track split payments
- **Flexible Tagging**: Tags can be linked to transactions or recorded as standalone events

---

## Screens

| Screen | Path | Description |
|--------|------|-------------|
| **Dashboard** | `/` | Monthly calendar + income/expense/asset summary cards |
| **Daily Detail** | `/dashboard/daily_transactions` | Transaction list + category breakdown for selected date |
| **Transaction Entry** | `/transactions/new` | Modal form (category tree, tag selector, card installment) |
| **Categories** | `/categories` | Drag-and-drop sorting, icon/color editing |
| **Tags** | `/tags` | Type-grouped display, last usage date |
| **Statistics** | `/statistics/:id` | Category pie chart + monthly trends |
| **Credit Cards** | `/credit_cards` | Card registration, billing day setting |
| **Recurring** | `/recurring_transactions` | Template CRUD |

---

## Development Setup

### Requirements

- Ruby 3.3+ (rbenv recommended)
- SQLite 3

### Run

```bash
# Install dependencies
bundle install

# Create DB and run migrations
bin/rails db:create db:migrate

# Start dev server (Rails + Tailwind CSS watch)
bin/dev

# Access: http://localhost:3000
```

### Key Commands

```bash
bin/rails console       # Rails console
bin/rails routes        # Show routes
bin/rails db:migrate    # Run migrations
bin/rails test          # Run tests
```

---

## Migration Story

### Before: React + FastAPI + PostgreSQL

- React SPA (frontend) + FastAPI (backend API) + PostgreSQL (database)
- 3 separate servers/processes to manage
- CORS configuration, API serialization, client state management complexity

### After: Rails 8 Monolith

- **Single process** integrating frontend + backend + database
- SQLite single file for database (no server needed)
- Solid Trifecta for **queue, cache, WebSocket without Redis**
- Hotwire for SPA-level UX (no JavaScript framework required)

### Migration Progress

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Rails init + Devise auth | ✅ |
| 2 | Data models + migrations | ✅ |
| 3 | Core CRUD + dashboard | ✅ |
| 4 | Calendar view + statistics | ✅ |
| 5 | Credit cards + installments | ✅ |
| 6 | Tagging system | ✅ |
| 7 | Recurring transaction scheduler | — |
| 8 | Data migration (596 records) | — |
| 9 | Docker deployment | — |

> Legacy code preserved on the `legacy/react-fastapi` branch.
