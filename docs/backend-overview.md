# 백엔드 구현 현황 정리

> 최종 업데이트: 2026-02-18
> Rails 8.1.2 / Ruby 3.3+ / SQLite

---

## 목차

1. [라우팅](#1-라우팅)
2. [데이터베이스 스키마](#2-데이터베이스-스키마)
3. [모델](#3-모델)
4. [컨트롤러](#4-컨트롤러)
5. [인증 (Devise)](#5-인증-devise)
6. [백그라운드 잡 & Solid Queue](#6-백그라운드-잡--solid-queue)
7. [국제화 (i18n)](#7-국제화-i18n)
8. [데이터 마이그레이션 (레거시 이관)](#8-데이터-마이그레이션-레거시-이관)
9. [주요 Gem 의존성](#9-주요-gem-의존성)
10. [알려진 이슈 & TODO](#10-알려진-이슈--todo)

---

## 1. 라우팅

**파일**: `config/routes.rb`

| HTTP 메서드 | 경로 | 컨트롤러#액션 | 설명 |
|---|---|---|---|
| — | `/users/*` | Devise | 인증 (로그인/회원가입/비밀번호) |
| GET | `/` (인증됨) | `dashboard#index` | 월별 대시보드 (authenticated_root) |
| GET | `/` (미인증) | → `/users/sign_in` redirect | 로그인 페이지로 이동 |
| GET | `/dashboard` | `dashboard#index` | 월별 캘린더 뷰 |
| GET | `/dashboard/daily_transactions` | `dashboard#daily_transactions` | 특정 날짜 거래 내역 |
| — | `/transactions` | `transactions#*` | CRUD 7개 액션 |
| GET | `/statistics/:id` | `statistics#show` | 카테고리별 통계 |
| GET | `/statistics/:id/chart_data` | `statistics#chart_data` | 차트 데이터 API |
| — | `/categories` | `categories#*` | CRUD + reorder |
| PATCH | `/categories/reorder` | `categories#reorder` | 드래그앤드롭 순서 변경 |
| — | `/recurring_transactions` | `recurring_transactions#*` | CRUD 7개 액션 |
| — | `/asset_adjustments` | `asset_adjustments#*` | CRUD 7개 액션 |
| GET | `/up` | Rails 헬스체크 | 서버 상태 확인 |

- 모든 라우트는 `before_action :authenticate_user!`로 인증 필수
- RESTful 리소스 기반 설계

---

## 2. 데이터베이스 스키마

**파일**: `db/schema.rb` (버전: `20260208105554`)

### ERD 요약

```
User (Devise)
 ├── has_many :categories
 ├── has_many :transactions
 ├── has_many :recurring_transactions
 └── has_many :asset_adjustments

Category
 ├── belongs_to :user
 └── has_many :transactions

Transaction
 ├── belongs_to :user
 ├── belongs_to :category
 └── belongs_to :recurring_transaction (optional)

RecurringTransaction
 ├── belongs_to :user
 └── has_many :transactions

AssetAdjustment
 └── belongs_to :user
```

### 테이블 상세

#### users (Devise 관리)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| email | string | unique index |
| encrypted_password | string | Devise 암호화 |
| reset_password_token | string | unique index |
| reset_password_sent_at | datetime | |
| remember_created_at | datetime | |

#### categories
| 컬럼 | 타입 | 비고 |
|---|---|---|
| user_id | FK (integer) | index |
| name | string | 최대 100자 |
| emoji | string | |
| position | integer | 정렬 순서 |

#### transactions
| 컬럼 | 타입 | 비고 |
|---|---|---|
| user_id | FK (integer) | index |
| category_id | FK (integer) | index |
| date | date | index |
| description | string | 최대 255자 |
| amount | integer | 원(KRW) 단위 |
| transaction_type | string | enum: income / expense |
| status | string | enum: confirmed / scheduled / pending (기본값: confirmed) |
| recurring_transaction_id | FK (integer) | nullable, index |

#### recurring_transactions
| 컬럼 | 타입 | 비고 |
|---|---|---|
| user_id | FK (integer) | index |
| template_name | string | |
| description | string | |
| amount | integer | |
| transaction_type | string | enum: income / expense |
| frequency | string | enum: weekly / monthly / yearly |
| start_date | date | |
| end_date | date | nullable |
| day_of_month | integer | |
| is_active | boolean | |
| is_variable_amount | boolean | |
| discarded_at | datetime | Soft Delete용, index |

#### asset_adjustments
| 컬럼 | 타입 | 비고 |
|---|---|---|
| user_id | FK (integer) | index |
| adjustment_date | date | index |
| amount | integer | 0보다 커야 함 |
| adjustment_type | string | enum: income_missing / expense_missing |
| description | string | |

### 마이그레이션 파일 목록

| 파일명 | 설명 |
|---|---|
| `20260208065212_devise_create_users.rb` | users 테이블 생성 |
| `20260208102657_create_categories.rb` | categories 테이블 생성 |
| `20260208103335_create_transactions.rb` | transactions 테이블 생성 |
| `20260208104148_create_recurring_transactions.rb` | recurring_transactions 테이블 생성 |
| `20260208105554_create_asset_adjustments.rb` | asset_adjustments 테이블 생성 |

---

## 3. 모델

### User (`app/models/user.rb`)

- **Devise 모듈**: `database_authenticatable`, `registerable`, `recoverable`, `rememberable`, `validatable`
- **연관관계**: 모든 하위 모델에 `has_many ... dependent: :destroy`
- **콜백**: `after_create :create_default_categories`
  - 회원가입 시 기본 카테고리 13개 자동 생성
  - 식비, 간식류, 카페, 교통비, 문화생활, 의류, 생필품, 의료비, 월급, 월세, 통신비, 공과금, 기타

### Category (`app/models/category.rb`)

- **연관관계**: `belongs_to :user`, `has_many :transactions (dependent: :destroy)`
- **검증**: name 필수 (최대 100자)
- **기본 정렬**: `default_scope { order(:position) }` — position 기준 오름차순
- **용도**: 거래 분류, 이모지 아이콘, 드래그앤드롭 순서 변경 지원

### Transaction (`app/models/transaction.rb`)

- **Enum**:
  - `transaction_type`: `income`, `expense`
  - `status`: `confirmed` (기본값), `scheduled`, `pending`
- **연관관계**: `belongs_to :user`, `belongs_to :category`, `belongs_to :recurring_transaction (optional)`
- **검증**: description 필수(255자), amount 필수(정수), date 필수
- **Scope**:
  - `by_date_range(start_date, end_date)` — 날짜 범위 필터
  - `by_category(category_id)` — 카테고리 필터
  - `by_type(type)` — 수입/지출 필터
  - `confirmed_only` — 확정 거래만

### RecurringTransaction (`app/models/recurring_transaction.rb`)

- **Soft Delete**: `discard` gem 사용 (`discarded_at` 컬럼)
  - `default_scope -> { kept }` — 삭제된 레코드 자동 제외
- **Enum**:
  - `transaction_type`: `income`, `expense`
  - `frequency`: `weekly`, `monthly`, `yearly`
- **연관관계**: `belongs_to :user`, `has_many :transactions`
- **용도**: 반복 거래 템플릿, 스케줄러가 자동으로 하위 Transaction 생성 (미구현)

### AssetAdjustment (`app/models/asset_adjustment.rb`)

- **Enum**: `adjustment_type` → `income_missing`, `expense_missing`
- **연관관계**: `belongs_to :user`
- **검증**: amount 필수 (0 초과), description 필수, adjustment_date 필수
- **용도**: 실제 자산과 기록 간 차이 조정

---

## 4. 컨트롤러

### ApplicationController (`app/controllers/application_controller.rb`)

- `allow_browser versions: :modern` — 모던 브라우저만 허용
- `before_action :authenticate_user!` — 전체 인증 필수

### DashboardController (`app/controllers/dashboard_controller.rb`)

| 액션 | 설명 |
|---|---|
| `index` | params에서 월 정보를 받아 해당 월의 거래를 조회. 총수입/총지출/총자산 계산. 날짜별로 거래를 그룹핑하여 캘린더에 전달 |
| `daily_transactions` | 특정 날짜의 거래 내역을 created_at 역순으로 조회 |

### TransactionsController (`app/controllers/transactions_controller.rb`)

| 액션 | 설명 |
|---|---|
| `new` | 거래 등록 폼 표시, 카테고리 목록 로드 |
| `create` | 거래 생성, Turbo Stream 또는 HTML redirect 응답 |
| `edit` | 거래 수정 폼 표시, 카테고리 목록 로드 |
| `update` | 거래 수정, Turbo Stream 또는 HTML redirect 응답 |
| `destroy` | 거래 삭제 (Hard Delete), Turbo Stream 응답 |

- **before_action**: `set_transaction` (edit, update, destroy)
- **Strong Parameters**: `date`, `description`, `amount`, `transaction_type`, `category_id`, `status`

### CategoriesController (`app/controllers/categories_controller.rb`)

| 액션 | 설명 |
|---|---|
| `index` | 현재 사용자의 카테고리 전체 목록 |
| `create` | 카테고리 생성 |
| `update` | 카테고리 수정 (이름/이모지) |
| `destroy` | 카테고리 삭제 |
| `reorder` | ID 배열을 받아 position 필드 일괄 업데이트 (204 No Content) |

- **Strong Parameters**: `name`, `emoji`

### StatisticsController (`app/controllers/statistics_controller.rb`)

| 액션 | 설명 |
|---|---|
| `show` | 월별 + 거래 유형별 카테고리 지출/수입 통계. Category와 JOIN하여 이모지·이름별로 그룹핑 후 합산 |

### RecurringTransactionsController (`app/controllers/recurring_transactions_controller.rb`)

| 액션 | 설명 |
|---|---|
| `index` | 반복 거래 목록 (Soft Delete 제외된 것만) |
| `new` / `create` | 반복 거래 템플릿 생성 |
| `edit` / `update` | 반복 거래 수정 |
| `destroy` | **Soft Delete** (`discard` 메서드 사용) |

- **Strong Parameters**: `template_name`, `description`, `amount`, `transaction_type`, `frequency`, `start_date`, `end_date`, `day_of_month`, `is_active`, `is_variable_amount`

### AssetAdjustmentsController (`app/controllers/asset_adjustments_controller.rb`)

| 액션 | 설명 |
|---|---|
| `index` | 자산 보정 목록 (adjustment_date 역순) |
| `new` / `create` | 자산 보정 등록 |
| `edit` / `update` | 자산 보정 수정 |
| `destroy` | 자산 보정 삭제 (Hard Delete) |

- **Strong Parameters**: `adjustment_date`, `amount`, `adjustment_type`, `description`

### 공통 패턴

- 모든 컨트롤러에서 `current_user` 스코프로 데이터 격리
- `respond_to` 블록으로 Turbo Stream / HTML 이중 응답 지원
- `before_action :set_*`으로 리소스 로드 및 권한 확인

---

## 5. 인증 (Devise)

**설정 파일**: `config/initializers/devise.rb`

- 이메일 대소문자 무시: `case_insensitive_keys = [:email]`
- 공백 제거: `strip_whitespace_keys = [:email]`
- 발신 이메일: 플레이스홀더 상태 (미설정)
- 활성화된 모듈: `database_authenticatable`, `registerable`, `recoverable`, `rememberable`, `validatable`

**시드 데이터**: `test@test.com` / `password123` (개발용)

---

## 6. 백그라운드 잡 & Solid Queue

**설정 파일**: `config/recurring.yml`

- 현재 운영 잡: `clear_solid_queue_finished_jobs` (매 시간 12분에 완료된 잡 정리, production 전용)
- 반복 거래 자동 생성 잡: **미구현**
- `ApplicationJob` (`app/jobs/application_job.rb`): 기본 템플릿만 존재

---

## 7. 국제화 (i18n)

**파일**: `config/locales/ko.yml`

- 날짜/시간 형식: 한국어 (YYYY년 MM월 DD일)
- 통화: 원(KRW) 단위
- ActiveRecord 검증 메시지: 한국어
- UI 라벨: dashboard, transactions, categories, statistics, recurring_transactions, asset_adjustments, 공유 요소 전체 한국어화

---

## 8. 데이터 마이그레이션 (레거시 이관)

**파일**: `lib/tasks/data_migration.rake`
**네임스페이스**: `data:migrate`

레거시 시스템(React + FastAPI + PostgreSQL)에서 현재 Rails + SQLite로 데이터 이관하는 Rake 태스크.

- **소스**: `~/household_ledger_backup/` (JSON 파일)
  - `hl_categories.json`, `hl_transactions.json`, `hl_recurring_transactions.json`
- **대상 사용자**: `ahsdfg30@gmail.com`
- **변환 내용**:
  - UUID → Integer ID 매핑
  - `type` → `transaction_type`, `order` → `position`
  - 상태값 소문자 변환
- **이관 규모**: users 3건, categories 24건, transactions 596건, recurring_transactions 1건

---

## 9. 주요 Gem 의존성

| 분류 | Gem | 버전 | 용도 |
|---|---|---|---|
| 프레임워크 | rails | ~> 8.1.2 | 풀스택 웹 프레임워크 |
| DB | sqlite3 | >= 2.1 | 파일 기반 데이터베이스 |
| 인증 | devise | 5.0.0 | 사용자 인증 |
| 인증 i18n | devise-i18n | — | Devise 다국어 지원 |
| Soft Delete | discard | 1.4.0 | 논리 삭제 (`discarded_at`) |
| 차트 | chartkick | ~> 5.2.1 | 차트 시각화 |
| 날짜 그룹 | groupdate | 6.7.0 | 날짜별 데이터 그룹핑 |
| 캘린더 | simple_calendar | — | 캘린더 뷰 헬퍼 |
| Turbo | turbo-rails | 8.1.2 | Hotwire Turbo (실시간 HTML 업데이트) |
| Stimulus | stimulus-rails | 6.1.1 | Hotwire Stimulus (JS 컨트롤러) |
| CSS | tailwindcss-rails | — | Tailwind CSS 통합 |
| 에셋 | importmap-rails | — | ESM importmap (npm 불필요) |
| 잡 큐 | solid_queue | — | DB 기반 백그라운드 잡 |
| 캐시 | solid_cache | — | DB 기반 캐시 |
| WebSocket | solid_cable | — | DB 기반 ActionCable |
| 웹 서버 | puma | >= 5.0 | 멀티스레드 웹 서버 |
| 보안 | brakeman | — | Rails 보안 스캐너 |
| 코드 스타일 | rubocop-rails-omakase | — | Rails 코딩 컨벤션 |

---

## 10. 알려진 이슈 & TODO

### 미구현 사항

- [ ] 반복 거래 자동 생성 스케줄러 잡 (Solid Queue)
- [ ] 백업/복원 기능 (`BackupService`)
- [ ] `acts_as_list` gem 미설치 — `Gemfile`에 추가 필요 (Category의 position 기반 정렬에 필요)
- [ ] Devise 메일러 발신 주소 설정 (현재 플레이스홀더)

### 참고사항

- `app/services/` 디렉토리 미생성 — 현재 비즈니스 로직은 모델·컨트롤러에 분산
- RecurringTransaction만 Soft Delete, 나머지는 Hard Delete
- StatisticsController가 (name, emoji) 튜플로 그룹핑 — 이모지 변경 시 히스토리 분리 가능성
- 컨트롤러에서 `current_user.모델명` 스코프로 권한 제어 (명시적 authorize 메서드 없음)
