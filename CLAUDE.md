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
- 데이터 계층: IndexedDB with Dexie (마이그레이션 대상)
- 주요 컴포넌트:
  - Home.jsx - 메인 컨테이너, 비즈니스 로직 포함
  - CalendarBox.jsx - React Calendar 통합
  - TransactionForm.jsx - 트랜잭션 추가/수정 모달
  - RecurringTransactionForm.jsx - 반복 트랜잭션 관리

### 백엔드 (FastAPI - 구축 중)
- 프레임워크: FastAPI + Python 3.11
- 데이터베이스: PostgreSQL 15
- 컨테이너: Docker + Docker Compose
- 인증: Clerk JWT 토큰 검증 (예정)

### 프로젝트 구조
```
household_ledger/
├── frontend/                    # React + Vite 앱
│   ├── src/
│   │   ├── pages/Home.jsx      # 메인 페이지
│   │   ├── components/         # 재사용 컴포넌트
│   │   ├── utils/db.js         # Dexie 데이터베이스
│   │   └── App.jsx             # Clerk 인증 통합
│   └── package.json
├── backend/                     # FastAPI 백엔드 (구축 중)
│   ├── app/
│   │   ├── main.py             # FastAPI 앱 진입점
│   │   ├── core/               # 설정, DB 연결
│   │   ├── models/             # SQLAlchemy 모델
│   │   ├── schemas/            # Pydantic 스키마
│   │   └── api/                # API 라우터들
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml           # Backend + DB 컨테이너 설정
└── CLAUDE.md                   # 이 파일
```

## 데이터 스키마

### 현재 IndexedDB 스키마
- transactions: id, date, description, amount, type, category, status, recurring_id
- recurring_transactions: id, template_name, description, amount, type, frequency, start_date, end_date, day_of_month, is_active, is_variable_amount
- categories: id, name, emoji

### 목표 PostgreSQL 스키마 (예정)
- users: clerk_user_id, email (Clerk 연동)
- categories: user_id, name, emoji (사용자별 격리)
- transactions: user_id, date, description, amount, type, category_id (사용자별 격리)
- recurring_transactions: user_id, template_name, description, amount, type, frequency (사용자별 격리)

## 마이그레이션 진행 상황

### 완료된 작업
- [x] Clerk 인증 프론트엔드 통합
- [x] Docker Compose 환경 구성 (Backend + PostgreSQL)
- [x] FastAPI 기본 구조 생성
- [x] 프로젝트 아키텍처 설계

### 진행 중인 작업
- [ ] FastAPI 기본 앱 및 헬스체크 구현
- [ ] SQLAlchemy 모델 정의
- [ ] 데이터베이스 연결 설정
- [ ] Clerk JWT 인증 미들웨어

### 예정된 작업
- [ ] Category API 구현 (CRUD)
- [ ] Transaction API 구현
- [ ] 통계 API 구현
- [ ] 프론트엔드 API 연동
- [ ] IndexedDB → PostgreSQL 데이터 마이그레이션

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
- Dexie로 브라우저 로컬 저장소 관리
- 반복 트랜잭션은 recurringScheduler.js 유틸리티로 처리

### 마이그레이션 고려사항
- 사용자별 데이터 격리 필수 (다중 테넌트)
- 기존 IndexedDB 데이터의 PostgreSQL 마이그레이션 경로 필요
- API를 통한 백업/복원 기능 유지
- 한국어 지원 보존
- 대용량 데이터셋에 대한 PostgreSQL 성능 최적화

## 중요 알림

Claude는 반드시 다음 사항을 준수해주세요:

1. 코드를 직접 작성하지 마세요 - 설명만 제공
2. 모든 대화는 한국어로 진행
3. 학습 중심 설명 - 원리, 작동 방식, 연계성 포함
4. 단계별 가이드 - 무엇을 어떻게 왜 작성해야 하는지 상세 설명
5. 모범 사례 제시 - 보안, 성능, 유지보수성 고려사항 포함