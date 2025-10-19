# PostgreSQL 캐싱 아키텍처: Shared Buffer와 OS 캐시

**작성 날짜**: 2025-10-19
**목적**: PostgreSQL의 이중 캐싱 메커니즘(Shared Buffer + OS 캐시)을 이해하고 최적화 방법 학습

---

## 📋 목차

1. [개요](#개요)
2. [PostgreSQL 메모리 구조](#postgresql-메모리-구조)
3. [Shared Buffer 상세 설명](#shared-buffer-상세-설명)
4. [OS 캐시(Page Cache) 상세 설명](#os-캐시page-cache-상세-설명)
5. [이중 캐싱 동작 원리](#이중-캐싱-동작-원리)
6. [물리적 IO 최소화 전략](#물리적-io-최소화-전략)
7. [성능 최적화 설정](#성능-최적화-설정)
8. [실전 예제](#실전-예제)
9. [모니터링 방법](#모니터링-방법)

---

## 🎯 개요

PostgreSQL은 **이중 캐싱 아키텍처**를 사용하여 디스크 IO를 최소화합니다.

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL Process                    │
├─────────────────────────────────────────────────────────┤
│  1️⃣ Shared Buffers (PostgreSQL 자체 캐시)                │
│     - 크기: 설정 가능 (예: 4GB)                           │
│     - 관리: PostgreSQL이 직접 관리                        │
│     - 용도: 자주 사용하는 데이터 페이지 캐싱               │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    Operating System                      │
├─────────────────────────────────────────────────────────┤
│  2️⃣ OS Page Cache (운영체제 캐시)                        │
│     - 크기: 남은 RAM 전체 (예: 12GB)                      │
│     - 관리: 커널이 자동 관리                              │
│     - 용도: 모든 파일 시스템 IO 캐싱                      │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    Physical Disk (HDD/SSD)               │
│     - 속도: 가장 느림 (ms 단위)                           │
│     - 영구 저장소                                        │
└─────────────────────────────────────────────────────────┘
```

### 왜 이중 캐싱인가?

**1. PostgreSQL Shared Buffer의 역할**
- PostgreSQL이 데이터 접근 패턴을 정확히 알고 있음
- 트랜잭션 격리 수준, MVCC 등을 고려한 최적화 가능
- 데이터베이스 특화 알고리즘 사용 (예: Clock Sweep)

**2. OS Page Cache의 역할**
- Shared Buffer에 없는 데이터도 메모리에 캐싱
- 파일 시스템 수준 최적화 (예: readahead)
- 다른 프로세스와 메모리 공유

**결론**: 두 캐시가 협력하여 최대한 물리적 디스크 IO를 줄임

---

## 🏗️ PostgreSQL 메모리 구조

### 전체 메모리 맵

```
총 RAM: 16GB 서버 예시

┌──────────────────────────────────────────────────┐
│ PostgreSQL Shared Memory (4GB)                   │
│ ├─ Shared Buffers: 3GB                           │
│ ├─ WAL Buffers: 16MB                             │
│ ├─ Work Memory (per connection): 4MB × N         │
│ └─ Maintenance Work Memory: 256MB                │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│ OS Page Cache (약 10GB)                          │
│ - 커널이 자동으로 파일 시스템 캐싱               │
│ - PostgreSQL 데이터 파일 포함                    │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│ 기타 시스템 메모리 (약 2GB)                       │
│ - OS 커널, 다른 프로세스 등                       │
└──────────────────────────────────────────────────┘
```

### 메모리 계층별 속도 비교

| 메모리 타입 | 접근 속도 | 크기 | 관리자 |
|------------|----------|------|--------|
| L1/L2/L3 Cache | 나노초(ns) | KB~MB | CPU |
| RAM (Shared Buffer) | 100ns | GB | PostgreSQL |
| RAM (OS Page Cache) | 100ns | GB | OS Kernel |
| SSD | 100마이크로초(μs) | TB | 디스크 컨트롤러 |
| HDD | 10밀리초(ms) | TB | 디스크 컨트롤러 |

**속도 차이**:
- RAM vs SSD: **1,000배 빠름**
- RAM vs HDD: **100,000배 빠름**

→ 캐싱이 없으면 쿼리 성능이 **1,000배 느려질 수 있음**!

---

## 🔵 Shared Buffer 상세 설명

### Shared Buffer란?

PostgreSQL이 **디스크의 데이터 페이지를 메모리에 캐싱**하는 영역입니다.

#### 기본 단위: **페이지 (Page)**
- 크기: **8KB** (PostgreSQL 기본값)
- 하나의 페이지에는 여러 행(row)이 저장됨
- 페이지가 캐싱의 최소 단위

```sql
-- 예시: users 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100)
);

-- 1,000개 행이 있다면?
-- 대략 125개 페이지 (1,000 × 평균 64바이트 ÷ 8KB)
```

### Shared Buffer 동작 원리

#### 1. **Read 요청 시**

```
SELECT * FROM users WHERE id = 'abc-123';

1️⃣ Shared Buffer에서 해당 페이지 검색
   ↓ Hit (있음)
   ✅ 즉시 반환 (100ns)

   ↓ Miss (없음)

2️⃣ OS Page Cache에서 검색
   ↓ Hit (있음)
   ✅ 메모리에서 복사 후 반환 (1μs)

   ↓ Miss (없음)

3️⃣ 디스크에서 읽기
   ✅ SSD: 100μs, HDD: 10ms
   → Shared Buffer와 OS Cache에 저장
```

#### 2. **Write 요청 시**

```
UPDATE users SET name = 'John' WHERE id = 'abc-123';

1️⃣ Shared Buffer에서 페이지 찾기

2️⃣ 페이지를 "Dirty"로 표시
   (메모리와 디스크 내용이 다름을 표시)

3️⃣ WAL(Write-Ahead Log)에 먼저 기록
   (크래시 복구용)

4️⃣ Background Writer가 주기적으로 Dirty 페이지를 디스크에 기록
   (비동기 처리로 성능 향상)
```

### Shared Buffer 관리 알고리즘: Clock Sweep

PostgreSQL은 **Clock Sweep** 알고리즘으로 캐시를 관리합니다.

```
Shared Buffer (순환 버퍼)
┌──────┬──���───┬──────┬──────┬──────┬──────┐
│ Page │ Page │ Page │ Page │ Page │ Page │
│  A   │  B   │  C   │  D   │  E   │  F   │
│ Used │ Used │ Old  │ Used │ Old  │ Used │
└──────┴──────┴──────┴──────┴──────┴──────┘
                ↑ Clock Hand (시계 바늘처럼 회전)

- Used: 최근 사용됨 (Usage Count > 0)
- Old: 오래 사용 안 됨 (Usage Count = 0) → 교체 대상
```

**동작 방식**:
1. Clock Hand가 순환하며 각 페이지의 Usage Count 확인
2. Usage Count > 0이면 1 감소
3. Usage Count = 0이면 해당 페이지 교체
4. 자주 사용되는 페이지는 Usage Count가 계속 증가하여 오래 유지됨

---

## 🟢 OS 캐시(Page Cache) 상세 설명

### OS Page Cache란?

운영체제 커널이 **모든 파일 시스템 IO를 자동으로 캐싱**하는 메커니즘입니다.

```
애플리케이션 (PostgreSQL, Node.js 등)
         ↓ read() / write() 시스템 콜
┌─────────────────────────────────────────┐
│         OS Kernel (리눅스 예시)          │
│  ┌───────────────────────────────────┐  │
│  │     Page Cache (RAM)              │  │
│  │  - 파일 A의 일부분                │  │
│  │  - 파일 B의 일부분                │  │
│  │  - PostgreSQL 데이터 파일         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         ↓ 캐시 미스 시에만
┌─────────────────────────────────────────┐
│         Physical Disk                   │
└─────────────────────────────────────────┘
```

### OS Page Cache 동작 원리

#### 1. **Read 동작**

```c
// PostgreSQL 내부에서 파일 읽기
int fd = open("/var/lib/postgresql/data/base/users", O_RDONLY);
read(fd, buffer, 8192);  // 8KB 페이지 읽기

// 커널 내부 동작:
1️⃣ Page Cache에서 해당 파일의 해당 오프셋 검색
   ↓ Hit
   ✅ 메모리에서 즉시 복사 (100ns)

   ↓ Miss
2️⃣ 디스크에서 읽기 (100μs ~ 10ms)
3️⃣ Page Cache에 저장
4️⃣ 애플리케이션에 반환

// 추가 최적화: Readahead
커널은 순차 읽기 감지 시 다음 페이지들을 미리 읽어옴
→ SELECT * FROM users 같은 스캔 쿼리 성능 향상
```

#### 2. **Write 동작**

```c
write(fd, buffer, 8192);

// 커널 내부 동작:
1️⃣ Page Cache에 데이터 기록 (메모리만)
2️⃣ 해당 페이지를 "Dirty"로 표시
3️⃣ write() 시스템 콜 즉시 반환 ✅ (빠름!)

// 백그라운드에서:
4️⃣ pdflush/flush 커널 스레드가 주기적으로 Dirty 페이지를 디스크에 기록
   - 기본 간격: 30초
   - 또는 Dirty 페이지가 너무 많아지면 즉시 기록
```

### OS Cache 관리 알고리즘: LRU (Least Recently Used)

```
Page Cache (LRU 리스트)
┌──────────────────────────────────────────┐
│ [가장 최근 사용] → [오래전 사용]          │
│                                          │
│ Page1 → Page2 → Page3 → Page4 → Page5   │
│ (1초전) (5초전) (10초전) (1분전) (5분전) │
└──────────────────────────────────────────┘

새로운 페이지 필요 시:
- Page5 (가장 오래 사용 안 함) 제거
- 새 페이지를 맨 앞에 추가
```

### OS Cache 크기 확인

```bash
# 리눅스에서 캐시 상태 확인
free -h

#               total        used        free      shared  buff/cache   available
# Mem:           16Gi       2.0Gi       1.5Gi       100Mi        12Gi        14Gi
#                                                            ↑ OS Page Cache

# 더 자세한 정보
cat /proc/meminfo | grep -E 'Cached|Buffers'
# Buffers:          200000 kB  ← 파일 메타데이터 캐시
# Cached:         12000000 kB  ← 파일 내용 캐시 (Page Cache)
```

---

## 🔄 이중 캐싱 동작 원리

### 시나리오 1: SELECT 쿼리 실행

```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

**단계별 동작**:

```
1️⃣ PostgreSQL Query Planner
   - 실행 계획 생성
   - 필요한 페이지 ID 계산 (예: pages 100, 101, 102)

2️⃣ Shared Buffer 검색
   Page 100: ✅ Hit (메모리에 있음)
   Page 101: ❌ Miss (메모리에 없음)
   Page 102: ✅ Hit

3️⃣ Page 101을 디스크에서 읽기 시도
   a) PostgreSQL → read() 시스템 콜
   b) OS Kernel → Page Cache 검색
      ✅ Hit! (이전에 다른 쿼리가 읽어서 캐싱됨)
   c) Page Cache → Shared Buffer로 복사 (1μs)
   d) Shared Buffer에 저장

4️⃣ 모든 페이지를 메모리에서 처리
   총 시간: 약 10μs (디스크 IO 없음!)
```

### 시나리오 2: UPDATE 쿼리 실행

```sql
UPDATE users SET name = 'John Doe' WHERE id = 'abc-123';
```

**단계별 동작**:

```
1️⃣ Shared Buffer에서 해당 페이지 찾기
   Page 50: ✅ Hit

2️⃣ 페이지 수정
   - 메모리의 페이지 내용 변경
   - Dirty 플래그 설정

3️⃣ WAL(Write-Ahead Log) 기록
   - WAL Buffer에 먼저 기록
   - WAL Buffer → 디스크 (fsync)
   - 트랜잭션 COMMIT 완료 ✅

4️⃣ Background Writer 동작 (비동기)
   a) Shared Buffer의 Dirty 페이지 선택
   b) write() 시스템 콜 → OS Page Cache
   c) OS Page Cache → Dirty 표시
   d) pdflush 커널 스레드가 디스크에 기록 (30초 이내)

5️⃣ Checkpoint
   - 주기적으로 모든 Dirty 페이지를 디스크에 강제 기록
   - 복구 시간 최소화
```

### 이중 캐싱의 장점

#### 1. **효율적인 메모리 사용**

```
시나리오: 16GB RAM 서버, 50GB 데이터베이스

옵션 A: Shared Buffer만 사용
- Shared Buffer: 12GB
- 나머지 4GB: OS, 다른 프로세스
- 캐시 히트율: 24% (12GB / 50GB)

옵션 B: 이중 캐싱 (실제 PostgreSQL)
- Shared Buffer: 4GB (자주 사용하는 핫 데이터)
- OS Page Cache: 10GB (추가 캐싱)
- 총 캐시: 14GB
- 캐시 히트율: 28% (14GB / 50GB)
- ✅ 더 많은 데이터를 메모리에 유지!
```

#### 2. **Readahead 최적화**

```sql
-- 순차 스캔 쿼리
SELECT * FROM transactions ORDER BY created_at;

Shared Buffer:
- 페이지를 하나씩 읽음

OS Page Cache:
- 순차 읽기 패턴 감지
- 다음 페이지들을 미리 읽어옴 (Readahead)
- ✅ 디스크 IO 횟수 감소!
```

#### 3. **크래시 복구 시 빠른 재시작**

```
PostgreSQL 크래시 발생!

Shared Buffer:
- ❌ 모두 손실 (프로세스 종료)

OS Page Cache:
- ✅ 그대로 유지 (커널 메모리)
- PostgreSQL 재시작 시 즉시 사용 가능
- 워밍업 시간 단축
```

---

## 💾 물리적 IO 최소화 전략

### 1. **Sequential Scan vs Index Scan**

#### Sequential Scan (전체 테이블 스캔)

```sql
SELECT * FROM users WHERE age > 30;

-- 인덱스 없음 → Sequential Scan
EXPLAIN ANALYZE:
Seq Scan on users (cost=0.00..1000.00 rows=500)
  Planning Time: 0.1ms
  Execution Time: 50ms
```

**IO 패턴**:
```
디스크에서 페이지 1, 2, 3, 4, 5, 6, 7, 8 ... 순차 읽기

OS Page Cache 효과:
- Readahead 동작 ✅
- 한 번에 여러 페이지 미리 읽기
- 실제 디스크 IO: 예상의 50%
```

#### Index Scan (인덱스 사용)

```sql
CREATE INDEX idx_users_age ON users(age);

SELECT * FROM users WHERE age > 30;

-- 인덱스 있음 → Index Scan
EXPLAIN ANALYZE:
Index Scan using idx_users_age on users (cost=0.29..500.00 rows=500)
  Planning Time: 0.2ms
  Execution Time: 20ms
```

**IO 패턴**:
```
디스크에서 페이지 3, 7, 15, 22, 35, 50 ... 랜덤 읽기

OS Page Cache 효과:
- Readahead 동작 안 함 ❌ (랜덤 패턴)
- 하지만 읽는 페이지 수가 적음
- 실제 디스크 IO: Sequential Scan의 40%
```

### 2. **Hot Data와 Cold Data 분리**

```
Shared Buffer (4GB):
┌────────────────────────────────────┐
│ 🔥 Hot Data (자주 사용)             │
│ - users 테이블의 최근 가입자        │
│ - 활성 세션 데이터                 │
│ - 자주 조회되는 통계 데이터         │
└────────────────────────────────────┘

OS Page Cache (10GB):
┌────────────────────────────────────┐
│ 🧊 Warm Data (가끔 사용)            │
│ - users 테이블의 6개월 전 데이터   │
│ - 접속 로그                        │
└────────────────────────────────────┘

Disk (50GB):
┌────────────────────────────────────┐
│ ❄️ Cold Data (거의 안 사용)         │
│ - 1년 전 데이터                    │
│ - 삭제된 데이터 아카이브            │
└────────────────────────────────────┘
```

**최적화 전략**:
```sql
-- Hot Data를 별도 테이블로 분리
CREATE TABLE users_active AS
SELECT * FROM users WHERE last_login > NOW() - INTERVAL '30 days';

-- 쿼리 성능 향상
SELECT * FROM users_active WHERE email = 'user@example.com';
-- 스캔할 페이지 수: 100개 (전체의 10%)
-- 캐시 히트율: 95% (Shared Buffer에 상주)
```

### 3. **VACUUM과 캐시 효율**

```sql
-- VACUUM 실행 전
SELECT * FROM users;
-- 총 페이지: 1,000개 (실제 데이터 500개 + Dead Tuples 500개)
-- 디스크 IO: 많음 ❌

-- VACUUM 실행
VACUUM FULL users;
-- 죽은 튜플 제거, 페이지 재구성

-- VACUUM 실행 후
SELECT * FROM users;
-- 총 페이지: 500개
-- 디스크 IO: 절반 ✅
-- Shared Buffer에 더 많은 데이터 캐싱 가능
```

---

## ⚙️ 성능 최적화 설정

### 1. Shared Buffers 크기 설정

**postgresql.conf**:

```ini
# 기본값: 128MB (너무 작음!)
# 권장값: 총 RAM의 25%

# 예시: 16GB RAM 서버
shared_buffers = 4GB

# 계산 방법:
# - 전용 DB 서버: RAM의 25-40%
# - 혼합 서버 (웹+DB): RAM의 15-25%
```

**설정 후 확인**:
```sql
SHOW shared_buffers;
-- 4GB
```

### 2. effective_cache_size 설정

이 설정은 **OS Page Cache까지 포함한 총 캐시 크기**를 PostgreSQL에 알려줍니다.

```ini
# PostgreSQL이 쿼리 플래너에서 사용
# 실제 메모리를 할당하지는 않음 (힌트일 뿐)

# 예시: 16GB RAM 서버
# Shared Buffer: 4GB
# OS Page Cache: 10GB (추정)
# 기타: 2GB
effective_cache_size = 14GB

# 계산 방법:
# - 전용 DB 서버: RAM의 75%
# - 혼합 서버: RAM의 50%
```

**영향**:
```sql
-- effective_cache_size가 크면:
-- → Planner가 Index Scan을 선호
-- → "대부분의 데이터가 메모리에 있을 것"으로 가정

-- effective_cache_size가 작으면:
-- → Planner가 Sequential Scan을 선호
-- → "디스크 IO가 많을 것"으로 가정
```

### 3. work_mem 설정

```ini
# 정렬, 해시 테이블 등에 사용하는 메모리
# 연결별로 할당됨!

work_mem = 4MB  # 기본값 (너무 작음)
work_mem = 64MB  # 권장값

# 주의:
# 100개 동시 연결 × 64MB = 6.4GB
# → Shared Buffer + work_mem이 RAM을 초과하지 않도록!
```

### 4. maintenance_work_mem 설정

```ini
# VACUUM, CREATE INDEX, ALTER TABLE 등에 사용
# 연결별이 아닌 작업별로 할당

maintenance_work_mem = 256MB  # 권장값 (RAM의 5%)
```

### 5. checkpoint 설정

```ini
# Checkpoint: Dirty 페이지를 디스크에 강제 기록
checkpoint_timeout = 15min  # 기본값: 5분
max_wal_size = 4GB  # 기본값: 1GB

# 효과:
# - Checkpoint 빈도 감소 → Write IO 감소
# - 하지만 복구 시간 증가 (WAL 재생 시간)
```

### 최적 설정 예시 (16GB RAM 서버)

```ini
# postgresql.conf

# 메모리
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 512MB

# Checkpoint
checkpoint_timeout = 15min
max_wal_size = 4GB
checkpoint_completion_target = 0.9

# WAL
wal_buffers = 16MB

# 쿼리 최적화
random_page_cost = 1.1  # SSD 사용 시 (HDD: 4.0)
effective_io_concurrency = 200  # SSD 사용 시

# 연결
max_connections = 100
```

---

## 💻 실전 예제

### 예제 1: 캐시 히트율 확인

```sql
-- Shared Buffer 히트율
SELECT
    sum(heap_blks_read) AS heap_read,
    sum(heap_blks_hit) AS heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio
FROM pg_statio_user_tables;

-- 결과:
-- heap_read | heap_hit | cache_hit_ratio
-- ----------+----------+----------------
--   100,000 | 900,000  |           0.90  ← 90% 히트율

-- 목표: 95% 이상
-- 90% 미만이면 shared_buffers 증가 고려
```

### 예제 2: 테이블별 캐시 상태

```sql
SELECT
    schemaname,
    tablename,
    heap_blks_read AS disk_reads,
    heap_blks_hit AS cache_hits,
    round(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) AS cache_hit_ratio
FROM pg_statio_user_tables
ORDER BY heap_blks_read DESC
LIMIT 10;

-- 결과:
-- tablename     | disk_reads | cache_hits | cache_hit_ratio
-- --------------+------------+------------+----------------
-- transactions  |    500,000 |  4,500,000 |           90.00
-- users         |    100,000 |  9,900,000 |           99.00  ← 매우 좋음
-- logs          |  1,000,000 |  1,000,000 |           50.00  ← 나쁨!

-- logs 테이블은 자주 디스크에서 읽음 → 파티셔닝 또는 아카이빙 고려
```

### 예제 3: OS Page Cache 효과 측정

```bash
# 1️⃣ OS Cache 비우기 (테스트 목적)
sudo sync
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'

# 2️⃣ 쿼리 실행 (Cold Start)
psql -c "SELECT COUNT(*) FROM users;"
# Time: 5000ms (디스크에서 읽음)

# 3️⃣ 같은 쿼리 다시 실행
psql -c "SELECT COUNT(*) FROM users;"
# Time: 100ms (OS Cache Hit!)

# 4️⃣ PostgreSQL 재시작
sudo systemctl restart postgresql

# 5️⃣ 같은 쿼리 실행
psql -c "SELECT COUNT(*) FROM users;"
# Time: 150ms (Shared Buffer는 비었지만 OS Cache는 살아있음!)
```

### 예제 4: EXPLAIN ANALYZE로 IO 확인

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE age > 30;

-- 결과:
-- Seq Scan on users (cost=0.00..1000.00 rows=500) (actual time=0.1..50.0 rows=500 loops=1)
--   Buffers: shared hit=800 read=200
--   Planning Time: 0.1ms
--   Execution Time: 50.2ms

-- 해석:
-- shared hit=800  : Shared Buffer에서 800개 페이지 읽음 (캐시 히트)
-- read=200        : 디스크에서 200개 페이지 읽음 (캐시 미스)
-- 히트율: 800 / (800 + 200) = 80%
```

### 예제 5: 인덱스로 IO 줄이기

```sql
-- 인덱스 없음
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'user@example.com';
-- Seq Scan on users
--   Buffers: shared read=1000  ← 전체 테이블 스캔
--   Execution Time: 100ms

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);

-- 인덱스 사용
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'user@example.com';
-- Index Scan using idx_users_email on users
--   Buffers: shared hit=4  ← 인덱스 페이지 + 데이터 페이지
--   Execution Time: 0.5ms

-- IO 감소: 1000 페이지 → 4 페이지 (250배 감소!)
```

---

## 📊 모니터링 방법

### 1. pg_stat_bgwriter로 Background Writer 모니터링

```sql
SELECT * FROM pg_stat_bgwriter \gx

-- 결과:
-- checkpoints_timed     | 100    ← 시간 기반 체크포인트
-- checkpoints_req       | 10     ← 강제 체크포인트 (너무 많으면 문제)
-- buffers_checkpoint    | 500000 ← 체크포인트로 쓴 버퍼
-- buffers_clean         | 100000 ← Background Writer가 쓴 버퍼
-- buffers_backend       | 50000  ← 백엔드가 직접 쓴 버퍼 (적을수록 좋음)

-- 분석:
-- buffers_backend이 높으면 → Background Writer가 느림
-- → bgwriter_delay 설정 조정 필요
```

### 2. pg_statio_* 뷰로 테이블 IO 모니터링

```sql
-- 가장 많이 읽힌 테이블
SELECT
    schemaname,
    tablename,
    heap_blks_read + idx_blks_read AS total_reads
FROM pg_statio_user_tables
ORDER BY total_reads DESC
LIMIT 10;

-- 가장 많이 쓰인 테이블
SELECT
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del AS total_writes
FROM pg_stat_user_tables
ORDER BY total_writes DESC
LIMIT 10;
```

### 3. OS 수준 모니터링

```bash
# 1. iostat으로 디스크 IO 확인
iostat -x 1

# Device  r/s   w/s  rkB/s  wkB/s  await  %util
# sda     100   50   8000   4000   5.0    60.0

# await: 평균 IO 대기 시간 (ms)
# %util: 디스크 사용률
# 목표: await < 10ms, %util < 80%

# 2. vmstat으로 메모리 상태 확인
vmstat 1

#  r  b   swpd   free   buff  cache
#  2  0      0  1500M  200M  12000M
#                            ↑ OS Page Cache

# 3. sar로 캐시 히트율 확인
sar -B 1

# pgpgin/s  pgpgout/s
#   1000       500
# pgpgin: 디스크에서 읽은 페이지 (적을수록 좋음)
```

### 4. 실시간 쿼리 모니터링

```sql
-- 현재 실행 중인 쿼리
SELECT
    pid,
    usename,
    application_name,
    state,
    query,
    query_start,
    state_change
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- IO 대기 중인 쿼리 (IO 병목)
SELECT
    pid,
    wait_event_type,
    wait_event,
    query
FROM pg_stat_activity
WHERE wait_event_type = 'IO';
```

---

## 🎓 정리 및 핵심 포인트

### 이중 캐싱이 물리적 IO를 줄이는 원리

```
쿼리 실행

1️⃣ Shared Buffer 검색 (100ns)
   ✅ Hit → 즉시 반환
   ❌ Miss → 2️⃣

2️⃣ OS Page Cache 검색 (1μs)
   ✅ Hit → 메모리 복사 후 반환
   ❌ Miss → 3️⃣

3️⃣ 디스크 읽기 (100μs ~ 10ms)
   → Shared Buffer와 OS Cache 양쪽에 저장
   → 다음 번엔 1️⃣ 또는 2️⃣에서 Hit

결과: 물리적 디스크 IO 최소화!
```

### 최적화 체크리스트

- [ ] `shared_buffers` = RAM의 25% 설정
- [ ] `effective_cache_size` = RAM의 75% 설정
- [ ] 캐시 히트율 95% 이상 유지
- [ ] 자주 사용하는 컬럼에 인덱스 생성
- [ ] VACUUM 정기 실행으로 Dead Tuples 제거
- [ ] Hot Data와 Cold Data 분리
- [ ] `EXPLAIN (ANALYZE, BUFFERS)`로 쿼리 분석

### 안티 패턴

❌ **하지 말아야 할 것**:
1. `shared_buffers`를 RAM의 50% 이상 설정
   → OS Page Cache 공간 부족
2. OS Cache를 강제로 비우기 (프로덕션)
3. 모든 테이블에 인덱스 생성
   → Write 성능 저하
4. VACUUM 실행 안 함
   → 페이지 낭비, 캐시 효율 저하

---

## 📚 참고 자료

- [PostgreSQL Documentation: Resource Consumption](https://www.postgresql.org/docs/current/runtime-config-resource.html)
- [PostgreSQL Wiki: Tuning Your PostgreSQL Server](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
- [Linux Kernel Documentation: Page Cache](https://www.kernel.org/doc/html/latest/admin-guide/mm/concepts.html)
- [Use The Index, Luke! - Indexing and Tuning Guide](https://use-the-index-luke.com/)

---

**작성자**: Claude
**최종 수정**: 2025-10-19
