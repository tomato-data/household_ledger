# React + FastAPI --> Ruby on Rails 풀스택 마이그레이션 가이드

> **문서 목적**: 현재 React + FastAPI + PostgreSQL 기반 가계부 앱을 Ruby on Rails 풀스택 모놀리스로 전면 이관하기 위한 단계별 가이드
>
> **대상 독자**: Rails 입문자 (Python/React 경험 있음)
>
> **최종 목표**: ERB + Hotwire/Turbo/Stimulus 기반 Rails 앱으로 전환, Devise 인증, 기존 데이터 이관 포함

---

## 목차

- [아키텍처 비교](#아키텍처-비교)
- [권장 Gem 목록](#권장-gem-목록)
- [Phase 0: 환경 설정](#phase-0-환경-설정)
- [Phase 1: Rails 프로젝트 초기화 + Devise 인증](#phase-1-rails-프로젝트-초기화--devise-인증)
- [Phase 2: 데이터베이스 모델 + 마이그레이션](#phase-2-데이터베이스-모델--마이그레이션)
- [Phase 3: 핵심 CRUD 기능](#phase-3-핵심-crud-기능)
- [Phase 4: 달력 뷰 + 통계](#phase-4-달력-뷰--통계)
- [Phase 5: 고급 기능](#phase-5-고급-기능)
- [Phase 6: 데이터 마이그레이션](#phase-6-데이터-마이그레이션)
- [Phase 7: Docker Compose 설정](#phase-7-docker-compose-설정)
- [Phase 8: 정리 + 기능 검증](#phase-8-정리--기능-검증)

---

## 아키텍처 비교

현재 스택과 Rails 스택의 개념 매핑을 먼저 이해해야 합니다. 두 프레임워크의 핵심 차이는 **SPA(Single Page Application) vs 서버 사이드 렌더링** 패러다임입니다.

```
현재 (React + FastAPI)                    Rails 풀스택
════════════════════════════════════════════════════════════════════
Frontend: React (SPA, CSR)           =>   ERB Views + Hotwire/Turbo (SSR)
State: Context API (클라이언트)       =>   Controller 인스턴스 변수 (서버)
API 통신: Axios (JSON)               =>   Form 제출 + Turbo (HTML)
Auth: Clerk JWT (외부 서비스)         =>   Devise (내장, session/cookie)
Router: FastAPI Router               =>   Rails Controller
Service: Python Service class        =>   Model 메서드 + Service Object
CRUD: SQLAlchemy 쿼리 함수           =>   ActiveRecord (ORM 내장)
Schema: Pydantic 검증                =>   Model Validations + Strong Params
Migration: Alembic                   =>   Rails Migrations (내장)
DB: PostgreSQL (Docker)               =>   SQLite (파일 기반, 서버 불필요)
Background: (없음)                   =>   Solid Queue + ActiveJob (DB 기반)
Cache: Redis (직접 관리)              =>   Solid Cache (DB 기반, Redis 불필요)
JS 패키지: npm + Vite                =>   importmap-rails 또는 jsbundling
CSS: 커스텀 CSS 파일                  =>   Tailwind CSS (rails 통합)
```

### 핵심 패러다임 전환

**현재 방식 (React SPA)**:
1. 브라우저가 빈 HTML 받음 -> React가 JavaScript로 UI 구성
2. 데이터 필요 시 Axios로 JSON API 호출
3. 상태 변경 시 Context API가 리렌더링

**Rails 방식 (서버 사이드 렌더링 + Hotwire)**:
1. 서버가 완성된 HTML을 브라우저에 전송
2. Turbo가 전체 페이지 새로고침 없이 부분 업데이트 (SPA처럼 느껴짐)
3. Stimulus가 가벼운 JavaScript 인터랙션 담당 (모달, 드래그앤드롭 등)

### 3계층 아키텍처 매핑

```
FastAPI 3-Layer              =>    Rails MVC
──────────────────────────────────────────────────
Router (HTTP 처리)           =>    Controller (HTTP 처리)
  - @router.get("/")               - def index
  - @router.post("/")              - def create
  - HTTPException                  - render / redirect / head

Service (비즈니스 로직)       =>    Model 메서드 + Service Object
  - class TransactionService       - Transaction 모델 메서드
  - commit() / refresh()           - save! / update! (자동)
  - 여러 CRUD 조합                 - 복잡한 로직은 Service Object

CRUD (DB 쿼리)               =>    ActiveRecord (내장)
  - get_transactions_by_user()     - Transaction.where(user: current_user)
  - joinedload()                   - .includes(:category)
  - func.sum()                     - .sum(:amount)
  - flush()                        - (자동 관리)

Schema (요청/응답 검증)       =>    Strong Parameters + Model Validations
  - TransactionCreate              - params.require(:transaction).permit(...)
  - Pydantic validators            - validates :amount, presence: true
```

---

## 권장 Gem 목록

| 카테고리 | Gem / 라이브러리 | 용도 | 현재 대응 |
|---------|----------------|------|----------|
| 인증 | `devise` | 이메일/비밀번호 인증 | Clerk JWT |
| 달력 | `simple_calendar` | 서버사이드 달력 렌더링 | react-calendar |
| 차트 | `chartkick` + `groupdate` | 파이차트, 통계 시각화 | recharts |
| 순서 관리 | `acts_as_list` | 드래그앤드롭 순서 | @dnd-kit |
| Soft Delete | `discard` | deleted_at 패턴 자동화 | 수동 구현 |
| 배경 작업 | `solid_queue` (Rails 8 내장) | DB 기반 Job 큐 | (없음) |
| 캐싱 | `solid_cache` (Rails 8 내장) | DB 기반 캐시 | Redis |
| WebSocket | `solid_cable` (Rails 8 내장) | DB 기반 ActionCable | (없음) |
| 스케줄링 | `solid_queue` recurring | 반복 작업 등록 | recurringScheduler.js |
| 페이지네이션 | `pagy` | 효율적 페이지네이션 | skip/limit 파라미터 |
| CSS | `tailwindcss-rails` | 유틸리티 CSS 프레임워크 | 커스텀 App.css |
| JS | `importmap-rails` (기본) | JS 패키지 관리 | npm + Vite |
| 파일 처리 | `zlib` (Ruby 표준) | gzip 백업 압축 | Python gzip |
| 검색/필터 | `ransack` (선택) | 복잡한 필터링 UI | SQLAlchemy 쿼리 체이닝 |
| Sortable JS | `sortablejs` (importmap) | 드래그앤드롭 UI | @dnd-kit/sortable |

### Solid Trio란?

Rails 8의 핵심 철학인 **"One Person Framework"**를 실현하는 3개의 DB 기반 어댑터입니다. 현재 프로젝트에서 Redis가 하던 모든 역할을 **SQLite(또는 메인 DB)로 대체**합니다.

```
현재 (FastAPI + Redis)                      Rails 8 Solid Trio
═══════════════════════════════════════════════════════════════════
Redis 캐싱 (사용자 5분 TTL)          =>     Solid Cache (DB 테이블에 캐시 저장)
(없음, Celery 등 필요)               =>     Solid Queue (DB 테이블에 Job 큐 저장)
(없음)                               =>     Solid Cable (DB 테이블로 WebSocket)
```

**왜 Solid Trio인가?**
1. **외부 의존성 제거**: Redis 서버가 필요 없음. SQLite 파일 하나로 모든 것을 처리
2. **운영 단순화**: 관리할 서비스가 줄어듦 (PostgreSQL + Redis → SQLite 하나)
3. **Rails 8 기본 내장**: `rails new` 시 자동 설정됨. 추가 gem 설치 불필요
4. **개인 프로젝트에 최적**: 대규모 트래픽이 아닌 이상 성능 충분

**Solid Queue의 작동 원리**:
Sidekiq이 Redis에 Job을 저장하고 꺼내서 실행하는 것처럼, Solid Queue는 **DB 테이블**(`solid_queue_jobs`, `solid_queue_scheduled_executions` 등)에 Job을 저장하고 실행합니다. `recurring.yml` 파일로 Cron 스케줄도 등록할 수 있어서 `sidekiq-cron`까지 대체합니다.

**Solid Cache의 작동 원리**:
현재 FastAPI에서 `await redis.setex(cache_key, 300, json.dumps(user_cache))`로 하던 캐싱을 Rails에서 `Rails.cache.fetch("user:#{id}", expires_in: 5.minutes) { ... }`로 하면, Solid Cache가 DB 테이블에 캐시를 저장합니다.

---

## Phase 0: 환경 설정

### 무엇을 하는가
Ruby, Rails, 필수 도구를 macOS에 설치합니다. Docker 없이 로컬 개발환경부터 구축합니다.

### 왜 필요한가
Rails는 Python과 달리 Ruby 런타임이 필요하며, 버전 관리가 중요합니다. Python의 `pyenv`처럼 Ruby도 `rbenv`로 버전을 관리합니다.

### 수행 항목

#### Step 0-1: rbenv + Ruby 설치

**rbenv란?** Ruby 버전 관리자입니다. Python의 `pyenv`, Node의 `nvm`에 해당합니다. 시스템 Ruby를 건드리지 않고 프로젝트별로 다른 Ruby 버전을 사용할 수 있게 해줍니다.

```bash
# Homebrew로 rbenv 설치
brew install rbenv ruby-build

# 쉘 초기화 (zsh 기준)
echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc
source ~/.zshrc

# Ruby 3.3 이상 설치 (최신 안정 버전 확인: rbenv install --list)
rbenv install 3.3.6
rbenv global 3.3.6

# 확인
ruby -v    # => ruby 3.3.6
gem -v     # => RubyGems 버전 출력
```

**학습 포인트**: `gem`은 Ruby의 패키지 매니저입니다 (Python의 `pip`, Node의 `npm`에 해당). `gem install`로 패키지를 설치하고, `Gemfile`로 프로젝트 의존성을 관리합니다.

#### Step 0-2: Rails 설치

```bash
# Rails 8 설치
gem install rails

# 확인
rails -v   # => Rails 8.x.x
```

**Rails 8을 선택하는 이유**: Rails 8은 Hotwire(Turbo + Stimulus)가 기본 내장되어 있고, `importmap-rails`로 npm 없이 JavaScript 패키지를 관리할 수 있습니다. React SPA 없이도 SPA와 유사한 사용자 경험을 제공합니다.

#### Step 0-3: 추가 도구 확인

```bash
# SQLite (macOS에 기본 내장되어 있음, 별도 설치 불필요)
sqlite3 --version

# Node.js (이미 프론트엔드 개발로 설치되어 있음 - Rails asset pipeline에도 사용)
node -v

# Yarn (선택, jsbundling 사용 시 필요)
npm install -g yarn
```

**SQLite를 선택하는 이유**: 현재 PostgreSQL을 Docker 컨테이너로 운영하고 있지만, 개인 가계부 앱에는 SQLite가 훨씬 적합합니다. 파일 하나(`db/development.sqlite3`)로 DB가 완성되어 서버 프로세스가 불필요하고, 백업은 파일 복사만으로 끝납니다. Rails 8은 SQLite를 기본 DB로 채택했으며, Solid Trio(Cache/Queue/Cable)도 SQLite 위에서 동작합니다.

### 테스트
```bash
ruby -v && rails -v && gem -v
```
세 명령어 모두 버전이 출력되면 환경 설정 완료.

---

## Phase 1: Rails 프로젝트 초기화 + Devise 인증

### 무엇을 하는가
Rails 프로젝트 뼈대를 생성하고, Devise gem으로 이메일/비밀번호 인증을 구현합니다. 현재 Clerk JWT 인증을 완전히 대체합니다.

### 왜 필요한가
Rails의 "Convention over Configuration" 철학을 이해하는 첫 단계입니다. `rails new` 한 줄로 MVC 구조, 라우팅, 마이그레이션 시스템, 테스트 프레임워크가 모두 세팅됩니다.

### 수행 항목

#### Step 1-0: 기존 코드 보관 + 클린 슬레이트 준비

같은 git 리포지토리 내에서 전환하므로, 먼저 현재 코드를 별도 브랜치에 보관합니다.

```bash
# 1. 현재 변경사항 모두 커밋
git add -A
git commit -m "Save current state before Rails migration"

# 2. legacy 브랜치 생성 (현재 코드 영구 보관)
git branch legacy/react-fastapi
git push origin legacy/react-fastapi

# 3. 보존할 파일 임시 복사
cp docs/rails-migration-guide.md /tmp/rails-migration-guide.md
cp CLAUDE.md /tmp/CLAUDE.md

# 4. main 브랜치에서 기존 파일 전부 삭제
git rm -rf .
git commit -m "Clean slate for Rails migration"
```

**왜 이렇게 하는가?**
- `legacy/react-fastapi` 브랜치에 현재 React + FastAPI 코드가 영구 보관됩니다
- 언제든 `git checkout legacy/react-fastapi`로 기존 코드를 확인하거나 롤백할 수 있습니다
- main 브랜치는 깨끗한 상태에서 Rails 프로젝트를 시작합니다
- git history는 `.git` 디렉토리가 유지되므로 전체 보존됩니다

#### Step 1-1: 프로젝트 생성

```bash
# 프로젝트 루트 디렉토리(household_ledger/)에서 실행
rails new . --css=tailwind
```

**핵심: `rails new .`의 `.` (점)**

`rails new .`은 **현재 디렉토리에 Rails 프로젝트를 생성**합니다. 새 디렉토리를 만들지 않습니다.

- 앱 이름: 디렉토리명 `household_ledger`에서 자동 유추 → `HouseholdLedger`
- `.git` 디렉토리: 그대로 유지 (기존 git history 보존)
- `.gitignore`: Rails 표준으로 새로 생성됨

**실행 후 보존 파일 복원**:
```bash
mkdir -p docs
cp /tmp/rails-migration-guide.md docs/
cp /tmp/CLAUDE.md .

# Rails 프로젝트 첫 커밋
git add -A
git commit -m "Initialize Rails 8 app (replacing React + FastAPI)"
```

**옵션 설명**:
- DB 옵션 생략: Rails 8은 **SQLite가 기본**. `--database` 옵션 없이 생성하면 SQLite + Solid Trio가 자동 설정됩니다
- `--css=tailwind`: Tailwind CSS 통합. 현재 커스텀 CSS를 점진적으로 이관하기에 유연함

**Rails 8 기본 생성 시 포함되는 것들**:
- SQLite 데이터베이스 (development, test, production)
- Solid Cache (캐시 어댑터 - Redis 대체)
- Solid Queue (Job 큐 어댑터 - Sidekiq 대체)
- Solid Cable (ActionCable 어댑터)
- Kamal 배포 설정
- Hotwire (Turbo + Stimulus)
- importmap-rails (npm 없이 JS 관리)

**생성되는 디렉토리 구조와 FastAPI 비교**:
```
Rails                              FastAPI 대응
──────────────────────────────────────────────────
app/controllers/                   app/api/routes/
app/models/                        app/models/ + app/crud/
app/views/                         (React 컴포넌트)
app/javascript/                    frontend/src/
config/routes.rb                   main.py의 router 등록
db/migrate/                        alembic/versions/
Gemfile                            requirements.txt
config/database.yml                app/core/database.py
```

#### Step 1-2: UUID 기본 키 설정 (선택)

**UUID vs 정수 ID - 판단이 필요합니다**:

현재 FastAPI 앱은 모든 테이블에 UUID PK를 사용합니다. Rails로 이관할 때 두 가지 선택지가 있습니다:

**방법 A: Rails 기본 정수 ID 사용 (권장)**
- Rails Convention을 따르는 가장 자연스러운 방식
- SQLite에서 성능이 좋음 (정수 비교가 문자열 비교보다 빠름)
- 데이터 마이그레이션 시 ID 재매핑 필요 (백업 Import의 UUID 매핑 로직을 활용)
- `rails generate model` 시 추가 설정 불필요

**방법 B: UUID PK 유지**
- 기존 데이터의 ID를 그대로 보존 가능
- `config/initializers/generators.rb`에서 `g.orm :active_record, primary_key_type: :uuid` 설정
- SQLite에서는 UUID를 **string 타입**으로 저장 (PostgreSQL의 네이티브 UUID 타입과 다름)
- 모델에 `before_create { self.id = SecureRandom.uuid }` 콜백 추가 필요 (SQLite는 `gen_random_uuid()` 함수가 없으므로 Ruby에서 생성)

**학습 포인트**: PostgreSQL은 `pgcrypto` 확장의 `gen_random_uuid()` DB 함수로 UUID를 생성하지만, SQLite는 이런 함수가 없습니다. 대신 Ruby의 `SecureRandom.uuid`로 애플리케이션 레벨에서 생성합니다. 현재 Python 코드의 `uuid.uuid4`와 같은 원리입니다.

#### Step 1-3: 데이터베이스 확인

**파일**: `config/database.yml` (자동 생성됨, 수정 불필요)

SQLite는 파일 기반 DB이므로 **서버 프로세스도, 연결 설정도 필요 없습니다**. `rails new` 실행 시 `database.yml`이 자동으로 아래와 같이 설정됩니다:

```yaml
development:
  adapter: sqlite3
  database: storage/development.sqlite3
test:
  adapter: sqlite3
  database: storage/test.sqlite3
production:
  adapter: sqlite3
  database: storage/production.sqlite3
```

**현재 FastAPI와의 차이**:
- FastAPI: `DATABASE_URL=postgresql://postgres:welcome1516@db:5432/household_ledger` (서버 주소, 포트, 인증 필요)
- Rails + SQLite: `database: storage/development.sqlite3` (파일 경로 하나면 끝)

**Solid Trio DB도 자동 설정됩니다**:
Rails 8은 `config/database.yml`에 캐시/큐/케이블용 SQLite 파일도 분리 관리합니다:
```yaml
cache:
  database: storage/cache.sqlite3    # Solid Cache용
queue:
  database: storage/queue.sqlite3    # Solid Queue용
cable:
  database: storage/cable.sqlite3    # Solid Cable용
```

이렇게 하면 메인 앱 DB와 인프라 DB가 분리되어, 캐시 초기화 시 앱 데이터에 영향이 없습니다.

```bash
# DB 생성 (SQLite 파일 자동 생성)
rails db:create
```

#### Step 1-4: Devise 설치 + 설정

**Devise란?** Rails의 사실상 표준 인증 gem입니다. 현재 Clerk가 외부 서비스에서 JWT 토큰을 발급하고, FastAPI가 이를 검증하는 방식이었다면, Devise는 **Rails 앱 내부에서** 세션/쿠키 기반 인증을 처리합니다.

**현재 인증 흐름 (Clerk)**:
```
브라우저 -> Clerk SDK 로그인 -> JWT 토큰 발급 -> Axios가 매 요청에 Bearer 토큰 전송
-> FastAPI가 JWT 디코딩 -> clerk_user_id 추출 -> DB에서 사용자 조회 (Redis 캐싱)
```

**Devise 인증 흐름**:
```
브라우저 -> Rails 로그인 페이지 -> 이메일/비밀번호 제출
-> Devise가 DB에서 사용자 조회 -> 비밀번호 해싱 비교 (bcrypt)
-> 세션 쿠키 발급 -> 이후 요청에 쿠키 자동 전송
```

**설치 순서**:

1. **Gemfile에 추가**: `gem 'devise'`
2. **설치**: `bundle install`
3. **Devise 초기화**: `rails generate devise:install`
   - `config/initializers/devise.rb` 생성 (Devise 전역 설정)
   - `config/locales/devise.en.yml` 생성 (에러 메시지 번역)
4. **User 모델 생성**: `rails generate devise User`
   - `app/models/user.rb` 생성 (Devise 모듈 포함)
   - `db/migrate/XXXX_devise_create_users.rb` 생성
5. **마이그레이션 실행**: `rails db:migrate`

**Devise User 마이그레이션 커스터마이징**:
Devise가 생성하는 기본 마이그레이션에는 `email`, `encrypted_password`, `reset_password_token` 등이 포함됩니다. 여기에 UUID PK가 적용되어야 합니다 (Step 1-2에서 설정했으므로 자동 적용).

**학습 포인트 - Clerk vs Devise 비교**:

| 항목 | Clerk | Devise |
|------|-------|--------|
| 인증 방식 | JWT 토큰 (무상태) | 세션/쿠키 (상태 유지) |
| 사용자 저장 | Clerk 서버 + 우리 DB | 우리 DB만 |
| 비밀번호 관리 | Clerk가 처리 | bcrypt gem으로 해싱 |
| 프론트엔드 | `@clerk/clerk-react` SDK | Rails ERB 뷰 |
| 비용 | 유료 (사용량 기반) | 무료 (오픈소스) |
| 커스터마이징 | 제한적 | 완전한 제어 |

#### Step 1-5: 한국어 로케일 설정

**파일**: `config/application.rb`에서 `config.i18n.default_locale = :ko` 설정

**파일**: `config/locales/ko.yml` (새로 생성)

Rails의 국제화(i18n) 시스템은 `config/locales/` 디렉토리의 YAML 파일로 번역을 관리합니다. 현재 React 앱에서 하드코딩된 한국어 텍스트를 Rails에서는 `t('transactions.income')` 같은 헬퍼로 관리할 수 있습니다.

Devise의 한국어 번역 파일은 [devise-i18n](https://github.com/tigrish/devise-i18n) gem을 설치하거나, 커뮤니티 번역 파일을 직접 추가할 수 있습니다.

#### Step 1-6: 기본 레이아웃 설정

**파일**: `app/views/layouts/application.html.erb`

이 파일은 현재 React의 `App.jsx`에 해당합니다. 모든 페이지에 공통으로 적용되는 레이아웃(내비게이션 바, 사이드바, 플래시 메시지 등)을 정의합니다.

레이아웃에 포함할 요소:
- Devise 로그인/로그아웃 링크 (현재 `<UserButton />`, `<SignInButton />` 대체)
- 내비게이션 메뉴 (홈, 통계 링크)
- Flash 메시지 영역 (Rails의 `flash[:notice]`, `flash[:alert]`)

**`yield`의 작동 원리**: `application.html.erb`의 `<%= yield %>` 위치에 각 페이지의 뷰가 삽입됩니다. React의 `{children}` props와 동일한 개념입니다.

### 생성할 파일 목록
```
config/initializers/generators.rb     # UUID PK 설정 (선택, Step 1-2 방법 B인 경우)
config/database.yml                   # 자동 생성됨 (SQLite, 수정 불필요)
config/application.rb                 # 한국어 로케일 (수정)
config/locales/ko.yml                 # 한국어 번역
config/initializers/devise.rb         # Devise 설정 (자동 생성)
app/models/user.rb                    # Devise User 모델 (자동 생성)
db/migrate/XXXX_devise_create_users.rb # User 마이그레이션 (자동 생성)
app/views/layouts/application.html.erb # 기본 레이아웃 (수정)
Gemfile                               # gem 추가 (수정)
```

### 테스트
```bash
rails server
```
브라우저에서 `http://localhost:3000/users/sign_up`에 접속하여 회원가입 후 로그인이 정상 동작하는지 확인합니다.

---

## Phase 2: 데이터베이스 모델 + 마이그레이션

### 무엇을 하는가
현재 5개 SQLAlchemy 모델(User, Category, Transaction, RecurringTransaction, AssetAdjustment)을 Rails ActiveRecord 모델로 변환합니다.

### 왜 필요한가
ActiveRecord는 Rails의 ORM으로, SQLAlchemy와 같은 역할을 합니다. 하지만 접근 방식이 다릅니다:
- **SQLAlchemy**: 명시적 (쿼리 함수를 직접 작성, flush/commit 수동 관리)
- **ActiveRecord**: 암시적 (Convention으로 자동 매핑, save!가 자동으로 트랜잭션 관리)

### 수행 항목

#### Step 2-1: Category 모델

**현재 SQLAlchemy 모델** (`backend/app/models/category.py`):
- `id` (UUID PK), `user_id` (FK), `name` (String 100), `emoji` (String 10), `order` (Integer), `created_at`, `updated_at`

**Rails에서 생성**:
```bash
rails generate model Category user:references name:string emoji:string order:integer
```

**이 명령이 하는 일**: `app/models/category.rb` 모델 파일과 `db/migrate/XXXX_create_categories.rb` 마이그레이션 파일을 자동 생성합니다. `user:references`는 자동으로 `user_id` 외래키 + 인덱스를 만듭니다.

**마이그레이션 파일 수정 포인트**:
- `name` 컬럼에 `null: false, limit: 100` 추가
- `emoji` 컬럼에 `limit: 10` 추가
- `order` 컬럼에 `null: false, default: 0` 추가

**모델 파일에 추가할 내용**:

`app/models/category.rb`에서 설정해야 할 것들:

1. **관계 정의**:
   - `belongs_to :user` (자동 생성됨)
   - `has_many :transactions, dependent: :destroy`
   - 현재 SQLAlchemy의 `relationship("User", back_populates="categories")`와 같은 역할

2. **검증(Validations)**:
   - `validates :name, presence: true, length: { maximum: 100 }`
   - 이것은 현재 Pydantic 스키마(`CategoryCreate`)에서 하던 검증의 Rails 버전

3. **기본 정렬**:
   - `default_scope { order(:order) }`
   - 현재 `category_crud.py`의 `order_by(CategoryModel.order)` 대체

**학습 포인트 - SQLAlchemy vs ActiveRecord**:

| SQLAlchemy | ActiveRecord |
|-----------|-------------|
| `Column(String(100), nullable=False)` | `validates :name, presence: true, length: { maximum: 100 }` |
| `relationship("User", back_populates=...)` | `belongs_to :user` |
| `ForeignKey("users.id", ondelete="CASCADE")` | `dependent: :destroy` (부모 모델에서) |
| `default=uuid.uuid4` | UUID PK 설정 시 자동 |
| `index=True` (Column에) | `add_index :categories, :user_id` (마이그레이션에) |

#### Step 2-2: Transaction 모델

**현재 SQLAlchemy 모델** (`backend/app/models/transaction.py`):
- `id`, `user_id`, `date`, `description`, `amount`, `type`, `category_id`, `status`, `recurring_id`, `created_at`, `updated_at`

**중요: `type` 컬럼 이름 충돌 문제**

Rails에서 `type` 컬럼은 **STI(Single Table Inheritance)**에 예약되어 있습니다. STI란 하나의 테이블에 여러 모델 타입을 저장하는 Rails 기능인데, `type` 컬럼에 모델 클래스명을 저장합니다.

현재 Python 코드에서 `type`을 "income"/"expense" 구분에 사용하고 있으므로, Rails에서는 **두 가지 해결 방법**이 있습니다:

**방법 A (권장)**: 컬럼명을 `transaction_type`으로 변경
- 장점: Rails Convention을 따름, 혼란 없음
- 단점: 데이터 마이그레이션 시 컬럼명 매핑 필요

**방법 B**: `self.inheritance_column = :_type_disabled`로 STI 비활성화
- 장점: 기존 컬럼명 유지
- 단점: Rails Convention에 어긋남, 다른 개발자가 혼란 가능

**방법 A를 권장합니다.** 같은 이유로 RecurringTransaction과 AssetAdjustment의 `type` 컬럼도 각각 `transaction_type`, `adjustment_type`으로 변경합니다.

**Rails에서 생성**:
```bash
rails generate model Transaction user:references date:date description:string \
  amount:integer transaction_type:string category:references status:string \
  recurring_id:uuid
```

**마이그레이션 파일 수정 포인트**:
- `description`에 `null: false, limit: 255`
- `amount`에 `null: false`
- `transaction_type`에 `null: false`
- `status`에 `null: false`
- `recurring_id`는 nullable (외래키를 수동으로 추가)
- `date` 컬럼에 인덱스 추가: `add_index :transactions, :date`
- `recurring_id`에 외래키 추가: `add_foreign_key :transactions, :recurring_transactions, column: :recurring_id`

**모델 파일에 추가할 내용**:

`app/models/transaction.rb`에서:

1. **Enum 정의**:
   ```ruby
   enum :transaction_type, { income: "income", expense: "expense" }
   enum :status, { confirmed: "confirmed", scheduled: "scheduled", pending: "pending" }
   ```
   이것은 현재 `enums.py`의 `TransactionType`, `TransactionStatus`에 해당합니다.
   ActiveRecord enum을 사용하면 `transaction.income?`, `transaction.confirmed?` 같은 메서드가 자동 생성됩니다.

2. **관계 정의**:
   - `belongs_to :user`
   - `belongs_to :category`
   - `belongs_to :recurring_transaction, foreign_key: :recurring_id, optional: true`

3. **검증**:
   - `validates :description, presence: true, length: { maximum: 255 }`
   - `validates :amount, presence: true, numericality: { only_integer: true }`
   - `validates :date, presence: true`

4. **Scope 정의** (현재 `transaction_crud.py`의 필터 함수 대체):
   ```ruby
   scope :by_date_range, ->(start_date, end_date) { where(date: start_date..end_date) }
   scope :by_category, ->(category_id) { where(category_id: category_id) }
   scope :by_type, ->(type) { where(transaction_type: type) }
   scope :confirmed_only, -> { where(status: :confirmed) }
   ```

   **Scope란?** 재사용 가능한 쿼리 조건입니다. SQLAlchemy에서 `query.filter(TransactionModel.date >= start_date).filter(TransactionModel.date <= end_date)` 같은 체이닝을 `Transaction.by_date_range(start, end)`로 간결하게 표현합니다. Scope은 체이닝도 가능합니다: `Transaction.by_date_range(start, end).by_type(:income).confirmed_only`

#### Step 2-3: RecurringTransaction 모델

**현재 SQLAlchemy 모델** (`backend/app/models/recurring_transaction.py`):
- `id`, `user_id`, `template_name`, `description`, `amount`, `type`, `frequency`, `start_date`, `end_date`, `day_of_month`, `is_active`, `is_variable_amount`, `deleted_at`, `created_at`, `updated_at`

**Rails에서 생성**:
```bash
rails generate model RecurringTransaction user:references template_name:string \
  description:string amount:integer transaction_type:string frequency:string \
  start_date:string end_date:string day_of_month:integer \
  is_active:boolean is_variable_amount:boolean deleted_at:datetime
```

**Soft Delete 구현 - `discard` gem 사용**:

현재 Python 코드에서는 soft delete를 수동으로 구현했습니다:
```python
# recurring_transaction_crud.py
def soft_delete_recurring_transaction(db, recurring):
    recurring.deleted_at = func.now()
    recurring.is_active = False
    db.flush()
```

Rails에서는 `discard` gem이 이 패턴을 자동화합니다:

1. **Gemfile에 추가**: `gem 'discard'`
2. **모델에 include**: `include Discard::Model`
3. **discard 컬럼 지정**: `self.discard_column = :deleted_at`
4. **기본 스코프**: `default_scope -> { kept }` (deleted_at이 nil인 레코드만 조회)

이렇게 하면 `recurring_transaction.discard`로 soft delete, `recurring_transaction.undiscard`로 복원, `RecurringTransaction.kept`로 활성 레코드만 조회, `RecurringTransaction.discarded`로 삭제된 레코드 조회가 가능합니다.

**모델 파일에 추가할 내용**:
1. **Enum**: `enum :transaction_type, { income: "income", expense: "expense" }`
2. **Enum**: `enum :frequency, { weekly: "weekly", monthly: "monthly", yearly: "yearly" }`
3. **관계**: `belongs_to :user`, `has_many :transactions, foreign_key: :recurring_id`
4. **검증**: template_name, description, amount 등

**학습 포인트 - Soft Delete 전략 비교**:
| 방법 | 장점 | 단점 |
|------|------|------|
| 수동 구현 (현재 Python) | 완전 제어 | 보일러플레이트 많음 |
| `discard` gem (권장) | 간결, 유지보수 쉬움 | 외부 의존성 |
| `acts_as_paranoid` gem | 오래된 표준 | 기본 스코프 덮어쓰기 문제 |
| `paranoia` gem | 인기 많음 | 유지보수 중단됨 |

#### Step 2-4: AssetAdjustment 모델

**현재 SQLAlchemy 모델** (`backend/app/models/asset_adjustment.py`):
- `id`, `user_id`, `amount`, `type`, `reason`, `adjustment_date`, `created_at`, `updated_at`

**Rails에서 생성**:
```bash
rails generate model AssetAdjustment user:references amount:integer \
  adjustment_type:string reason:string adjustment_date:date
```

**모델 파일에 추가할 내용**:
1. **Enum**: `enum :adjustment_type, { income_missing: "income_missing", expense_missing: "expense_missing" }`
2. **검증**: amount (양수), reason (presence), adjustment_date (presence)
3. **인덱스**: adjustment_date에 인덱스 추가 (마이그레이션에서)

#### Step 2-5: User 모델 관계 추가

Phase 1에서 Devise가 생성한 `app/models/user.rb`에 관계를 추가합니다:

```ruby
has_many :categories, dependent: :destroy
has_many :transactions, dependent: :destroy
has_many :recurring_transactions, dependent: :destroy
has_many :asset_adjustments, dependent: :destroy
```

이것은 현재 `backend/app/models/user.py`의 `relationship()` 정의에 해당합니다.

**`dependent: :destroy`의 의미**: 사용자 삭제 시 관련 데이터도 함께 삭제. 현재 SQLAlchemy의 `ondelete="CASCADE"`와 동일합니다.

#### Step 2-6: 기본 카테고리 시드 + 자동 생성

**현재 구현**: `backend/app/api/dependencies/auth.py`의 `create_default_categories()` 함수가 첫 로그인 시 13개 기본 카테고리를 bulk insert합니다.

**Rails에서의 구현 - 두 곳에서 처리**:

1. **`db/seeds.rb`** (개발/테스트용 초기 데이터):
   기본 카테고리 데이터를 정의합니다. `rails db:seed` 명령으로 실행합니다.

2. **User 모델의 `after_create` 콜백** (프로덕션 자동 생성):
   새 사용자 가입 시 자동으로 기본 카테고리를 생성합니다.

   **`after_create` 콜백이란?** ActiveRecord의 라이프사이클 콜백입니다. 레코드가 DB에 생성된 직후에 실행됩니다. 현재 FastAPI의 `get_current_user` 함수에서 `if not user:` 조건으로 하던 것을 Rails에서는 콜백으로 깔끔하게 분리합니다.

   User 모델에 `after_create :create_default_categories` 메서드를 정의하고, 그 안에서 13개 카테고리를 생성합니다.

기본 카테고리 데이터 (현재 `auth.py`에서 가져옴):
```
식비 🍽️, 간식류 🍪, 카페 ☕, 교통비 🚗, 문화생활 🎭,
의류 👔, 생필품 🛒, 의료비 🏥, 월급 💰, 월세 🏠,
통신비 📱, 공과금 ⚡, 기타 📝
```

#### Step 2-7: 마이그레이션 실행 순서

마이그레이션 파일은 타임스탬프 순으로 실행됩니다. 외래키 의존성을 고려해서 올바른 순서로 생성해야 합니다:

```
1. CreateUsers (Devise, Phase 1에서 완료)
2. CreateCategories (User FK)
3. CreateRecurringTransactions (User FK)
4. CreateTransactions (User FK, Category FK, RecurringTransaction FK)
5. CreateAssetAdjustments (User FK)
```

```bash
rails db:migrate
```

### 생성할 파일 목록
```
app/models/category.rb                            # Category 모델
app/models/transaction.rb                          # Transaction 모델
app/models/recurring_transaction.rb                # RecurringTransaction 모델
app/models/asset_adjustment.rb                     # AssetAdjustment 모델
app/models/user.rb                                 # User 모델 (수정: 관계 + 콜백)
db/migrate/XXXX_create_categories.rb               # Category 마이그레이션
db/migrate/XXXX_create_recurring_transactions.rb   # RecurringTransaction 마이그레이션
db/migrate/XXXX_create_transactions.rb             # Transaction 마이그레이션
db/migrate/XXXX_create_asset_adjustments.rb        # AssetAdjustment 마이그레이션
db/seeds.rb                                        # 기본 카테고리 시드 (수정)
Gemfile                                            # discard gem 추가 (수정)
```

### 테스트
```bash
rails db:migrate
rails console
```

Rails 콘솔에서 모델 CRUD 테스트:
```ruby
# 사용자 생성 (Devise)
user = User.create!(email: "test@test.com", password: "password123")

# 기본 카테고리 자동 생성 확인
user.categories.count  # => 13

# 트랜잭션 생성
category = user.categories.first
user.transactions.create!(
  date: Date.today,
  description: "테스트 지출",
  amount: 15000,
  transaction_type: :expense,
  category: category,
  status: :confirmed
)

# Scope 테스트
user.transactions.confirmed_only.count
user.transactions.by_type(:expense).sum(:amount)
```

---

## Phase 3: 핵심 CRUD 기능

### 무엇을 하는가
거래(Transaction), 카테고리(Category), 반복거래(RecurringTransaction), 자산조정(AssetAdjustment)의 CRUD를 구현합니다. ERB 뷰와 Turbo Frame으로 SPA에 가까운 사용자 경험을 만듭니다.

### 왜 필요한가
이 Phase에서 Rails MVC 패턴의 핵심을 이해하게 됩니다. FastAPI에서 Router → Service → CRUD 3계층을 거치던 로직이 Rails에서는 Controller → Model 2계층으로 단순화됩니다.

### 수행 항목

#### Step 3-1: 라우팅 설정

**파일**: `config/routes.rb`

**라우트 설계 (현재 FastAPI 엔드포인트 매핑)**:

```ruby
# config/routes.rb
Rails.application.routes.draw do
  devise_for :users

  # 인증된 사용자만 접근
  authenticated :user do
    root "transactions#index"
  end

  # 미인증 사용자
  unauthenticated do
    root "devise/sessions#new", as: :unauthenticated_root
  end

  resources :transactions do
    collection do
      get :stats        # GET /transactions/stats
    end
  end

  resources :categories do
    collection do
      patch :reorder    # PATCH /categories/reorder
    end
  end

  resources :recurring_transactions
  resources :asset_adjustments do
    collection do
      get :stats        # GET /asset_adjustments/stats
    end
  end

  # 백업
  post "backup/export", to: "backups#export"
  post "backup/import", to: "backups#import_data"
  post "backup/preview", to: "backups#preview"
end
```

**`resources`의 작동 원리**: `resources :transactions` 한 줄로 7개 RESTful 라우트가 자동 생성됩니다:

```
GET    /transactions          => transactions#index   (목록)
GET    /transactions/new      => transactions#new     (생성 폼)
POST   /transactions          => transactions#create  (생성)
GET    /transactions/:id      => transactions#show    (상세)
GET    /transactions/:id/edit => transactions#edit    (수정 폼)
PATCH  /transactions/:id      => transactions#update  (수정)
DELETE /transactions/:id      => transactions#destroy (삭제)
```

FastAPI에서는 각 라우트를 `@router.get`, `@router.post`로 하나씩 정의했지만, Rails의 `resources`는 Convention으로 7개를 한 번에 생성합니다.

#### Step 3-2: Transactions Controller

**파일**: `app/controllers/transactions_controller.rb`

**현재 FastAPI 구조와 비교**:

현재 거래 생성 흐름:
```
FastAPI: transactions.py (Router) → transaction_service.py (Service) → transaction_crud.py (CRUD)
```

Rails 거래 생성 흐름:
```
Rails: transactions_controller.rb (Controller) → Transaction 모델 (ActiveRecord)
```

**Controller에서 구현할 액션들**:

1. **`before_action` 설정**:
   - `before_action :authenticate_user!` (Devise 인증, 현재 `Depends(get_current_user)` 대체)
   - `before_action :set_transaction, only: [:show, :edit, :update, :destroy]`

   **`before_action`이란?** 액션 실행 전에 공통 로직을 실행하는 필터입니다. FastAPI의 `Depends()`와 같은 역할. `authenticate_user!`는 Devise가 제공하는 메서드로, 로그인하지 않은 사용자를 로그인 페이지로 리다이렉트합니다.

2. **`index` 액션 (목록 조회 + 필터링)**:
   현재 FastAPI의 `get_transactions_by_user()` 함수 + 쿼리 파라미터 필터링에 해당합니다.

   `current_user.transactions`로 시작해서 Scope 체이닝으로 필터링합니다.
   현재 `transaction_crud.py`에서 `if start_date:`, `if end_date:` 등으로 분기하던 것을 Rails Scope으로 깔끔하게 처리합니다.

   **N+1 방지**: `.includes(:category)`를 반드시 추가합니다.
   이것은 현재 `joinedload(TransactionModel.category)`와 동일합니다.

3. **`create` 액션 (생성)**:
   현재 `transaction_service.py`의 `create_transaction()` → `transaction_crud.py`의 `create_transaction()` 흐름을 하나의 액션으로 통합합니다.

   **Strong Parameters**: FastAPI의 Pydantic 스키마(`TransactionCreate`)를 대체합니다.
   `params.require(:transaction).permit(:date, :description, :amount, :transaction_type, :category_id, :status, :recurring_id)`

   이렇게 하면 허용된 필드만 Mass Assignment가 가능합니다 (보안).

4. **`update` 액션 (수정)**:
   현재 `transaction_service.py`의 `update_transaction()` 대체.
   `@transaction.update!(transaction_params)` 한 줄로 처리됩니다.
   SQLAlchemy의 `setattr(transaction, field, value)` 루프 + `flush()` + `commit()` + `refresh()`가 Rails에서는 `update!` 하나로 끝납니다.

5. **`destroy` 액션 (삭제)**:
   `@transaction.destroy!`

6. **`stats` 커스텀 액션 (통계)**:
   현재 `transaction_crud.py`의 `get_total_income()`, `get_total_expense()`, `get_transaction_count()`, `get_category_breakdown()`을 대체합니다.

   이 통계 쿼리들은 Transaction 모델에 클래스 메서드로 정의하는 것을 권장합니다:
   - `Transaction.total_income(user)` → `user.transactions.income.confirmed_only.sum(:amount)`
   - `Transaction.total_expense(user)` → `user.transactions.expense.confirmed_only.sum(:amount)`
   - `Transaction.category_breakdown(user, start_date, end_date, type)` → GROUP BY 쿼리

**`private` 메서드**:
- `set_transaction`: `@transaction = current_user.transactions.find(params[:id])`
  현재 `get_transaction_by_id(db, transaction_id, user_id)` 대체. `current_user.transactions`로 시작하므로 자동으로 사용자별 데이터 격리가 됩니다.
- `transaction_params`: Strong Parameters 메서드

#### Step 3-3: Categories Controller

**파일**: `app/controllers/categories_controller.rb`

현재 `backend/app/api/routes/categories.py`의 Rails 버전입니다. 기본 CRUD는 Transactions Controller와 동일한 패턴입니다.

**특수 액션 - `reorder`**:
현재 `PATCH /categories/batch/reorder`로 카테고리 순서를 일괄 변경합니다.

Rails에서는 `acts_as_list` gem을 사용하면 `insert_at(position)` 메서드가 자동 생성됩니다. 컨트롤러의 `reorder` 액션에서 전달받은 순서 배열을 순회하며 각 카테고리의 position을 업데이트합니다.

#### Step 3-4: RecurringTransactions Controller

**파일**: `app/controllers/recurring_transactions_controller.rb`

기본 CRUD + soft delete 처리.

**`destroy` 액션 주의사항**: 현재 FastAPI의 soft delete 로직(`recurring_transaction_service.py`):
1. SCHEDULED 상태 트랜잭션 삭제
2. RecurringTransaction soft delete (deleted_at 설정 + is_active = false)
3. CONFIRMED 트랜잭션 보존

이 로직은 Controller에서 직접 하기에 복잡합니다. **Service Object 패턴**을 적용하는 것을 권장합니다:

`app/services/recurring_transaction_destroyer.rb` 파일을 만들어서 이 비즈니스 로직을 분리합니다.

**Service Object란?** Controller가 비대해지는 것을 방지하는 Rails 패턴입니다. FastAPI의 Service Layer와 같은 개념이지만, Rails에서는 필요할 때만 선택적으로 사용합니다. 단순 CRUD는 Controller + Model로 충분하고, 복잡한 비즈니스 로직만 Service Object로 분리합니다.

#### Step 3-5: AssetAdjustments Controller

**파일**: `app/controllers/asset_adjustments_controller.rb`

기본 CRUD + `stats` 커스텀 액션. Transaction Controller와 유사한 패턴입니다.

#### Step 3-6: ERB 뷰 작성

**현재 React 컴포넌트 → Rails ERB 뷰 매핑**:

```
React                                   Rails ERB
──────────────────────────────────────────────────────────
Home.jsx                           =>   transactions/index.html.erb
TransactionForm.jsx                =>   transactions/_form.html.erb
TransactionList.jsx                =>   transactions/_transaction.html.erb (파셜)
TransactionItem.jsx                =>   (위 파셜에 포함)
RecurringTransactionForm.jsx       =>   recurring_transactions/_form.html.erb
CategoryManagement.jsx             =>   categories/index.html.erb
StatsPage.jsx                      =>   transactions/stats.html.erb
```

**ERB 파셜(_partial)이란?** React의 재사용 컴포넌트와 같은 개념입니다. 파일명이 `_`로 시작하며, `<%= render "transaction", transaction: @transaction %>`으로 포함합니다.

**Turbo Frame 활용**:

Turbo Frame은 페이지의 특정 영역만 서버에서 갱신하는 기술입니다. React의 컴포넌트 리렌더링에 해당합니다.

예를 들어, 거래 목록을 Turbo Frame으로 감싸면:
```erb
<turbo-frame id="transactions_list">
  <!-- 거래 목록 -->
</turbo-frame>
```
필터를 변경하면 이 프레임 안의 내용만 서버에서 다시 받아옵니다. 전체 페이지 새로고침 없이요.

**활용 포인트**:
- 거래 목록: 필터 변경 시 목록만 갱신
- 거래 폼: 모달을 Turbo Frame으로 로드
- 월별 요약: 월 변경 시 요약 영역만 갱신

#### Step 3-7: Turbo Stream으로 실시간 업데이트

**Turbo Stream이란?** 서버에서 HTML 조각을 보내서 페이지의 특정 요소를 추가/수정/삭제하는 기술입니다. React의 상태 변경 → 리렌더링과 비슷하지만, 서버가 주도합니다.

거래 생성 후 목록에 자동 추가되는 예시:

Controller에서 `create` 액션이 성공하면, `create.turbo_stream.erb` 파일이 렌더링되어 `turbo_stream.prepend "transactions_list"` 같은 명령으로 목록 상단에 새 거래를 삽입합니다.

이것은 현재 React의 `addTransaction()` → Context state 업데이트 → 리렌더링 패턴을 서버 사이드에서 처리하는 것입니다.

### 생성할 파일 목록
```
config/routes.rb                                      # 라우트 정의 (수정)
app/controllers/transactions_controller.rb             # Transaction CRUD
app/controllers/categories_controller.rb               # Category CRUD
app/controllers/recurring_transactions_controller.rb   # RecurringTransaction CRUD
app/controllers/asset_adjustments_controller.rb        # AssetAdjustment CRUD
app/controllers/backups_controller.rb                  # 백업/복원 (뼈대)
app/services/recurring_transaction_destroyer.rb        # Soft delete 서비스
app/views/transactions/index.html.erb                  # 메인 페이지
app/views/transactions/_form.html.erb                  # 거래 폼
app/views/transactions/_transaction.html.erb           # 거래 항목 파셜
app/views/transactions/new.html.erb                    # 새 거래 모달
app/views/transactions/edit.html.erb                   # 수정 모달
app/views/categories/index.html.erb                    # 카테고리 관리
app/views/categories/_form.html.erb                    # 카테고리 폼
app/views/recurring_transactions/index.html.erb        # 반복거래 목록
app/views/recurring_transactions/_form.html.erb        # 반복거래 폼
app/views/asset_adjustments/index.html.erb             # 자산조정 목록
```

### 테스트
```bash
rails routes  # 전체 라우트 확인
rails server
```
브라우저에서 각 CRUD 동작 확인:
- 거래 추가/수정/삭제
- 카테고리 추가/수정/삭제
- 반복거래 추가/수정/삭제 (soft delete 확인)
- 자산조정 추가/수정/삭제

---

## Phase 4: 달력 뷰 + 통계

### 무엇을 하는가
React의 `react-calendar` + `recharts`를 Rails ERB + `simple_calendar` + `chartkick`으로 대체합니다. Stimulus controller로 인터랙티브한 동작을 추가합니다.

### 왜 필요한가
이 Phase에서 서버 사이드 렌더링의 강점을 이해하게 됩니다. React에서는 데이터를 JSON으로 받아서 클라이언트에서 달력을 그렸지만, Rails에서는 서버가 완성된 달력 HTML을 보내줍니다.

### 수행 항목

#### Step 4-1: simple_calendar gem 설치

**Gemfile에 추가**: `gem 'simple_calendar'`

**simple_calendar이란?** 서버에서 HTML 달력을 렌더링하는 gem입니다. `react-calendar`가 클라이언트 사이드에서 달력을 그리는 것과 달리, 서버가 완성된 달력 HTML을 브라우저에 보냅니다.

**현재 CalendarBox.jsx와의 차이**:

현재 방식:
```
서버 → JSON 데이터 → React가 달력 렌더링 → tileContent에 수입/지출 표시
```

Rails 방식:
```
서버가 달력 HTML 렌더링 (각 날짜 셀에 수입/지출 이미 포함) → 브라우저에 전송
```

#### Step 4-2: 달력 뷰 구현

`simple_calendar`는 뷰 템플릿에서 `month_calendar` 헬퍼를 사용합니다. 각 날짜를 순회하면서 해당 날짜의 이벤트(거래)를 표시합니다.

**Controller에서 데이터 준비**:

거래 데이터를 날짜별로 그룹화합니다. 현재 `CalendarBox.jsx`에서 `filteredTransactions`를 클라이언트에서 날짜별로 필터링하던 것을 서버에서 처리합니다:

```ruby
# transactions_controller.rb의 index 액션
@transactions_by_date = current_user.transactions
  .includes(:category)
  .by_date_range(@start_date, @end_date)
  .group_by(&:date)
```

**N+1 방지**: `.includes(:category)`가 반드시 필요합니다. 이것은 현재 Python 코드의 `joinedload(TransactionModel.category)`와 동일합니다. 없으면 각 거래마다 별도 SQL로 카테고리를 조회합니다.

#### Step 4-3: 날짜 클릭 시 상세 내역 (Turbo Frame)

현재 React에서는 날짜를 클릭하면 `selectedDate` 상태가 변경되고, 하단의 `simple-details-section`이 리렌더링됩니다.

Rails에서는 **Turbo Frame**으로 구현합니다:

1. 달력의 각 날짜 셀에 링크를 만들고, `data-turbo-frame="daily_transactions"` 속성을 추가합니다.
2. 하단에 `<turbo-frame id="daily_transactions">` 영역을 만듭니다.
3. 날짜 클릭 시 해당 날짜의 거래 목록만 이 프레임 안에 업데이트됩니다.

**Turbo Frame의 작동 원리**: 링크나 폼이 `turbo-frame` 안에 있으면, 응답의 같은 ID를 가진 `turbo-frame`만 교체합니다. 나머지 페이지는 그대로 유지됩니다. React의 부분 리렌더링과 동일한 결과를 서버 사이드에서 달성합니다.

#### Step 4-4: 월별 요약 (수입/지출 합계)

현재 Home.jsx의 `summary-container`에 표시되는 월별 수입/지출 합계입니다.

현재 방식:
```javascript
// TransactionContext.jsx에서 filteredTransactions 기반 클라이언트 계산
const income = filteredTransactions
  .filter(t => t.type === 'income' && t.status === 'confirmed')
  .reduce((sum, t) => sum + t.amount, 0)
```

Rails 방식 (서버에서 계산):
```ruby
# Controller
@total_income = current_user.transactions.income.confirmed_only
  .by_date_range(@start_date, @end_date).sum(:amount)
@total_expense = current_user.transactions.expense.confirmed_only
  .by_date_range(@start_date, @end_date).sum(:amount)
```

DB에서 SUM을 계산하므로 클라이언트보다 효율적입니다. 현재 Python 코드의 `get_total_income()`, `get_total_expense()` 함수와 동일한 SQL이 생성됩니다.

#### Step 4-5: 월 변경 (Turbo Frame)

현재 React에서는 `react-calendar`의 `onActiveStartDateChange`로 월이 변경될 때 `loadFilteredTransactions()`를 호출합니다.

Rails에서는 달력 전체를 Turbo Frame으로 감싸고, 이전/다음 월 버튼 클릭 시 해당 월의 데이터로 프레임을 교체합니다.

#### Step 4-6: 통계 페이지 (chartkick + groupdate)

**Gemfile에 추가**: `gem 'chartkick'` + `gem 'groupdate'`

**chartkick이란?** 서버 사이드에서 차트 데이터를 준비하고, Chart.js(또는 Google Charts)로 렌더링하는 gem입니다. 현재 React의 `recharts` 라이브러리를 대체합니다.

**현재 StatsPage.jsx + CategoryPieChart.jsx와의 비교**:

현재 방식:
```
서버 → JSON (category_breakdown) → React → recharts PieChart 렌더링
```

Rails 방식:
```
서버 → chartkick 헬퍼가 데이터 + Chart.js 스크립트를 HTML에 포함 → 브라우저가 차트 렌더링
```

**통계 데이터 쿼리**:

현재 `transaction_crud.py`의 `get_category_breakdown()`을 Rails ActiveRecord로 변환합니다.

Transaction 모델에 클래스 메서드를 추가합니다:

```ruby
# app/models/transaction.rb
def self.category_breakdown(start_date, end_date, type)
  where(date: start_date..end_date, transaction_type: type, status: :confirmed)
    .joins(:category)
    .group('categories.name', 'categories.emoji')
    .select(
      'categories.name as category_name',
      'categories.emoji as category_emoji',
      'SUM(transactions.amount) as total_amount',
      'COUNT(transactions.id) as transaction_count'
    )
    .order('total_amount DESC')
end
```

이것은 현재 Python의 GROUP BY + JOIN 쿼리와 동일한 SQL을 생성합니다.

**뷰에서 차트 렌더링**:
ERB 템플릿에서 `pie_chart` 헬퍼를 사용합니다. chartkick이 데이터를 받아서 Chart.js 파이 차트를 자동으로 그려줍니다.

**월별 선택 + 타입 토글**:
현재 StatsPage.jsx의 이전/다음 월 버튼과 수입/지출 토글을 Turbo Frame으로 구현합니다. 버튼 클릭 시 통계 영역만 갱신됩니다.

### 생성할 파일 목록
```
app/views/transactions/index.html.erb    # 달력 뷰 포함 (수정)
app/views/transactions/_calendar.html.erb # 달력 파셜
app/views/transactions/_daily.html.erb    # 일별 상세 내역 파셜
app/views/transactions/_summary.html.erb  # 월별 요약 파셜
app/views/transactions/stats.html.erb     # 통계 페이지
Gemfile                                   # simple_calendar, chartkick 추가 (수정)
```

### 테스트
- 달력에서 날짜별 수입/지출 표시 확인
- 날짜 클릭 시 하단에 상세 내역 갱신 확인 (전체 페이지 새로고침 없이)
- 이전/다음 월 이동 시 달력 + 요약 갱신 확인
- 통계 페이지에서 파이 차트 렌더링 확인
- 월별/타입별 필터링 동작 확인

---

## Phase 5: 고급 기능

### 무엇을 하는가
반복거래 자동 생성 스케줄러, 백업/복원, 카테고리 드래그앤드롭, 온보딩 모달, ESC 키 모달 닫기 등 현재 앱의 고급 기능들을 Rails로 구현합니다.

### 왜 필요한가
Rails의 ActiveJob, Solid Queue, Stimulus, Service Object 등 프레임워크의 심화 기능을 학습합니다.

### 수행 항목

#### Step 5-1: 반복거래 자동 생성 스케줄러 (Solid Queue)

**현재 구현**: `frontend/src/utils/recurringScheduler.js`에 로직이 있지만 현재 미사용 상태. 백엔드 스케줄러로 이동 예정이었음.

**Rails 8 + Solid Queue에서의 구현**:

Solid Queue는 Rails 8 기본 내장이므로 **별도 gem 설치가 필요 없습니다**. Sidekiq과 달리 Redis도 불필요합니다.

1. **Solid Queue 확인** (이미 설정됨):
   - `config/queue.yml` — Solid Queue 데이터베이스 설정 (Rails 8 생성 시 자동)
   - `config/solid_queue.yml` — 큐 워커 설정 (Rails 8 생성 시 자동)
   - `config/recurring.yml` — **반복 작업 스케줄 등록** (새로 생성)

2. **Job 생성**:
   ```bash
   rails generate job RecurringTransactionGenerator
   ```
   `app/jobs/recurring_transaction_generator_job.rb` 파일이 생성됩니다.

**ActiveJob이란?** Rails의 백그라운드 작업 프레임워크입니다. FastAPI에서는 백그라운드 작업 기능이 제한적이었지만 (별도의 Celery 등 필요), Rails의 ActiveJob은 내장 기능입니다. Solid Queue가 이 Job을 DB 테이블에 저장하고 실행합니다.

**Solid Queue vs Sidekiq 비교**:

| 항목 | Sidekiq | Solid Queue |
|------|---------|-------------|
| 저장소 | Redis (외부 서비스) | DB 테이블 (SQLite) |
| 설치 | gem 추가 + Redis 설치 | Rails 8 기본 내장 |
| 반복 스케줄 | sidekiq-cron gem 별도 필요 | `config/recurring.yml` 내장 |
| 모니터링 | Sidekiq Web UI | Mission Control gem (선택) |
| 성능 | 높음 (Redis 인메모리) | 개인 프로젝트에 충분 |

**Job 로직** (현재 `recurringScheduler.js`의 `generateScheduledTransactions` 참조):

1. 활성 상태(`is_active: true`)인 RecurringTransaction 조회
2. 각 템플릿의 `frequency`, `day_of_month` 기준으로 오늘 생성해야 하는지 판단
3. 이미 이번 달에 생성된 거래가 있는지 확인 (중복 방지)
4. 날짜가 과거/오늘이면 `confirmed`, 미래면 `scheduled` 상태로 거래 생성
5. `start_date`, `end_date` 범위 내인지 확인

**스케줄 등록**: `config/recurring.yml`에서 매일 자정(KST) 실행:
```yaml
# config/recurring.yml
recurring_transaction_generator:
  class: RecurringTransactionGeneratorJob
  schedule: every day at 12:00am Asia/Seoul
```

**Solid Queue의 `recurring.yml` 작동 원리**: Sidekiq-cron이 Redis에 Cron 스케줄을 저장하는 것과 달리, Solid Queue는 이 YAML 파일을 읽어서 DB의 `solid_queue_recurring_executions` 테이블에 스케줄을 등록합니다. Rails 서버(또는 Solid Queue 워커)가 실행 중이면 자동으로 스케줄된 시간에 Job이 실행됩니다.

#### Step 5-2: 백업/복원 (Service Object)

**현재 구현**: `backend/app/services/backup_service.py`

이 기능은 Rails Controller에서 직접 구현하기에 복잡합니다. **Service Object 패턴**을 적용합니다.

**파일 구조**:
```
app/services/backup/
  export_service.rb    # 데이터 수집 + JSON + gzip
  import_service.rb    # 해제 + 파싱 + UUID 매핑 + bulk insert
```

**Export 서비스** (현재 `backup_service.py`의 `create_backup()` 대체):

1. `current_user`의 모든 데이터 수집 (categories, transactions, recurring_transactions)
2. Ruby Hash로 구성 (Python의 dict에 해당)
3. `to_json`으로 직렬화
4. `Zlib::Deflate.deflate()`로 gzip 압축 (Ruby 표준 라이브러리)
5. `send_data`로 파일 다운로드 응답

**Import 서비스** (현재 `backup_service.py`의 `restore_backup()` 대체):

현재 Python 코드의 핵심 로직인 **UUID 재매핑**을 Rails에서도 동일하게 구현합니다:

1. gzip 해제 + JSON 파싱
2. `overwrite` 옵션이 true면 기존 데이터 삭제
3. Category bulk insert → flush → 새 UUID 발급
4. `category_id_map`: 백업의 old UUID → 새 UUID 매핑 테이블 생성
5. Transaction bulk insert (mapped category_id 사용)
6. RecurringTransaction bulk insert → flush → 새 UUID 발급
7. `recurring_id_map` 생성 → Transaction의 recurring_id 업데이트
8. 전체를 하나의 트랜잭션으로 감싸서 commit (실패 시 rollback)

Rails에서 트랜잭션 관리:
```ruby
ActiveRecord::Base.transaction do
  # 모든 insert/update가 성공해야 commit
  # 에러 발생 시 자동 rollback
end
```

이것은 현재 Python의 `try: ... self.db.commit() / except: self.db.rollback()` 패턴과 동일합니다.

**Controller**:

`app/controllers/backups_controller.rb`에서 3개 액션:
- `export`: Export 서비스 호출 → gzip 파일 다운로드 (현재 `POST /backup/export`)
- `import_data`: Import 서비스 호출 (현재 `POST /backup/import`)
  - 파일 업로드: `params[:file]` (현재 FastAPI의 `UploadFile`)
  - overwrite 옵션: `params[:overwrite]`
- `preview`: 메타데이터만 추출 (현재 `POST /backup/preview`)

#### Step 5-3: 카테고리 드래그앤드롭 (Stimulus + Sortable.js)

**현재 구현**: `@dnd-kit/core` + `@dnd-kit/sortable` (React)

**Rails에서의 구현**:

1. **acts_as_list gem**: 카테고리의 순서를 DB에서 관리합니다.
   - Gemfile에 `gem 'acts_as_list'` 추가
   - Category 모델에 `acts_as_list scope: :user` 추가
   - 이미 `order` 컬럼이 있으므로 `column: :order` 옵션 사용

2. **Sortable.js + Stimulus**: 프론트엔드 드래그앤드롭을 처리합니다.
   - importmap에 `pin "sortablejs"` 추가
   - `app/javascript/controllers/sortable_controller.js` Stimulus controller 생성
   - 드래그 종료 시 서버에 PATCH 요청 (새 순서 전송)

**Stimulus Controller란?** Rails의 가벼운 JavaScript 프레임워크입니다. React 컴포넌트가 상태 관리 + UI 렌더링을 모두 하는 것과 달리, Stimulus는 **이미 서버에서 렌더링된 HTML에 동작(behavior)만 추가**합니다.

```
React: 상태 → 렌더링 → 이벤트 핸들러 (모든 것이 JS)
Stimulus: 서버 HTML → Stimulus가 이벤트만 처리 (HTML은 서버, JS는 최소한)
```

#### Step 5-4: 모달 시스템 (Stimulus)

**현재 구현**: React의 `useState`로 `showForm`, `showCategoryManagement` 등을 토글. ESC 키로 닫기.

**Rails에서의 구현**:

`app/javascript/controllers/modal_controller.js` Stimulus controller 생성:

- `connect()`: 모달 열기 (Stimulus 라이프사이클)
- `close()`: 모달 닫기
- `closeOnEsc(event)`: ESC 키 이벤트 감지
- `closeOnOverlay(event)`: 오버레이 클릭 감지

HTML에서 사용:
```erb
<div data-controller="modal" data-action="keydown.esc@window->modal#close">
  <!-- 모달 내용 -->
</div>
```

**Stimulus의 `data-action` 문법**: `이벤트@타겟->컨트롤러#메서드` 형식입니다. React의 `onKeyDown={handleEscape}`와 동일한 역할입니다.

**Turbo Frame + 모달 조합**: 모달 내용을 Turbo Frame으로 로드하면, 새 거래 폼이나 수정 폼을 서버에서 가져와서 모달에 표시할 수 있습니다.

#### Step 5-5: 온보딩 모달

**현재 구현**: `OnboardingModal.jsx` + `localStorage`로 표시 여부 관리

**Rails에서의 구현**:

1. User 모델에 `onboarding_completed` 컬럼 추가 (boolean, default: false):
   ```bash
   rails generate migration AddOnboardingCompletedToUsers onboarding_completed:boolean
   ```

2. `before_action`으로 온보딩 체크:
   `application_controller.rb`에서 `check_onboarding` 메서드를 정의하고, `onboarding_completed`가 false인 경우 온보딩 페이지로 리다이렉트합니다.

3. 온보딩 완료 시 `current_user.update!(onboarding_completed: true)`

**localStorage vs DB 저장의 차이**: 현재는 localStorage에 저장하므로 브라우저를 바꾸면 온보딩이 다시 표시됩니다. DB에 저장하면 어느 기기에서든 일관됩니다.

#### Step 5-6: 백업 알림 (30일)

**현재 구현**: `Home.jsx`의 `checkBackupStatus()` + localStorage

**Rails에서의 구현**:

1. User 모델에 `last_backup_at` 컬럼 추가 (datetime)
2. `before_action`에서 30일 경과 체크
3. Flash 메시지 또는 Turbo Stream으로 알림 표시:
   `flash.now[:backup_reminder] = "마지막 백업 후 30일이 지났습니다."`

### 생성할 파일 목록
```
app/jobs/recurring_transaction_generator_job.rb    # 반복거래 자동 생성 Job
app/services/backup/export_service.rb              # 백업 Export 서비스
app/services/backup/import_service.rb              # 백업 Import 서비스
app/services/recurring_transaction_destroyer.rb     # Soft delete 서비스 (Phase 3)
app/controllers/backups_controller.rb              # 백업 컨트롤러
app/javascript/controllers/sortable_controller.js  # 드래그앤드롭
app/javascript/controllers/modal_controller.js     # 모달 제어
config/recurring.yml                               # Solid Queue 반복 스케줄
db/migrate/XXXX_add_onboarding_to_users.rb         # 온보딩 컬럼
db/migrate/XXXX_add_last_backup_at_to_users.rb     # 백업 날짜 컬럼
Gemfile                                            # acts_as_list 추가
```

### 테스트
- 반복거래 생성 후 Solid Queue Job 수동 실행:
  ```ruby
  RecurringTransactionGeneratorJob.perform_now
  ```
- 백업 Export → Import → 데이터 비교
- 카테고리 드래그앤드롭 후 순서 저장 확인
- ESC 키로 모달 닫기 확인
- 온보딩 모달 표시/비표시 확인

---

## Phase 6: 데이터 마이그레이션

### 무엇을 하는가
기존 PostgreSQL 데이터베이스(FastAPI 앱의 261+ 트랜잭션, 카테고리, 반복거래 등)를 새 Rails SQLite 데이터베이스로 이관합니다.

### 왜 필요한가
기존에 쌓아온 가계부 데이터를 보존해야 합니다. Rails의 Rake 태스크를 통해 데이터 이관 스크립트를 작성하는 방법을 학습합니다.

### 수행 항목

#### Step 6-1: 데이터 이관 전략

DB 엔진이 PostgreSQL → SQLite로 바뀌므로, 직접 SQL 연결 대신 **백업 JSON 파일을 활용**하는 것이 가장 안전합니다.

**방법 (권장)**: 기존 백업 기능으로 JSON export → Rails에서 import

1. 현재 FastAPI 앱의 백업 기능(`POST /backup/export`)으로 gzip JSON 파일 생성
2. Rails Rake 태스크에서 이 파일을 읽어서 새 DB에 삽입
3. 이미 구현된 `backup_service.py`의 UUID 매핑 로직을 Rails에서 재구현

이 방법은 이미 Phase 5에서 구현한 `Backup::ImportService`를 재활용할 수 있으므로 효율적입니다.

**대안 (고급)**: `pg` gem을 설치해서 기존 PostgreSQL에 직접 연결
```ruby
# Gemfile (개발용으로만)
gem 'pg', group: :development
```
하지만 SQLite 앱에 PostgreSQL 의존성을 추가하는 것은 비추천합니다.

#### Step 6-2: Rake 태스크 생성

**Rake란?** Ruby의 빌드/태스크 자동화 도구입니다. Python의 스크립트나 Makefile에 해당합니다. `rails db:migrate`도 내부적으로 Rake 태스크입니다.

```bash
rails generate task migrate_data import
```

**파일**: `lib/tasks/migrate_data.rake`

Rake 태스크에서 할 일:

1. 기존 앱에서 export한 gzip JSON 파일 경로를 인자로 받음
2. `Zlib::GzipReader`로 해제 + `JSON.parse`
3. Devise User 생성 (이메일/임시 비밀번호)
4. Phase 5에서 만든 `Backup::ImportService` 호출 (또는 동일 로직 직접 구현)

#### Step 6-3: 스키마 매핑

| 기존 (FastAPI/PostgreSQL) | 신규 (Rails/SQLite) | 비고 |
|--------------------------|-------------------|------|
| `type` (enum) | `transaction_type` (string) | STI 충돌 회피 |
| `clerk_user_id` | (없음) | Devise email로 대체 |
| UUID PK (PostgreSQL 네이티브) | 정수 ID 또는 string UUID | Step 1-2 선택에 따라 |
| PostgreSQL Enum | Rails ActiveRecord Enum (string) | 값은 동일 |
| `DateTime(timezone=True)` | `datetime` | SQLite는 타임존 미지원, UTC 문자열 |

**마이그레이션 단계**:

1. **사용자 생성**: 기존 User의 email로 Devise User 생성. 비밀번호는 임시로 설정하고, 이후 비밀번호 재설정 필요.

2. **카테고리 이관**: 백업 JSON의 categories 배열 → Rails Category 모델로 삽입. ID 매핑 테이블 생성.

3. **반복거래 이관**: `type` → `transaction_type` 매핑, `deleted_at` 보존.

4. **트랜잭션 이관**: `type` → `transaction_type` 매핑, category_id와 recurring_id를 ID 매핑 테이블로 변환.

5. **자산조정 이관**: `type` → `adjustment_type` 매핑.

#### Step 6-4: 데이터 검증

마이그레이션 후 반드시 검증합니다:

```ruby
# 레코드 수 비교
puts "Categories: #{Category.count}"
puts "Transactions: #{Transaction.count}"
puts "RecurringTransactions: #{RecurringTransaction.count}"
puts "AssetAdjustments: #{AssetAdjustment.count}"

# FK 무결성 확인
Transaction.where.not(category_id: Category.pluck(:id)).count  # => 0이어야 함
Transaction.where.not(recurring_id: [nil, *RecurringTransaction.pluck(:id)]).count  # => 0이어야 함

# 통계 비교
puts "Total income: #{Transaction.income.confirmed_only.sum(:amount)}"
puts "Total expense: #{Transaction.expense.confirmed_only.sum(:amount)}"
```

### 생성할 파일 목록
```
lib/tasks/migrate_data.rake    # 데이터 마이그레이션 Rake 태스크
```

### 테스트
```bash
# 1. 기존 FastAPI 앱에서 백업 export (Docker 실행 중인 상태에서)
curl -X POST http://localhost:8001/api/v1/backup/export -H "Authorization: Bearer <token>" -o backup.json.gz

# 2. Rails에서 import
rails migrate_data:import[backup.json.gz]

# 3. Rails 콘솔에서 데이터 확인
rails console
```
기존 앱과 새 앱의 레코드 수, 합계를 비교합니다.

---

## Phase 7: 배포 설정

### 무엇을 하는가
SQLite + Solid Trio 구성의 Rails 앱을 배포합니다. PostgreSQL, Redis가 필요 없으므로 인프라가 극적으로 단순해집니다.

### 왜 필요한가
현재 Docker Compose로 3개 컨테이너(PostgreSQL + Redis + FastAPI)를 관리했지만, SQLite + Solid Trio 구성에서는 **Rails 앱 하나만 배포하면 됩니다**. 이것이 Rails 8 "One Person Framework" 철학의 핵심입니다.

### 수행 항목

#### Step 7-1: 현재 인프라와 비교

```
현재 (Docker Compose 3컨테이너)              Rails 8 (단일 프로세스)
═══════════════════════════════════════════════════════════════════
hl-db (PostgreSQL 15)              =>   storage/production.sqlite3 (파일)
hl-redis (Redis 7)                 =>   storage/cache.sqlite3 (Solid Cache)
                                        storage/queue.sqlite3 (Solid Queue)
hl-api (FastAPI/Uvicorn)           =>   Rails/Puma (단일 서버)
docker-compose.yml (필수)          =>   Docker 선택사항 (없어도 됨)
```

#### Step 7-2: 개발 환경 (Docker 불필요)

SQLite는 서버 프로세스가 필요 없으므로, 개발 시 Docker가 필요 없습니다:

```bash
# 이것만으로 전체 앱이 실행됨
rails server
```

Solid Queue 워커도 별도 프로세스 없이 Rails 서버 안에서 실행됩니다 (개발 모드):
```ruby
# config/environments/development.rb
config.solid_queue.connects_to = { database: { writing: :queue } }
```

**현재와의 차이**: 현재는 `docker-compose up -d`로 PostgreSQL + Redis + FastAPI를 모두 띄워야 백엔드가 동작하지만, Rails + SQLite에서는 `rails server` 한 줄이면 끝입니다.

#### Step 7-3: 프로덕션 배포 - Dockerfile (선택)

Proxmox self-hosting 예정이므로, Docker로 배포하려면 Dockerfile을 작성합니다.

**Rails 8은 `rails new` 시 Dockerfile을 자동 생성합니다.** 별도 작성 불필요.

**현재 FastAPI Dockerfile** (`backend/Dockerfile`)과의 비교:

```
FastAPI                              Rails 8
──────────────────────────────────────────────────
python:3.11-slim                =>   ruby:3.3-slim
pip install requirements.txt   =>   bundle install
uvicorn app.main:app            =>   rails server (Puma)
(없음)                          =>   rails assets:precompile
외부 DB 필요 (PostgreSQL)       =>   SQLite 파일 내장 (볼륨 마운트)
외부 캐시 필요 (Redis)          =>   Solid Cache 내장
```

**핵심 주의사항 - SQLite 볼륨 마운트**:
Docker 컨테이너는 기본적으로 stateless입니다. SQLite 파일(`storage/` 디렉토리)을 **반드시 볼륨으로 마운트**해야 컨테이너 재시작 시 데이터가 보존됩니다.

#### Step 7-4: docker-compose.yml (프로덕션용)

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - rails_storage:/rails/storage    # SQLite 파일 보존 (핵심!)
    environment:
      - RAILS_ENV=production
      - RAILS_MASTER_KEY=${RAILS_MASTER_KEY}

volumes:
  rails_storage:                        # SQLite 데이터 영속화
```

**현재 4컨테이너에서 1컨테이너로 축소**. PostgreSQL, Redis 서비스가 모두 사라졌습니다.

#### Step 7-5: 환경 변수 관리

**현재**: `backend/.env` (DATABASE_URL, CLERK 키, REDIS_URL 등 6개+)

**Rails 방식**: `config/credentials.yml.enc` (암호화된 시크릿 관리)
- `EDITOR="vim" rails credentials:edit`로 편집
- `RAILS_MASTER_KEY`로 복호화
- 필요한 시크릿: `secret_key_base`만 (DATABASE_URL, REDIS_URL 불필요!)

**환경 변수 비교**:

| 현재 (.env) | Rails 8 | 비고 |
|------------|---------|------|
| `DATABASE_URL` | 불필요 | SQLite는 파일 경로 (database.yml에 내장) |
| `REDIS_URL` | 불필요 | Solid Trio가 대체 |
| `CLERK_PUBLISHABLE_KEY` | 불필요 | Devise가 대체 |
| `CLERK_SECRET_KEY` | 불필요 | Devise가 대체 |
| `ALLOWED_ORIGINS` | 불필요 | 풀스택이므로 CORS 불필요 |
| `RAILS_MASTER_KEY` | **필요** | credentials 암호화 키 |

#### Step 7-6: 백업 전략 변경

현재는 gzip JSON export/import로 백업하지만, SQLite에서는 **파일 복사가 곧 백업**입니다:

```bash
# SQLite 백업 = 파일 복사
cp storage/production.sqlite3 backups/production_$(date +%Y%m%d).sqlite3
```

기존 gzip JSON 백업 기능(Phase 5)은 **데이터 이식성**을 위해 유지하되, 일상적인 백업은 파일 복사로 충분합니다.

### 생성할 파일 목록
```
Dockerfile                    # Rails 8이 자동 생성 (확인만)
docker-compose.yml            # 프로덕션용 (1컨테이너)
.dockerignore                 # Rails 8이 자동 생성 (확인만)
```

### 테스트
```bash
# 개발 환경 (Docker 없이)
rails server
# http://localhost:3000 접속 → 전체 기능 확인

# Docker 프로덕션 환경
docker-compose build
docker-compose up -d
# http://localhost:3000 접속 → 전체 기능 확인
# 컨테이너 재시작 후 데이터 보존 확인
```

---

## Phase 8: 정리 + 기능 검증

### 무엇을 하는가
모든 기능이 Rails로 이관되었는지 확인하고, 기존 React + FastAPI 코드를 정리합니다.

### 왜 필요한가
마이그레이션 완료 확인과 기존 코드 보관이 필요합니다. 기존 코드는 즉시 삭제하지 않고 별도 브랜치에 보관하는 것을 권장합니다 (롤백 대비).

### 수행 항목

#### Step 8-1: 기능 체크리스트

아래 항목을 모두 확인합니다:

**인증**
- [ ] 회원가입 (이메일/비밀번호)
- [ ] 로그인/로그아웃
- [ ] 비밀번호 재설정

**거래(Transaction) CRUD**
- [ ] 거래 추가 (수입/지출)
- [ ] 거래 목록 조회
- [ ] 거래 수정
- [ ] 거래 삭제
- [ ] 거래 상태 (confirmed/scheduled)
- [ ] 카테고리 연결

**달력**
- [ ] 월별 달력 표시
- [ ] 날짜별 수입/지출 표시
- [ ] 날짜 클릭 시 상세 내역
- [ ] 이전/다음 월 이동

**카테고리**
- [ ] 카테고리 추가 (이름 + 이모지)
- [ ] 카테고리 수정
- [ ] 카테고리 삭제
- [ ] 카테고리 드래그앤드롭 순서 변경

**반복거래**
- [ ] 반복거래 템플릿 추가
- [ ] 반복거래 수정
- [ ] 반복거래 삭제 (soft delete)
- [ ] 자동 생성 스케줄러 (Solid Queue)
- [ ] SCHEDULED 거래 삭제 + CONFIRMED 보존

**자산조정**
- [ ] 자산조정 추가
- [ ] 자산조정 수정/삭제
- [ ] 통계 조회

**통계**
- [ ] 전체 자산 표시 (수입 - 지출)
- [ ] 월별 수입/지출 요약
- [ ] 카테고리별 파이 차트
- [ ] 월/타입 필터링

**백업/복원**
- [ ] gzip 백업 Export
- [ ] gzip 백업 Import (overwrite 옵션)
- [ ] 백업 미리보기 (Preview)
- [ ] 백업 알림 (30일)

**UX**
- [ ] 온보딩 모달 (첫 로그인)
- [ ] 기본 카테고리 13개 자동 생성
- [ ] ESC 키 모달 닫기
- [ ] 금액 콤마 포맷팅
- [ ] 한국어 UI 전체

#### Step 8-2: 기존 코드 확인

Phase 1의 Step 1-0에서 이미 `legacy/react-fastapi` 브랜치에 기존 코드를 보관했습니다.

```bash
# 기존 코드 확인이 필요할 때
git log legacy/react-fastapi --oneline -10
git show legacy/react-fastapi:backend/app/services/backup_service.py
```

기존 파일을 참조할 때 체크아웃 없이 `git show 브랜치:파일경로`로 내용을 확인할 수 있습니다.

#### Step 8-3: CLAUDE.md 업데이트

새 Rails 구조를 반영하여 CLAUDE.md를 전면 개정합니다:
- 프로젝트 개요 (Rails 풀스택)
- 개발 명령어 (`rails server`, `rails console`, `docker-compose up`)
- 아키텍처 (MVC, Hotwire, Stimulus)
- Gem 의존성 목록
- 데이터베이스 스키마 (ActiveRecord 기준)

#### Step 8-4: 문서 정리

- `docs/` 디렉토리의 기존 FastAPI 관련 문서를 `docs/legacy/`로 이동
- 새 Rails 관련 문서 추가 (필요 시)

### 테스트
- 체크리스트 100% 완료 확인
- `rails server`로 전체 앱 기동 확인
- 데이터 마이그레이션 후 기존 데이터 조회 확인
- 기존 코드 제거 후 빌드/실행 확인
- SQLite 파일 백업/복원 확인

---

## 참고: 예상 학습 곡선

| Phase | 난이도 | 예상 학습 내용 |
|-------|--------|--------------|
| 0 | 쉬움 | Ruby 설치, 환경 설정 |
| 1 | 보통 | Rails Convention, Devise, MVC 패턴 |
| 2 | 보통 | ActiveRecord, 마이그레이션, Enum, Scope |
| 3 | 어려움 | Controller CRUD, ERB, Turbo Frame/Stream, Strong Parameters |
| 4 | 어려움 | simple_calendar, chartkick, Stimulus, Turbo 심화 |
| 5 | 어려움 | Solid Queue, Service Object, Stimulus 심화, 복잡한 비즈니스 로직 |
| 6 | 보통 | Rake 태스크, JSON 파싱, 데이터 검증 |
| 7 | 쉬움 | Dockerfile 확인, 볼륨 마운트 (1컨테이너) |
| 8 | 쉬움 | 정리, 검증 |

---

## 참고 자료

### 공식 문서
- [Ruby on Rails 가이드](https://guides.rubyonrails.org/) - Rails 공식 학습 자료
- [Devise README](https://github.com/heartcombo/devise) - Devise gem 문서
- [Hotwire 공식](https://hotwired.dev/) - Turbo + Stimulus 문서
- [Stimulus Handbook](https://stimulus.hotwired.dev/handbook/introduction) - Stimulus 학습

### Solid Trio 문서
- [Solid Queue](https://github.com/rails/solid_queue) - DB 기반 Job 큐 (Sidekiq 대체)
- [Solid Cache](https://github.com/rails/solid_cache) - DB 기반 캐시 (Redis 대체)
- [Solid Cable](https://github.com/rails/solid_cable) - DB 기반 ActionCable

### Gem 문서
- [simple_calendar](https://github.com/excid3/simple_calendar)
- [chartkick](https://github.com/ankane/chartkick)
- [discard](https://github.com/jhawthorn/discard)
- [acts_as_list](https://github.com/brendon/acts_as_list)
- [pagy](https://github.com/ddnexus/pagy)

### 현재 프로젝트 참조 파일
데이터 이관 및 기능 구현 시 참조할 현재 파일들:
- `backend/app/models/enums.py` — 4개 Enum 정의
- `backend/app/services/backup_service.py` — 백업 UUID 재매핑 로직
- `backend/app/crud/transaction_crud.py` — 통계 쿼리, N+1 방지
- `frontend/src/pages/Home.jsx` — UI 흐름, 모달 패턴
- `backend/app/api/dependencies/auth.py` — 기본 카테고리 13개 데이터
- `frontend/src/utils/recurringScheduler.js` — 반복거래 생성 로직
