# FastAPI 백엔드 마이그레이션 가이드

이 문서는 household_ledger 프로젝트를 현재 IndexedDB 기반에서 FastAPI + PostgreSQL + Clerk 인증 시스템으로 마이그레이션하기 위한 상세 가이드입니다.

## 1. 현재 아키텍처 분석

### 1.1 데이터 구조 (IndexedDB/Dexie)

#### transactions 테이블
```sql
-- 현재 스키마 (Dexie v4)
id: auto_increment
date: string (YYYY-MM-DD)
description: string
amount: number
type: string ('income' | 'expense')
category: string
status: string ('confirmed' | 'scheduled')
recurring_id: number | null
```

#### recurring_transactions 테이블
```sql
id: auto_increment
template_name: string
description: string
amount: number
type: string ('income' | 'expense')
frequency: string ('monthly')
start_date: string (YYYY-MM)
end_date: string | null (YYYY-MM)
day_of_month: number
is_active: boolean
is_variable_amount: boolean
```

#### categories 테이블
```sql
id: auto_increment
name: string
emoji: string
```

### 1.2 현재 카테고리 목록
```javascript
// TransactionForm.jsx와 CalendarBox.jsx에 하드코딩됨
const categories = [
    '🍽️ 식비', '🍿 간식류', '☕ 카페', '🏀 농구 패배',
    '🎵 음악', '🚌 교통비', '🏠 주거비', '📱 통신비',
    '🏥 의료비', '👕 생활용품', '🎁 선물', '📚 교육',
    '🎯 취미', '💰 금융', '🔧 기타'
];
```

### 1.3 현재 핵심 기능
- 거래 추가/수정/삭제 (CRUD)
- 반복 거래 관리
- 달력 기반 거래 조회
- 수입/지출 통계
- JSON 백업/복원
- 총 자산 토글 표시

## 2. PostgreSQL 데이터베이스 설계

### 2.1 ERD 설계
```sql
-- users 테이블 (Clerk 연동)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- categories 테이블 (사용자별 또는 글로벌)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- recurring_transactions 테이블
CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES categories(id),
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    is_active BOOLEAN DEFAULT true,
    is_variable_amount BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- transactions 테이블
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES categories(id),
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'scheduled')),
    recurring_id UUID REFERENCES recurring_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category_id);
CREATE INDEX idx_recurring_user_active ON recurring_transactions(user_id, is_active);
```

## 3. FastAPI 백엔드 구조

### 3.1 프로젝트 구조
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 앱 진입점
│   ├── config.py              # 설정 관리
│   ├── database.py            # DB 연결 설정
│   ├── dependencies.py        # 공통 의존성 (Clerk 인증 등)
│   ├── models/               # SQLAlchemy 모델
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── transaction.py
│   │   ├── category.py
│   │   └── recurring_transaction.py
│   ├── schemas/              # Pydantic 스키마
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── transaction.py
│   │   ├── category.py
│   │   └── recurring_transaction.py
│   ├── routers/              # API 라우터
│   │   ├── __init__.py
│   │   ├── auth.py           # 인증 관련
│   │   ├── transactions.py   # 거래 CRUD
│   │   ├── categories.py     # 카테고리 관리
│   │   ├── recurring.py      # 반복거래 관리
│   │   └── stats.py          # 통계 API
│   ├── services/             # 비즈니스 로직
│   │   ├── __init__.py
│   │   ├── transaction_service.py
│   │   ├── recurring_service.py
│   │   └── stats_service.py
│   └── utils/
│       ├── __init__.py
│       ├── clerk_auth.py     # Clerk 인증 유틸리티
│       └── date_utils.py
├── alembic/                  # DB 마이그레이션
├── tests/
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── alembic.ini
```

### 3.2 핵심 의존성 (requirements.txt)
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.13.0
psycopg2-binary==2.9.9
pydantic==2.5.0
pydantic-settings==2.1.0
python-multipart==0.0.6
httpx==0.25.2              # Clerk API 호출용
python-jose[cryptography]==3.3.0
python-dotenv==1.0.0
```

## 4. 필수 API 엔드포인트

### 4.1 인증 API
```python
# POST /auth/webhook - Clerk 웹훅 처리
# GET /auth/me - 현재 사용자 정보
```

### 4.2 거래 관리 API
```python
# GET /transactions - 거래 목록 조회 (필터링, 페이지네이션)
# POST /transactions - 새 거래 생성
# GET /transactions/{transaction_id} - 특정 거래 조회
# PUT /transactions/{transaction_id} - 거래 수정
# DELETE /transactions/{transaction_id} - 거래 삭제
# GET /transactions/by-date/{date} - 특정 날짜 거래 조회
# GET /transactions/by-month/{year}/{month} - 월별 거래 조회
```

### 4.3 반복거래 관리 API
```python
# GET /recurring - 반복거래 목록
# POST /recurring - 새 반복거래 생성
# PUT /recurring/{recurring_id} - 반복거래 수정
# DELETE /recurring/{recurring_id} - 반복거래 삭제
# POST /recurring/{recurring_id}/generate - 스케줄된 거래 생성
```

### 4.4 카테고리 API
```python
# GET /categories - 카테고리 목록 (기본 + 사용자 정의)
# POST /categories - 새 카테고리 생성
# PUT /categories/{category_id} - 카테고리 수정
# DELETE /categories/{category_id} - 카테고리 삭제
```

### 4.5 통계 API
```python
# GET /stats/summary - 수입/지출 요약
# GET /stats/monthly/{year}/{month} - 월별 통계
# GET /stats/category - 카테고리별 통계
# GET /stats/assets - 총 자산 계산
```

