# 인증 시스템 아키텍처 및 흐름

이 문서는 Household Ledger 애플리케이션의 전체 인증 시스템을 상세히 설명합니다.

## 목차

1. [JWT (JSON Web Token) 기초](#1-jwt-json-web-token-기초)
2. [Clerk의 역할](#2-clerk의-역할)
3. [전체 인증 흐름](#3-전체-인증-흐름)
4. [Redis 캐싱 전략](#4-redis-캐싱-전략)
5. [Session vs JWT 비교](#5-session-vs-jwt-비교)
6. [구현 세부사항](#6-구현-세부사항)
7. [보안 고려사항](#7-보안-고려사항)
8. [테스트 가이드](#8-테스트-가이드)

---

## 1. JWT (JSON Web Token) 기초

### 1.1 JWT란 무엇인가?

JWT는 **클라이언트와 서버 간에 정보를 안전하게 전송하기 위한 표준화된 방법**입니다. JSON 객체를 Base64로 인코딩하고 디지털 서명을 추가하여 위변조를 방지합니다.

### 1.2 JWT의 구조

JWT는 **세 부분**으로 구성되며, 점(`.`)으로 구분됩니다:

```
Header.Payload.Signature
```

#### 예시:
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.fake_signature
```

#### 1) Header (헤더)
```json
{
  "typ": "JWT",
  "alg": "HS256"
}
```
- `typ`: 토큰 타입 (항상 "JWT")
- `alg`: 서명 알고리즘 (HS256, RS256 등)

#### 2) Payload (페이로드)
```json
{
  "sub": "user_123",           // Subject: 사용자 ID
  "email": "test@example.com", // 사용자 정보
  "iat": 1234567890,          // Issued At: 발급 시간
  "exp": 9999999999           // Expiration: 만료 시간
}
```
- **표준 클레임**: `sub`, `iat`, `exp`, `iss`, `aud` 등
- **커스텀 클레임**: 애플리케이션에서 필요한 추가 정보

#### 3) Signature (서명)
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret_key
)
```
- Header와 Payload를 합쳐서 비밀 키로 서명
- **위변조 방지**: 서명 검증을 통해 토큰이 변조되지 않았음을 보장

### 1.3 JWT의 작동 원리

```mermaid
sequenceDiagram
    participant Client as 클라이언트
    participant Auth as 인증 서버 (Clerk)
    participant API as API 서버 (FastAPI)

    Client->>Auth: 1. 로그인 요청 (이메일, 비밀번호)
    Auth->>Auth: 2. 인증 확인
    Auth->>Client: 3. JWT 토큰 발급

    Note over Client: 4. JWT를 로컬 저장소에 저장

    Client->>API: 5. API 요청 (Authorization: Bearer <JWT>)
    API->>API: 6. JWT 서명 검증
    API->>API: 7. Payload에서 사용자 정보 추출
    API->>Client: 8. API 응답
```

### 1.4 JWT의 장점

1. **Stateless (무상태성)**
   - 서버는 세션을 저장하지 않음
   - 토큰 자체에 모든 정보가 포함됨
   - 수평 확장(Scale-out)에 유리

2. **분산 시스템에 적합**
   - 여러 서버에서 동일한 토큰 검증 가능
   - 마이크로서비스 아키텍처에 이상적

3. **Cross-Domain 지원**
   - 다른 도메인 간에도 토큰 전송 가능
   - CORS 문제 최소화

4. **모바일 친화적**
   - 쿠키가 없는 환경에서도 사용 가능
   - 네이티브 앱에서도 간편하게 사용

### 1.5 JWT의 단점과 해결 방법

| 단점 | 해결 방법 |
|-----|---------|
| 토큰 크기가 큼 | 필수 정보만 Payload에 포함 |
| 토큰 무효화 어려움 | 짧은 만료 시간 + Refresh Token |
| 민감한 정보 노출 위험 | Payload에 민감 정보 저장 금지 |
| 서버 부하 | Redis 캐싱으로 DB 조회 최소화 |

---

## 2. Clerk의 역할

### 2.1 Clerk란?

Clerk는 **SaaS 인증 플랫폼**으로, 복잡한 인증 로직을 대신 처리해줍니다.

### 2.2 Clerk가 제공하는 기능

1. **사용자 관리**
   - 회원가입, 로그인, 로그아웃
   - 이메일 인증, 비밀번호 재설정
   - 소셜 로그인 (Google, GitHub 등)

2. **JWT 토큰 발급**
   - 로그인 성공 시 JWT 토큰 발급
   - 토큰 갱신 (Refresh Token)
   - 토큰 서명 (RS256 알고리즘)

3. **보안**
   - HTTPS 강제
   - CSRF 방어
   - Rate Limiting

### 2.3 Clerk JWT의 구조

Clerk가 발급하는 JWT는 다음과 같은 Payload를 포함합니다:

```json
{
  "sub": "user_2abcd1234efgh",  // Clerk User ID
  "email": "user@example.com",
  "email_verified": true,
  "iss": "https://clerk.your-domain.com",
  "aud": "your-app-id",
  "iat": 1633024800,
  "exp": 1633028400
}
```

### 2.4 프론트엔드 Clerk 통합

```jsx
// main.jsx
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
);
```

```jsx
// App.jsx
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

function App() {
  return (
    <div>
      <SignedOut>
        <SignInButton />  {/* 로그인 버튼 */}
      </SignedOut>
      <SignedIn>
        <UserButton />    {/* 사용자 프로필 버튼 */}
        <Home />
      </SignedIn>
    </div>
  );
}
```

**Clerk의 역할**:
- `<ClerkProvider>`는 앱 전체에 인증 컨텍스트 제공
- 로그인 성공 시 JWT 토큰을 자동으로 브라우저에 저장
- `useAuth()` 훅으로 토큰 접근 가능

---

## 3. 전체 인증 흐름

### 3.1 시퀀스 다이어그램 (전체 흐름)

```mermaid
sequenceDiagram
    participant U as 사용자 (브라우저)
    participant F as Frontend (React)
    participant C as Clerk
    participant B as Backend (FastAPI)
    participant R as Redis
    participant DB as PostgreSQL

    %% 1. 로그인
    U->>F: 1. "로그인" 버튼 클릭
    F->>C: 2. Clerk 로그인 페이지 리다이렉트
    U->>C: 3. 이메일/비밀번호 입력
    C->>C: 4. 인증 확인
    C->>F: 5. JWT 토큰 발급 + 리다이렉트
    F->>F: 6. 토큰 저장 (LocalStorage/Cookie)

    %% 2. API 호출
    U->>F: 7. "카테고리 조회" 버튼 클릭
    F->>B: 8. GET /api/v1/categories/<br/>Authorization: Bearer <JWT>

    %% 3. 백엔드 인증
    B->>B: 9. Bearer 토큰 추출
    B->>B: 10. JWT 서명 검증 (verify_clerk_token)
    B->>B: 11. Payload에서 clerk_user_id 추출

    %% 4. Redis 캐시 확인
    B->>R: 12. GET user:clerk_user_id
    alt 캐시 HIT
        R->>B: 13a. 캐싱된 사용자 정보 반환
        B->>DB: 14a. SELECT * FROM users WHERE id=?
    else 캐시 MISS
        R->>B: 13b. null 반환
        B->>DB: 14b. SELECT * FROM users<br/>WHERE clerk_user_id=?
        alt 사용자 없음
            DB->>B: 15b. null
            B->>DB: 16b. INSERT INTO users<br/>(clerk_user_id)
            DB->>B: 17b. 새 사용자 생성 완료
        else 사용자 존재
            DB->>B: 15b. 사용자 정보 반환
        end
        B->>R: 18. SET user:clerk_user_id<br/>(TTL: 5분)
    end

    %% 5. API 로직 실행
    B->>DB: 19. SELECT * FROM categories<br/>WHERE user_id=?
    DB->>B: 20. 카테고리 목록 반환
    B->>F: 21. JSON 응답
    F->>U: 22. UI에 카테고리 표시
```

### 3.2 단계별 상세 설명

#### **Phase 1: 로그인 (1-6단계)**

1. 사용자가 프론트엔드에서 "로그인" 버튼 클릭
2. Clerk의 로그인 페이지로 리다이렉트
3. 사용자가 이메일/비밀번호 입력
4. Clerk가 인증 정보 확인
5. 인증 성공 시 JWT 토큰 발급 및 앱으로 리다이렉트
6. 프론트엔드가 JWT를 LocalStorage 또는 Cookie에 저장

#### **Phase 2: API 호출 (7-8단계)**

7. 사용자가 "카테고리 조회" 등의 기능 요청
8. 프론트엔드가 API 서버에 요청:
   ```http
   GET /api/v1/categories/
   Authorization: Bearer eyJ0eXAiOiJKV1Q...
   ```

#### **Phase 3: JWT 검증 (9-11단계)**

9. FastAPI의 `HTTPBearer`가 `Authorization` 헤더에서 토큰 추출
10. `verify_clerk_token()` 함수가 JWT 서명 검증
11. Payload에서 `sub` 클레임(clerk_user_id) 추출

**코드:**
```python
# backend/app/api/dependencies/auth.py
async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    token = credentials.credentials

    payload = jwt.decode(
        token,
        key="",  # 개발: 빈 키, 프로덕션: Clerk Public Key
        options={"verify_signature": False},  # 개발용
    )

    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(401, "Invalid token")

    return clerk_user_id
```

#### **Phase 4: 사용자 조회 및 캐싱 (12-18단계)**

12. Redis에서 `user:clerk_user_id` 키로 캐시 확인
13a. **캐시 HIT**: 캐싱된 사용자 ID로 DB 조회 (빠름)
13b. **캐시 MISS**: DB에서 `clerk_user_id`로 사용자 검색

**자동 사용자 생성 (첫 로그인)**:
- DB에 사용자가 없으면 자동으로 생성
- Clerk에서 인증된 사용자이므로 안전하게 생성 가능

18. 조회한 사용자 정보를 Redis에 5분간 캐싱

**코드:**
```python
# backend/app/api/dependencies/auth.py
async def get_current_user(
    clerk_user_id: str = Depends(verify_clerk_token),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> UserModel:
    cache_key = f"user:{clerk_user_id}"

    # 1. Redis 캐시 확인
    cached = await redis.get(cache_key)
    if cached:
        user_data = json.loads(cached)
        user = db.query(UserModel).filter(UserModel.id == user_data["id"]).first()
        if user:
            return user

    # 2. DB 조회
    user = db.query(UserModel).filter(
        UserModel.clerk_user_id == clerk_user_id
    ).first()

    # 3. 없으면 자동 생성
    if not user:
        user = UserModel(clerk_user_id=clerk_user_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    # 4. Redis 캐싱 (5분)
    user_cache = {
        "id": str(user.id),
        "clerk_user_id": user.clerk_user_id,
        "email": user.email
    }
    await redis.setex(cache_key, 300, json.dumps(user_cache))

    return user
```

#### **Phase 5: API 로직 실행 (19-22단계)**

19. API 엔드포인트가 `current_user.id`로 데이터 필터링
20. DB에서 해당 사용자의 카테고리만 조회 (데이터 격리)
21. JSON 응답 반환
22. 프론트엔드가 UI에 표시

**코드:**
```python
# backend/app/api/routes/categories.py
@router.get("/", response_model=List[Category])
def get_categories(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    categories = (
        db.query(CategoryModel)
        .filter(CategoryModel.user_id == current_user.id)  # 사용자별 격리
        .all()
    )
    return categories
```

---

## 4. Redis 캐싱 전략

### 4.1 왜 Redis를 사용하는가?

JWT는 Stateless이므로 **서버가 세션을 저장하지 않습니다**. 그렇다면 왜 Redis를 사용할까요?

#### Redis의 용도 (이 프로젝트에서)

1. **사용자 정보 캐싱**
   - 매 API 요청마다 DB에서 사용자 조회하는 것은 비효율적
   - Redis에 사용자 정보를 캐싱하여 DB 부하 감소

2. **성능 최적화**
   - Redis는 인메모리 DB로 ms 단위 응답 속도
   - PostgreSQL 조회(10-50ms) vs Redis 조회(1ms 이하)

3. **확장성**
   - 향후 Rate Limiting, API 응답 캐싱 등에 활용 가능

### 4.2 캐시 키 구조

```
user:<clerk_user_id>
```

**예시:**
```
user:user_test_123
```

**값 (JSON):**
```json
{
  "id": "8c355fe4-3735-408e-b940-4401b33ffa35",
  "clerk_user_id": "user_test_123",
  "email": null
}
```

### 4.3 TTL (Time To Live) 전략

- **TTL: 5분 (300초)**
- 사용자 정보는 자주 변경되지 않으므로 5분간 캐싱
- 5분 후 자동 만료되어 최신 정보로 갱신

### 4.4 캐시 히트/미스 시나리오

| 시나리오 | Redis | PostgreSQL | 성능 |
|---------|-------|-----------|------|
| **첫 API 호출** | MISS | 1회 조회 | 보통 |
| **5분 내 재호출** | HIT | 조회 없음 | 빠름 (10-50배) |
| **5분 후 호출** | MISS | 1회 조회 | 보통 |

### 4.5 Redis 싱글톤 패턴

모든 요청이 **동일한 Redis 연결**을 공유하여 리소스 절약:

```python
# backend/app/core/redis.py
class RedisClient:
    _instance: Optional[Redis] = None

    @classmethod
    async def get_instance(cls) -> Redis:
        if cls._instance is None:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            cls._instance = await aioredis.from_url(redis_url)
        return cls._instance
```

---

## 5. Session vs JWT 비교

### 5.1 Session 기반 인증

```mermaid
sequenceDiagram
    participant C as 클라이언트
    participant S as 서버
    participant DB as 세션 DB

    C->>S: 1. 로그인 (이메일, 비밀번호)
    S->>DB: 2. 세션 생성 및 저장
    S->>C: 3. 세션 ID 쿠키 전송

    C->>S: 4. API 요청 (Cookie: session_id=abc123)
    S->>DB: 5. 세션 ID로 사용자 정보 조회
    DB->>S: 6. 사용자 정보 반환
    S->>C: 7. API 응답
```

**특징:**
- 서버가 세션을 **상태 저장 (Stateful)**
- 매 요청마다 세션 DB 조회 필요
- 서버 메모리 사용량 증가

### 5.2 JWT 기반 인증

```mermaid
sequenceDiagram
    participant C as 클라이언트
    participant S as 서버

    C->>S: 1. 로그인
    S->>C: 2. JWT 토큰 발급

    C->>S: 3. API 요청 (Authorization: Bearer JWT)
    S->>S: 4. JWT 서명 검증
    S->>S: 5. Payload에서 사용자 정보 추출
    S->>C: 6. API 응답
```

**특징:**
- 서버가 상태를 저장하지 않음 **(Stateless)**
- 토큰 자체에 사용자 정보 포함
- 세션 DB 불필요

### 5.3 비교표

| 항목 | Session | JWT |
|-----|---------|-----|
| **상태 관리** | Stateful (서버 저장) | Stateless (서버 저장 안 함) |
| **확장성** | 어려움 (세션 동기화 필요) | 쉬움 (서버 간 공유 가능) |
| **DB 부하** | 높음 (매 요청마다 조회) | 낮음 (검증만) |
| **토큰 무효화** | 쉬움 (세션 삭제) | 어려움 (만료 시간 의존) |
| **보안** | 쿠키 기반 (CSRF 위험) | Bearer 토큰 (XSS 위험) |
| **모바일 지원** | 어려움 (쿠키 제한적) | 쉬움 (토큰 전송) |

### 5.4 왜 JWT를 선택했는가?

1. **마이크로서비스 아키텍처 준비**
   - 향후 여러 서버로 확장 가능
   - 각 서버가 독립적으로 토큰 검증

2. **Redis와의 조합**
   - JWT의 단점(DB 조회)을 Redis로 보완
   - Stateless의 장점 + 캐싱의 성능

3. **Clerk와의 통합**
   - Clerk가 기본적으로 JWT 제공
   - 별도 세션 관리 불필요

---

## 6. 구현 세부사항

### 6.1 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  - Clerk 로그인 UI                                            │
│  - JWT 토큰 저장 (LocalStorage)                               │
│  - API 호출 시 Authorization 헤더에 JWT 추가                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS + Bearer Token
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   API Layer (routes/)                                │  │
│  │   - categories.py                                    │  │
│  │   - transactions.py                                  │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                              │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │   Dependencies (dependencies/auth.py)                │  │
│  │   1. verify_clerk_token() - JWT 검증                 │  │
│  │   2. get_current_user() - 사용자 조회 + Redis 캐싱    │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                              │
│               ├──────────────┬──────────────────────────┐   │
│               │              │                          │   │
│  ┌────────────▼──────┐  ┌───▼──────────┐  ┌───────────▼─┐ │
│  │  Redis Client     │  │  DB Session  │  │  Models     │ │
│  │  (Singleton)      │  │  (SQLAlchemy)│  │  (User,     │ │
│  │  - 사용자 캐싱     │  │              │  │  Category,  │ │
│  │  - TTL: 5분       │  │              │  │  Transaction│ │
│  └───────────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                     │                │
                     │                │
        ┌────────────▼──────┐  ┌──────▼──────────┐
        │  Redis            │  │  PostgreSQL     │
        │  (Docker)         │  │  (Docker)       │
        │  - Port: 6379     │  │  - Port: 5432   │
        └───────────────────┘  └─────────────────┘
```

### 6.2 디렉토리 구조

```
backend/
├── app/
│   ├── api/
│   │   ├── dependencies/
│   │   │   └── auth.py              # 인증 로직
│   │   └── routes/
│   │       ├── categories.py        # 카테고리 API
│   │       └── transactions.py      # 트랜잭션 API
│   ├── core/
│   │   ├── config.py                # 환경 변수
│   │   ├── database.py              # DB 연결
│   │   └── redis.py                 # Redis 클라이언트
│   ├── models/
│   │   ├── user.py                  # User 모델
│   │   ├── category.py              # Category 모델
│   │   └── transaction.py           # Transaction 모델
│   └── main.py                      # FastAPI 앱 진입점
```

### 6.3 환경 변수 (.env)

```bash
# 데이터베이스
DATABASE_URL=postgresql://postgres:welcome1516@db:5432/household_ledger

# Redis
REDIS_URL=redis://redis:6379

# Clerk (프로덕션에서 사용)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 6.4 Docker Compose 구성

```yaml
services:
  db:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      - DATABASE_URL=postgresql://postgres:welcome1516@db:5432/household_ledger
      - REDIS_URL=redis://redis:6379
```

---

## 7. 보안 고려사항

### 7.1 개발 환경 vs 프로덕션

#### 현재 (개발 환경)
```python
payload = jwt.decode(
    token,
    key="",  # 빈 키
    options={"verify_signature": False},  # 서명 검증 OFF
)
```

**문제점:**
- 누구나 JWT를 위조 가능
- 테스트 목적으로만 사용 가능

#### 프로덕션 환경
```python
import httpx

# Clerk의 JWKS (공개 키) 가져오기
async def get_clerk_jwks():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://clerk.your-domain.com/.well-known/jwks.json")
        return response.json()

# RS256 알고리즘으로 서명 검증
payload = jwt.decode(
    token,
    key=clerk_public_key,  # Clerk 공개 키
    algorithms=["RS256"],  # RS256 알고리즘
    audience="your-app-id",
    issuer="https://clerk.your-domain.com",
)
```

**장점:**
- Clerk의 개인 키로 서명된 토큰만 유효
- 위조된 토큰은 자동으로 거부됨

### 7.2 HTTPS 필수

- **프로덕션에서는 반드시 HTTPS 사용**
- HTTP에서는 토큰이 평문으로 전송되어 탈취 위험

### 7.3 토큰 저장 위치

| 위치 | 장점 | 단점 |
|-----|------|------|
| **LocalStorage** | 간편한 접근 | XSS 공격에 취약 |
| **HttpOnly Cookie** | XSS 방어 | CSRF 공격에 취약 |
| **SessionStorage** | 탭 닫으면 삭제 | XSS 공격에 취약 |

**권장: HttpOnly Cookie + SameSite=Strict**

### 7.4 토큰 만료 시간

- **Access Token: 15분~1시간** (짧게)
- **Refresh Token: 7일~30일** (길게)
- 만료된 토큰은 자동으로 거부됨

### 7.5 Rate Limiting

Redis를 활용한 API 호출 제한:

```python
# 예시: 1분당 60회 제한
async def rate_limit(user_id: str, redis: Redis):
    key = f"rate_limit:{user_id}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)  # 1분 후 삭제
    if count > 60:
        raise HTTPException(429, "Too many requests")
```

---

## 8. 테스트 가이드

### 8.1 Docker 컨테이너 시작

```bash
docker-compose up -d
docker-compose ps  # 상태 확인
```

### 8.2 Mock JWT 토큰 생성

```python
python3 -c "
import base64
import json

header = {'typ': 'JWT', 'alg': 'HS256'}
payload = {'sub': 'user_test_123', 'email': 'test@example.com'}

def base64_url_encode(data):
    json_str = json.dumps(data, separators=(',', ':'))
    encoded = base64.urlsafe_b64encode(json_str.encode()).decode()
    return encoded.rstrip('=')

header_encoded = base64_url_encode(header)
payload_encoded = base64_url_encode(payload)
token = f'{header_encoded}.{payload_encoded}.fake_signature'
print(token)
"
```

**출력:**
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyX3Rlc3RfMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.fake_signature
```

### 8.3 API 호출 테스트

#### 1) 카테고리 조회 (첫 호출 - 사용자 자동 생성)
```bash
curl -X GET http://localhost:8000/api/v1/categories/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyX3Rlc3RfMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.fake_signature"
```

**응답:**
```json
[]
```

**확인:**
- PostgreSQL에 `user_test_123` 사용자 자동 생성
- Redis에 `user:user_test_123` 키 캐싱 (TTL: 5분)

#### 2) 카테고리 생성
```bash
curl -X POST http://localhost:8000/api/v1/categories/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyX3Rlc3RfMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.fake_signature" \
  -H "Content-Type: application/json" \
  -d '{"name": "식비", "emoji": "🍚"}'
```

**응답:**
```json
{
  "id": "83bacfe3-e83f-4d54-a91c-891983d85b7c",
  "user_id": "8c355fe4-3735-408e-b940-4401b33ffa35",
  "name": "식비",
  "emoji": "🍚",
  "created_at": "2025-10-10T11:29:42.321500Z",
  "updated_at": "2025-10-10T11:29:42.321500Z"
}
```

#### 3) 카테고리 재조회 (Redis 캐시 HIT)
```bash
curl -X GET http://localhost:8000/api/v1/categories/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyX3Rlc3RfMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.fake_signature"
```

**응답:**
```json
[
  {
    "id": "83bacfe3-e83f-4d54-a91c-891983d85b7c",
    "user_id": "8c355fe4-3735-408e-b940-4401b33ffa35",
    "name": "식비",
    "emoji": "🍚",
    "created_at": "2025-10-10T11:29:42.321500Z",
    "updated_at": "2025-10-10T11:29:42.321500Z"
  }
]
```

### 8.4 Redis 캐시 확인

#### 1) 캐시된 사용자 정보 확인
```bash
docker exec hl-redis redis-cli GET "user:user_test_123"
```

**출력:**
```json
{"id": "8c355fe4-3735-408e-b940-4401b33ffa35", "clerk_user_id": "user_test_123", "email": null}
```

#### 2) TTL 확인
```bash
docker exec hl-redis redis-cli TTL "user:user_test_123"
```

**출력:**
```
257  # 남은 시간 (초)
```

#### 3) 모든 Redis 키 확인
```bash
docker exec hl-redis redis-cli KEYS "*"
```

**출력:**
```
user:user_test_123
```

### 8.5 PostgreSQL 사용자 확인

```bash
docker exec hl-db psql -U postgres -d household_ledger -c \
  "SELECT id, clerk_user_id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;"
```

**출력:**
```
                  id                  | clerk_user_id |      email       |          created_at
--------------------------------------+---------------+------------------+-------------------------------
 8c355fe4-3735-408e-b940-4401b33ffa35 | user_test_123 |                  | 2025-10-10 11:29:23.633037+00
```

### 8.6 성능 테스트 (캐싱 효과)

향후 `/no-cache` 엔드포인트를 추가하여 성능 비교:

```bash
# Redis 캐싱 사용
time curl -X GET http://localhost:8000/api/v1/categories/ \
  -H "Authorization: Bearer <JWT>"

# 캐싱 미사용 (매번 DB 조회)
time curl -X GET http://localhost:8000/api/v1/categories/no-cache \
  -H "Authorization: Bearer <JWT>"
```

**예상 결과:**
- 캐싱 사용: 10-20ms
- 캐싱 미사용: 50-100ms

---

## 9. 문제 해결

### 9.1 "Missing required positional argument: 'key'" 에러

**원인:**
```python
payload = jwt.decode(
    token,
    options={"verify_signature": False},  # key 파라미터 누락
)
```

**해결:**
```python
payload = jwt.decode(
    token,
    key="",  # 빈 키 추가
    options={"verify_signature": False},
)
```

### 9.2 Redis 연결 실패

**확인:**
```bash
docker exec hl-redis redis-cli ping
```

**출력:**
```
PONG
```

**환경 변수 확인:**
```bash
docker exec hl-api env | grep REDIS_URL
```

### 9.3 토큰 검증 실패

**디버깅:**
```python
import json
import base64

token = "eyJ0eXAi..."
parts = token.split('.')
payload = json.loads(base64.urlsafe_b64decode(parts[1] + '=='))
print(payload)
```

---

## 10. 다음 단계

1. **프로덕션 JWT 검증 구현**
   - Clerk JWKS 엔드포인트 연동
   - RS256 서명 검증

2. **Refresh Token 구현**
   - Access Token 만료 시 자동 갱신

3. **Rate Limiting 추가**
   - Redis 기반 API 호출 제한

4. **성능 모니터링**
   - Redis 캐시 히트율 측정
   - DB 쿼리 최적화

---

## 참고 자료

- [JWT 공식 문서](https://jwt.io/)
- [Clerk 문서](https://clerk.com/docs)
- [FastAPI 보안 가이드](https://fastapi.tiangolo.com/tutorial/security/)
- [Redis 공식 문서](https://redis.io/docs/)
