# PostgreSQL WAL (Write-Ahead Logging) 메커니즘

## 목차
1. [WAL이란?](#wal이란)
2. [WAL의 핵심 원리](#wal의-핵심-원리)
3. [WAL의 동작 방식](#wal의-동작-방식)
4. [트랜잭션 커밋 과정](#트랜잭션-커밋-과정)
5. [WAL 파일 관리](#wal-파일-관리)
6. [체크포인트 메커니즘](#체크포인트-메커니즘)
7. [장애 복구 과정](#장애-복구-과정)
8. [성능 최적화](#성능-최적화)
9. [WAL 관련 설정](#wal-관련-설정)
10. [실전 예시](#실전-예시)

---

## WAL이란?

**WAL (Write-Ahead Logging)**은 PostgreSQL이 데이터 무결성과 내구성(Durability)을 보장하기 위해 사용하는 핵심 메커니즘입니다.

### 핵심 개념
"데이터를 실제로 디스크에 쓰기 전에, 먼저 로그를 기록한다"

```
일반적인 DB 쓰기:
데이터 변경 → 디스크에 직접 쓰기 (느림, 위험)

WAL 방식:
데이터 변경 → 로그 기록 (빠름) → 나중에 디스크에 쓰기 (안전)
```

---

## WAL의 핵심 원리

### 1. ACID의 D (Durability) 보장

```
ACID:
- Atomicity (원자성)
- Consistency (일관성)
- Isolation (격리성)
- Durability (내구성) ← WAL이 담당!
```

**Durability**: 커밋된 트랜잭션은 시스템 장애가 발생해도 절대 사라지지 않음

### 2. Write-Ahead Rule

```
핵심 규칙:
"데이터 페이지를 디스크에 쓰기 전에,
반드시 해당 변경사항을 기록한 WAL 레코드가 먼저 디스크에 기록되어야 한다"
```

### 3. 순차 쓰기 vs 랜덤 쓰기

| 구분 | WAL 로그 | 데이터 파일 |
|------|----------|-------------|
| 쓰기 패턴 | 순차 쓰기 (Sequential) | 랜덤 쓰기 (Random) |
| 속도 | 매우 빠름 (100MB/s+) | 느림 (10MB/s) |
| 디스크 위치 | pg_wal/ 디렉토리 | base/ 디렉토리 |
| 목적 | 빠른 로그 기록 | 영구 저장 |

**왜 WAL이 빠른가?**
- 파일 끝에 계속 추가만 하면 됨 (Append-only)
- 디스크 헤드 이동 최소화
- 랜덤 액세스 불필요

---

## WAL의 동작 방식

### 1. 트랜잭션 실행 과정

```sql
-- 예시: 계좌 이체 트랜잭션
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

**내부 동작:**

```
1. BEGIN 실행
   → XID (트랜잭션 ID) 할당: 예) XID 12345

2. 첫 번째 UPDATE 실행
   → Shared Buffer에서 해당 페이지 찾기/로드
   → 버퍼에서 balance 값 변경: 1000 → 900
   → WAL 버퍼에 로그 기록:
     "XID 12345: accounts 테이블 페이지 42,
      오프셋 3의 balance를 1000→900으로 변경"
   → 아직 디스크에 쓰지 않음!

3. 두 번째 UPDATE 실행
   → 마찬가지로 Shared Buffer + WAL 버퍼에 기록
   → WAL 로그:
     "XID 12345: accounts 테이블 페이지 43,
      오프셋 7의 balance를 500→600으로 변경"

4. COMMIT 실행
   → WAL 버퍼의 모든 로그를 디스크(pg_wal/)에 강제 flush (fsync)
   → WAL에 커밋 레코드 추가: "XID 12345 COMMIT"
   → 사용자에게 "COMMIT SUCCESS" 응답
   → Shared Buffer의 dirty page는 아직 디스크에 쓰지 않음!
```

### 2. LSN (Log Sequence Number)

WAL의 각 레코드는 고유한 LSN을 가집니다.

```
LSN 형식: XXX/YYYYYYYY (16진수)
예시: 0/1A2B3C4D

0/1A2B3C4D
│ └─────── WAL 파일 내 오프셋
└─────── WAL 파일 번호
```

**LSN의 역할:**
- 로그의 순서 보장
- 복제(Replication)에서 위치 추적
- 복구 시작점 결정

---

## 트랜잭션 커밋 과정

### 커밋 시퀀스

```
┌─────────────┐
│   COMMIT    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│ WAL 버퍼 → 디스크 flush     │  ← 가장 중요!
│ (fsync() 시스템 콜)          │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ WAL에 COMMIT 레코드 추가    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 트랜잭션 상태를 COMMITTED로 │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 클라이언트에 성공 응답      │
└─────────────────────────────┘

주의: Shared Buffer의 dirty page는
      나중에 Background Writer/Checkpointer가 기록
```

### synchronous_commit 설정

```sql
-- 동기 커밋 (기본값, 안전)
SET synchronous_commit = on;
-- COMMIT 시 WAL이 디스크에 완전히 쓰여질 때까지 대기

-- 비동기 커밋 (빠름, 약간 위험)
SET synchronous_commit = off;
-- COMMIT 즉시 반환, WAL은 나중에 디스크에 기록
-- 최대 3 * wal_writer_delay만큼 데이터 손실 가능 (기본 0.6초)
```

---

## WAL 파일 관리

### 1. WAL 파일 구조

```bash
$ ls -lh /var/lib/postgresql/data/pg_wal/
-rw------- 1 postgres postgres 16M  000000010000000000000001
-rw------- 1 postgres postgres 16M  000000010000000000000002
-rw------- 1 postgres postgres 16M  000000010000000000000003
```

**특징:**
- 각 파일 크기: 16MB (고정)
- 순차적으로 생성: 001 → 002 → 003...
- 재활용(Recycle): 오래된 파일을 새 이름으로 재사용

### 2. WAL 세그먼트 순환

```
┌──────┐     ┌──────┐     ┌──────┐
│ 001  │ --> │ 002  │ --> │ 003  │
└──────┘     └──────┘     └──────┘
   ↑                          │
   │         체크포인트         │
   └──────────────────────────┘
        (001 재활용)
```

**WAL 파일 생성 조건:**
- 현재 파일이 16MB로 가득 참
- `wal_keep_size` 설정값만큼 유지
- 아카이빙 설정 시 아카이브 완료 전까지 유지

### 3. WAL 아카이빙

```sql
-- postgresql.conf
archive_mode = on
archive_command = 'cp %p /mnt/backup/wal_archive/%f'
```

**아카이빙 프로세스:**

```
WAL 파일 가득 참
     │
     ▼
archive_command 실행
     │
     ▼
외부 저장소로 복사
(예: /mnt/backup, AWS S3)
     │
     ▼
복사 성공 시 파일 재활용
```

---

## 체크포인트 메커니즘

### 1. 체크포인트란?

"Shared Buffer의 모든 dirty page를 디스크에 쓰는 작업"

**목적:**
1. WAL 파일 무한 증가 방지
2. 복구 시간 단축 (최근 체크포인트부터만 재실행)
3. 디스크 공간 관리

### 2. 체크포인트 동작

```
┌─────────────────┐
│ Checkpoint 시작 │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│ Shared Buffer의 모든 dirty   │
│ page를 디스크에 쓰기          │
│ (수 GB 데이터일 수 있음)      │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ WAL에 CHECKPOINT 레코드 기록 │
│ (복구 시작점 마커)            │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 이전 WAL 파일 재활용 가능    │
└──────────────────────────────┘
```

### 3. 체크포인트 트리거

```sql
-- postgresql.conf
checkpoint_timeout = 5min         -- 5분마다 자동 실행
max_wal_size = 1GB                -- WAL 1GB 초과 시 실행
checkpoint_completion_target = 0.9 -- 다음 체크포인트의 90% 시간 내에 완료
```

**예시:**
- `checkpoint_timeout = 5min`
- `checkpoint_completion_target = 0.9`
- → 체크포인트는 4.5분(5 * 0.9) 동안 천천히 진행
- → I/O 스파이크 방지

### 4. Checkpoint Warning

```sql
checkpoint_warning = 30s
```

30초 이내에 체크포인트가 2번 발생하면 경고 로그 출력:

```
LOG: checkpoints are occurring too frequently (24 seconds apart)
HINT: Consider increasing the configuration parameter "max_wal_size".
```

---

## 장애 복구 과정

### 1. Crash Recovery

서버가 비정상 종료(crash) 후 재시작될 때:

```
PostgreSQL 시작
     │
     ▼
pg_control 파일 읽기
(마지막 체크포인트 LSN 확인)
     │
     ▼
체크포인트 LSN부터 WAL 재실행
     │
     ▼
┌─────────────────────────────┐
│ WAL 레코드를 하나씩 읽으며: │
│ - COMMIT된 트랜잭션: 재실행 │
│ - 미완료 트랜잭션: ROLLBACK │
└────────┬────────────────────┘
         │
         ▼
데이터 일관성 복구 완료
     │
     ▼
정상 서비스 시작
```

### 2. REDO vs UNDO

| 개념 | 설명 | PostgreSQL |
|------|------|------------|
| REDO | 커밋된 작업 다시 실행 | WAL 재실행 |
| UNDO | 미완료 작업 롤백 | MVCC로 자동 처리 |

**PostgreSQL의 UNDO 방식:**
- 별도의 UNDO 로그 없음
- MVCC 튜플 버전으로 롤백 구현
- WAL에는 REDO 정보만 기록

### 3. 복구 예시

**시나리오:**

```
10:00 - 체크포인트 (LSN: 0/1000)
10:05 - 트랜잭션 A 시작
10:06 - 트랜잭션 A 커밋 (WAL LSN: 0/2000)
10:07 - 트랜잭션 B 시작
10:08 - [시스템 크래시!] ← 트랜잭션 B 미완료
```

**복구 과정:**

```bash
# 10:09 - PostgreSQL 재시작
LOG: database system was interrupted; last known up at 10:00:00 KST
LOG: starting crash recovery from checkpoint at 0/1000
LOG: redo starts at 0/1000
LOG: redo done at 0/2500, LSN 0/2000
LOG: last completed transaction was at 0/2000 (트랜잭션 A)
LOG: database system is ready to accept connections
```

**결과:**
- ✅ 트랜잭션 A: 커밋 완료 (WAL에 기록됨) → 재실행하여 복구
- ❌ 트랜잭션 B: 커밋 안 됨 → 자동 롤백

---

## 성능 최적화

### 1. WAL 버퍼 크기

```sql
-- postgresql.conf
wal_buffers = 16MB  -- 기본값: shared_buffers의 1/32
```

**권장 설정:**
- 대부분: 16MB (기본값 적절)
- 대량 쓰기 워크로드: 32~64MB

### 2. WAL 압축

```sql
wal_compression = on  -- PostgreSQL 9.5+
```

**효과:**
- WAL 파일 크기 30~50% 감소
- CPU 사용량 약간 증가
- I/O 감소로 전체 성능 향상

### 3. Commit Delay

```sql
commit_delay = 10  -- 마이크로초 (기본: 0)
commit_siblings = 5
```

**동작:**
- 다른 트랜잭션이 커밋 대기 중이면 10μs 지연
- 여러 트랜잭션을 한 번의 fsync로 처리
- 동시성 높은 환경에서 효과적

### 4. Full Page Writes

```sql
full_page_writes = on  -- 기본값 (권장)
```

**역할:**
- 체크포인트 후 첫 번째 변경 시 전체 페이지 기록
- Partial write 문제 방지
- WAL 크기 증가하지만 안전성 보장

**Partial Write 문제:**
```
디스크 쓰기 중 전원 차단
→ 8KB 페이지의 절반만 쓰여짐
→ 페이지 손상
→ full_page_writes로 복구 가능
```

---

## WAL 관련 설정

### 주요 설정 파라미터

| 파라미터 | 기본값 | 설명 | 권장값 |
|---------|--------|------|--------|
| `wal_level` | replica | WAL 로깅 상세도 | replica (복제용) |
| `fsync` | on | WAL을 디스크에 강제 기록 | on (절대 off 금지!) |
| `synchronous_commit` | on | 커밋 시 WAL 대기 | on (안전) / off (성능) |
| `wal_buffers` | -1 (자동) | WAL 버퍼 크기 | 16MB |
| `wal_writer_delay` | 200ms | WAL 작성기 대기 시간 | 200ms |
| `checkpoint_timeout` | 5min | 체크포인트 간격 | 10~30min |
| `max_wal_size` | 1GB | 체크포인트 트리거 크기 | 2~4GB |
| `min_wal_size` | 80MB | 최소 WAL 크기 | 1GB |
| `archive_mode` | off | WAL 아카이빙 활성화 | on (백업용) |
| `wal_compression` | off | WAL 압축 | on (I/O 절약) |

### 성능 vs 안전성 트레이드오프

**최대 안전성 (은행, 금융):**
```sql
fsync = on
synchronous_commit = on
full_page_writes = on
wal_sync_method = fdatasync
```

**균형 (일반 서비스):**
```sql
fsync = on
synchronous_commit = on
full_page_writes = on
checkpoint_timeout = 15min
max_wal_size = 2GB
```

**최대 성능 (로그 분석, 임시 데이터):**
```sql
fsync = on  # 절대 off 금지!
synchronous_commit = off  # 0.6초 데이터 손실 가능
full_page_writes = off  # 파일시스템이 안전하다면
checkpoint_timeout = 30min
```

---

## 실전 예시

### 1. WAL 통계 확인

```sql
-- 현재 WAL 위치
SELECT pg_current_wal_lsn();
-- 결과: 0/1A2B3C4D

-- WAL 생성 속도 (1분 동안)
SELECT pg_current_wal_lsn();
-- 1분 대기
SELECT pg_current_wal_lsn();
-- 두 값의 차이 = 1분간 생성된 WAL 양

-- WAL 파일 목록
SELECT * FROM pg_ls_waldir() ORDER BY modification DESC LIMIT 10;
```

### 2. WAL 파일 크기 모니터링

```sql
-- 전체 WAL 디렉토리 크기
SELECT
    pg_size_pretty(SUM(size)) AS total_wal_size,
    COUNT(*) AS wal_file_count
FROM pg_ls_waldir();
```

출력 예시:
```
 total_wal_size | wal_file_count
----------------+----------------
 512 MB         |             32
```

### 3. 체크포인트 통계

```sql
SELECT
    checkpoints_timed,      -- 시간 기반 체크포인트
    checkpoints_req,        -- 요청 기반 체크포인트 (max_wal_size 초과)
    checkpoint_write_time,  -- 쓰기 시간 (ms)
    checkpoint_sync_time,   -- 동기화 시간 (ms)
    buffers_checkpoint,     -- 체크포인트로 쓴 버퍼 수
    buffers_clean,          -- background writer가 쓴 버퍼 수
    buffers_backend         -- 백엔드가 직접 쓴 버퍼 수 (높으면 문제)
FROM pg_stat_bgwriter;
```

**분석:**
- `checkpoints_req`가 높으면: `max_wal_size` 증가 필요
- `buffers_backend`이 높으면: `shared_buffers` 또는 `checkpoint_timeout` 조정

### 4. WAL 아카이빙 설정 (PITR)

```sql
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /mnt/wal_archive/%f && cp %p /mnt/wal_archive/%f'
archive_timeout = 300  -- 5분마다 강제 아카이브
```

**백업 스크립트:**
```bash
#!/bin/bash
# 베이스 백업
pg_basebackup -D /mnt/backup/base -Ft -z -P

# WAL 아카이브 + 베이스 백업 = Point-in-Time Recovery 가능!
```

### 5. 복구 테스트

```bash
# 1. 특정 시점으로 복구
recovery_target_time = '2025-10-19 14:30:00'
recovery_target_action = 'promote'

# 2. 특정 트랜잭션까지 복구
recovery_target_xid = '12345'

# 3. 특정 LSN까지 복구
recovery_target_lsn = '0/1A2B3C4D'
```

---

## 요약

### WAL의 핵심 원리

1. **Write-Ahead Rule**: 데이터 전에 로그를 먼저 기록
2. **순차 쓰기**: 빠른 WAL 기록으로 성능 향상
3. **내구성 보장**: 커밋된 트랜���션은 절대 손실 안 됨
4. **체크포인트**: 주기적으로 dirty page를 디스크에 기록
5. **Crash Recovery**: WAL 재실행으로 데이터 복구

### WAL 최적화 체크리스트

- ✅ `wal_buffers` 적절히 설정 (16MB 이상)
- ✅ `checkpoint_timeout`과 `max_wal_size` 조정
- ✅ `wal_compression` 활성화
- ✅ `checkpoint_completion_target` = 0.9
- ✅ WAL 디스크를 별도 파티션으로 분리
- ✅ 정기적으로 WAL 통계 모니터링
- ❌ `fsync = off` 절대 사용 금지!

### 참고 자료

- [PostgreSQL WAL 공식 문서](https://www.postgresql.org/docs/current/wal.html)
- [Reliability and the Write-Ahead Log](https://www.postgresql.org/docs/current/wal-reliability.html)
- [WAL Configuration](https://www.postgresql.org/docs/current/wal-configuration.html)

---

**작성일**: 2025-10-19
**대상 버전**: PostgreSQL 15+