### 4.6 백업/복원 API
```python
# GET /backup/export - 데이터 JSON 내보내기
# POST /backup/import - JSON 데이터 가져오기
```

## 5. Clerk 인증 통합

### 5.1 Clerk 설정 (Frontend)
```javascript
// .env.local
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

// main.jsx 수정
import { ClerkProvider } from '@clerk/clerk-react'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)

// App.jsx 수정
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import Home from './pages/Home'

function App() {
  return (
    <>
      <SignedOut>
        <div className="sign-in">
          <SignInButton mode="modal" />
        </div>
      </SignedOut>
      <SignedIn>
        <div className="header">
          <UserButton afterSignOutUrl="/" />
        </div>
        <Home />
      </SignedIn>
    </>
  )
}
```

### 5.2 백엔드 Clerk 인증
```python
# app/dependencies.py
from clerk import Clerk
import httpx

clerk = Clerk()

async def get_current_user(authorization: str = Header(...)):
    """Clerk JWT 토큰으로 사용자 인증"""
    token = authorization.replace("Bearer ", "")
    
    # Clerk API로 토큰 검증
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.clerk.com/v1/sessions/verify",
            headers={
                "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                "Clerk-Session-Token": token
            }
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_data = response.json()
    return user_data["user_id"]
```

## 6. 배포 환경 설정

### 6.1 Docker 설정
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml (개발용)
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: household_ledger
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/household_ledger
      CLERK_SECRET_KEY: sk_test_...
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### 6.2 Kubernetes 매니페스트
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: household-ledger

---
# k8s/postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: household-ledger
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: household_ledger
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc

---
# k8s/api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: household-api
  namespace: household-ledger
spec:
  replicas: 2
  selector:
    matchLabels:
      app: household-api
  template:
    metadata:
      labels:
        app: household-api
    spec:
      containers:
      - name: api
        image: your-registry/household-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: database-url
        - name: CLERK_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: clerk-secret
```

## 7. 단계별 마이그레이션 계획

### Phase 1: 백엔드 기반 구축 (2-3주)
1. **환경 설정**
   - FastAPI 프로젝트 초기화
   - PostgreSQL 데이터베이스 설정
   - Docker 개발 환경 구축

2. **기본 모델 및 API 구현**
   - SQLAlchemy 모델 정의
   - 기본 CRUD API 구현
   - Alembic 마이그레이션 설정

3. **Clerk 인증 통합**
   - Clerk 설정 및 웹훅 구현
   - JWT 토큰 검증 미들웨어
   - 사용자 생성/관리 로직

### Phase 2: 핵심 기능 구현 (3-4주)
1. **거래 관리 API**
   - 거래 CRUD 완성
   - 날짜별/월별 조회 기능
   - 카테고리 관리

2. **반복거래 시스템**
   - 반복거래 관리 API
   - 스케줄된 거래 자동 생성 로직
   - 크론잡 또는 백그라운드 태스크

3. **통계 및 리포팅**
   - 수입/지출 통계 API
   - 카테고리별 분석
   - 자산 계산 로직

### Phase 3: 프론트엔드 통합 (2-3주)
1. **Clerk 인증 UI 통합**
   - 로그인/로그아웃 컴포넌트
   - 인증 상태 관리
   - API 호출 시 토큰 추가

2. **API 클라이언트 구현**
   - axios 또는 fetch 기반 API 클라이언트
   - 에러 핸들링 및 로딩 상태
   - 캐싱 전략 (React Query 고려)

3. **기존 컴포넌트 수정**
   - IndexedDB → API 호출로 변경
   - 에러 상태 UI 추가
   - 오프라인 대응 (선택사항)

### Phase 4: 데이터 마이그레이션 및 배포 (1-2주)
1. **데이터 마이그레이션**
   - 기존 IndexedDB 데이터 추출 스크립트
   - PostgreSQL로 데이터 이관
   - 데이터 검증 및 테스트

2. **배포 환경 구축**
   - Kubernetes 클러스터에 배포
   - CI/CD 파이프라인 구축
   - 모니터링 및 로깅 설정

3. **성능 최적화 및 테스트**
   - API 성능 튜닝
   - 데이터베이스 인덱스 최적화
   - 통합 테스트 및 E2E 테스트

## 8. 개발 시 주의사항

### 8.1 데이터 일관성
- 사용자별 데이터 완전 분리
- 트랜잭션 처리로 데이터 무결성 보장
- 반복거래와 일반거래 간 참조 무결성 유지

### 8.2 성능 고려사항
- 데이터베이스 쿼리 최적화 (N+1 문제 방지)
- 페이지네이션으로 대용량 데이터 처리
- 적절한 인덱스 설계

### 8.3 보안
- Clerk JWT 토큰 검증 철저히
- SQL 인젝션 방지 (SQLAlchemy ORM 사용)
- CORS 설정 적절히 구성
- 환경 변수로 시크릿 관리

### 8.4 에러 핸들링
- 상세한 에러 메시지와 코드 정의
- 클라이언트 친화적 에러 응답
- 로깅 시스템 구축

## 9. 추가 고려사항

### 9.1 확장 가능성
- 다중 사용자 가계부 (가족 공유)
- 다중 통화 지원
- 예산 관리 기능
- 자동 거래 분류 (AI/ML)

### 9.2 백업 및 복구
- 정기 데이터베이스 백업
- 사용자별 데이터 내보내기/가져오기
- 재해 복구 계획

### 9.3 모니터링
- API 성능 모니터링 (Prometheus/Grafana)
- 에러 추적 (Sentry)
- 사용자 행동 분석

이 가이드를 따라 단계적으로 구현하면 안정적이고 확장 가능한 백엔드 시스템을 구축할 수 있습니다.