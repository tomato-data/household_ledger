# ACID 속성: 데이터베이스 트랜잭션의 4가지 핵심 원칙

## 목차
1. [ACID란?](#acid란)
2. [Atomicity (원자성)](#atomicity-원자성)
3. [Consistency (일관성)](#consistency-일관성)
4. [Isolation (격리성)](#isolation-격리성)
5. [Durability (내구성)](#durability-내구성)
6. [ACID 구현 메커니즘](#acid-구현-메커니즘)
7. [PostgreSQL의 ACID 구현](#postgresql의-acid-구현)
8. [실전 예시](#실전-예시)
9. [BASE vs ACID](#base-vs-acid)

---

## ACID란?

**ACID**는 데이터베이스 트랜잭션이 안전하게 수행되기 위해 반드시 보장되어야 하는 4가지 핵심 속성입니다.

```
A - Atomicity (원자성)
C - Consistency (일관성)
I - Isolation (격리성)
D - Durability (내구성)
```

### 왜 ACID가 중요한가?

ACID가 없으면:
- ❌ 은행 이체 중 전원이 나가면 돈이 사라질 수 있음
- ❌ 동시에 좌석을 예약하면 중복 예약이 발생할 수 있음
- ❌ 재고가 음수가 될 수 있음
- ❌ 저장한 데이터가 갑자기 사라질 수 있음

ACID가 있으면:
- ✅ 모든 작업이 완전히 성공하거나 완전히 실패함
- ✅ 데이터베이스의 규칙이 항상 지켜짐
- ✅ 여러 사용자가 동시에 사용해도 안전함
- ✅ 커밋된 데이터는 절대 사라지지 않음

---

## Atomicity (원자성)

### 정의

**"All or Nothing"** - 트랜잭션의 모든 작업이 완전히 성공하거나, 하나라도 실패하면 전부 취소됨

```
원자(Atom): 더 이상 쪼갤 수 없는 최소 단위
→ 트랜잭션도 쪼개질 수 없는 하나의 단위
```

### 예시: 은행 계좌 이체

**시나리오:**
- A 계좌에서 100만원을 출금하여
- B 계좌에 100만원을 입금

```sql
BEGIN;
UPDATE accounts SET balance = balance - 1000000 WHERE id = 'A';  -- 출금
UPDATE accounts SET balance = balance + 1000000 WHERE id = 'B';  -- 입금
COMMIT;
```

**Atomicity 보장:**

| 상황 | Atomicity 없음 | Atomicity 있음 |
|------|----------------|----------------|
| 정상 완료 | A -100만원, B +100만원 ✅ | A -100만원, B +100만원 ✅ |
| 출금 후 전원 차단 | A -100만원, B 그대로 ❌ (돈 사라짐!) | A 그대로, B 그대로 ✅ (롤백됨) |
| 입금 계좌 없음 | A -100만원, 에러 ❌ (돈 사라짐!) | A 그대로 ✅ (전체 롤백) |

### 구현 메커니즘

**1. 트랜잭션 로그 (Transaction Log)**

```
BEGIN 시점의 데이터 상태 기록
→ 중간 과정 모두 기록
→ ROLLBACK 시 BEGIN 시점으로 복구
```

**2. 2단계 커밋 (Two-Phase Commit)**

```
Phase 1: 준비 (Prepare)
- 모든 작업이 성공 가능한지 확인
- REDO/UNDO 로그 기록

Phase 2: 커밋 (Commit)
- 모두 성공 가능하면 COMMIT
- 하나라도 실패하면 ROLLBACK
```

### PostgreSQL의 Atomicity 구현

```sql
-- 예시: 재고 차감 + 주문 생성
BEGIN;

-- 1. 재고 확인 및 차감
UPDATE products SET stock = stock - 1 WHERE id = 100;

-- 2. 재고가 부족하면 에러 (CHECK 제약)
-- ERROR: new row for relation "products" violates check constraint "stock_non_negative"

-- 3. 자동 ROLLBACK
-- PostgreSQL이 자동으로 BEGIN 전 상태로 복구
```

**내부 동작:**

```
1. BEGIN 실행
   → XID (트랜잭션 ID) 할당
   → 스냅샷 생성 (현재 데이터 상태 기록)

2. UPDATE 실행
   → 기존 튜플에 xmax = XID 기록 (삭제 표시)
   → 새 튜플 생성, xmin = XID (생성 표시)
   → WAL에 변경사항 기록

3. 에러 발생
   → 트랜잭션 상태를 ABORTED로 변경
   → xmin = XID인 모든 튜플 무효화
   → 기존 튜플 복구 (xmax 무효화)

4. 결과
   → 데이터는 BEGIN 이전 상태 그대로
```

---

## Consistency (일관성)

### 정의

**"데이터베이스는 항상 일관된 상태를 유지해야 한다"** - 트랜잭션 전후에 데이터베이스의 모든 규칙이 지켜짐

### 일관성 규칙 (Consistency Rules)

1. **무결성 제약 조건 (Integrity Constraints)**
   - Primary Key: 중복/NULL 금지
   - Foreign Key: 참조 무결성
   - Unique: 중복 금지
   - Not Null: NULL 금지
   - Check: 조건 만족

2. **도메인 규칙**
   - 나이는 0 이상
   - 잔액은 음수 불가
   - 이메일은 올바른 형식

3. **비즈니스 규칙**
   - 재고는 주문량보다 많아야 함
   - 예약은 중복될 수 없음
   - 계좌 잔액 합계는 항상 일정

### 예시: 재고 관리

**스키마 정의:**

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    stock INT NOT NULL,
    CONSTRAINT stock_non_negative CHECK (stock >= 0)  -- 일관성 규칙!
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),  -- 참조 무결성!
    CONSTRAINT quantity_positive CHECK (quantity > 0)  -- 일관성 규칙!
);
```

**일관성 위반 시도:**

```sql
-- 시나리오 1: 재고를 음수로 만들려고 시도
BEGIN;
UPDATE products SET stock = -10 WHERE id = 1;
-- ERROR: new row violates check constraint "stock_non_negative"
ROLLBACK;  -- 자동 롤백됨

-- 시나리오 2: 없는 상품 주문 시도
BEGIN;
INSERT INTO orders (product_id, quantity) VALUES (9999, 5);
-- ERROR: insert or update on table "orders" violates foreign key constraint
ROLLBACK;

-- 시나리오 3: 재고보다 많이 주문
BEGIN;
-- 현재 재고: 3개
UPDATE products SET stock = stock - 5 WHERE id = 1;
-- ERROR: new row violates check constraint "stock_non_negative"
ROLLBACK;
```

### PostgreSQL의 Consistency 구현

**1. 제약 조건 검사 시점**

```sql
-- 즉시 검사 (기본값)
ALTER TABLE products ADD CONSTRAINT stock_check CHECK (stock >= 0);

-- 트랜잭션 끝에 검사 (지연 검사)
ALTER TABLE products
ADD CONSTRAINT stock_check
CHECK (stock >= 0) DEFERRABLE INITIALLY DEFERRED;
```

**지연 검사 사용 예시:**

```sql
BEGIN;

-- 상품 A와 B의 재고를 교환하려고 함
UPDATE products SET stock = 0 WHERE id = 'A';  -- 일시적으로 규칙 위반
UPDATE products SET stock = 100 WHERE id = 'B';

-- 즉시 검사: 첫 번째 UPDATE에서 실패 ❌
-- 지연 검사: COMMIT 시점에 검사하여 성공 ✅

COMMIT;  -- 이 시점에 모든 제약 조건 검사
```

**2. 트리거를 이용한 복잡한 일관성 규칙**

```sql
-- 주문 시 재고 자동 차감 + 재고 부족 검증
CREATE OR REPLACE FUNCTION check_and_reduce_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- 재고 확인
    IF (SELECT stock FROM products WHERE id = NEW.product_id) < NEW.quantity THEN
        RAISE EXCEPTION '재고가 부족합니다';
    END IF;

    -- 재고 차감
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_stock_trigger
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION check_and_reduce_stock();
```

---

## Isolation (격리성)

### 정의

**"동시에 실행되는 트랜잭션들이 서로 영향을 주지 않아야 한다"** - 마치 순차적으로 실행되는 것처럼 동작

### 격리 수준이 필요한 이유

**동시성 문제 예시:**

```
상황: 영화 좌석 예약 시스템, 남은 좌석 1개

시간 | 사용자 A                          | 사용자 B
-----|-----------------------------------|-----------------------------------
10:00| SELECT seats WHERE id=1;         |
     | (남은 좌석: 1개 확인)             |
10:01|                                   | SELECT seats WHERE id=1;
     |                                   | (남은 좌��: 1개 확인)
10:02| UPDATE seats SET reserved=true;  |
     | COMMIT; (예약 성공!)              |
10:03|                                   | UPDATE seats SET reserved=true;
     |                                   | COMMIT; (예약 성공!)
-----|-----------------------------------|-----------------------------------
결과: 1개 좌석에 2명 예약됨! ❌ (중복 예약 문제)
```

### 격리 수준 (Isolation Level)

PostgreSQL은 4가지 격리 수준을 제공합니다:

| 격리 수준 | Dirty Read | Non-Repeatable Read | Phantom Read | 설명 |
|-----------|------------|---------------------|--------------|------|
| **Read Uncommitted** | 가능 | 가능 | 가능 | 커밋 안 된 데이터도 읽음 (PostgreSQL 미지원) |
| **Read Committed** | 불가능 | 가능 | 가능 | 커밋된 데이터만 읽음 (기본값) |
| **Repeatable Read** | 불가능 | 불가능 | 불가능 (PG) | 트랜잭션 내 같은 쿼리 결과 동일 |
| **Serializable** | 불가능 | 불가능 | 불가능 | 완전한 직렬화, 가장 엄격 |

### 동시성 이상 현상 (Concurrency Anomalies)

#### 1. Dirty Read (더티 리드)

**"커밋되지 않은 데이터를 읽는 현상"**

```
시간 | 트랜잭션 A                        | 트랜잭션 B
-----|-----------------------------------|-----------------------------------
T1   | BEGIN;                            |
T2   | UPDATE accounts                   |
     | SET balance = 1000 WHERE id=1;   |
T3   |                                   | BEGIN;
T4   |                                   | SELECT balance FROM accounts WHERE id=1;
     |                                   | (1000 읽음 - 아직 커밋 안 됨!)
T5   | ROLLBACK; (실제로는 500이었음!)   |
T6   |                                   | -- 잘못된 데이터(1000)로 작업 진행 ❌
```

**PostgreSQL**: Read Uncommitted를 지원하지 않아 Dirty Read 발생 안 함 ✅

#### 2. Non-Repeatable Read (반복 불가능 읽기)

**"같은 쿼리를 두 번 실행했을 때 결과가 다른 현상"**

```
시간 | 트랜잭션 A (Read Committed)       | 트랜잭션 B
-----|-----------------------------------|-----------------------------------
T1   | BEGIN;                            |
T2   | SELECT balance FROM accounts      |
     | WHERE id=1;                       |
     | (결과: 500)                       |
T3   |                                   | BEGIN;
     |                                   | UPDATE accounts SET balance=1000 WHERE id=1;
     |                                   | COMMIT;
T4   | SELECT balance FROM accounts      |
     | WHERE id=1;                       |
     | (결과: 1000) ← 다른 결과! ❌      |
```

**해결책**: Repeatable Read 이상 사용

```sql
-- 트랜잭션 A
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id=1;  -- 500
-- (트랜잭션 B가 1000으로 변경해도)
SELECT balance FROM accounts WHERE id=1;  -- 여전히 500 ✅
COMMIT;
```

#### 3. Phantom Read (팬텀 리드)

**"범위 쿼리 시 이전에 없던 행이 나타나는 현상"**

```
시간 | 트랜잭션 A                        | 트랜잭션 B
-----|-----------------------------------|-----------------------------------
T1   | BEGIN;                            |
T2   | SELECT COUNT(*) FROM orders       |
     | WHERE user_id=1;                  |
     | (결과: 5개)                       |
T3   |                                   | BEGIN;
     |                                   | INSERT INTO orders (user_id, ...) VALUES (1, ...);
     |                                   | COMMIT;
T4   | SELECT COUNT(*) FROM orders       |
     | WHERE user_id=1;                  |
     | (결과: 6개) ← 유령 행 출현! ❌    |
```

**해결책**: Serializable 사용 (또는 PostgreSQL의 Repeatable Read도 방지함)

### PostgreSQL의 격리 구현: MVCC

**MVCC (Multi-Version Concurrency Control)** - 다중 버전 동시성 제어

```
핵심 아이디어:
"데이터를 수정할 때 기존 데이터를 덮어쓰지 않고,
새로운 버전을 만든다"
```

**예시: 계좌 잔액 변경**

```sql
-- 초기 상태
accounts 테이블:
| id | balance | xmin  | xmax  |
|----|---------|-------|-------|
| 1  | 500     | 100   | NULL  |  ← 현재 유효한 버전

-- 트랜잭션 200: UPDATE accounts SET balance=1000 WHERE id=1;
COMMIT;

-- 상태 변화
| id | balance | xmin  | xmax  | 상태 |
|----|---------|-------|-------|------|
| 1  | 500     | 100   | 200   | 과거 버전 (xmax=200으로 삭제 표시)
| 1  | 1000    | 200   | NULL  | 현재 버전 (xmin=200으로 생성)
```

**동시 트랜잭션 처리:**

```
트랜잭션 A (XID=300, Repeatable Read):
- 시작 시점 스냅샷: XID 200까지 커밋된 데이터만 보임
- SELECT balance FROM accounts WHERE id=1;
  → xmin <= 200이고 xmax > 200인 튜플 선택
  → balance = 500 반환 ✅

트랜잭션 B (XID=301, Read Committed):
- 매 쿼리마다 최신 커밋 데이터 보임
- SELECT balance FROM accounts WHERE id=1;
  → xmin <= 301이고 xmax = NULL인 튜플 선택
  → balance = 1000 반환 ✅

→ 같은 시간, 같은 행을 읽어도 서로 다른 버전을 본다!
→ 락(Lock) 없이 동시성 보장!
```

### 실전 예시: 좌석 예매 시스템

**문제: 동시 예약 방지**

```sql
-- ❌ 잘못된 방법 (경쟁 상태 발생)
BEGIN;
SELECT is_reserved FROM seats WHERE id = 1;
-- (is_reserved = false 확인)
UPDATE seats SET is_reserved = true WHERE id = 1;
COMMIT;
-- 문제: SELECT와 UPDATE 사이에 다른 트랜잭션이 끼어들 수 있음!
```

**✅ 올바른 방법 1: SELECT FOR UPDATE (비관적 락)**

```sql
BEGIN;
SELECT is_reserved FROM seats WHERE id = 1 FOR UPDATE;
-- ← 이 행에 락을 걸어서 다른 트랜잭션이 대기하게 만듦
IF is_reserved = false THEN
    UPDATE seats SET is_reserved = true WHERE id = 1;
    COMMIT;
ELSE
    ROLLBACK;
END IF;
```

**✅ 올바른 방법 2: Serializable (낙관적 락)**

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT is_reserved FROM seats WHERE id = 1;
UPDATE seats SET is_reserved = true WHERE id = 1;
COMMIT;
-- 충돌 시 PostgreSQL이 자동으로 ROLLBACK하고 에러 발생:
-- ERROR: could not serialize access due to concurrent update
-- → 애플리케이션에서 재시도 로직 구현
```

**✅ 올바른 방법 3: 조건부 UPDATE**

```sql
BEGIN;
UPDATE seats
SET is_reserved = true
WHERE id = 1 AND is_reserved = false;

-- affected rows 확인
IF (row_count = 0) THEN
    -- 이미 예약됨
    ROLLBACK;
ELSE
    COMMIT;
END IF;
```

---

## Durability (내구성)

### 정의

**"커밋된 트랜잭션은 영구적으로 저장되며, 시스템 장애가 발생해도 절대 사라지지 않는다"**

### 시나리오: 전원 차단

```
10:00:00 - 사용자가 주문 완료 버튼 클릭
10:00:01 - 애플리케이션이 INSERT 쿼리 전송
10:00:02 - PostgreSQL이 트랜잭션 처리
10:00:03 - COMMIT 성공, 사용자에게 "주문 완료!" 메시지 표시
10:00:04 - [갑자기 정전 발생! ⚡]
10:00:05 - 서버 다운
10:05:00 - 전원 복구, PostgreSQL 재시작

질문: 10:00:03에 커밋된 주문 데이터는 살아있을까?
답: ✅ 반드시 살아있어야 한다! (Durability)
```

### Durability가 없으면?

```
상황: 온라인 쇼핑몰
1. 고객이 100만원 결제 완료 ✅
2. 서버가 "결제 완료!" 응답 ✅
3. 서버 크래시 💥
4. 재시작 후 확인 → 주문 데이터 사라짐 ❌

결과:
- 고객: 돈은 빠져나갔는데 주문이 없음
- 회사: 신뢰 추락, 법적 문제
```

### PostgreSQL의 Durability 구현

#### 1. WAL (Write-Ahead Logging)

```
핵심 원리:
"커밋 전에 반드시 변경사항을 로그에 먼저 기록한다"
```

**트랜잭션 처리 과정:**

```
1. BEGIN;
2. INSERT INTO orders (user_id, amount) VALUES (1, 100);
   → Shared Buffer에 데이터 기록 (메모리)
   → WAL 버퍼에 로그 기록 (메모리)
   ※ 아직 디스크에 쓰지 않음!

3. COMMIT;
   → WAL 버퍼를 디스크(pg_wal/)에 강제 쓰기 (fsync)  ← 핵심!
   → 사용자에게 "COMMIT SUCCESS" 응답
   → Shared Buffer의 데이터는 나중에 디스크에 기록

4. [이 시점에 전원 차단되어도 안전!]
   → WAL에 COMMIT 기록이 있으면 복구 시 재실행
```

**복구 과정:**

```
PostgreSQL 재시작
  ↓
WAL 파일 읽기
  ↓
마지막 체크포인트 이후의 모든 COMMIT된 트랜잭션 재실행 (REDO)
  ↓
커밋 안 된 트랜잭션은 무시 (MVCC로 자동 롤백)
  ↓
데이터 완전 복구 ✅
```

#### 2. fsync (강제 디스크 동기화)

```sql
-- postgresql.conf
fsync = on  -- 기본값, 절대 off로 설정 금지!
```

**fsync의 역할:**

```
일반적인 쓰기:
프로그램 → OS 버퍼 → (나중에) 디스크
↑ 이 시점에 전원 차단 시 데이터 손실!

fsync 쓰기:
프로그램 → OS 버퍼 → fsync() → 디스크에 물리적 쓰기 완료
↑ 이 시점 이후는 절대 손실 안 됨!
```

**성능 vs 안전성:**

```sql
-- 최대 안전성 (은행, 금융)
fsync = on
synchronous_commit = on
→ 커밋이 느리지만 절대 안전

-- 성능 우선 (로그 수집, 분석)
fsync = on  -- 여전히 on!
synchronous_commit = off
→ 빠르지만 최대 0.6초 데이터 손실 가능
```

#### 3. 동기식 복제 (Synchronous Replication)

```
마스터 서버와 복제본 서버가 함께 커밋
→ 마스터 서버가 고장나도 복제본에 데이터 있음
```

```sql
-- postgresql.conf (마스터)
synchronous_standby_names = 'replica1'

-- 동작 방식
1. 클라이언트 → COMMIT
2. 마스터 → WAL 기록
3. 마스터 → 복제본으로 WAL 전송
4. 복제본 → WAL 기록 완료 응답
5. 마스터 → 클라이언트에 COMMIT SUCCESS 응답
   ↑ 이 시점에 마스터와 복제본 모두에 데이터 저장됨!
```

---

## ACID 구현 메커니즘

### PostgreSQL의 ACID 구현 요약

| ACID | 구현 메커니즘 | 핵심 기술 |
|------|---------------|-----------|
| **Atomicity** | 트랜잭션 로그, MVCC | WAL, XID, 튜플 버전 관리 |
| **Consistency** | 제약 조건, 트리거 | CHECK, FK, UNIQUE, 트리거 |
| **Isolation** | MVCC, 락 | 스냅샷, xmin/xmax, SSI |
| **Durability** | WAL, fsync | pg_wal/, 체크포인트, 복제 |

### MVCC 상세 동작

**1. 튜플 가시성 규칙**

```c
// 튜플이 현재 트랜잭션에서 보이는가?
bool tuple_is_visible(Tuple t, TransactionSnapshot snap) {
    // 1. 생성 트랜잭션이 내 스냅샷보다 이후면 → 안 보임
    if (t.xmin > snap.xmax) return false;

    // 2. 생성 트랜잭션이 아직 실행 중이면 → 안 보임
    if (t.xmin in snap.active_xids) return false;

    // 3. 삭제 트랜잭션이 커밋됐고 내 스냅샷보다 이전이면 → 안 보임
    if (t.xmax <= snap.xmax && t.xmax committed) return false;

    // 4. 그 외 → 보임
    return true;
}
```

**2. 실제 예시**

```sql
-- 초기 상태
| id | name | xmin | xmax | 스냅샷 100에서 보임? |
|----|------|------|------|---------------------|
| 1  | 홍길동 | 50   | NULL | ✅ Yes (xmin < 100) |
| 2  | 김철수 | 110  | NULL | ❌ No (xmin > 100)  |
| 3  | 이영희 | 80   | 90   | ❌ No (xmax < 100)  |

트랜잭션 100 (Repeatable Read):
SELECT * FROM users;
→ 결과: id=1 (홍길동)만 반환 ✅
```

---

## PostgreSQL의 ACID 구현

### 트랜잭션 격리 수준 설정

```sql
-- 세션 전체에 적용
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- 현재 트랜잭션만
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT ...
COMMIT;

-- 기본값 확인
SHOW default_transaction_isolation;
-- 결과: read committed
```

### 락 종류

```sql
-- 1. Row-Level Lock
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;  -- 배타적 락
SELECT * FROM accounts WHERE id = 1 FOR SHARE;   -- 공유 락

-- 2. Table-Level Lock
LOCK TABLE accounts IN ACCESS EXCLUSIVE MODE;  -- 가장 강력
LOCK TABLE accounts IN SHARE MODE;             -- 읽기 허용

-- 3. Advisory Lock (애플리케이션 레벨)
SELECT pg_advisory_lock(12345);  -- 임의의 숫자로 락
-- 작업 수행
SELECT pg_advisory_unlock(12345);
```

### 데드락 처리

```sql
-- 데드락 발생 예시
-- 트랜잭션 A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 1번 잠금
-- (대기)
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- 2번 필요

-- 트랜잭션 B (동시 실행)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 2;  -- 2번 잠금
-- (대기)
UPDATE accounts SET balance = balance + 100 WHERE id = 1;  -- 1번 필요

-- PostgreSQL의 자동 처리
-- 1초 후 데드락 감지 → 하나의 트랜잭션 자동 롤백
ERROR: deadlock detected
DETAIL: Process 1234 waits for ShareLock on transaction 5678;
        blocked by process 5678.
```

---

## 실전 예시

### 1. 전자상거래: 주문 처리

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- 1. 재고 확인 및 차감
UPDATE products
SET stock = stock - :quantity
WHERE id = :product_id
AND stock >= :quantity;  -- 조건부 UPDATE로 동시성 제어

-- affected rows가 0이면 재고 부족
IF (row_count = 0) THEN
    ROLLBACK;
    RAISE EXCEPTION '재고가 부족합니다';
END IF;

-- 2. 주문 생성
INSERT INTO orders (user_id, product_id, quantity, total_amount)
VALUES (:user_id, :product_id, :quantity, :total_amount);

-- 3. 결제 처리 (외부 API 호출)
-- ... (실패 시 예외 발생)

COMMIT;  -- 모두 성공 시 커밋

-- Atomicity: 재고 차감과 주문 생성이 함께 성공/실패
-- Consistency: stock >= 0 제약 조건 유지
-- Isolation: Repeatable Read로 다른 트랜잭션과 격리
-- Durability: COMMIT 후 절대 사라지지 않음
```

### 2. 은행: 계좌 이체

```sql
CREATE OR REPLACE FUNCTION transfer_money(
    from_account_id INT,
    to_account_id INT,
    amount DECIMAL
) RETURNS VOID AS $$
BEGIN
    -- Serializable로 완벽한 격리 보장
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

    -- 출금 계좌 잠금 + 잔액 확인
    UPDATE accounts
    SET balance = balance - amount
    WHERE id = from_account_id
    AND balance >= amount;

    IF NOT FOUND THEN
        RAISE EXCEPTION '잔액이 부족합니다';
    END IF;

    -- 입금 계좌 업데이트
    UPDATE accounts
    SET balance = balance + amount
    WHERE id = to_account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION '입금 계좌가 존재하지 않습니다';
    END IF;

    -- 거래 내역 기록
    INSERT INTO transactions (from_account, to_account, amount, timestamp)
    VALUES (from_account_id, to_account_id, amount, NOW());

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '이체 실패: %', SQLERRM;
        RAISE;  -- 예외 재발생 → 자동 ROLLBACK
END;
$$ LANGUAGE plpgsql;

-- 사용
BEGIN;
SELECT transfer_money(1, 2, 100000);
COMMIT;
```

### 3. 예약 시스템: 좌석 예매

```sql
-- 방법 1: SELECT FOR UPDATE (비관적 락)
CREATE OR REPLACE FUNCTION book_seat(seat_id INT, user_id INT)
RETURNS BOOLEAN AS $$
DECLARE
    is_available BOOLEAN;
BEGIN
    -- 좌석 행에 배타적 락
    SELECT is_reserved INTO is_available
    FROM seats
    WHERE id = seat_id
    FOR UPDATE;

    IF is_available THEN
        RETURN FALSE;  -- 이미 예약됨
    END IF;

    -- 예약 처리
    UPDATE seats SET is_reserved = TRUE, reserved_by = user_id WHERE id = seat_id;
    INSERT INTO bookings (user_id, seat_id, booked_at) VALUES (user_id, seat_id, NOW());

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 방법 2: Unique Index (낙관적 락)
CREATE UNIQUE INDEX unique_active_booking
ON bookings (seat_id)
WHERE is_active = true;

BEGIN;
INSERT INTO bookings (user_id, seat_id, is_active)
VALUES (:user_id, :seat_id, true);
-- 중복 시 자동 에러: duplicate key value violates unique constraint
COMMIT;
```

---

## BASE vs ACID

### NoSQL의 BASE 모델

```
B - Basically Available (기본적으로 가용함)
A - Soft state (소프트 상태)
S - Eventually consistent (최종적 일관성)
E -
```

| 특성 | ACID (RDBMS) | BASE (NoSQL) |
|------|--------------|--------------|
| 일관성 | 즉시 일관성 | 최종 일관성 (몇 초 지연) |
| 가용성 | 제한적 | 매우 높음 |
| 트랜잭션 | 강력함 | 제한적 |
| 확장성 | 수직 확장 (Scale-up) | 수평 확장 (Scale-out) |
| 사용 사례 | 은행, 금융, 전자상거래 | SNS, 로그, 실시간 분석 |

### ACID가 필요한 경우

```
✅ 은행 거래
✅ 전자상거래 주문/결제
✅ 재고 관리
✅ 예약 시스템
✅ 회계 시스템
✅ 의료 기록
```

### BASE가 적합한 경우

```
✅ 소셜 미디어 좋아요/팔로우
✅ 로그 수집
✅ 실시간 분석
✅ 캐싱
✅ 세션 저장
```

---

## 요약

### ACID 핵심 원칙

1. **Atomicity (원자성)**
   - All or Nothing
   - 트랜잭션은 쪼갤 수 없는 단위
   - 구현: WAL, MVCC, XID

2. **Consistency (일관성)**
   - 데이터베이스 규칙 항상 유지
   - 제약 조건 위반 시 자동 롤백
   - 구현: CHECK, FK, Trigger

3. **Isolation (격리성)**
   - 동시 트랜잭션 간섭 방지
   - 격리 수준: Read Committed ~ Serializable
   - 구현: MVCC, Snapshot, Lock

4. **Durability (내구성)**
   - 커밋된 데이터는 영구 보존
   - 시스템 장애에도 복구 가능
   - 구현: WAL, fsync, Replication

### PostgreSQL ACID 체크리스트

- ✅ 금융 거래는 Serializable 사용
- ✅ 재고 차감은 조건부 UPDATE 사용
- ✅ 동시 예약은 SELECT FOR UPDATE
- ✅ fsync = on 유지 (절대 off 금지!)
- ✅ 중요 데이터는 동기식 복제 구성
- ✅ 정기적으로 WAL 아카이빙
- ✅ 트랜잭션은 최대한 짧게 유지

### 참고 자료

- [PostgreSQL MVCC 공식 문서](https://www.postgresql.org/docs/current/mvcc.html)
- [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Reliability and the Write-Ahead Log](https://www.postgresql.org/docs/current/wal-reliability.html)

---

**작성일**: 2025-10-19
**대상 버전**: PostgreSQL 15+
