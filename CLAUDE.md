# CLAUDE.md

이 파일은 Claude Code가 이 리포지토리에서 작업할 때 참고할 가이드라인입니다.

## 프로젝트 개요

React 기반 가계부 애플리케이션으로, 현재 IndexedDB 로컬 전용에서 FastAPI 백엔드, PostgreSQL 데이터베이스, Clerk 인증을 포함한 풀스택 애플리케이션으로 마이그레이션 중입니다.

## 핵심 학습 목표 및 중요 지침

### 기본 원칙
- 이 프로젝트는 React, FastAPI, PostgreSQL, Docker 학습이 주목적입니다
- Claude는 직접 코드를 작성하지 말고, 개발자가 수동으로 코딩할 수 있도록 상세한 설명을 제공해주세요
- 모든 대화는 한국어로 진행해주세요

### 응답 방식
Claude는 다음과 같은 방식으로 응답해야 합니다:

1. 코드 작성 대신 설명 우선: 코드를 직접 수정하지 말고, 어떻게 작성해야 하는지 단계별로 설명
2. 작동 원리 설명: 해당 코드가 왜 그렇게 작성되어야 하는지, 어떤 원리로 동작하는지 설명
3. 다른 코드와의 연계성: 작성할 코드가 다른 파일이나 모듈과 어떻게 상호작용하는지 설명
4. 모범 사례 및 주의사항: 코딩 패턴, 보안, 성능 등에 대한 모범 사례 제시
5. 학습 포인트 강조: 각 단계에서 배울 수 있는 개념이나 기술을 명확히 설명

### 예시
❌ 나쁜 응답: "이렇게 코드를 작성하세요" + 바로 코드 제시
✅ 좋은 응답: "FastAPI에서 라우터를 만들 때는 다음과 같은 원리로 작동합니다. 먼저 APIRouter를 import하는 이유는... 그리고 이 라우터가 main.py의 app 인스턴스와 연결되는 방식은... 따라서 당신이 작성해야 할 코드의 구조는..."

## 개발 명령어

### 프론트엔드
- 개발 서버 시작: `cd frontend && npm run dev`
- 프로덕션 빌드: `cd frontend && npm run build`
- 프리뷰: `cd frontend && npm run preview`

### 백엔드 + 데이터베이스
- 컨테이너 시작: `docker-compose up -d`
- 컨테이너 중지: `docker-compose down`
- 로그 확인: `docker-compose logs -f backend`

## 현재 아키텍처

### 프론트엔드 (React + Vite)
- 인증: Clerk 통합 완료
- 데이터 계층: Context API + Backend API (Category 완료, Transaction/RecurringTransaction 마이그레이션 중)
- 상태 관리: React Context API 패턴 (AppProviders 메타 프로바이더)
- API 통신: axios 기반 서비스 레이어 (Service → Context → Component 3계층 구조)
- 주요 컴포넌트:
  - Home.jsx - 메인 컨테이너, 비즈니스 로직 포함
  - CalendarBox.jsx - React Calendar 통합
  - TransactionForm.jsx - 트랜잭션 추가/수정 모달
  - RecurringTransactionForm.jsx - 반복 트랜잭션 관리
  - CategoryManagement.jsx - 카테고리 CRUD 재사용 컴포넌트
  - OnboardingModal.jsx - 첫 로그인 온보딩 모달

### 백엔드 (FastAPI)
- 프레임워크: FastAPI + Python 3.11
- 데이터베이스: PostgreSQL 15
- 캐싱: Redis (사용자 정보 5분 TTL)
- 컨테이너: Docker + Docker Compose
- 인증: Clerk JWT 토큰 검증 완료 (자동 사용자 생성 + 기본 카테고리 생성)

