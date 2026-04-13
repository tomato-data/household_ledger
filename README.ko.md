# 가계부 (Household Ledger)

[English](README.md)

> Rails 8 기반 개인 재무 관리 앱 — 외부 의존성 제로, SPA급 UX, JavaScript 프레임워크 없음.

## Highlights

- **인프라 제로** — SQLite + Solid Trifecta (Queue, Cache, Cable). Redis 없음, npm 없음, DB 서버 없음.
- **SPA 없이 SPA급 UX** — Hotwire (Turbo + Stimulus)로 실시간 업데이트, 모달, 부분 페이지 교체를 JavaScript 프레임워크 없이 구현.
- **신용카드 할부 자동 분할** — 12개월 할부를 한 번 입력하면 결제일 기반으로 12건의 거래가 자동 생성.
- **베푼 것/받은 것 태깅** — 누구에게 줬는지, 누구에게 받았는지 기록하고 달력에 컬러 도트로 표시. 시중 앱에 없는 기능.
- **한국어 완전 로컬라이징** — 날짜, 통화, UI 전체, Pretendard 폰트. 한국어 일상 사용에 최적화.
- **React + FastAPI + PostgreSQL에서 이관** — 서버 3개 스택을 `bin/dev` 하나로 축소.

<!-- TODO: 스크린샷 추가 -->

## 왜 만들었나

기존 가계부 앱들을 여러 개 써봤지만, 어느 것도 원하는 기능을 다 갖추고 있지 않았습니다. 신용카드 할부 자동 분할, 베푼 것/받은 것 태깅, 구매일 vs 결제일 기준 통계 전환 — 이런 것들이 개별적으로는 있어도 하나의 앱에 모여 있지 않았습니다.

처음에는 회사에서 React를 쓰고 있었는데 아무것도 몰랐기에, AI에게 한 단계씩 물어보며 React + FastAPI + PostgreSQL로 만들었습니다. 이후 Rails 8의 Solid Trifecta(Queue, Cache, Cable)가 Redis 없이 큐, 캐시, WebSocket을 지원한다는 소식을 접했고, 언어의 지평을 넓히고 싶기도 했고, 개인 프로젝트 유지보수에는 Rails 모놀리스가 더 어울린다고 판단하여 **Rails 8로 전면 이관**했습니다.

## 주요 기능

| 영역 | 내용 |
|------|------|
| **거래 관리** | 수입/지출 CRUD, 확인됨/예정/보류 상태, 2단계 계층 카테고리, 드래그 앤 드롭 정렬, 아이콘 및 색상 커스터마이징 |
| **신용카드** | 카드 등록, 기본 카드 설정, 할부 자동 분할 (UUID 그룹핑), 결제일 기반 날짜 계산, 구매일/결제일 기준 전환 |
| **태깅** | 범용 / 베푼 것 / 받은 것 3가지 유형, 거래 연결 또는 독립 이벤트 기록, 달력 컬러 도트, 마지막 사용일 추적 |
| **반복 거래** | 주간/월간/연간 템플릿, 변동 금액 지원, Soft Delete로 이력 보존 |
| **통계** | 카테고리별 파이/바 차트, 6개월 롤링 트렌드, 부모 카테고리 그룹화, 구매일/결제일 기준 전환 |
| **자산 보정** | 실제 자산과 기록 차이 조정, 누락 수입/지출 유형 분류 |
| **UX** | 다크 모드 (시스템 + 토글), 반응형 (모바일 하단 탭 + 데스크톱 사이드바), Turbo Frame 모달, 실시간 Turbo Stream 업데이트 |

## 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| **프레임워크** | Ruby on Rails 8.1 | 풀스택 모놀리스 |
| **언어** | Ruby 3.3+ | rbenv 관리 |
| **데이터베이스** | SQLite | 파일 기반, 서버 불필요 |
| **인증** | Devise | 이메일/비밀번호 |
| **프론트엔드** | ERB + Hotwire | Turbo + Stimulus |
| **CSS** | Tailwind CSS + Propshaft | 유틸리티 우선 |
| **JS** | importmap-rails | npm 불필요 |
| **잡 / 캐시 / WS** | Solid Queue / Cache / Cable | DB 기반, Redis 불필요 |
| **차트** | Chartkick + Groupdate | |
| **배포** | Kamal + Docker | |

## 아키텍처

```
브라우저 요청
    -> Router (config/routes.rb)
        -> Controller (app/controllers/)
            -> Model (app/models/)        <- ActiveRecord ORM
            -> View (app/views/)          <- ERB 템플릿
        -> 응답 (HTML 또는 Turbo Stream)
            -> Turbo Frame 교체 (부분 갱신)
            -> Stimulus Controller (클라이언트 인터랙션)
```

## 데이터 모델

