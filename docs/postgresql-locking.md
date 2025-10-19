# PostgreSQL의 Lock 메커니즘

## 목차
1. [Lock이란?](#lock이란)
2. [Lock의 필요성과 MVCC와의 관계](#lock의-필요성과-mvcc와의-관계)
3. [Lock 레벨](#lock-레벨)
4. [Row-Level Lock](#row-level-lock)
5. [Table-Level Lock](#table-level-lock)
6. [Advisory Lock](#advisory-lock)
7. [Deadlock (교착 상태)](#deadlock-교착-상태)
8. [Lock 모니터링](#lock-모니터링)
9. [Lock 최적화 전략](#lock-최적화-전략)
10. [실전 예시](#실전-예시)

---

## Lock이란?

### 정의

**Lock (잠금)**은 여러 트랜잭션이 동시에 같은 데이터를 수정할 때 데이터 일관성을 보장하기 위한 동기화 메커니즘입니다.

```
Lock의 핵심 목적:
"동시에 같은 데이터를 변경하려는 트랜잭션들을 순차적으로 실행되게 만든다"
```

### Lock의 기본 개념

```
시나리오: 두 사용자가 동시에 같은 계좌 잔액 변경

Lock 없음:
사용자 A: 읽음 (잔액 1000) → 계산 (1000 - 100 = 900) → 쓰기 (900)
사용자 B: 읽음 (잔액 1000) → 계산 (1000 - 200 = 800) → 쓰기 (800)

최종 결과: 800원 (❌ 잘못됨! 700원이어야 함)
→ Lost Update 문제 발생

Lock 있음:
사용자 A: Lock 획득 → 읽음 (1000) → 계산 (900) → 쓰기 (900) → Lock 해제
사용자 B: [A의 Lock 대기...] → Lock 획득 → 읽음 (900) → 계산 (700) → 쓰기 (700) → Lock 해제

최종 결과: 700원 ✅ (정확함!)
```

---

## Lock의 필요성과 MVCC와의 관계

### MVCC의 한계

PostgreSQL은 MVCC를 사용하여 **읽기는 Lock 없이** 처리하지만, **쓰기는 여전히 Lock이 필요**합니다.

```
MVCC가 해결하는 것:
✅ Reader vs Reader: Lock 불필요 (각자 스냅샷 사용)
✅ Reader vs Writer: Lock 불필요 (다중 버전으로 해결)

MVCC가 해결하지 못하는 것:
❌ Writer vs Writer: Lock 필요! (동시 수정 방지)
```

**예시: 동시 UPDATE**

```sql
-- 초기 상태: balance = 1000

-- 트랜잭션 A (XID=100)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- balance = 900
-- (아직 커밋 안 함)

-- 트랜잭션 B (XID=101, 동시 실행)
BEGIN;
UPDATE accounts SET balance = balance - 200 WHERE id = 1;
-- ← 여기서 대기! (A가 같은 행을 수정 중)

-- 트랜잭션 A
COMMIT;  -- Lock 해제

-- 트랜잭션 B
-- → 이제 실행 가능
-- → 최신 버전(900)을 읽어서 700으로 변경 ✅
COMMIT;
```

**Lock이 없다면:**

```sql
-- Lock 없는 상황 (가정)
트랜잭션 A: balance = 1000 - 100 = 900 → 새 튜플 (xmin=100, balance=900)
트랜잭션 B: balance = 1000 - 200 = 800 → 새 튜플 (xmin=101, balance=800)

최종 상태:
| balance | xmin | xmax | 상태 |
|---------|------|------|------|
| 1000    | 50   | 100  | 삭제 (A가 표시) |
| 1000    | 50   | 101  | 삭제 (B가 표시) ❌ 충돌! |
| 900     | 100  | NULL | A의 결과 |
| 800     | 101  | NULL | B의 결과 |

→ 두 결과가 모두 존재 (일관성 깨짐) ❌
```

### MVCC + Lock 조합

```
PostgreSQL의 전략:

읽기 (SELECT):
→ MVCC로 처리 (Lock 없음)
→ 각 트랜잭션은 자신의 스냅샷 사용
→ 높은 동시성 ✅

쓰기 (UPDATE/DELETE):
→ Row-Level Lock 사용
→ 같은 행을 동시 수정 불가
→ 대기 후 순차 실행
→ 일관성 보장 ✅

결과:
→ 읽기 성능 최대화 + 쓰기 안정성 보장
```

---

## Lock 레벨

PostgreSQL은 3가지 레벨의 Lock을 제공합니다:

```
1. Row-Level Lock (행 레벨)
   → 가장 세밀한 Lock
   → 다른 행은 영향 없음
   → 동시성 최대

2. Table-Level Lock (테이블 레벨)
   → 테이블 전체에 Lock
   → DDL, TRUNCATE 등에서 사용
   → 동시성 낮음

3. Advisory Lock (애플리케이션 레벨)
   → 개발자가 직접 제어
   → 분산 Lock 구현 가능
   → 유연함
```

### Lock 호환성 (Compatibility)

| 현재 Lock | 요청 Lock | 호환 여부 |
|-----------|-----------|-----------|
| Shared (S) | Shared (S) | ✅ 호환 (동시 읽기 가능) |
| Shared (S) | Exclusive (X) | ❌ 충돌 (대기) |
| Exclusive (X) | Shared (S) | ❌ 충돌 (대기) |
| Exclusive (X) | Exclusive (X) | ❌ 충돌 (대기) |

---

## Row-Level Lock

### 1. FOR UPDATE (Exclusive Lock)

**가장 강력한 행 레벨 Lock - 읽기와 쓰기 모두 차단**

```sql
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
```

**특징:**
- 선택된 행에 배타적 Lock
- 다른 트랜잭션의 `SELECT FOR UPDATE`, `UPDATE`, `DELETE` 차단
- 일반 `SELECT`는 허용 (MVCC로 처리)

**사용 사례: 좌석 예매**

```sql
BEGIN;

-- 좌석 상태 확인 및 Lock
SELECT seat_number, is_reserved
FROM seats
WHERE id = 100
FOR UPDATE;

-- 다른 트랜잭션은 여기서 대기 ⏳

-- 예약 가능 여부 확인
IF is_reserved = false THEN
    -- 예약 처리
    UPDATE seats SET is_reserved = true, user_id = :user_id WHERE id = 100;
    INSERT INTO bookings (seat_id, user_id) VALUES (100, :user_id);
    COMMIT;  -- Lock 해제
ELSE
    ROLLBACK;
END IF;
```

**내부 동작:**

```
1. SELECT ... FOR UPDATE 실행
   → 해당 행의 튜플 헤더에 Lock 정보 기록
   → pg_locks 시스템 뷰에 등록

2. 다른 트랜잭션이 같은 행에 UPDATE 시도
   → 튜플 헤더 확인
   → Lock 보유 트랜잭션(XID) 확인
   → 해당 트랜잭션이 완료될 때까지 대기

3. COMMIT 또는 ROLLBACK
   → Lock 해제
   → 대기 중인 트랜잭션 실행 재개
```

### 2. FOR NO KEY UPDATE

**약한 Exclusive Lock - Foreign Key 충돌 방지**

```sql
SELECT * FROM accounts WHERE id = 1 FOR NO KEY UPDATE;
```

**차이점:**
- Primary Key나 Unique Key를 변경하지 않을 때 사용
- Foreign Key를 참조하는 다른 테이블의 작업과 호환
- `FOR UPDATE`보다 동시성 높음

**예시:**

```sql
-- accounts 테이블
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    balance INT
);

-- orders 테이블 (accounts 참조)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(id)
);

-- 트랜잭션 A: balance만 변경 (id는 안 건드림)
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR NO KEY UPDATE;
UPDATE accounts SET balance = 1000 WHERE id = 1;

-- 트랜잭션 B: 동시에 주문 생성 가능! ✅
BEGIN;
INSERT INTO orders (account_id) VALUES (1);  -- 대기하지 않음
COMMIT;

-- 트랜잭션 A
COMMIT;
```

### 3. FOR SHARE (Shared Lock)

**공유 Lock - 동시 읽기 허용, 쓰기만 차단**

```sql
SELECT * FROM accounts WHERE id = 1 FOR SHARE;
```

**특징:**
- 여러 트랜잭션이 동시에 `FOR SHARE` Lock 획득 가능
- `UPDATE`, `DELETE` 차단 (대기)
- 일반 `SELECT`는 허용

**사용 사례: 집계 보고서**

```sql
-- 트랜잭션 A: 읽기 전용 보고서
BEGIN;
SELECT SUM(balance) FROM accounts WHERE user_id = 1 FOR SHARE;
-- → 다른 트랜잭션이 balance를 변경하지 못하게 Lock
-- → 일관된 집계값 보장

-- 트랜잭션 B: 동시에 같은 데이터를 읽기 가능 ✅
BEGIN;
SELECT SUM(balance) FROM accounts WHERE user_id = 1 FOR SHARE;
-- → A와 동시 실행 가능 (Shared Lock 호환)

-- 트랜잭션 C: 쓰기 시도
BEGIN;
UPDATE accounts SET balance = 1000 WHERE user_id = 1;
-- → A와 B가 완료될 때까지 대기 ⏳
```

### 4. FOR KEY SHARE

**가장 약한 Shared Lock - Foreign Key 참조용**

```sql
SELECT * FROM accounts WHERE id = 1 FOR KEY SHARE;
```

**특징:**
- Primary Key/Unique Key 변경만 차단
- 일반 컬럼 UPDATE 허용
- Foreign Key 참조 시 자동 사용

**예시:**

```sql
-- 트랜잭션 A
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR KEY SHARE;

-- 트랜잭션 B: balance 변경 가능 ✅
UPDATE accounts SET balance = 1000 WHERE id = 1;  -- 대기 없음

-- 트랜잭션 C: id 변경 시도 ❌
UPDATE accounts SET id = 999 WHERE id = 1;  -- 대기 필요
```

### 5. NOWAIT와 SKIP LOCKED

**Lock 대기 제어 옵션**

#### NOWAIT

```sql
-- Lock 획득 실패 시 즉시 에러
SELECT * FROM seats WHERE id = 100 FOR UPDATE NOWAIT;

-- Lock이 이미 걸려있으면:
ERROR: could not obtain lock on row in relation "seats"
```

**사용 사례: 빠른 실패 처리**

```python
# Python 예시
try:
    cursor.execute("SELECT * FROM seats WHERE id = %s FOR UPDATE NOWAIT", (seat_id,))
    seat = cursor.fetchone()
    # 예약 처리
    cursor.execute("UPDATE seats SET reserved = true WHERE id = %s", (seat_id,))
    conn.commit()
except psycopg2.OperationalError:
    # 이미 다른 사용자가 예약 중
    return {"error": "다른 사용자가 예약 진행 중입니다. 다른 좌석을 선택해주세요."}
```

#### SKIP LOCKED

```sql
-- Lock 걸린 행은 건너뛰고 다음 행 반환
SELECT * FROM tasks
WHERE status = 'pending'
ORDER BY priority DESC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

**사용 사례: 작업 큐 (Job Queue)**

```sql
-- Worker 1
BEGIN;
SELECT * FROM tasks
WHERE status = 'pending'
LIMIT 1
FOR UPDATE SKIP LOCKED;
-- 결과: Task ID 101 반환

UPDATE tasks SET status = 'processing' WHERE id = 101;
-- 작업 처리...
UPDATE tasks SET status = 'completed' WHERE id = 101;
COMMIT;

-- Worker 2 (동시 실행)
BEGIN;
SELECT * FROM tasks
WHERE status = 'pending'
LIMIT 1
FOR UPDATE SKIP LOCKED;
-- 결과: Task ID 102 반환 (101은 Worker 1이 Lock 중이므로 스킵)

-- → 두 Worker가 다른 작업을 동시에 처리 ✅
```

---

## Table-Level Lock

### Lock 모드 (강도 순)

PostgreSQL은 8가지 테이블 레벨 Lock 모드를 제공합니다:

| Lock 모드 | 설명 | 충돌 | 사용 예시 |
|-----------|------|------|-----------|
| **ACCESS SHARE** | SELECT | ACCESS EXCLUSIVE | `SELECT` |
| **ROW SHARE** | SELECT FOR UPDATE | EXCLUSIVE, ACCESS EXCLUSIVE | `SELECT FOR UPDATE` |
| **ROW EXCLUSIVE** | UPDATE, DELETE, INSERT | SHARE 이상 | `UPDATE`, `DELETE`, `INSERT` |
| **SHARE UPDATE EXCLUSIVE** | VACUUM, ANALYZE, INDEX | SHARE UPDATE EXCLUSIVE 이상 | `VACUUM`, `CREATE INDEX CONCURRENTLY` |
| **SHARE** | CREATE INDEX | ROW EXCLUSIVE 이상 | `CREATE INDEX` |
| **SHARE ROW EXCLUSIVE** | - | ROW EXCLUSIVE 이상 | 거의 사용 안 함 |
| **EXCLUSIVE** | - | ROW SHARE 이상 | `REFRESH MATERIALIZED VIEW` |
| **ACCESS EXCLUSIVE** | ALTER TABLE, DROP, TRUNCATE | 모든 Lock | `DROP TABLE`, `TRUNCATE`, `ALTER TABLE` |

### 1. ACCESS SHARE (가장 약함)

```sql
-- SELECT 실행 시 자동 획득
SELECT * FROM accounts;

-- 명시적 획득
LOCK TABLE accounts IN ACCESS SHARE MODE;
```

**특징:**
- 가장 약한 Lock
- `ACCESS EXCLUSIVE`하고만 충돌
- 대부분의 작업과 호환

### 2. ROW EXCLUSIVE

```sql
-- UPDATE, DELETE, INSERT 시 자동 획득
UPDATE accounts SET balance = 1000;

-- 명시적 획득
LOCK TABLE accounts IN ROW EXCLUSIVE MODE;
```

**특징:**
- 동시 SELECT, UPDATE, DELETE 허용
- CREATE INDEX 차단

### 3. SHARE

```sql
-- CREATE INDEX 시 자동 획득
CREATE INDEX idx_balance ON accounts(balance);

-- 명시적 획득
LOCK TABLE accounts IN SHARE MODE;
```

**특징:**
- 다른 트랜잭션의 UPDATE, DELETE, INSERT 차단
- SELECT는 허용
- 인덱스 생성 시 사용

**문제점:**

```sql
-- 트랜잭션 A
BEGIN;
CREATE INDEX idx_balance ON accounts(balance);
-- → SHARE Lock 획득
-- → 수 분~수 시간 소요 가능 (테이블 크기에 따라)

-- 트랜잭션 B (동시 실행)
INSERT INTO accounts (name, balance) VALUES ('홍길동', 1000);
-- → ROW EXCLUSIVE Lock 필요
-- → SHARE Lock과 충돌
-- → A의 인덱스 생성이 완료될 때까지 대기 ⏳❌
```

**해결책: CONCURRENTLY**

```sql
-- 온라인 인덱스 생성 (Lock 최소화)
CREATE INDEX CONCURRENTLY idx_balance ON accounts(balance);
-- → SHARE UPDATE EXCLUSIVE Lock만 사용
-- → INSERT, UPDATE, DELETE 허용 ✅
-- → 시간은 더 걸리지만 서비스 중단 없음
```

### 4. ACCESS EXCLUSIVE (가장 강함)

```sql
-- DDL 작업 시 자동 획득
ALTER TABLE accounts ADD COLUMN email VARCHAR(100);
DROP TABLE accounts;
TRUNCATE accounts;

-- 명시적 획득
LOCK TABLE accounts IN ACCESS EXCLUSIVE MODE;
```

**특징:**
- 가장 강력한 Lock
- 모든 Lock과 충돌
- SELECT조차 대기 필요
- DDL 작업 시 자동 사용

**주의사항:**

```sql
-- 운영 중인 서비스에서 매우 위험! ⚠️
BEGIN;
ALTER TABLE accounts ADD COLUMN email VARCHAR(100);
-- → ACCESS EXCLUSIVE Lock
-- → 모든 SELECT, UPDATE 차단
-- → 서비스 장애 발생 가능

-- 수 초~수 분 동안 Lock 유지
-- → 큐에 쌓인 모든 쿼리 대기
-- → Timeout 발생
-- → 사용자 불만 폭주
```

**안전한 DDL 방법:**

```sql
-- 1. Timeout 설정
SET lock_timeout = '2s';  -- 2초 안에 Lock 못 얻으면 실패

BEGIN;
ALTER TABLE accounts ADD COLUMN email VARCHAR(100);
-- Lock 대기 중 다른 쿼리 있으면 → 2초 후 에러
-- → 재시도 로직 구현
COMMIT;

-- 2. 트래픽 적은 시간대 (새벽)에 실행

-- 3. 점진적 마이그레이션
-- 새 컬럼을 NULL 허용으로 추가
ALTER TABLE accounts ADD COLUMN email VARCHAR(100) NULL;
-- → 빠름 (메타데이터만 변경)

-- 애플리케이션 배포 (새 컬럼 사용 시작)

-- 나중에 NOT NULL 추가
ALTER TABLE accounts ALTER COLUMN email SET NOT NULL;
```

---

## Advisory Lock

### 정의

**개발자가 직접 제어하는 사용자 정의 Lock**

```
테이블이나 행이 아닌, 임의의 숫자(ID)에 Lock을 거는 메커니즘
→ 분산 시스템, 배치 작업, 동시성 제어 등에 유용
```

### 함수

```sql
-- Exclusive Lock
SELECT pg_advisory_lock(12345);           -- 대기
SELECT pg_try_advisory_lock(12345);       -- 즉시 반환 (true/false)

-- Shared Lock
SELECT pg_advisory_lock_shared(12345);
SELECT pg_try_advisory_lock_shared(12345);

-- Lock 해제
SELECT pg_advisory_unlock(12345);
SELECT pg_advisory_unlock_shared(12345);

-- 세션 종료 시 자동 해제
SELECT pg_advisory_lock(12345);
-- (세션 종료) → 자동 unlock
```

### 사용 사례 1: 배치 작업 중복 실행 방지

```sql
-- 매일 실행되는 배치 스크립트
DO $$
BEGIN
    -- 배치 작업 ID = 999
    IF NOT pg_try_advisory_lock(999) THEN
        RAISE NOTICE '이미 다른 프로세스가 실행 중입니다.';
        RETURN;
    END IF;

    -- 배치 작업 실행
    RAISE NOTICE '배치 작업 시작...';
    -- ... 대량 데이터 처리 ...

    -- Lock 해제
    PERFORM pg_advisory_unlock(999);
    RAISE NOTICE '배치 작업 완료.';
END $$;
```

**시나리오:**

```
09:00 - Cron Job 1 시작
        → pg_try_advisory_lock(999) → TRUE ✅
        → 배치 작업 진행 중...

09:01 - Cron Job 2 시작 (중복 실행)
        → pg_try_advisory_lock(999) → FALSE ❌
        → 즉시 종료 (중복 방지 성공!)

09:10 - Cron Job 1 완료
        → pg_advisory_unlock(999)
```

### 사용 사례 2: 분산 Lock (리더 선출)

```python
# Python 예시: 여러 Worker 중 1개만 작업 수행

import psycopg2

def process_with_leader_election(worker_id):
    conn = psycopg2.connect("dbname=mydb")
    cursor = conn.cursor()

    # Leader Lock 획득 시도 (Lock ID = 777)
    cursor.execute("SELECT pg_try_advisory_lock(777)")
    is_leader = cursor.fetchone()[0]

    if is_leader:
        print(f"Worker {worker_id}: 리더로 선출됨! 작업 수행 중...")
        # 중요한 작업 수행 (예: 통계 계산, 캐시 갱신)
        time.sleep(10)
        cursor.execute("SELECT pg_advisory_unlock(777)")
        print(f"Worker {worker_id}: 작업 완료, 리더 해제")
    else:
        print(f"Worker {worker_id}: 팔로워, 대기 중...")

    cursor.close()
    conn.close()
```

**실행 결과:**

```
Worker 1: 리더로 선출됨! 작업 수행 중...
Worker 2: 팔로워, 대기 중...
Worker 3: 팔로워, 대기 중...
Worker 4: 팔로워, 대기 중...
Worker 1: 작업 완료, 리더 해제
```

### 사용 사례 3: 행 단위 커스텀 Lock

```sql
-- 사용자별 Lock (user_id를 Lock ID로 사용)
CREATE OR REPLACE FUNCTION process_user_exclusive(user_id INT)
RETURNS VOID AS $$
BEGIN
    -- 해당 사용자의 모든 작업을 직렬화
    PERFORM pg_advisory_lock(user_id);

    -- 사용자 데이터 처리 (충돌 없이 안전)
    UPDATE user_stats SET last_login = NOW() WHERE id = user_id;
    INSERT INTO user_logs (user_id, action) VALUES (user_id, 'login');

    PERFORM pg_advisory_unlock(user_id);
END;
$$ LANGUAGE plpgsql;

-- 사용
SELECT process_user_exclusive(123);  -- user_id=123에 대해서만 직렬화
SELECT process_user_exclusive(456);  -- 동시 실행 가능 (다른 user_id)
```

---

## Deadlock (교착 상태)

### 정의

**두 개 이상의 트랜잭션이 서로가 보유한 Lock을 기다리며 무한 대기하는 상황**

```
트랜잭션 A: 자원 1 보유 → 자원 2 대기
트랜잭션 B: 자원 2 보유 → 자원 1 대기

→ 서로 기다림 → 무한 대기 (Deadlock)
```

### Deadlock 발생 예시

#### 예시 1: 기본적인 Deadlock

```sql
-- 초기 상태
accounts 테이블:
| id | name   | balance |
|----|--------|---------|
| 1  | Alice  | 1000    |
| 2  | Bob    | 2000    |

-- 트랜잭션 A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 1번 행 Lock 획득 🔒
-- (일시 정지)

-- 트랜잭션 B (동시 실행)
BEGIN;
UPDATE accounts SET balance = balance - 200 WHERE id = 2;  -- 2번 행 Lock 획득 🔒
-- (일시 정지)

-- 트랜잭션 A 재개
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- 2번 Lock 필요 → B 대기 중 ⏳

-- 트랜잭션 B 재개
UPDATE accounts SET balance = balance + 200 WHERE id = 1;  -- 1번 Lock 필요 → A 대기 중 ⏳

-- Deadlock 발생! 💥
```

**Deadlock 다이어그램:**

```
트랜잭션 A               트랜잭션 B
    │                        │
    ├─ Lock Row 1 🔒         │
    │                        ├─ Lock Row 2 🔒
    │                        │
    ├─ Wait for Row 2 ⏳ ────┤
    │                        │
    │ ────── Wait for Row 1 ⏳
    │                        │
    └───── DEADLOCK! 💥 ─────┘
```

### PostgreSQL의 Deadlock 처리

**1. Deadlock 감지**

```
PostgreSQL은 1초마다 Deadlock 검사 수행:
- deadlock_timeout = 1s (기본값)
- Deadlock 감지 시 한 트랜잭션을 자동으로 ABORT
```

**2. Victim 선택**

```
PostgreSQL이 롤백할 트랜잭션 선택 기준:
1. 더 적은 작업을 수행한 트랜잭션 (롤백 비용 적음)
2. 더 적은 Lock을 보유한 트랜잭션
3. 더 나중에 시작한 트랜잭션
```

**3. 에러 메시지**

```sql
-- 트랜잭션 A (희생양으로 선택됨)
ERROR: deadlock detected
DETAIL: Process 1234 waits for ShareLock on transaction 5678;
        blocked by process 5679.
        Process 5679 waits for ShareLock on transaction 1234;
        blocked by process 1234.
HINT: See server log for query details.
CONTEXT: while updating tuple (0,1) in relation "accounts"

-- 트랜잭션 B
-- 정상 진행 (A가 롤백되어 Lock 해제됨)
UPDATE accounts SET balance = balance + 200 WHERE id = 1;  -- 성공 ✅
COMMIT;
```

### Deadlock 발생 원인

#### 원인 1: Lock 순서 불일치

```sql
-- 트랜잭션 A: 1 → 2 순서
UPDATE accounts SET ... WHERE id = 1;
UPDATE accounts SET ... WHERE id = 2;

-- 트랜잭션 B: 2 → 1 순서 (역순!)
UPDATE accounts SET ... WHERE id = 2;
UPDATE accounts SET ... WHERE id = 1;

→ Deadlock 발생 가능성 높음 ❌
```

#### 원인 2: 복잡한 쿼리

```sql
-- 트랜잭션 A
UPDATE orders SET status = 'shipped'
WHERE user_id IN (
    SELECT id FROM users WHERE country = 'KR'
);
-- → 수천 개 행 Lock

-- 트랜잭션 B
UPDATE orders SET status = 'cancelled'
WHERE user_id IN (
    SELECT id FROM users WHERE country = 'US'
);
-- → 수천 개 행 Lock

-- 두 쿼리가 일부 행을 다른 순서로 Lock → Deadlock 가능
```

#### 원인 3: 인덱스 부재

```sql
-- orders 테이블: user_id에 인덱스 없음

-- 트랜잭션 A
UPDATE orders SET amount = 100 WHERE user_id = 1;
-- → Full Table Scan
-- → 모든 행에 Lock 시도 (순차적)

-- 트랜잭션 B
UPDATE orders SET amount = 200 WHERE user_id = 1000;
-- → Full Table Scan
-- → 모든 행에 Lock 시도 (순차적)

-- 두 트랜잭션이 행을 다른 순서로 스캔 → Deadlock 가능

-- 해결: 인덱스 생성
CREATE INDEX idx_user_id ON orders(user_id);
-- → 필요한 행만 직접 Lock → Deadlock 확률 감소
```

### Deadlock 방지 전략

#### 전략 1: Lock 순서 통일

```sql
-- ❌ 나쁜 예
UPDATE accounts SET balance = balance - 100
WHERE id IN (SELECT unnest(ARRAY[5, 3, 1, 4, 2]));
-- → 5, 3, 1, 4, 2 순서로 Lock

-- ✅ 좋은 예
UPDATE accounts SET balance = balance - 100
WHERE id IN (SELECT unnest(ARRAY[5, 3, 1, 4, 2]) ORDER BY 1);
-- → 1, 2, 3, 4, 5 순서로 Lock (정렬됨)
```

**함수로 구현:**

```sql
CREATE OR REPLACE FUNCTION transfer_batch(account_ids INT[])
RETURNS VOID AS $$
DECLARE
    sorted_ids INT[];
BEGIN
    -- 항상 ID 순서로 정렬
    sorted_ids := ARRAY(SELECT unnest(account_ids) ORDER BY 1);

    -- 정렬된 순서로 처리
    FOR i IN 1..array_length(sorted_ids, 1) LOOP
        UPDATE accounts
        SET balance = balance - 100
        WHERE id = sorted_ids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

#### 전략 2: 트랜잭션 크기 최소화

```sql
-- ❌ 나쁜 예: 긴 트랜잭션
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- 복잡한 비즈니스 로직 (10초 소요)
-- 외부 API 호출 (5초 소요)
-- ...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- → 15초 동안 Lock 보유 → Deadlock 위험 증가

-- ✅ 좋은 예: 짧은 트랜잭션
-- 1. 외부 API 호출 (트랜잭션 밖에서)
result = call_external_api()

-- 2. 짧은 트랜잭션
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- → 0.1초 동안 Lock 보유 → Deadlock 위험 감소
```

#### 전략 3: Lock Timeout 설정

```sql
-- 세션 레벨
SET lock_timeout = '5s';  -- 5초 안에 Lock 못 얻으면 에러

-- 트랜잭션 레벨
BEGIN;
SET LOCAL lock_timeout = '3s';
UPDATE accounts SET balance = 1000 WHERE id = 1;
-- 3초 대기 후 Lock 못 얻으면:
-- ERROR: canceling statement due to lock timeout
COMMIT;
```

**애플리케이션 재시도 로직:**

```python
import psycopg2
import time

def update_with_retry(account_id, new_balance, max_retries=3):
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect("dbname=mydb")
            cursor = conn.cursor()

            cursor.execute("SET lock_timeout = '2s'")
            cursor.execute(
                "UPDATE accounts SET balance = %s WHERE id = %s",
                (new_balance, account_id)
            )
            conn.commit()

            print(f"성공! (시도 {attempt + 1}회)")
            return True

        except psycopg2.OperationalError as e:
            if "lock timeout" in str(e) or "deadlock" in str(e):
                print(f"Lock 실패, 재시도 중... ({attempt + 1}/{max_retries})")
                time.sleep(0.5 * (attempt + 1))  # Exponential backoff
                continue
            else:
                raise

        finally:
            cursor.close()
            conn.close()

    print("최대 재시도 횟수 초과")
    return False
```

#### 전략 4: Optimistic Locking (낙관적 Lock)

```sql
-- version 컬럼 추가
ALTER TABLE accounts ADD COLUMN version INT DEFAULT 0;

-- 애플리케이션 로직
BEGIN;

-- 1. 현재 버전 읽기
SELECT balance, version FROM accounts WHERE id = 1;
-- 결과: balance=1000, version=5

-- 2. 업데이트 (버전 체크)
UPDATE accounts
SET balance = 900, version = version + 1
WHERE id = 1 AND version = 5;

-- 3. affected rows 확인
IF (row_count = 0) THEN
    -- 다른 트랜잭션이 먼저 수정함
    ROLLBACK;
    RAISE EXCEPTION '데이터가 변경되었습니다. 다시 시도해주세요.';
ELSE
    COMMIT;
END IF;
```

**장점:**
- Deadlock 발생하지 않음 (Lock을 거의 안 씀)
- 충돌 시 재시도 (사용자 경험)

**단점:**
- 충돌 빈도가 높으면 비효율적

---

## Lock 모니터링

### 1. 현재 Lock 상태 확인

```sql
-- pg_locks 시스템 뷰
SELECT
    locktype,           -- Lock 타입 (relation, tuple, transactionid 등)
    relation::regclass, -- 테이블 이름
    mode,               -- Lock 모드 (AccessShareLock, RowExclusiveLock 등)
    granted,            -- Lock 획득 여부 (true/false)
    pid,                -- 프로세스 ID
    page,               -- 페이지 번호
    tuple               -- 튜플 번호
FROM pg_locks
WHERE NOT granted;  -- 대기 중인 Lock만
```

**출력 예시:**

```
 locktype | relation | mode             | granted | pid
----------|----------|------------------|---------|------
 tuple    | accounts | ExclusiveLock    | false   | 1234
 relation | accounts | RowExclusiveLock | true    | 5678
```

### 2. Lock 대기 중인 쿼리 확인

```sql
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement,
    blocked_activity.application_name AS blocked_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**출력 예시:**

```
 blocked_pid | blocked_user | blocking_pid | blocking_user | blocked_statement          | blocking_statement
-------------|--------------|--------------|---------------|----------------------------|--------------------
 1234        | user1        | 5678         | user2         | UPDATE accounts SET ...    | UPDATE accounts SET ...
```

### 3. Deadlock 로그 확인

```sql
-- postgresql.conf
log_lock_waits = on             -- Lock 대기 로그 기록
deadlock_timeout = 1s           -- Deadlock 감지 시간
log_min_duration_statement = 0  -- 모든 쿼리 로그 (디버그용)
```

**로그 예시:**

```
2025-10-19 14:30:00 KST [1234] LOG: process 1234 still waiting for ShareLock on transaction 5678 after 1000.123 ms
2025-10-19 14:30:01 KST [1234] STATEMENT: UPDATE accounts SET balance = 900 WHERE id = 1
2025-10-19 14:30:02 KST [1234] ERROR: deadlock detected
2025-10-19 14:30:02 KST [1234] DETAIL: Process 1234 waits for ShareLock on transaction 5678; blocked by process 5679.
        Process 5679 waits for ShareLock on transaction 1234; blocked by process 1234.
2025-10-19 14:30:02 KST [1234] HINT: See server log for query details.
```

### 4. Lock 대기 시간 모니터링

```sql
SELECT
    pid,
    usename,
    application_name,
    state,
    wait_event_type,
    wait_event,
    state_change,
    now() - state_change AS wait_duration,
    query
FROM pg_stat_activity
WHERE wait_event_type = 'Lock'
ORDER BY wait_duration DESC;
```

### 5. 유용한 모니터링 뷰 생성

```sql
CREATE OR REPLACE VIEW lock_monitor AS
SELECT
    l.pid,
    a.usename,
    a.application_name,
    l.locktype,
    l.relation::regclass AS table_name,
    l.mode,
    l.granted,
    a.query,
    now() - a.query_start AS query_duration
FROM pg_locks l
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.pid != pg_backend_pid()  -- 현재 세션 제외
ORDER BY granted, query_duration DESC;

-- 사용
SELECT * FROM lock_monitor;
```

---

## Lock 최적화 전략

### 1. 인덱스 최적화

```sql
-- ❌ 인덱스 없음 → Full Table Scan → 많은 행 Lock
UPDATE orders SET status = 'shipped' WHERE user_id = 123;

-- ✅ 인덱스 있음 → Index Scan → 필요한 행만 Lock
CREATE INDEX idx_user_id ON orders(user_id);
```

### 2. 배치 처리 최적화

```sql
-- ❌ 큰 트랜잭션
BEGIN;
UPDATE orders SET status = 'archived' WHERE created_at < '2020-01-01';  -- 100만 행
COMMIT;
-- → 오랜 시간 Lock → Deadlock 위험

-- ✅ 작은 배치로 분할
DO $$
DECLARE
    batch_size INT := 1000;
    updated_count INT;
BEGIN
    LOOP
        UPDATE orders
        SET status = 'archived'
        WHERE id IN (
            SELECT id FROM orders
            WHERE created_at < '2020-01-01'
            AND status != 'archived'
            LIMIT batch_size
        );

        GET DIAGNOSTICS updated_count = ROW_COUNT;
        EXIT WHEN updated_count = 0;

        COMMIT;  -- 배치마다 커밋
        PERFORM pg_sleep(0.1);  -- 100ms 대기 (다른 트랜잭션에 양보)
    END LOOP;
END $$;
```

### 3. SELECT FOR UPDATE 범위 최소화

```sql
-- ❌ 전체 테이블 Lock
SELECT * FROM accounts FOR UPDATE;

-- ✅ 필요한 행만 Lock
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
```

### 4. DDL 작업 최적화

```sql
-- ❌ 운영 중 위험한 DDL
ALTER TABLE accounts ADD COLUMN email VARCHAR(100) NOT NULL DEFAULT '';
-- → ACCESS EXCLUSIVE Lock
-- → 서비스 중단

-- ✅ 안전한 DDL (단계적 적용)
-- Step 1: NULL 허용 컬럼 추가 (빠름)
ALTER TABLE accounts ADD COLUMN email VARCHAR(100) NULL;

-- Step 2: 애플리케이션 배포 (email 사용 시작)

-- Step 3: 기존 데이터 배치 업데이트
UPDATE accounts SET email = '' WHERE email IS NULL;

-- Step 4: NOT NULL 제약 추가
ALTER TABLE accounts ALTER COLUMN email SET NOT NULL;
```

---

## 실전 예시

### 예시 1: 재고 차감 (동시성 제어)

```sql
CREATE OR REPLACE FUNCTION decrease_stock(product_id INT, quantity INT)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock INT;
BEGIN
    -- 비관적 Lock: SELECT FOR UPDATE
    SELECT stock INTO current_stock
    FROM products
    WHERE id = product_id
    FOR UPDATE;

    -- 재고 확인
    IF current_stock < quantity THEN
        RAISE EXCEPTION '재고 부족: 현재 %, 요청 %', current_stock, quantity;
    END IF;

    -- 재고 차감
    UPDATE products
    SET stock = stock - quantity
    WHERE id = product_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 사용
BEGIN;
SELECT decrease_stock(100, 5);  -- 상품 100의 재고 5개 차감
-- 다른 작업...
COMMIT;
```

### 예시 2: 작업 큐 (Job Queue)

```sql
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    payload JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Worker 프로세스
CREATE OR REPLACE FUNCTION fetch_next_job()
RETURNS TABLE(job_id INT, payload JSONB) AS $$
BEGIN
    RETURN QUERY
    UPDATE jobs
    SET status = 'processing'
    WHERE id = (
        SELECT id FROM jobs
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED  -- 다른 Worker가 처리 중인 작업 스킵
    )
    RETURNING id, jobs.payload;
END;
$$ LANGUAGE plpgsql;

-- Python Worker
import psycopg2

def worker():
    conn = psycopg2.connect("dbname=mydb")
    cursor = conn.cursor()

    while True:
        cursor.execute("SELECT * FROM fetch_next_job()")
        job = cursor.fetchone()

        if not job:
            time.sleep(1)
            continue

        job_id, payload = job
        try:
            # 작업 처리
            process_job(payload)

            # 완료 표시
            cursor.execute("UPDATE jobs SET status = 'completed' WHERE id = %s", (job_id,))
            conn.commit()
        except Exception as e:
            # 실패 표시
            cursor.execute("UPDATE jobs SET status = 'failed' WHERE id = %s", (job_id,))
            conn.commit()
```

### 예시 3: Deadlock 회피 (계좌 이체)

```sql
CREATE OR REPLACE FUNCTION transfer_safe(
    from_account_id INT,
    to_account_id INT,
    amount DECIMAL
) RETURNS VOID AS $$
DECLARE
    first_id INT;
    second_id INT;
BEGIN
    -- Lock 순서 통일 (항상 작은 ID 먼저)
    IF from_account_id < to_account_id THEN
        first_id := from_account_id;
        second_id := to_account_id;
    ELSE
        first_id := to_account_id;
        second_id := from_account_id;
    END IF;

    -- 정렬된 순서로 Lock 획득
    PERFORM * FROM accounts WHERE id = first_id FOR UPDATE;
    PERFORM * FROM accounts WHERE id = second_id FOR UPDATE;

    -- 출금
    UPDATE accounts
    SET balance = balance - amount
    WHERE id = from_account_id
    AND balance >= amount;

    IF NOT FOUND THEN
        RAISE EXCEPTION '잔액 부족';
    END IF;

    -- 입금
    UPDATE accounts
    SET balance = balance + amount
    WHERE id = to_account_id;
END;
$$ LANGUAGE plpgsql;

-- 사용 (Deadlock 발생하지 않음)
BEGIN;
SELECT transfer_safe(1, 2, 100);  -- 항상 1 → 2 순서로 Lock
COMMIT;

BEGIN;
SELECT transfer_safe(2, 1, 50);   -- 항상 1 → 2 순서로 Lock (역순 아님!)
COMMIT;
```

---

## 요약

### Lock의 핵심 원리

1. **MVCC + Lock 조합**
   - 읽기: MVCC (Lock 없음)
   - 쓰기: Row-Level Lock (동시 수정 방지)
   - 높은 동시성 + 데이터 일관성 보장

2. **Lock 레벨**
   - Row-Level: 행 단위, 세밀한 제어
   - Table-Level: 테이블 단위, DDL 작업
   - Advisory: 사용자 정의, 분산 Lock

3. **Deadlock**
   - 두 트랜잭션이 서로의 Lock 대기
   - PostgreSQL이 1초 후 자동 감지
   - 한 트랜잭션 자동 롤백 (Victim)

### Row-Level Lock 요약

| Lock 타입 | 강도 | 차단 대상 | 사용 예시 |
|-----------|------|-----------|-----------|
| FOR UPDATE | 강함 | UPDATE, DELETE, FOR UPDATE | 좌석 예매 |
| FOR NO KEY UPDATE | 중간 | UPDATE, DELETE (PK 변경은 FK 허용) | balance 변경 |
| FOR SHARE | 약함 | UPDATE, DELETE | 보고서 생성 |
| FOR KEY SHARE | 가장 약함 | PK/UK 변경만 차단 | FK 참조 |

### Deadlock 방지 체크리스트

- ✅ Lock 순서 통일 (ID 정렬)
- ✅ 트랜잭션 최소화 (짧게 유지)
- ✅ 인덱스 생성 (Full Scan 방지)
- ✅ Lock Timeout 설정
- ✅ 재시도 로직 구현
- ✅ 배치 처리 분할
- ✅ 모니터링 뷰 활용

### 참고 자료

- [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Lock Monitoring](https://www.postgresql.org/docs/current/view-pg-locks.html)
- [Deadlock Detection](https://www.postgresql.org/docs/current/runtime-config-locks.html)

---

**작성일**: 2025-10-19
**대상 버전**: PostgreSQL 15+
