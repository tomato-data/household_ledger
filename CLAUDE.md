# CLAUDE.md

이 파일은 Claude Code가 이 리포지토리에서 작업할 때 참고할 가이드라인입니다.

## 프로젝트 개요

Ruby on Rails 기반 가계부(Household Ledger) 풀스택 모놀리스 애플리케이션입니다.
기존 React + FastAPI + PostgreSQL 프로젝트에서 Rails로 전면 이관 중이며, 기존 코드는 `legacy/react-fastapi` 브랜치에 보존되어 있습니다.

## 핵심 학습 목표 및 중요 지침

### 기본 원칙

- 이 프로젝트는 Ruby on Rails 학습이 주목적입니다
- **Rails 백엔드 코드** (모델, 컨트롤러, 마이그레이션 등): Claude는 직접 코드를 작성하지 말고, 개발자가 수동으로 코딩할 수 있도록 상세한 설명을 제공해주세요
- **프론트엔드/디자인 코드** (뷰, CSS, JavaScript, 레이아웃 등): Claude가 직접 작성해도 됩니다
- 모든 대화는 한국어로 진행해주세요

### 응답 방식

Claude는 다음과 같은 방식으로 응답해야 합니다:

1. 코드 작성 대신 설명 우선: 코드를 직접 수정하지 말고, 어떻게 작성해야 하는지 단계별로 설명
2. 작동 원리 설명: 해당 코드가 왜 그렇게 작성되어야 하는지, 어떤 원리로 동작하는지 설명
3. 다른 코드와의 연계성: 작성할 코드가 다른 파일이나 모듈과 어떻게 상호작용하는지 설명
4. 모범 사례 및 주의사항: Rails Convention, 보안, 성능 등에 대한 모범 사례 제시
5. 학습 포인트 강조: 각 단계에서 배울 수 있는 개념이나 기술을 명확히 설명

### 예시

- 나쁜 응답: "이렇게 코드를 작성하세요" + 바로 코드 제시
- 좋은 응답: "Rails에서 Controller를 만들 때는 다음과 같은 원리로 작동합니다. RESTful 라우팅이 자동으로 7개의 액션을 매핑하는 이유는... 그리고 Strong Parameters로 매스 어사인먼트를 방지하는 방식은... 따라서 당신이 작성해야 할 코드의 구조는..."

## 기술 스택

| 영역         | 기술                             | 비고                            |
| ------------ | -------------------------------- | ------------------------------- |
| 프레임워크   | Ruby on Rails 8                  | 풀스택 모놀리스                 |
| 언어         | Ruby 3.3+                        | rbenv로 버전 관리               |
| 데이터베이스 | SQLite                           | 파일 기반, 서버 불필요          |
| 인증         | Devise                           | 이메일/비밀번호, session/cookie |
| 프론트엔드   | ERB + Hotwire (Turbo + Stimulus) | SPA 없이 SPA 같은 UX            |
| CSS          | Tailwind CSS                     | rails 통합                      |
| JS 패키지    | importmap-rails                  | npm 불필요                      |
| 배경 작업    | Solid Queue (Rails 8 내장)       | DB 기반 Job 큐                  |
| 캐싱         | Solid Cache (Rails 8 내장)       | DB 기반 캐시                    |
| WebSocket    | Solid Cable (Rails 8 내장)       | DB 기반 ActionCable             |

## 개발 명령어

### Rails 서버

- 개발 서버 시작: `bin/dev` (Procfile.dev 기반, Rails + Tailwind CSS watch)
- Rails 서버만 시작: `bin/rails server`
- Rails 콘솔: `bin/rails console`
- DB 마이그레이션: `bin/rails db:migrate`
- DB 초기화: `bin/rails db:reset`
- 라우트 확인: `bin/rails routes`
- 테스트 실행: `bin/rails test`

### 코드 생성 (scaffold/generator)

- 모델 생성: `bin/rails generate model ModelName field:type`
- 컨트롤러 생성: `bin/rails generate controller ControllerName action1 action2`
- 마이그레이션 생성: `bin/rails generate migration AddFieldToTable field:type`

## 아키텍처

### Rails MVC 패턴

```
Request → Router (config/routes.rb)
           → Controller (app/controllers/)
              → Model (app/models/) ← ActiveRecord ORM
              → View (app/views/)   ← ERB + Turbo
           → Response (HTML / Turbo Stream)
```

### 프로젝트 구조 (목표)

```
household_ledger/
├── app/
│   ├── controllers/          # Controller (HTTP 처리)
│   │   ├── application_controller.rb
│   │   ├── transactions_controller.rb
│   │   ├── categories_controller.rb
│   │   ├── recurring_transactions_controller.rb
│   │   ├── asset_adjustments_controller.rb
│   │   ├── statistics_controller.rb
│   │   └── backups_controller.rb
│   ├── models/               # Model (비즈니스 로직 + ORM)
│   │   ├── application_record.rb
│   │   ├── user.rb
│   │   ├── transaction.rb
│   │   ├── category.rb
│   │   ├── recurring_transaction.rb
│   │   └── asset_adjustment.rb
│   ├── views/                # View (ERB 템플릿)
│   │   ├── layouts/
│   │   ├── transactions/
│   │   ├── categories/
│   │   └── shared/           # 재사용 partial
│   ├── javascript/           # Stimulus controllers
│   │   └── controllers/
│   └── services/             # Service Objects (복잡한 비즈니스 로직)
│       └── backup_service.rb
├── config/
│   ├── routes.rb             # RESTful 라우팅
│   ├── recurring.yml         # Solid Queue 반복 작업 스케줄
│   └── locales/
│       └── ko.yml            # 한국어 로케일
├── db/
│   ├── migrate/              # 마이그레이션 파일
│   ├── seeds.rb              # 기본 데이터 (13개 카테고리 등)
│   ├── development.sqlite3   # 개발 DB
│   └── production.sqlite3    # 프로덕션 DB
├── docs/
│   └── rails-migration-guide.md  # 마이그레이션 가이드
├── lib/
│   └── tasks/
│       └── data_migration.rake   # 기존 데이터 이관 Rake 태스크
├── Gemfile                   # Ruby 의존성 (pip의 requirements.txt)
├── Gemfile.lock
└── CLAUDE.md                 # 이 파일
```