### 프로젝트 구조
```
household_ledger/
├── frontend/                           # React + Vite 앱
│   ├── src/
│   │   ├── pages/Home.jsx             # 메인 페이지
│   │   ├── components/                # 재사용 컴포넌트
│   │   │   ├── CategoryManagement.jsx  # 카테고리 CRUD UI
│   │   │   └── OnboardingModal.jsx     # 첫 로그인 온보딩
│   │   ├── context/                   # React Context API
│   │   │   ├── CategoryContext.jsx    # 카테고리 상태 관리
│   │   │   ├── TransactionContext.jsx # 트랜잭션 상태 관리
│   │   │   └── AppProviders.jsx       # 메타 프로바이더
│   │   ├── services/                  # API 서비스 레이어
│   │   │   ├── categoryService.js     # 카테고리 API 호출
│   │   │   └── transactionService.js  # 트랜잭션 API 호출
│   │   ├── utils/
│   │   │   ├── api.js                 # axios 인스턴스 설정
│   │   │   └── db.js                  # Dexie (RecurringTransaction만 사용)
│   │   └── App.jsx                    # Clerk 인증 + 프로바이더
│   ├── .env.development               # 개발 환경 변수
│   ├── .env.production                # 프로덕션 환경 변수
│   ├── export_all_indexeddb.js        # IndexedDB 데이터 추출 스크립트
│   └── package.json
├── backend/                           # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py                    # FastAPI 앱 진입점
│   │   ├── core/                      # 설정, DB 연결, Redis
│   │   ├── models/                    # SQLAlchemy 모델
│   │   ├── schemas/                   # Pydantic 스키마
│   │   └── api/
│   │       ├── dependencies/auth.py   # Clerk JWT 인증 + 기본 카테고리
│   │       └── v1/                    # API 라우터들
│   ├── scripts/                       # 마이그레이션 및 유틸리티
│   │   ├── migrate_indexeddb.py       # IndexedDB → PostgreSQL 마이그레이션
│   │   └── backup_data.json           # IndexedDB 백업 데이터
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml                 # Backend + DB + Redis 컨테이너
└── CLAUDE.md                          # 이 파일
```

## 데이터 스키마

### 현재 IndexedDB 스키마
- transactions: id, date, description, amount, type, category, status, recurring_id
- recurring_transactions: id, template_name, description, amount, type, frequency, start_date, end_date, day_of_month, is_active, is_variable_amount
- categories: id, name, emoji

### PostgreSQL 스키마 (구현 완료)
- **users**: id (UUID), clerk_user_id, email, created_at, updated_at
- **categories**: id (UUID), user_id, name, emoji, created_at, updated_at
- **transactions**: id (UUID), user_id, date, description, amount, type, category_id, status, recurring_id, created_at, updated_at
- **recurring_transactions**: id (UUID), user_id, template_name, description, amount, type, frequency, start_date, end_date, day_of_month, is_active, is_variable_amount, created_at, updated_at
- **Enum 타입**: TransactionType (INCOME, EXPENSE), TransactionStatus (CONFIRMED, SCHEDULED, PENDING), RecurringFrequency (WEEKLY, MONTHLY, YEARLY)

## 마이그레이션 진행 상황

### 완료된 작업
- [x] Clerk 인증 프론트엔드 통합
- [x] Docker Compose 환경 구성 (Backend + PostgreSQL)
- [x] FastAPI 기본 앱 및 헬스체크 구현
- [x] SQLAlchemy 모델 정의 (User, Category, Transaction, RecurringTransaction)
- [x] 데이터베이스 연결 설정 (PostgreSQL + SQLAlchemy)
- [x] Alembic 마이그레이션 설정 및 초기 마이그레이션 생성
- [x] Docker로 전체 스택 실행 (Backend + DB)
- [x] Pydantic 스키마 정의 (Category, Transaction)
- [x] Category API 구현 (CRUD 완료)
  - GET /api/v1/categories/ - 목록 조회
  - GET /api/v1/categories/{id} - 단일 조회
  - POST /api/v1/categories/ - 생성
  - PATCH /api/v1/categories/{id} - 수정
  - DELETE /api/v1/categories/{id} - 삭제
- [x] Transaction API 구현 (CRUD 완료 + 필터링)
  - GET /api/v1/transactions/ - 목록 조회 (날짜/카테고리/타입 필터링)
  - GET /api/v1/transactions/{id} - 단일 조회
  - POST /api/v1/transactions/ - 생성 (category_id 검증)
  - PATCH /api/v1/transactions/{id} - 수정
  - DELETE /api/v1/transactions/{id} - 삭제
