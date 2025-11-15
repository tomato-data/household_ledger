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
- **아키텍처**: 3-Layer Architecture (Router → Service → CRUD → Model)
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
│   │   ├── crud/                      # CRUD Layer (DB 쿼리)
│   │   │   ├── category_crud.py
│   │   │   ├── transaction_crud.py
│   │   │   ├── recurring_transaction_crud.py
│   │   │   └── backup_crud.py
│   │   ├── services/                  # Service Layer (비즈니스 로직)
│   │   │   ├── category_service.py
│   │   │   ├── transaction_service.py
│   │   │   ├── recurring_transaction_service.py
│   │   │   └── backup_service.py
│   │   └── api/
│   │       ├── dependencies/auth.py   # Clerk JWT 인증 + 기본 카테고리
│   │       └── routes/                # Router Layer (HTTP 처리)
│   │           ├── categories.py
│   │           ├── transactions.py
│   │           ├── recurring_transactions.py
│   │           └── backup.py
│   ├── scripts/                       # 마이그레이션 및 유틸리티
│   │   ├── migrate_indexeddb.py       # IndexedDB → PostgreSQL 마이그레이션
│   │   └── backup_data.json           # IndexedDB 백업 데이터
│   ├── requirements.txt
│   └── Dockerfile
├── docs/                              # 기술 문서
│   ├── architecture-refactoring.md    # 3-Layer Architecture 리팩토링 가이드
│   └── MIGRATION_HISTORY.md           # 마이그레이션 완료 작업 상세 내역
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
> 📄 전체 상세 내역은 [MIGRATION_HISTORY.md](MIGRATION_HISTORY.md) 참조

**주요 완료 항목**:
- ✅ Backend 3-Layer Architecture (CRUD/Service/Router 분리)
- ✅ Category, Transaction, RecurringTransaction API 구현
- ✅ Backend 백업/복원 API (gzip 압축, UUID 매핑, 미리보기)
- ✅ Frontend API 연동 (Category, Transaction, RecurringTransaction)
- ✅ Clerk 인증 + 자동 사용자 생성 + 기본 카테고리 생성
- ✅ Docker Compose 환경 (Backend + PostgreSQL + Redis)
- ✅ IndexedDB → PostgreSQL 마이그레이션 완료 (261건)
- ✅ 통계 API + 시각화 (Recharts)
- ✅ Soft Delete 패턴 (RecurringTransaction)
- ✅ Timezone 전략 (UTC → KST)

### 진행 중인 작업
- [ ] **프론트엔드 백업/복원 기능 Backend API 전환** (다음 작업)
  - 백업 서비스 레이어 작성 (services/backupService.js)
    - exportBackup(): Blob 응답 처리 (responseType: 'blob')
    - previewBackup(file): FormData 파일 업로드
    - importBackup(file, overwrite): 복원 API 호출
  - Home.jsx 수정
    - handleBackup(): IndexedDB → Backend API (exportBackup)
    - restoreFromFile(): FileReader → Backend API (previewBackup + importBackup)
    - 파일 확장자: .json → .json.gz
    - Context API 새로고침 (복원 후)
  - IndexedDB 의존성 제거
    - Home.jsx에서 `import db from '../utils/db'` 삭제
    - 백업/복원 관련 IndexedDB 코드 모두 제거
- [ ] 반복 트랜잭션 자동 생성 스케줄러 (Backend로 이동)

### 예정된 작업
- [ ] Clerk JWT 서명 검증 강화 (JWKS)
- [ ] Terraform + Ansible 배포 스크립트

## 주요 기능

### 현재 기능
- 트랜잭션 관리: 수입/지출 추가, 수정, 삭제 (Backend API 연동 완료)
- 반복 트랜잭션: 템플릿 관리 (Backend API 연동 완료, 자동 생성은 Frontend 스케줄러)
- 카테고리: 이모지와 함께 분류, 드래그 앤 드롭 순서 변경 (Backend API 연동 완료)
- 달력 뷰: react-calendar로 일별 트랜잭션 표시, lazy loading 최적화
- 통계: 전체 자산, 카테고리별 지출 분석, 파이 차트 시각화
- 백업/복원: gzip 압축 JSON 파일 export/import (Backend API 구현 완료, Frontend 전환 대기)

### 마이그레이션 완료 현황
- ✅ 사용자별 데이터 격리: Clerk 사용자 ID 기반 완료
- ✅ API 기반 아키텍처: Category, Transaction, RecurringTransaction, Backup 모두 Backend 연동 완료
- ✅ 통계 및 분석 기능: 카테고리별 지출 통계 API + 시각화 완료
- ✅ Backend 백업/복원 API: gzip 압축, UUID 매핑, 미리보기 기능 완료
- 🔄 컨테이너 배포: Docker Compose 완료, Kubernetes 대기
- 🔄 IndexedDB 제거: Frontend 백업 기능 전환 후 완전 제거 예정
- 🔄 트랜잭션 '수정' 기능에 날짜 수정기능 추가

