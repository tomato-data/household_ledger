# 풀스택 가계부 앱 마이그레이션 플랜

## 개요
현재 프론트엔드 전용(IndexedDB) 가계부 앱을 백엔드(FastAPI) + 데이터베이스(PostgreSQL) + 프론트엔드(React + Clerk) 구조로 마이그레이션하는 단계별 가이드입니다.

---

## Phase 1: 현재 데이터 백업 및 분석

### 1.1 IndexedDB 데이터 백업
- [ ] 현재 앱에서 백업 기능을 사용하여 JSON 파일로 데이터 추출
- [ ] 백업된 JSON 파일 구조 분석 및 문서화
- [ ] 데이터 스키마 정리 (transactions, recurring_transactions, categories)

### 1.2 현재 기능 목록 정리
- [ ] 트랜잭션 CRUD 기능
- [ ] 반복 트랜잭션 관리
- [ ] 카테고리 관리
- [ ] 달력 뷰
- [ ] 자산 계산
- [ ] 백업/복원 기능

---

## Phase 2: 백엔드 구조 설계

### 2.1 프로젝트 구조 설정
```
household_ledger/
├── frontend/          # 기존 React 앱
├── backend/           # 새로 생성할 FastAPI 앱
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── api/
│   │   ├── core/
│   │   └── db/
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml # DB + Backend 컨테이너 관리
└── README.md
```

### 2.2 기술 스택 결정
- [ ] **백엔드**: FastAPI + SQLAlchemy + Pydantic
- [ ] **데이터베이스**: PostgreSQL
- [ ] **인증**: Clerk JWT 토큰 검증
- [ ] **컨테이너**: Docker + Docker Compose

---

## Phase 3: 데이터베이스 설계

### 3.1 PostgreSQL 스키마 설계
```sql
-- Users 테이블 (Clerk와 연동)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories 테이블
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions 테이블
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description VARCHAR(500),
    amount DECIMAL(12, 2) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES categories(id),
    status VARCHAR(20) DEFAULT 'completed',
    recurring_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring Transactions 테이블
CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(100),
    description VARCHAR(500),
    amount DECIMAL(12, 2) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense')),
    frequency VARCHAR(20) DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
    is_active BOOLEAN DEFAULT true,
    is_variable_amount BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 인덱스 및 제약조건
- [ ] 사용자별 데이터 조회 최적화 인덱스
- [ ] 날짜별 트랜잭션 조회 인덱스
- [ ] 외래키 제약조건 설정

---

## Phase 4: 백엔드 API 구현

### 4.1 FastAPI 프로젝트 초기 설정
```python
# backend/requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.13.1
pydantic==2.5.0
python-jose[cryptography]==3.3.0
python-multipart==0.0.6
```

### 4.2 Clerk JWT 인증 미들웨어
- [ ] Clerk 공개키로 JWT 토큰 검증
- [ ] 사용자 정보 추출 및 컨텍스트 설정
- [ ] 인증 데코레이터 구현

### 4.3 API 엔드포인트 설계
```python
# 사용자 관리
POST   /api/users/register          # 사용자 등록
GET    /api/users/profile          # 사용자 정보 조회

# 트랜잭션 관리
GET    /api/transactions           # 트랜잭션 목록 조회
POST   /api/transactions           # 트랜잭션 생성
PUT    /api/transactions/{id}      # 트랜잭션 수정
DELETE /api/transactions/{id}      # 트랜잭션 삭제

# 반복 트랜잭션 관리
GET    /api/recurring-transactions # 반복 트랜잭션 목록
POST   /api/recurring-transactions # 반복 트랜잭션 생성
PUT    /api/recurring-transactions/{id}
DELETE /api/recurring-transactions/{id}

# 카테고리 관리
GET    /api/categories             # 카테고리 목록
POST   /api/categories             # 카테고리 생성
PUT    /api/categories/{id}        # 카테고리 수정
DELETE /api/categories/{id}        # 카테고리 삭제

# 통계 및 분석
GET    /api/statistics/monthly     # 월별 통계
GET    /api/statistics/category    # 카테고리별 통계
GET    /api/statistics/assets      # 자산 계산

# 데이터 관리
POST   /api/data/import            # 백업 파일 가져오기
GET    /api/data/export            # 데이터 내보내기
```

### 4.4 SQLAlchemy 모델 구현
- [ ] User, Transaction, RecurringTransaction, Category 모델
- [ ] 관계 설정 (Foreign Key, Back References)
- [ ] 검증 로직 구현

### 4.5 Pydantic 스키마 구현
- [ ] 요청/응답 스키마 정의
- [ ] 데이터 검증 규칙 설정
- [ ] 시리얼라이제이션 로직

---

## Phase 5: 프론트엔드 API 연동

### 5.1 API 클라이언트 설정
```javascript
// frontend/src/utils/api.js
import { useAuth } from '@clerk/clerk-react';