- [x] RecurringTransaction API 구현 (CRUD 완료)
  - GET /api/v1/recurring-transactions/ - 목록 조회 (활성화 상태 필터링)
  - GET /api/v1/recurring-transactions/{id} - 단일 조회
  - POST /api/v1/recurring-transactions/ - 생성
  - PATCH /api/v1/recurring-transactions/{id} - 수정
  - DELETE /api/v1/recurring-transactions/{id} - 삭제
- [x] Clerk JWT 인증 미들웨어 (기본 구현 완료, Redis 캐싱 포함)
  - Bearer 토큰 추출 및 검증
  - 사용자 자동 생성 (첫 로그인 시)
  - Redis 캐싱으로 성능 최적화 (5분 TTL)
- [x] 기본 카테고리 자동 생성 (첫 로그인 시 13개 카테고리 bulk insert)
  - 식비, 간식류, 카페/디저트, 교통, 생활, 의료, 쇼핑, 문화/여가, 교육, 월급, 용돈, 기타수입, 기타지출
- [x] 프론트엔드 Category API 연동 완료
  - axios 기반 API 클라이언트 구성 (utils/api.js)
  - 환경별 설정 분리 (.env.development, .env.production)
  - 서비스 레이어 구현 (services/categoryService.js)
  - Context API 상태 관리 (context/CategoryContext.jsx)
  - 메타 프로바이더 패턴 (context/AppProviders.jsx)
- [x] 온보딩 UX 구현
  - CategoryManagement.jsx - 재사용 가능한 카테고리 CRUD 컴포넌트
  - OnboardingModal.jsx - 첫 로그인 시 카테고리 관리 모달 (localStorage 기반)
  - 완전한 CSS 스타일링 (반응형, 애니메이션, 모바일 대응)
- [x] Transaction 스키마 개선
  - CategoryNested 스키마 추가로 중첩 객체 응답 지원
  - Transaction 응답에 카테고리 전체 정보 포함 (id, name, emoji)
  - 프론트엔드에서 카테고리 정보를 위한 추가 API 호출 불필요
- [x] 프론트엔드 Transaction API 연동 완료
  - axios 기반 transactionService.js 구현
  - TransactionContext를 Backend API로 완전 전환
  - IndexedDB 의존성 제거 (Transaction은 더 이상 IndexedDB 사용하지 않음)
  - Home, TransactionForm, CalendarBox 컴포넌트 업데이트
  - Category와 동일한 3계층 패턴 적용 (Service → Context → Component)
- [x] IndexedDB 마이그레이션 도구 구현 및 실행 완료
  - Python 스크립트 (migrate_indexeddb.py): JSON → PostgreSQL 변환 로직
    - UTC → KST 타임존 변환 (+9시간) 적용
    - 카테고리 매핑 실패 시 상세 로그 추가
  - JavaScript 스크립트 (export_all_indexeddb.js): 브라우저 콘솔에서 데이터 추출
  - backup_data.json 최신화 (2025-10-12 기준)
  - 마이그레이션 실행 완료: 261개 트랜잭션 성공적으로 이전
  - 데이터 검증 완료: 월급 날짜 30일, 월세 데이터 4건 모두 정상 확인
- [x] 프론트엔드 이중 상태 관리 구현
  - TransactionContext: allTransactions + filteredTransactions 분리
  - hasActiveFilters() 헬퍼 함수로 불필요한 API 호출 방지
  - Home.jsx: 전체 자산(allTransactions), 월별 요약(filteredTransactions) 분리
- [x] 달력 성능 최적화
  - 필터 범위 확장: 달력 표시 범위(이전/다음 달 포함) 전체 로드
  - startOfWeek/endOfWeek 사용으로 약 35-42일분만 필터링
  - 방법 1(전체 데이터) 대비 6.5배 성능 향상 (9,135회 → 1,400회 비교)
  - 이전/다음 달 날짜에도 트랜잭션 표시로 UX 개선

### 진행 중인 작업
- [ ] 프론트엔드 RecurringTransaction API 연동
- [ ] 백업/복원 기능을 Backend API로 전환
- [ ] 통계 API 구현 (월별 합계, 카테고리별 지출 등)

### 예정된 작업
- [ ] 반복 트랜잭션 자동 생성 스케줄러 (APScheduler/Celery)
- [ ] Clerk JWT 서명 검증 강화 (JWKS)
- [ ] Terraform + Ansible 배포 스크립트

## 주요 기능

