# MVCC와 VACUUM: PostgreSQL의 동시성 제어 메커니즘

## 목차
1. [ACID vs Concurrency 트레이드오프](#acid-vs-concurrency-트레이드오프)
2. [MVCC란?](#mvcc란)
3. [MVCC 동작 원리](#mvcc-동작-원리)
4. [Dead Tuple 문제](#dead-tuple-문제)
5. [VACUUM의 역할](#vacuum의-역할)
6. [VACUUM 종류](#vacuum-종류)
7. [Autovacuum 메커니즘](#autovacuum-메커니즘)
8. [Bloat 문제와 해결](#bloat-문제와-해결)
9. [성능 최적화](#성능-최적화)
10. [실전 예시](#실전-예시)

---

## ACID vs Concurrency 트레이드오프

### 문제: ACID의 딜레마

**ACID를 엄격히 지키려면...**

```
시나리오: 두 사용자가 동시에 같은 계좌 조회

전통적인 Lock 방식:
┌─────────────────────────────────────────────┐
│ 사용자 A: SELECT * FROM accounts WHERE id=1 │
│ → 계좌 행에 Shared Lock 걸림 🔒             │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ 사용자 B: SELECT * FROM accounts WHERE id=1 │
│ → 대기... 대기... 대기... ⏳                │
│ (A가 커밋할 때까지 블로킹됨)                 │
└─────────────────────────────────────────────┘

결과:
✅ ACID 완벽 보장 (Isolation)
❌ Concurrency 포기 (동시 처리 불가)
❌ 성능 저하 (대기 시간 증가)
```

**Lock-Based Concurrency Control의 한계:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **Pessimistic Lock** (비관적 락) | ACID 완벽 보장 | 동시성 낮음, 데드락 위험 |
| **Optimistic Lock** (낙관적 락) | 동시성 높음 | 충돌 시 재시도 필요, 복잡도 증가 |

### PostgreSQL의 해법: MVCC

```
"Lock 없이도 ACID를 보장하면서 높은 동시성을 제공한다"

핵심 아이디어:
- Readers는 Writers를 블로킹하지 않는다
- Writers는 Readers를 블로킹하지 않는다
- Writers만 서로 블로킹한다 (같은 행 수정 시)
```

**MVCC 방식:**

```
사용자 A: SELECT * FROM accounts WHERE id=1;
→ 현재 시점의 스냅샷 사용
→ Lock 없음! ✅

사용자 B: UPDATE accounts SET balance=1000 WHERE id=1;
→ 새로운 버전 생성 (기존 버전 유지)
→ A는 여전히 이전 버전을 봄
→ Lock 충돌 없음! ✅

사용자 C: SELECT * FROM accounts WHERE id=1;
→ 커밋된 최신 버전 또는 자신의 스냅샷 버전 선택
→ Lock 없음! ✅

결과:
✅ ACID 보장 (각 트랜잭션은 일관된 스냅샷 사용)
✅ Concurrency 유지 (동시 읽기/쓰기 가능)
✅ 성능 향상 (블로킹 최소화)
```

---

## MVCC란?

### Multi-Version Concurrency Control (다중 버전 동시성 제어)

**정의:**
> 데이터를 수정할 때 기존 데이터를 덮어쓰지 않고 새로운 버전을 만들어서, 여러 트랜잭션이 서로 다른 버전을 동시에 볼 수 있게 하는 기술

### MVCC vs 전통적인 Lock

**전통적인 Lock 방식 (MySQL InnoDB 기본):**

```
계좌 잔액: 1000원

트랜잭션 A: UPDATE accounts SET balance = 900;
→ 행에 Exclusive Lock 🔒
→ 디스크에서 1000 → 900 직접 수정

트랜잭션 B: SELECT balance FROM accounts;
→ A의 Lock 때문에 대기... ⏳
→ A가 COMMIT할 때까지 블로킹됨

문제:
❌ SELECT조차 블로킹됨 (동시성 저하)
❌ 데드락 위험 증가
```

**PostgreSQL MVCC 방식:**

```
계좌 잔액: 1000원

트랜잭션 A (XID=100): UPDATE accounts SET balance = 900;
→ Lock 없음!
→ 기존 튜플: (balance=1000, xmin=50, xmax=100) ← 삭제 표시
→ 새 튜플: (balance=900, xmin=100, xmax=NULL) ← 생성

트랜잭션 B (XID=101): SELECT balance FROM accounts;
→ Lock 없음! ✅
→ 스냅샷 규칙에 따라 적절한 버전 선택:
  - A가 커밋 전: 1000 반환 (이전 버전)
  - A가 커밋 후: 900 또는 1000 (격리 수준에 따라)

결과:
✅ 동시 읽기/쓰기 가능
✅ 블로킹 없음
```

---

## MVCC 동작 원리

### 1. 튜플 구조

PostgreSQL의 각 행(튜플)은 메타데이터를 포함합니다:

```c
// 튜플 헤더 구조 (간략화)
typedef struct HeapTupleHeaderData {
    TransactionId xmin;     // 이 튜플을 생성한 트랜잭션 ID
    TransactionId xmax;     // 이 튜플을 삭제한 트랜잭션 ID (NULL이면 유효)
    CommandId     cmin;     // 생성 커맨드 ID (트랜잭션 내 순서)
    CommandId     cmax;     // 삭제 커맨드 ID
    ItemPointerData t_ctid; // 새 버전 위치 (UPDATE 시)
    // ... 실제 데이터 ...
} HeapTupleHeaderData;
```

**실제 데이터 예시:**

```sql
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    balance INT
);

INSERT INTO accounts (name, balance) VALUES ('홍길동', 1000);
```

**디스크 상의 튜플:**

```
Page (8KB 블록):
┌────────────────────────────────────────────────┐
│ Tuple 1:                                       │
│   xmin: 100  (트랜잭션 100이 생성)              │
│   xmax: 0    (아직 삭제 안 됨)                  │
│   cmin: 0                                      │
│   cmax: 0                                      │
│   t_ctid: (0, 1)  (자기 자신 가리킴)            │
│   data: id=1, name='홍길동', balance=1000      │
└────────────────────────────────────────────────┘
```

### 2. 트랜잭션 ID (XID)

```
PostgreSQL은 각 트랜잭션에 고유한 32비트 정수 ID 할당:

XID: 1, 2, 3, 4, ..., 4,294,967,295 (약 42억)
→ 순환 (Wraparound): 42억 넘으면 다시 1로 돌아감
→ VACUUM이 이를 처리해야 함! (나중에 설명)
```

**XID 확인:**

```sql
-- 현재 트랜잭션 ID
SELECT txid_current();
-- 결과: 12345

-- 다음 트랜잭션
BEGIN;
SELECT txid_current();
-- 결과: 12346
COMMIT;
```

### 3. 스냅샷 (Snapshot)

트랜잭션이 시작할 때 "현재 어떤 트랜잭션들이 진행 중인가"를 기록합니다.

```c
typedef struct SnapshotData {
    TransactionId xmin;           // 가장 오래된 활성 XID
    TransactionId xmax;           // 다음에 할당될 XID
    TransactionId *xip;           // 진행 중인 XID 배열
    uint32 xcnt;                  // 진행 중인 XID 개수
} SnapshotData;
```

**예시:**

```
시간 순서:
XID 100 - COMMIT 완료 ✅
XID 101 - 진행 중 🔄
XID 102 - 진행 중 🔄
XID 103 - 아직 시작 안 함 ⏳

트랜잭션 104가 시작할 때 스냅샷:
{
    xmin: 101,
    xmax: 104,
    xip: [101, 102],   // 진행 중인 트랜잭션들
    xcnt: 2
}

이 스냅샷으로 튜플 가시성 판단:
- xmin < 101이고 커밋됨 → 보임 ✅
- xmin = 101 또는 102 → 안 보임 ❌ (아직 진행 중)
- xmin >= 104 → 안 보임 ❌ (미래 데이터)
```

### 4. 튜플 가시성 판단 알고리즘

```python
def is_tuple_visible(tuple, snapshot):
    """
    튜플이 현재 스냅샷에서 보이는지 판단
    """
    xmin = tuple.xmin  # 생성 XID
    xmax = tuple.xmax  # 삭제 XID

    # 1. 생성 트랜잭션이 커밋되지 않았거나 미래 트랜잭션
    if xmin >= snapshot.xmax:
        return False  # 안 보임

    if xmin in snapshot.xip:  # 진행 중
        return False  # 안 보임

    if not is_committed(xmin):  # 커밋 안 됨
        return False  # 안 보임

    # 2. 생성 트랜잭션은 커밋됨, 이제 삭제 여부 확인
    if xmax == 0:  # 삭제 안 됨
        return True  # 보임 ✅

    if xmax >= snapshot.xmax:  # 삭제가 미래
        return True  # 아직 삭제 안 된 것으로 봄 ✅

    if xmax in snapshot.xip:  # 삭제 트랜잭션 진행 중
        return True  # 아직 삭제 안 된 것으로 봄 ✅

    if not is_committed(xmax):  # 삭제 트랜잭션 롤백됨
        return True  # 삭제 안 된 것 ✅

    # 3. 삭제 트랜잭션도 커밋됨
    return False  # 안 보임 (삭제됨) ❌
```

### 5. INSERT/UPDATE/DELETE 동작

#### INSERT

```sql
INSERT INTO accounts (name, balance) VALUES ('김철수', 2000);
```

**내부 동작:**

```
1. 새 튜플 생성:
   xmin = 현재 트랜잭션 ID (예: 200)
   xmax = 0 (NULL)
   data = ('김철수', 2000)

2. 페이지에 추가:
   ┌────────────────────────────────┐
   │ Tuple 1: xmin=100, xmax=0, ... │
   │ Tuple 2: xmin=200, xmax=0, ... │ ← 새로 추가
   └────────────────────────────────┘

3. WAL 기록 (Durability 보장)

4. COMMIT:
   → XID 200을 커밋 상태로 표시
   → 이후 트랜잭션들이 Tuple 2를 볼 수 있음
```

#### UPDATE

```sql
UPDATE accounts SET balance = 1500 WHERE id = 1;
```

**내부 동작:**

```
1. 기존 튜플 수정 (삭제 표시):
   Old Tuple:
   xmin = 100
   xmax = 201  ← 현재 트랜잭션 ID로 표시
   t_ctid = (0, 3)  ← 새 버전 위치

2. 새 튜플 생성:
   New Tuple:
   xmin = 201
   xmax = 0
   t_ctid = (0, 3)  ← 자기 자신
   data = (balance=1500)

3. 페이지 상태:
   ┌─────────────────────────────────────────┐
   │ Tuple 1: xmin=100, xmax=201, t_ctid→3  │ ← Old Version
   │ Tuple 2: xmin=200, xmax=0, ...         │
   │ Tuple 3: xmin=201, xmax=0, ...         │ ← New Version
   └─────────────────────────────────────────┘

4. 동시 트랜잭션 처리:
   - XID < 201인 트랜잭션: Tuple 1 보임 (balance=1000)
   - XID = 201 (본인): Tuple 3 보임 (balance=1500)
   - XID > 201이고 201 커밋 전: Tuple 1 보임
   - XID > 201이고 201 커밋 후: Tuple 3 보임
```

#### DELETE

```sql
DELETE FROM accounts WHERE id = 1;
```

**내부 동작:**

```
1. 기존 튜플에 삭제 표시만:
   Tuple:
   xmin = 100
   xmax = 202  ← 삭제한 트랜잭션 ID
   (물리적으로 삭제하지 않음!)

2. 페이지 상태:
   ┌────────────────────────────────┐
   │ Tuple 1: xmin=100, xmax=202    │ ← 삭제 표시만
   └────────────────────────────────┘

3. 가시성:
   - XID < 202: 보임 ✅
   - XID = 202 (본인): 안 보임 (자신이 삭제했으므로)
   - XID > 202이고 202 커밋 전: 보임 ✅
   - XID > 202이고 202 커밋 후: 안 보임 ❌

4. 중요: 디스크에서 실제 삭제는 VACUUM이 나중에 수행!
```

---

## Dead Tuple 문제

### Dead Tuple이란?

**정의:**
> 어떤 트랜잭션에서도 더 이상 볼 수 없는 (죽은) 튜플

```
예시:
┌─────────────────────────────────────────┐
│ Tuple 1: xmin=100, xmax=200            │ ← Dead! (200이 커밋됨)
│ Tuple 2: xmin=200, xmax=0              │ ← Live!
└─────────────────────────────────────────┘

모든 진행 중인 트랜잭션의 XID > 200
→ 아무도 Tuple 1을 볼 수 없음
→ Dead Tuple!
```

### Dead Tuple의 문제점

#### 1. 디스크 공간 낭비 (Bloat)

```
100만 건의 행을 가진 테이블에서
매일 50만 건을 UPDATE하면:

1일 후:
- Live Tuple: 100만 개
- Dead Tuple: 50만 개
- 디스크 사용: 150만 개 분량

7일 후:
- Live Tuple: 100만 개
- Dead Tuple: 350만 개
- 디스크 사용: 450만 개 분량 ❌

→ 실제 필요한 공간의 4.5배 낭비!
```

#### 2. 성능 저하

```sql
SELECT * FROM orders WHERE user_id = 123;
```

**내부 동작:**

```
PostgreSQL이 스캔해야 하는 튜플:
- Live Tuple: 1,000개
- Dead Tuple: 9,000개

총 10,000개 튜플을 읽어서 가시성 검사
→ 9,000개는 버림
→ 1,000개만 반환

결과:
❌ I/O 10배 증가
❌ CPU 10배 낭비 (가시성 검사)
❌ 캐시 효율 감소 (메모리 낭비)
```

#### 3. 인덱스 Bloat

```
인덱스도 마찬가지로 Dead Tuple을 가리키는 엔트리가 쌓임:

B-Tree 인덱스:
┌────────────────────────────────────┐
│ Key: user_id=123                   │
│ Pointers:                          │
│   → Page 10, Offset 1 (Dead) ❌    │
│   → Page 10, Offset 2 (Dead) ❌    │
│   → Page 10, Offset 3 (Dead) ❌    │
│   → Page 10, Offset 4 (Live) ✅    │
└────────────────────────────────────┘

인덱스 스캔 시:
- 4개 포인터 모두 확인
- 3개는 Dead Tuple (버림)
- 1개만 반환

→ 인덱스 효율 저하
→ Index Bloat 발생
```

#### 4. XID Wraparound 위험

```
XID는 32비트 정수 (0 ~ 42억):

XID가 42억을 넘으면 다시 1로 순환:
... → 4,294,967,293 → 4,294,967,294 → 4,294,967,295 → 1 → 2 → ...

문제:
Tuple: xmin=100 (과거)
현재 XID: 4,294,967,295

다음 트랜잭션: XID=1
→ XID 1 < 100으로 판단됨 (순환 때문에)
→ 과거 튜플이 미래 튜플처럼 보임 ❌

해결:
VACUUM이 오래된 튜플의 xmin을 FrozenXID(2)로 변경
→ "영원히 과거" 표시
→ Wraparound 문제 해결
```

---

## VACUUM의 역할

### VACUUM이란?

**정의:**
> Dead Tuple을 제거하고 디스크 공간을 재사용 가능하게 만드는 정리 작업

```
VACUUM의 3가지 핵심 역할:
1. Dead Tuple 제거 → 디스크 공간 회수
2. XID Wraparound 방지 → Tuple Freezing
3. 통계 정보 갱신 → 쿼리 최적화
```

### VACUUM 동작 과정

```
1. Dead Tuple 스캔:
   테이블을 순회하며 각 튜플 검사
   → xmax가 설정되고 모든 트랜잭션에서 안 보이면 Dead

2. Dead Tuple 마킹:
   페이지에서 Dead Tuple 위치 기록
   (즉시 삭제하지 않음!)

3. 인덱스 정리:
   모든 인덱스를 스캔하여 Dead Tuple을 가리키는 엔트리 제거

4. 페이지 정리:
   Dead Tuple이 차지한 공간을 "재사용 가능" 표시
   (물리적 파일 크기는 줄지 않음!)

5. FSM 업데이트:
   Free Space Map에 재사용 가능한 공간 기록
   → 다음 INSERT 시 이 공간 사용

6. Visibility Map 업데이트:
   모든 튜플이 모든 트랜잭션에서 보이는 페이지 표시
   → 다음 VACUUM 시 스킵 가능 (성능 향상)
```

**예시:**

```
VACUUM 전:
Page 1: [Live][Dead][Dead][Live][Dead] → 5개 튜플, 60% Bloat
Page 2: [Live][Live][Dead][Dead][Dead] → 5개 튜플, 60% Bloat

VACUUM 실행:
1. Dead Tuple 확인 (6개)
2. 인덱스에서 6개 엔트리 제거
3. 페이지 정리:

Page 1: [Live][____][____][Live][____] → 재사용 가능 공간 표시
Page 2: [Live][Live][____][____][____]

FSM 업데이트:
Page 1: 60% free space
Page 2: 60% free space

다음 INSERT 시:
INSERT INTO ... VALUES (...);
→ Page 1의 빈 공간에 삽입 ✅ (새 페이지 ��당하지 않음)
```

### VACUUM vs VACUUM FULL

| 항목 | VACUUM | VACUUM FULL |
|------|--------|-------------|
| 디스크 공간 회수 | 재사용 가능 표시만 (파일 크기 그대로) | 물리적으로 파일 크기 축소 ✅ |
| 테이블 잠금 | Shared Lock (읽기 가능) | Exclusive Lock (읽기/쓰기 불가) ❌ |
| 수행 시간 | 빠름 (초~분) | 매우 느림 (시간~일) |
| 디스크 사용량 | 기존 크기 유지 | 임시로 2배 필요 (복사본 생성) |
| 사용 시점 | 정기적으로 자주 | 극단적 Bloat 시에만 |

**VACUUM FULL 동작:**

```
1. 새 파일 생성
2. Live Tuple만 복사 (압축됨)
3. 인덱스 재생성
4. 기존 파일 삭제
5. 새 파일로 교체

Before:
[Live][Dead][Dead][Live][Dead][Dead][Live][Dead]
100MB 파일

After:
[Live][Live][Live]
30MB 파일 (70MB 절약!) ✅

대가:
- 30분~2시간 걸림 (테이블 크기에 따라)
- 서비스 중단 (Exclusive Lock)
- 임시로 130MB 디스크 필요
```

---

## VACUUM 종류

### 1. Manual VACUUM

```sql
-- 전체 데이터베이스
VACUUM;

-- 특정 테이블
VACUUM accounts;

-- 자세한 정보 출력
VACUUM VERBOSE accounts;

-- 통계 정보도 갱신
VACUUM ANALYZE accounts;

-- 전체 재작성 (주의!)
VACUUM FULL accounts;
```

**출력 예시:**

```sql
VACUUM VERBOSE accounts;

INFO:  vacuuming "public.accounts"
INFO:  scanned index "accounts_pkey" to remove 15000 row versions
DETAIL:  CPU: user: 0.12 s, system: 0.05 s, elapsed: 0.18 s
INFO:  "accounts": removed 15000 row versions in 200 pages
DETAIL:  CPU: user: 0.08 s, system: 0.02 s, elapsed: 0.11 s
INFO:  "accounts": found 15000 removable, 85000 nonremovable row versions in 1200 pages
DETAIL:  0 dead row versions cannot be removed yet.
        CPU: user: 0.35 s, system: 0.12 s, elapsed: 0.52 s
```

### 2. Autovacuum (자동)

PostgreSQL은 기본적으로 autovacuum이 활성화되어 있습니다:

```sql
-- postgresql.conf
autovacuum = on  -- 기본값
autovacuum_naptime = 1min  -- 1분마다 실행 여부 확인
```

**Autovacuum 트리거 조건:**

```
VACUUM 트리거 조건:
dead_tuples > autovacuum_vacuum_threshold
              + autovacuum_vacuum_scale_factor * reltuples

기본값:
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.2

예시:
테이블 행 수: 10,000개
트리거 조건: 50 + 0.2 * 10,000 = 2,050개
→ Dead Tuple이 2,050개 넘으면 자동 VACUUM 실행
```

### 3. Freeze VACUUM

```sql
-- XID Wraparound 방지
VACUUM FREEZE accounts;
```

**동작:**

```
오래된 튜플의 xmin을 FrozenXID(2)로 변경:

Before:
Tuple: xmin=12345, xmax=0

After:
Tuple: xmin=2 (FrozenXID), xmax=0

효과:
- 이 튜플은 "영원히 과거" 취급
- 모든 트랜잭션에서 항상 보임
- XID Wraparound 걱정 없음
```

---

## Autovacuum 메커니즘

### 1. Autovacuum Launcher

```
PostgreSQL 시작 시 자동으로 실행되는 백그라운드 프로세스:

Autovacuum Launcher (1개)
  ├─ 1분마다 깨어남
  ├─ 각 데이터베이스의 통계 확인
  ├─ VACUUM이 필요한 테이블 발견 시
  └─ Autovacuum Worker 프로세스 생성 (최대 3개)

Autovacuum Worker 1 → database1.table_a 처리
Autovacuum Worker 2 → database2.table_b 처리
Autovacuum Worker 3 → database1.table_c 처리
```

### 2. 테이블 통계 (pg_stat_user_tables)

```sql
SELECT
    schemaname,
    relname,
    n_tup_ins,          -- INSERT된 행 수
    n_tup_upd,          -- UPDATE된 행 수
    n_tup_del,          -- DELETE된 행 수
    n_live_tup,         -- 현재 Live Tuple 수
    n_dead_tup,         -- 현재 Dead Tuple 수
    last_vacuum,        -- 마지막 수동 VACUUM
    last_autovacuum,    -- 마지막 자동 VACUUM
    vacuum_count,       -- 수동 VACUUM 횟수
    autovacuum_count    -- 자동 VACUUM 횟수
FROM pg_stat_user_tables
WHERE relname = 'accounts';
```

**출력 예시:**

```
 relname  | n_live_tup | n_dead_tup | last_autovacuum     | autovacuum_count
----------|------------|------------|---------------------|------------------
 accounts |     85000  |      2150  | 2025-10-19 14:30:00 |              42
```

### 3. Autovacuum 트리거 임계값 조정

```sql
-- 테이블별로 임계값 조정 가능
ALTER TABLE accounts SET (
    autovacuum_vacuum_threshold = 100,      -- 기본 50
    autovacuum_vacuum_scale_factor = 0.1    -- 기본 0.2
);

-- 대용량 테이블 (수백만 행)
ALTER TABLE big_table SET (
    autovacuum_vacuum_scale_factor = 0.05   -- 5%만 변경되어도 실행
);

-- 고빈도 갱신 테이블
ALTER TABLE hot_table SET (
    autovacuum_vacuum_threshold = 10,       -- 10개만 변경되어도 실행
    autovacuum_vacuum_scale_factor = 0      -- scale factor 무시
);
```

### 4. Autovacuum Worker 개수 조정

```sql
-- postgresql.conf
autovacuum_max_workers = 3  -- 기본값

-- 대용량 서버 (많은 DB/테이블)
autovacuum_max_workers = 6  -- 증가

-- 소형 서버 (리소스 절약)
autovacuum_max_workers = 1  -- 감소
```

### 5. Autovacuum 비용 제한 (Cost-Based Delay)

```sql
-- postgresql.conf
autovacuum_vacuum_cost_delay = 2ms      -- 기본값: 2ms
autovacuum_vacuum_cost_limit = 200      -- 기본값: 200

-- 동작 원리:
-- 1. VACUUM이 페이지를 읽거나 쓸 때마다 "비용" 누적
--    - Shared Buffer Hit: 비용 1
--    - 디스크 Read: 비용 10
--    - 디스크 Write: 비용 20
-- 2. 누적 비용이 limit(200)를 넘으면
--    → delay(2ms)만큼 일시 정지
--    → 비용 초기화
-- 3. 반복

-- 효과: VACUUM이 I/O를 독점하지 않고 양보
```

**튜닝 예시:**

```sql
-- 야간 배치: VACUUM을 빠르게
autovacuum_vacuum_cost_delay = 0  -- 지연 없음
autovacuum_vacuum_cost_limit = -1 -- 제한 없음

-- 운영 시간: VACUUM을 천천히
autovacuum_vacuum_cost_delay = 10ms  -- 더 자주 대기
autovacuum_vacuum_cost_limit = 100   -- 더 적은 작업 후 대기
```

---

## Bloat 문제와 해결

### 1. Bloat 측정

```sql
-- pgstattuple 확장 설치
CREATE EXTENSION pgstattuple;

-- 테이블 Bloat 확인
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
```

**출력 예시:**

```
 tablename | size   | n_dead_tup | n_live_tup | dead_ratio
-----------|--------|------------|------------|------------
 orders    | 1.2 GB |    450000  |   1000000  |      31.03
 accounts  | 850 MB |    180000  |    500000  |      26.47
```

**상세 Bloat 분석:**

```sql
SELECT
    pg_size_pretty(pg_relation_size('orders')) AS table_size,
    pg_size_pretty(pg_total_relation_size('orders')) AS total_size,  -- 인덱스 포함
    (pgstattuple('orders')).tuple_percent AS live_tuple_percent,
    (pgstattuple('orders')).dead_tuple_percent AS dead_tuple_percent,
    (pgstattuple('orders')).free_percent AS free_percent;
```

**출력:**

```
 table_size | total_size | live_tuple_percent | dead_tuple_percent | free_percent
------------|------------|--------------------|--------------------|-------------
 1.2 GB     | 2.5 GB     |              65.3  |              28.7  |          6.0
```

### 2. Bloat 발생 원인

#### 원인 1: Autovacuum이 따라잡지 못함

```
시나리오: 대량 UPDATE/DELETE

09:00 - 100만 행 UPDATE 시작
09:01 - 100만 개 Dead Tuple 생성
09:02 - Autovacuum 트리거 (2,050개 기준 초과)
09:03 - Autovacuum 시작... (느림)
09:05 - 또 100만 행 UPDATE
09:06 - 200만 개 Dead Tuple (Autovacuum 아직 진행 중)
09:10 - Autovacuum 완료 (100만 개 처리)
09:10 - 여전히 100만 개 Dead Tuple 남음 ❌

결과: Bloat 계속 증가
```

**해결책:**

```sql
-- 임계값 낮추기
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.05  -- 5%만 변경되어도 실행
);

-- 또는 배치 작업 후 수동 VACUUM
UPDATE orders SET status = 'shipped' WHERE ...;
VACUUM orders;  -- 즉시 정리
```

#### 원인 2: Long-Running Transaction

```
시나리오:

09:00 - 트랜잭션 A 시작 (XID=1000)
        SELECT * FROM accounts;  -- 스냅샷 생성

09:01 - 트랜잭션 B: UPDATE accounts ... (100만 행)
        → 100만 개 Dead Tuple 생성

09:02 - VACUUM 실행
        → Dead Tuple 확인
        → 하지만 XID=1000이 아직 진행 중!
        → 이 Dead Tuple들을 트랜잭션 A가 볼 수 있음
        → VACUUM이 제거할 수 없음 ❌

09:30 - 트랜잭션 A 여전히 실행 중 (30분째)
        → 30분 동안 생긴 모든 Dead Tuple 누적 ❌

10:00 - 트랜잭션 A 종료
        → 이제야 VACUUM이 Dead Tuple 제거 가능
```

**해결책:**

```sql
-- Long-Running Transaction 모니터링
SELECT
    pid,
    usename,
    state,
    now() - xact_start AS duration,
    query
FROM pg_stat_activity
WHERE state != 'idle'
  AND xact_start < now() - interval '10 minutes'
ORDER BY xact_start;

-- 필요시 강제 종료
SELECT pg_terminate_backend(pid);
```

#### 원인 3: 높은 UPDATE 빈도

```
UPDATE accounts SET last_login = NOW() WHERE id = 123;

매 로그인마다 실행 → 하루 수천~수만 번
→ Dead Tuple 폭발적 증가
→ Bloat 심화
```

**해결책 1: 별도 테이블로 분리**

```sql
-- accounts 테이블: 자주 변경되지 않는 데이터
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP
);

-- user_sessions 테이블: 자주 변경되는 데이터
CREATE TABLE user_sessions (
    user_id INT PRIMARY KEY,
    last_login TIMESTAMP,
    login_count INT
);

-- UPDATE는 user_sessions에만 발생
-- accounts는 Bloat 없음 ✅
```

**해결책 2: HOT Update 활용**

```sql
-- HOT (Heap-Only Tuple) Update:
-- 인덱스되지 않은 컬럼만 변경 시 인덱스 업데이트 불필요

-- ❌ 나쁜 예 (인덱스 컬럼 변경)
CREATE INDEX idx_last_login ON accounts(last_login);
UPDATE accounts SET last_login = NOW() WHERE id = 123;
→ 인덱스도 업데이트 필요 (느림)

-- ✅ 좋은 예 (인덱스 안 건 컬럼 변경)
-- last_login에 인덱스 없음
UPDATE accounts SET last_login = NOW() WHERE id = 123;
→ HOT Update (빠름, Bloat 적음)
```

### 3. Bloat 해결 방법

#### 방법 1: VACUUM (일반)

```sql
VACUUM VERBOSE orders;

-- 장점:
-- ✅ 온라인 서비스 가능 (Shared Lock만)
-- ✅ 빠름 (수 분)
-- ✅ 안전함

-- 단점:
-- ❌ 파일 크기는 안 줄어듦 (재사용 표시만)
```

#### 방법 2: VACUUM FULL (극단적)

```sql
VACUUM FULL orders;

-- 장점:
-- ✅ 파일 크기 실제로 축소

-- 단점:
-- ❌ Exclusive Lock (서비스 중단)
-- ❌ 매우 느림 (수 시간)
-- ❌ 디스크 2배 필요
```

#### 방법 3: REINDEX

```sql
-- 인덱스 Bloat 해결
REINDEX TABLE orders;

-- 또는 개별 인덱스
REINDEX INDEX idx_orders_user_id;

-- CONCURRENTLY 옵션 (온라인)
REINDEX TABLE CONCURRENTLY orders;  -- PostgreSQL 12+
```

#### 방법 4: pg_repack (추천)

```bash
# 확장 설치
apt-get install postgresql-15-repack

# 실행 (온라인, 서비스 중단 없음)
pg_repack -t orders -j 4  # 4개 병렬

# 동작 원리:
# 1. 트리거로 변경사항 추적
# 2. 새 테이블에 Live Tuple만 복사
# 3. 변경사항 적용
# 4. 원자적으로 교체
# → VACUUM FULL 효과 + 서비스 중단 없음!
```

---

## 성능 최적화

### 1. Autovacuum 튜닝

```sql
-- postgresql.conf

-- 고성능 서버 (많은 RAM, 빠른 SSD)
autovacuum_max_workers = 6
autovacuum_naptime = 30s  -- 더 자주 확인
autovacuum_vacuum_cost_delay = 1ms  -- 더 빠르게
autovacuum_vacuum_cost_limit = 500  -- 더 많은 작업

-- 대용량 테이블 최적화
autovacuum_vacuum_scale_factor = 0.05  -- 5%만 변경돼도 실행
autovacuum_analyze_scale_factor = 0.02  -- 2%만 변경돼도 분석
```

### 2. Visibility Map 활용

```
Visibility Map (VM):
각 페이지의 모든 튜플이 모든 트랜잭션에서 보이는지 표시하는 비트맵

페이지 1: 1 (모든 튜플 Frozen) → VACUUM 시 스킵 ✅
페이지 2: 0 (일부 튜플 최신) → VACUUM 필요
페이지 3: 1 (모든 튜플 Frozen) → 스킵 ✅

효과:
- VACUUM이 모든 페이지를 스캔하지 않아도 됨
- I/O 대폭 감소
- 특히 대용량 테이블에서 효과적
```

### 3. Fillfactor 조정

```sql
-- Fillfactor: 페이지를 얼마나 채울지 설정 (0~100)

-- 기본값: 100 (100% 채움)
-- UPDATE가 많은 테이블: 70~90 (여유 공간 확보)

ALTER TABLE accounts SET (fillfactor = 70);

-- 효과:
-- 페이지에 30% 여유 공간
-- UPDATE 시 같은 페이지 내에서 HOT Update 가능
-- 새 페이지 할당 불필요
-- Bloat 감소 ✅
```

**예시:**

```
Fillfactor = 100 (기본):
Page: [T1][T2][T3][T4][T5][T6][T7][T8] (꽉 참)
UPDATE T1 → 새 페이지 할당 필요 ❌

Fillfactor = 70:
Page: [T1][T2][T3][T4][T5][__][__][__] (30% 여유)
UPDATE T1 → 같은 페이지에 새 버전 저장 (HOT Update) ✅
```

### 4. 파티셔닝

```sql
-- 날짜별 파티셔닝으로 VACUUM 부담 분산
CREATE TABLE orders (
    id BIGSERIAL,
    user_id INT,
    created_at DATE,
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2025_10 PARTITION OF orders
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE orders_2025_11 PARTITION OF orders
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- 효과:
-- - 오래된 파티션은 VACUUM 불필요 (Frozen)
-- - 최신 파티션만 VACUUM
-- - 전체 테이블 스캔 불필요
```

---

## 실전 예시

### 1. Bloat 모니터링 자동화

```sql
-- 모니터링 뷰 생성
CREATE OR REPLACE VIEW bloat_monitor AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    n_live_tup,
    n_dead_tup,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio,
    last_autovacuum,
    autovacuum_count
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000  -- 1000개 이상만
ORDER BY dead_ratio DESC;

-- 매일 확인
SELECT * FROM bloat_monitor;
```

**알림 스크립트 (cron):**

```bash
#!/bin/bash
# /etc/cron.daily/check_bloat.sh

THRESHOLD=30  # Dead Tuple 30% 이상 시 알림

psql -U postgres -d household_ledger -t -c "
SELECT tablename, dead_ratio
FROM bloat_monitor
WHERE dead_ratio > $THRESHOLD
" | while read table ratio; do
    echo "WARNING: Table $table has $ratio% dead tuples!" | mail -s "Bloat Alert" admin@example.com
done
```

### 2. 배치 작업 후 VACUUM

```python
# Python 예시
import psycopg2

conn = psycopg2.connect("dbname=household_ledger")
cur = conn.cursor()

try:
    # 대량 UPDATE 배치
    cur.execute("""
        UPDATE orders
        SET status = 'shipped'
        WHERE status = 'pending'
          AND created_at < NOW() - INTERVAL '7 days'
    """)
    conn.commit()

    # 즉시 VACUUM
    conn.autocommit = True  # VACUUM은 트랜잭션 밖에서 실행
    cur.execute("VACUUM ANALYZE orders")

    print(f"Updated {cur.rowcount} rows and vacuumed successfully")

except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    cur.close()
    conn.close()
```

### 3. Long-Running Transaction 방지

```sql
-- postgresql.conf
statement_timeout = 600000  -- 10분 (10분 이상 쿼리 자동 취소)
idle_in_transaction_session_timeout = 300000  -- 5분 (5분 이상 유휴 트랜잭션 종료)

-- 또는 애플리케이션에서
BEGIN;
SET LOCAL statement_timeout = '5min';
-- 작업 수행
COMMIT;
```

### 4. 야간 VACUUM 스케줄

```bash
# /etc/cron.d/vacuum_tables

# ��일 새벽 2시: 주요 테이블 VACUUM
0 2 * * * postgres psql -d household_ledger -c "VACUUM ANALYZE orders, accounts, transactions"

# 매주 일요일 새벽 3시: VACUUM FULL (서비스 중단 가능 시간)
0 3 * * 0 postgres psql -d household_ledger -c "VACUUM FULL orders"
```

---

## 요약

### MVCC의 핵심

1. **다중 버전**
   - UPDATE 시 기존 튜플 유지 + 새 버전 생성
   - 각 트랜잭션은 자신의 스냅샷에 맞는 버전 선택
   - Readers와 Writers가 서로 블로킹하지 않음

2. **트레이드오프**
   - ✅ 장점: 높은 동시성, 락 감소, 성능 향상
   - ❌ 단점: Dead Tuple 생성, 디스크 공간 증가, VACUUM 필요

3. **가시성 판단**
   - xmin/xmax + 트랜잭션 스냅샷
   - 각 트랜잭션은 일관된 데이터 뷰 보장 (ACID Isolation)

### VACUUM의 핵심

1. **3가지 역할**
   - Dead Tuple 제거 (Bloat 방지)
   - XID Wraparound 방지 (Tuple Freezing)
   - 통계 갱신 (쿼리 최적화)

2. **Autovacuum**
   - 자동으로 Dead Tuple 비율 모니터링
   - 임계값 초과 시 자동 실행
   - 비용 기반 지연으로 I/O 부담 조절

3. **Bloat 관리**
   - 정기적인 VACUUM (재사용 표시)
   - 극단적 상황: VACUUM FULL 또는 pg_repack
   - 예방: Fillfactor 조정, 파티셔닝, 테이블 분리

### 모범 사례

- ✅ Autovacuum 항상 활성화 (절대 끄지 말 것!)
- ✅ Bloat 정기 모니터링 (dead_ratio 확인)
- ✅ Long-Running Transaction 방지 (timeout 설정)
- ✅ 대량 작업 후 수동 VACUUM
- ✅ UPDATE 빈번한 테이블: Fillfactor 조정
- ✅ 대용량 테이블: 파티셔닝 고려
- ❌ VACUUM FULL은 신중히 사용 (서비스 중단)

### 참고 자료

- [PostgreSQL MVCC 공식 문서](https://www.postgresql.org/docs/current/mvcc.html)
- [Routine Vacuuming](https://www.postgresql.org/docs/current/routine-vacuuming.html)
- [Autovacuum 튜닝](https://www.postgresql.org/docs/current/runtime-config-autovacuum.html)

---

**작성일**: 2025-10-19
**대상 버전**: PostgreSQL 15+