## 한국어 지원
- 모든 UI 텍스트와 주석은 한국어로 작성
- 카테고리명과 트랜잭션 설명은 한국어 용어 사용
- 파일명에 한국어 포함 (가계부_백업_*.json)
- ESC 키 모달 닫기, 30일 백업 알림 등 한국 사용자 중심 UX

## 중요 구현 노트

### 현재 구현
- 트랜잭션 편집은 Home 컴포넌트의 editTarget 상태로 관리
- react-calendar 라이브러리로 날짜 선택 구현
- **모든 도메인 Backend API 연동 완료**: Category, Transaction, RecurringTransaction, Backup
- IndexedDB는 Home.jsx 백업 기능에만 남아있음 (Frontend 전환 후 제거 예정)
- 반복 트랜잭션 자동 생성은 아직 Frontend(recurringScheduler.js)에서 처리 (Backend 이동 예정)

### 프론트엔드 아키텍처 패턴 (Category/Transaction API 연동으로 확립)
1. **3계층 구조**: Service → Context → Component
   - **Service 레이어**: axios로 API 호출, 순수 함수
     - categoryService.js: 카테고리 CRUD
     - transactionService.js: 트랜잭션 CRUD + 필터링
     - recurringTransactionService.js: 반복 트랜잭션 CRUD
     - backupService.js: 백업/복원 (구현 대기)
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

### 백엔드 아키텍처 패턴 (3-Layer Architecture, 2025-11-02 확립)
1. **CRUD Layer** (`app/crud/*.py`):
   - 순수 DB 쿼리만 담당
   - `flush()` 사용 (commit은 Service에서)
   - None 반환 (에러는 상위 계층)
   - 재사용 가능한 쿼리 함수
2. **Service Layer** (`app/services/*.py`):
   - 비즈니스 로직 처리
   - 여러 CRUD 조합
   - `commit()` + `refresh()` 담당
   - None/False 반환 (HTTPException은 Router에서)
   - 클래스 기반 설계 (의존성 주입)
3. **Router Layer** (`app/api/routes/*.py`):
   - HTTP 요청/응답만
   - Service 호출
   - None/False → HTTPException
   - 직접 DB 쿼리 금지

### 백엔드 성능 최적화
- **Bulk Insert**: 기본 카테고리 생성 시 `db.bulk_save_objects()` 사용 (13개 INSERT → 1 트랜잭션)
- **Redis 캐싱**: 사용자 정보 5분 TTL, DB 쿼리 감소
- **인덱싱**: user_id 기반 쿼리 최적화 (SQLAlchemy 모델에 ForeignKey 인덱스)
- **N+1 방지**: joinedload() 사용 + 이미 조회한 객체 재사용

### RecurringTransaction Soft Delete 패턴
- **Soft Delete 구현**: 실제 삭제 대신 `deleted_at` 컬럼 설정 + `is_active = false`
- **confirmed Transaction 보호**: 이미 발생한 거래는 유지 (recurring_id 유지)
- **scheduled Transaction 삭제**: 예정된 거래만 삭제
- **히스토리 추적**: 삭제된 RecurringTransaction도 DB에 남아 추적 가능
- **Foreign Key 무결성**: CASCADE 대신 수동 관리로 데이터 보호

### Timezone 전략
- **Backend + DB**: UTC로 통일 (func.now() 사용, PostgreSQL timezone=UTC)
- **Frontend**: 로컬 타임존(KST) 자동 표시 (formatDate.js 유틸리티)
- **다국적 대비**: 글로벌 서비스 확장 준비 완료
- **일관성**: DateTime(timezone=True) 사용으로 모든 시간 필드 통일

### 백업/복원 구현 패턴 (Backend)
- **gzip 압축**: Python `gzip.compress()`로 파일 크기 감소
- **UUID 매핑**: 백업 시 UUID → 복원 시 신규 UUID로 자동 재매핑
  - `category_id_map`, `recurring_id_map`으로 FK 관계 유지
  - Pydantic 스키마 → SQLAlchemy 모델 변환 시 ID 재생성
- **미리보기 기능**: 복원 전 BackupData 파싱 → BackupMetadata 추출 (UX 개선)
- **overwrite 옵션**:
  - `overwrite=true`: 기존 데이터 삭제 후 복원
  - `overwrite=false`: 병합 (ID 충돌 가능성 주의)
- **Blob 응답**: FastAPI `StreamingResponse`로 바이너리 파일 다운로드
- **FormData 업로드**: `UploadFile`로 multipart/form-data 처리

## 중요 알림

Claude는 반드시 다음 사항을 준수해주세요:

1. 코드를 직접 작성하지 마세요 - 설명만 제공
2. 모든 대화는 한국어로 진행
3. 학습 중심 설명 - 원리, 작동 방식, 연계성 포함
4. 단계별 가이드 - 무엇을 어떻게 왜 작성해야 하는지 상세 설명
5. 모범 사례 제시 - 보안, 성능, 유지보수성 고려사항 포함