### 현재 기능
- 트랜잭션 관리: 수입/지출 추가, 수정, 삭제
- 반복 트랜잭션: 월별 자동 생성 (급여, 고정비 등)
- 카테고리: 이모지와 함께 분류 (식비, 간식류, 카페 등)
- 달력 뷰: react-calendar로 일별 트랜잭션 표시
- 자산 계산: 전체 트랜잭션 합계
- 백업/복원: JSON 파일 export/import

### 목표 기능 (마이그레이션 후)
- 사용자별 데이터 격리: Clerk 사용자 ID 기반
- API 기반 아키텍처: 프론트엔드-백엔드 분리
- 확장 가능한 구조: 다중 사용자, 통계, 분석 기능
- 컨테이너 배포: Kubernetes 준비

## 한국어 지원
- 모든 UI 텍스트와 주석은 한국어로 작성
- 카테고리명과 트랜잭션 설명은 한국어 용어 사용
- 파일명에 한국어 포함 (가계부_백업_*.json)
- ESC 키 모달 닫기, 30일 백업 알림 등 한국 사용자 중심 UX

## 중요 구현 노트

### 현재 구현
- 트랜잭션 편집은 Home 컴포넌트의 editTarget 상태로 관리
- react-calendar 라이브러리로 날짜 선택 구현
- Dexie로 브라우저 로컬 저장소 관리 (RecurringTransaction만 사용 중)
- 반복 트랜잭션은 recurringScheduler.js 유틸리티로 처리
- **Category와 Transaction은 Backend API 연동 완료** (IndexedDB 사용하지 않음)

### 프론트엔드 아키텍처 패턴 (Category/Transaction API 연동으로 확립)
1. **3계층 구조**: Service → Context → Component
   - **Service 레이어**: axios로 API 호출, 순수 함수
     - categoryService.js: 카테고리 CRUD
     - transactionService.js: 트랜잭션 CRUD + 필터링
   - **Context 레이어**: 상태 관리, useAuth로 토큰 주입
     - CategoryContext.jsx: 카테고리 전역 상태
     - TransactionContext.jsx: 트랜잭션 전역 상태
   - **Component 레이어**: 커스텀 훅으로 상태/함수 사용
     - useCategories() 훅
     - useTransactions() 훅
2. **메타 프로바이더 패턴**: AppProviders.jsx로 모든 Context 중앙 관리 (Provider Hell 방지)
3. **환경 변수 분리**: .env.development / .env.production (Vite 자동 선택)
4. **Naming Convention**: 백엔드 API와 일관성 유지 (updateCategory, deleteCategory)
   - 충돌 방지: import 시 별칭 사용 (`updateCategory as updateCategoryAPI`)
5. **재사용 컴포넌트**: CategoryManagement - 온보딩과 설정에서 공통 사용
6. **중첩 객체 응답**: 백엔드가 관계 데이터를 함께 반환 (Transaction → Category)
   - 프론트엔드에서 추가 API 호출 불필요
   - N+1 쿼리 문제 방지

### 백엔드 성능 최적화
- **Bulk Insert**: 기본 카테고리 생성 시 `db.bulk_save_objects()` 사용 (13개 INSERT → 1 트랜잭션)
- **Redis 캐싱**: 사용자 정보 5분 TTL, DB 쿼리 감소
- **인덱싱**: user_id 기반 쿼리 최적화 (SQLAlchemy 모델에 ForeignKey 인덱스)

### 마이그레이션 고려사항
- 사용자별 데이터 격리 필수 (다중 테넌트) ✅ 완료
- 기존 IndexedDB 데이터의 PostgreSQL 마이그레이션 경로 필요
- API를 통한 백업/복원 기능 유지
- 한국어 지원 보존 ✅ 완료
- 대용량 데이터셋에 대한 PostgreSQL 성능 최적화 (진행 중)

## 중요 알림

Claude는 반드시 다음 사항을 준수해주세요:

1. 코드를 직접 작성하지 마세요 - 설명만 제공
2. 모든 대화는 한국어로 진행
3. 학습 중심 설명 - 원리, 작동 방식, 연계성 포함
4. 단계별 가이드 - 무엇을 어떻게 왜 작성해야 하는지 상세 설명
5. 모범 사례 제시 - 보안, 성능, 유지보수성 고려사항 포함