```
User (Devise)
 |-- has_many :categories
 |    +-- parent_id (self-ref, 2단계 계층)
 |-- has_many :transactions
 |    |-- belongs_to :category
 |    |-- belongs_to :credit_card (optional)
 |    |-- belongs_to :recurring_transaction (optional)
 |    |-- has_many :taggings
 |    +-- installment_group (UUID, 할부 그룹핑)
 |-- has_many :tags
 |    +-- tag_type: general / giving / receiving
 |-- has_many :taggings
 |    |-- belongs_to :tag
 |    +-- belongs_to :transaction (optional, 독립 태그 가능)
 |-- has_many :credit_cards
 |    +-- payment_day (1-28), is_default
 |-- has_many :recurring_transactions (soft delete)
 |    +-- frequency: weekly / monthly / yearly
 +-- has_many :asset_adjustments
      +-- adjustment_type: income_missing / expense_missing
```

### 설계 특징

- **STI 회피** — Rails의 `type` 예약어 대신 `transaction_type`, `adjustment_type` 사용
- **Soft Delete** — `discard` gem으로 `discarded_at` 기반 소프트 삭제
- **다중 사용자** — 모든 테이블이 `user_id` FK로 스코핑
- **할부 그룹핑** — UUID `installment_group`으로 월별 분할 결제 추적
- **유연한 태깅** — 거래에 연결하거나 독립 이벤트로 기록 가능

## 화면 구성

| 화면 | 경로 | 설명 |
|------|------|------|
| **대시보드** | `/` | 월별 캘린더 + 수입/지출/자산 요약 |
| **일별 상세** | `/dashboard/daily_transactions` | 거래 목록 + 카테고리 비율 |
| **거래 입력** | `/transactions/new` | 모달 폼 (카테고리 트리, 태그, 할부) |
| **카테고리 관리** | `/categories` | 드래그 앤 드롭 정렬, 아이콘/색상 편집 |
| **태그 관리** | `/tags` | 유형별 그룹, 마지막 사용일 표시 |
| **통계** | `/statistics/:id` | 카테고리 파이차트 + 월별 트렌드 |
| **신용카드** | `/credit_cards` | 카드 등록, 결제일 설정 |
| **반복 거래** | `/recurring_transactions` | 템플릿 CRUD |

<!-- TODO: 스크린샷 추가 -->

## 개발 환경 설정

**요구사항:** Ruby 3.3+ (rbenv 권장), SQLite 3

```bash
bundle install
bin/rails db:create db:migrate
bin/dev
# -> http://localhost:3000
```

## 문서 구성

프로젝트 문서는 **작성 주체**에 따라 둘로 분리되어 있습니다:

| 경로 | 내용 |
|------|------|
| [`docs/`](docs/README.md) | Claude가 작성한 Phase 스펙·가이드·백엔드 상태 스냅샷 |
| [`docs/backend-overview.md`](docs/backend-overview.md) | 현재 Rails 백엔드 상태 — 라우팅, 모델, 컨트롤러, Gem, TODO |
| [`docs/phases/`](docs/phases/) | Rails 8 학습 단위 Phase 스펙 (학습 진행에 따라 추가) |
| [`docs/plans/`](docs/plans/) | `/tdd-plan` 등 설계 문서 (선택) |
| [`learnings/`](learnings/README.md) | 사용자가 직접 쓴 Q&A·회고·크로스커팅 심화 |
| [`learnings/retrospectives/rails-migration.md`](learnings/retrospectives/rails-migration.md) | React + FastAPI → Rails 8 재작성 전체 서사 (Devise, Solid Queue, i18n, 데이터 이관 포함) |

## 마이그레이션 스토리

**Before:** React SPA + FastAPI + PostgreSQL — 서버 3개, CORS 설정, 클라이언트 상태 관리 복잡도.

**After:** Rails 8 모놀리스 — 단일 프로세스, SQLite 파일 하나, Solid Trifecta (Redis 불필요), Hotwire (JS 프레임워크 불필요).

| Phase | 설명 | 상태 |
|-------|------|------|
| 1 | Rails 초기화 + Devise 인증 | 완료 |
| 2 | 데이터 모델 + 마이그레이션 | 완료 |
| 3 | 핵심 CRUD + 대시보드 | 완료 |
| 4 | 달력 뷰 + 통계 차트 | 완료 |
| 5 | 신용카드 + 할부 결제 | 완료 |
| 6 | 태깅 시스템 | 완료 |
| 7 | 반복 거래 스케줄러 | -- |
| 8 | 데이터 이관 (596건) | -- |
| 9 | Docker 배포 | -- |

> 기존 코드는 `legacy/react-fastapi` 브랜치에 보존되어 있습니다.

## 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)로 배포됩니다.