export const apiClient = {
  get: async (url, options = {}) => {
    // Clerk 토큰을 헤더에 포함
  },
  post: async (url, data, options = {}) => {
    // POST 요청 구현
  },
  put: async (url, data, options = {}) => {
    // PUT 요청 구현
  },
  delete: async (url, options = {}) => {
    // DELETE 요청 구현
  }
};
```

### 5.2 상태 관리 구조 변경
- [ ] IndexedDB 의존성 제거
- [ ] API 호출로 데이터 CRUD 변경
- [ ] 로딩 상태 및 에러 처리 추가
- [ ] 옵티미스틱 업데이트 구현 (선택사항)

### 5.3 컴포넌트별 API 연동
- [ ] **Home.jsx**: 전체 데이터 로드 API 연동
- [ ] **TransactionForm.jsx**: 트랜잭션 생성/수정 API
- [ ] **RecurringTransactionForm.jsx**: 반복 트랜잭션 API
- [ ] **CalendarBox.jsx**: 날짜별 트랜잭션 조회 API
- [ ] **TransactionList.jsx**: 트랜잭션 목록/삭제 API

### 5.4 사용자 인증 플로우
```javascript
// 사용자 등록 플로우
useEffect(() => {
  if (user && isSignedIn) {
    // 백엔드에 사용자 등록/확인
    registerOrLoginUser(user.id, user.emailAddresses[0].emailAddress);
  }
}, [user, isSignedIn]);
```

---

## Phase 6: Docker 환경 구성

### 6.1 Docker Compose 설정
```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: household_ledger
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/household_ledger
      CLERK_PUBLISHABLE_KEY: ${CLERK_PUBLISHABLE_KEY}
    volumes:
      - ./backend:/app

volumes:
  postgres_data:
```

### 6.2 백엔드 Dockerfile
```dockerfile
# backend/Dockerfile
FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

---

## Phase 7: 데이터 마이그레이션

### 7.1 마이그레이션 스크립트 작성
```python
# backend/scripts/migrate_data.py
import json
from datetime import datetime
from app.db.database import get_db
from app.models.transaction import Transaction, RecurringTransaction, Category

def migrate_backup_data(backup_file_path: str, user_id: str):
    """백업 JSON 파일을 데이터베이스로 마이그레이션"""
    with open(backup_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Categories 마이그레이션
    # Transactions 마이그레이션
    # Recurring Transactions 마이그레이션
```

### 7.2 마이그레이션 API 엔드포인트
- [ ] JSON 파일 업로드 API
- [ ] 데이터 검증 및 변환
- [ ] 중복 데이터 처리
- [ ] 마이그레이션 결과 리포트

---

## Phase 8: 테스트 및 배포

### 8.1 단위 테스트
```python
# backend/tests/test_transactions.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_transaction():
    # 트랜잭션 생성 테스트
    pass

def test_get_transactions():
    # 트랜잭션 조회 테스트
    pass
```

### 8.2 통합 테스트
- [ ] API 엔드포인트별 테스트
- [ ] 인증 플로우 테스트
- [ ] 데이터베이스 연동 테스트

### 8.3 프론트엔드 테스트
- [ ] 컴포넌트 단위 테스트
- [ ] API 통신 테스트
- [ ] 사용자 인터랙션 테스트

---

## Phase 9: 배포 준비

### 9.1 환경 변수 설정
```bash
# .env.production
DATABASE_URL=postgresql://user:pass@prod-db:5432/household_ledger
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CORS_ORIGINS=["https://yourdomain.com"]
```

### 9.2 프로덕션 최적화
- [ ] 데이터베이스 커넥션 풀링
- [ ] API 응답 캐싱
- [ ] 로깅 설정
- [ ] 보안 헤더 설정
- [ ] Rate Limiting

### 9.3 배포 스크립트
```bash
#!/bin/bash
# deploy.sh
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

## Phase 10: 모니터링 및 유지보수

### 10.1 로깅 및 모니터링
- [ ] 애플리케이션 로그 설정
- [ ] 데이터베이스 성능 모니터링
- [ ] 사용자 행동 분석 (선택사항)

### 10.2 백업 및 복원 전략
- [ ] 자동 데이터베이스 백업
- [ ] 재해 복구 계획
- [ ] 데이터 보존 정책

---

## 체크리스트

### Phase 1 완료 조건
- [ ] 현재 IndexedDB 데이터 백업 완료
- [ ] 데이터 스키마 분석 문서 작성
- [ ] 기능 요구사항 정리

### Phase 2-4 완료 조건
- [ ] 백엔드 API 서버 정상 구동
- [ ] 모든 엔드포인트 구현 및 테스트
- [ ] Clerk 인증 정상 동작

### Phase 5-7 완료 조건
- [ ] 프론트엔드 API 연동 완료
- [ ] 사용자별 데이터 격리 확인
- [ ] 기존 데이터 마이그레이션 성공

### Phase 8-10 완료 조건
- [ ] 전체 시스템 통합 테스트 통과
- [ ] 프로덕션 환경 배포 성공
- [ ] 모니터링 시스템 구축

---

## 예상 소요 시간
- **Phase 1-2**: 1-2일 (설계 및 환경 구성)
- **Phase 3-4**: 3-5일 (백엔드 구현)
- **Phase 5**: 2-3일 (프론트엔드 연동)
- **Phase 6-7**: 1-2일 (Docker 및 마이그레이션)
- **Phase 8-10**: 2-3일 (테스트 및 배포)

**총 예상 기간**: 9-15일

---

## 참고 자료
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [Clerk React 가이드](https://clerk.com/docs/quickstarts/react)
- [SQLAlchemy 문서](https://docs.sqlalchemy.org/)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)