## 데이터 스키마 (목표)

### ActiveRecord 모델

- **User**: email, encrypted_password (Devise 관리), created_at, updated_at
- **Category**: user_id (FK), name, emoji, position (acts_as_list), created_at, updated_at
- **Transaction**: user_id (FK), date, description, amount, transaction_type (enum: income/expense), category_id (FK), status (enum: confirmed/scheduled/pending), recurring_transaction_id (FK), created_at, updated_at
- **RecurringTransaction**: user_id (FK), template_name, description, amount, transaction_type (enum), frequency (enum: weekly/monthly/yearly), start_date, end_date, day_of_month, is_active, is_variable_amount, discarded_at (Soft Delete), created_at, updated_at
- **AssetAdjustment**: user_id (FK), adjustment_date, amount, adjustment_type (enum: income_missing/expense_missing), description, created_at, updated_at

### 주요 설계 참고사항

- `type` 컬럼 사용 금지: Rails STI(Single Table Inheritance) 예약어이므로 `transaction_type`, `adjustment_type`으로 명명
- Soft Delete: `discard` gem 사용 (`discarded_at` 컬럼)
- 순서 관리: `acts_as_list` gem 사용 (`position` 컬럼, 기존 `order` 대응)
- Enum: Rails 내장 `enum` 매크로 사용 (별도 Enum 파일 불필요)

## 마이그레이션 진행 상황

### 참조 정보

- 마이그레이션 가이드: `docs/rails-migration-guide.md` (9개 Phase)
- 기존 코드 브랜치: `legacy/react-fastapi`
- 데이터 백업: `~/household_ledger_backup/` (JSON + SQL dump)
  - users 3건, categories 24건, transactions 596건, recurring_transactions 1건

### Phase 진행 현황

- [ ] Phase 0: 환경 설정 (rbenv, Ruby, Rails 설치)
- [ ] Phase 1: Rails 프로젝트 초기화 + Devise 인증
- [ ] Phase 2: 데이터베이스 모델 + 마이그레이션
- [ ] Phase 3: 핵심 CRUD 기능
- [ ] Phase 4: 달력 뷰 + 통계
- [ ] Phase 5: 고급 기능 (반복거래 스케줄러, 백업/복원)
- [ ] Phase 6: 데이터 마이그레이션 (기존 596건 이관)
- [ ] Phase 7: Docker 설정 (선택)
- [ ] Phase 8: 정리 + 기능 검증

## 주요 기능 (구현 예정)

- 트랜잭션 관리: 수입/지출 추가, 수정, 삭제
- 반복 트랜잭션: 템플릿 관리 + Solid Queue 자동 생성
- 카테고리: 이모지 분류, 드래그앤드롭 순서 변경
- 달력 뷰: simple_calendar로 일별 트랜잭션 표시
- 통계: chartkick + groupdate로 카테고리별 지출 분석
- 백업/복원: gzip JSON export/import
- 온보딩: 첫 로그인 시 기본 카테고리 13개 자동 생성
- 자산 보정: 실제 자산과 기록 차이 조정

## 한국어 지원

- 모든 UI 텍스트는 한국어 (config/locales/ko.yml)
- 기본 카테고리 13개: 식비, 간식류, 카페, 교통, 생활용품, 건강/의료, 문화/여가, 의류/미용, 통신, 교육, 경조사/선물, 기타지출, 저축/투자
- 날짜 형식: YYYY년 MM월 DD일 (한국식)
- 통화: 원(KRW) 단위

## Rails Convention 참고

### 현재 프로젝트에서 알아야 할 Rails 규칙

- **Convention over Configuration**: 파일명, 클래스명, 테이블명의 명명 규칙이 자동 매핑됨
  - 모델: `Transaction` (단수, CamelCase) → 테이블: `transactions` (복수, snake_case)
  - 컨트롤러: `TransactionsController` → 파일: `transactions_controller.rb`
- **RESTful 7 Actions**: index, show, new, create, edit, update, destroy
- **Strong Parameters**: Controller에서 허용할 필드를 명시적으로 선언 (매스 어사인먼트 방지)
- **Callbacks**: before_action, after_create 등으로 공통 로직 처리
- **Scopes**: 자주 사용하는 쿼리를 Model에 scope로 정의

## 중요 알림

Claude는 반드시 다음 사항을 준수해주세요:

1. **Rails 백엔드 코드**는 직접 작성하지 마세요 - 설명만 제공
2. **프론트엔드/디자인 코드** (뷰, CSS, JS, 레이아웃)는 직접 작성 가능
3. 모든 대화는 한국어로 진행
4. 학습 중심 설명 - 원리, 작동 방식, 연계성 포함
5. 단계별 가이드 - 무엇을 어떻게 왜 작성해야 하는지 상세 설명
6. 모범 사례 제시 - Rails Convention, 보안, 성능, 유지보수성 고려사항 포함
