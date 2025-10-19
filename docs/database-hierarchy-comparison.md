# 데이터베이스 계층 구조 비교: PostgreSQL vs MySQL vs SQLite

**작성 날짜**: 2025-10-19
**목적**: PostgreSQL, MySQL, SQLite의 데이터 저장 계층 구조를 비교하고 각각의 특징 이해

---

## 📋 목차

1. [개요](#개요)
2. [PostgreSQL 계층 구조](#postgresql-계층-구조)
3. [MySQL 계층 구조](#mysql-계층-구조)
4. [SQLite 계층 구조](#sqlite-계층-구조)
5. [계층별 상세 비교](#계층별-상세-비교)
6. [실전 예제](#실전-예제)
7. [선택 가이드](#선택-가이드)

---

## 🎯 개요

관계형 데이터베이스는 데이터를 **계층적 구조**로 관리합니다. 하지만 각 RDBMS마다 계층 구조가 다르며, 이는 아키텍처와 사용 사례에 영향을 미칩니다.

### 빠른 비교

| 계층 | PostgreSQL | MySQL | SQLite |
|------|-----------|-------|--------|
| **최상위** | Cluster | Server Instance | - |
| **2단계** | Database | Database | Database File |
| **3단계** | Schema | - | - |
| **4단계** | Table/View/Index | Table/View/Index | Table/View/Index |
| **5단계** | Tuple (Row) | Row | Row |
| **최하위** | Attribute (Column) | Column | Column |

---

## 🐘 PostgreSQL 계층 구조

PostgreSQL은 **가장 복잡하고 유연한** 계층 구조를 가지고 있습니다.

### 전체 계층

```
┌──────────────────────────────────────────────────┐
│ 1️⃣ Cluster (클러스터)                            │
│    - 여러 데이터베이스를 관리하는 최상위 개념      │
│    - 하나의 PostgreSQL 인스턴스                  │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 2️⃣ Database (데이터베이스)                       │
│    - 논리적으로 완전히 독립된 데이터베이스         │
│    - 서로 데이터 공유 불가                        │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 3️⃣ Schema (스키마)                              │
│    - 데이터베이스 내의 네임스페이스               │
│    - 테이블/뷰/함수 등을 논리적으로 그룹화         │
│    - 기본 스키마: public                         │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 4️⃣ Object (오브젝트)                            │
│    - Table (테이블)                              │
│    - View (뷰)                                   │
│    - Index (인덱스)                              │
│    - Sequence (시퀀스)                           │
│    - Function (함수)                             │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 5️⃣ Tuple (튜플) = Row (행)                      │
│    - 테이블의 한 행                              │
│    - MVCC로 인해 여러 버전 존재 가능              │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 6️⃣ Attribute (속성) = Column (열)               │
│    - 튜플의 각 필드                              │
│    - 데이터 타입과 제약 조건 포함                 │
└──────────────────────────────────────────────────┘
```

### 1. Cluster (클러스터)

**정의**: PostgreSQL 서버 인스턴스 전체

**특징**:
- 하나의 데이터 디렉토리 (`/var/lib/postgresql/data`)
- 하나의 `postgres` 프로세스가 관리
- 여러 데이터베이스를 포함
- 공통 설정 파일 (`postgresql.conf`)

**디렉토리 구조**:
```bash
/var/lib/postgresql/data/
├── base/              # 데이터베이스 디렉토리들
│   ├── 1/             # template1
│   ├── 13806/         # template0
│   ├── 16384/         # postgres (기본 DB)
│   └── 16385/         # household_ledger (우리 DB)
├── global/            # 클러스터 전역 데이터
├── pg_wal/            # Write-Ahead Log
├── pg_xact/           # 트랜잭션 상태
└── postgresql.conf    # 설정 파일
```

**확인 명령어**:
```sql
-- 클러스터 정보
SELECT version();
-- PostgreSQL 15.3 on x86_64-pc-linux-gnu

-- 데이터 디렉토리 위치
SHOW data_directory;
-- /var/lib/postgresql/data
```

### 2. Database (데이터베이스)

**정의**: 논리적으로 완전히 독립된 데이터베이스

**특징**:
- 서로 데이터 공유 불가 (JOIN 불가)
- 각 데이터베이스는 별도의 OID (Object ID)
- 기본 데이터베이스: `postgres`, `template0`, `template1`

**생성 및 확인**:
```sql
-- 데이터베이스 목록
\l
-- 또는
SELECT datname FROM pg_database;

-- 데이터베이스 생성
CREATE DATABASE household_ledger;

-- 데이터베이스 전환
\c household_ledger

-- 현재 데이터베이스 확인
SELECT current_database();
```

**물리적 위치**:
```bash
/var/lib/postgresql/data/base/16385/
├── 12345    # users 테이블 파일
├── 12346    # categories 테이블 파일
└── ...
```

### 3. Schema (스키마)

**정의**: 데이터베이스 내의 네임스페이스

**특징**:
- 같은 이름의 테이블을 다른 스키마에 생성 가능
- 기본 스키마: `public`
- 멀티 테넌트 구현에 유용
- 권한 관리 단위

**예시**:
```sql
-- 스키마 목록
\dn

-- 스키마 생성
CREATE SCHEMA sales;
CREATE SCHEMA marketing;

-- 각 스키마에 같은 이름의 테이블 생성 가능
CREATE TABLE sales.customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE marketing.customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

-- 테이블 접근 (스키마명.테이블명)
SELECT * FROM sales.customers;
SELECT * FROM marketing.customers;

-- 기본 스키마 (public)
CREATE TABLE users (id SERIAL);  -- 실제로는 public.users

-- 스키마 검색 경로 확인
SHOW search_path;
-- "$user", public
```

**실전 사용 예시 (멀티 테넌트)**:
```sql
-- 고객사별로 스키마 분리
CREATE SCHEMA tenant_company_a;
CREATE SCHEMA tenant_company_b;

-- 각 고객사의 데이터
CREATE TABLE tenant_company_a.orders (...);
CREATE TABLE tenant_company_b.orders (...);

-- 애플리케이션 레벨에서 스키마 전환
SET search_path TO tenant_company_a;
SELECT * FROM orders;  -- tenant_company_a.orders를 조회
```

### 4. Object (오브젝트)

**정의**: 스키마 내의 데이터베이스 객체

**종류**:
- **Table** (테이블): 데이터 저장
- **View** (뷰): 가상 테이블
- **Index** (인덱스): 검색 성능 향상
- **Sequence** (시퀀스): 자동 증가 번호
- **Function** (함수): 저장 프로시저
- **Type** (타입): 사용자 정의 타입

**예시**:
```sql
-- 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100)
);

-- 뷰
CREATE VIEW active_users AS
SELECT * FROM users WHERE last_login > NOW() - INTERVAL '30 days';

-- 인덱스
CREATE INDEX idx_users_email ON users(email);

-- 시퀀스
CREATE SEQUENCE user_id_seq;

-- 함수
CREATE FUNCTION get_user_count() RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM users);
END;
$$ LANGUAGE plpgsql;
```

### 5. Tuple (튜플)

**정의**: 테이블의 한 행 (Row)

**PostgreSQL의 특별한 점: MVCC (Multi-Version Concurrency Control)**
- 하나의 행이 **여러 버전**으로 존재할 수 있음
- UPDATE 시 기존 튜플은 유지하고 새 튜플 생성
- 동시성 제어에 유리

**튜플 구조**:
```
Tuple = Header + Data

Header (23 bytes):
- t_xmin: 생성한 트랜잭션 ID
- t_xmax: 삭제한 트랜잭션 ID
- t_cid: 생성/삭제 명령 ID
- t_ctid: 다음 버전 튜플 위치 (UPDATE 시)

Data:
- 실제 컬럼 값들
```

**MVCC 예시**:
```sql
-- 초기 데이터
INSERT INTO users (id, name) VALUES (1, 'Alice');
-- Tuple 1: xmin=100, xmax=0, name='Alice'

-- UPDATE 실행
UPDATE users SET name = 'Bob' WHERE id = 1;
-- Tuple 1: xmin=100, xmax=101, name='Alice' (Dead Tuple)
-- Tuple 2: xmin=101, xmax=0, name='Bob' (Live Tuple)

-- VACUUM으로 Dead Tuple 정리
VACUUM users;
-- Tuple 1 제거, Tuple 2만 남음
```

### 6. Attribute (속성)

**정의**: 튜플의 각 컬럼

**특징**:
- 데이터 타입
- 제약 조건 (NOT NULL, UNIQUE, CHECK 등)
- 기본값

**예시**:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    age INTEGER CHECK (age >= 0 AND age <= 150),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 컬럼 정보 확인
\d users

-- 결과:
--  Column   |       Type       | Nullable | Default
-- ----------+------------------+----------+---------
--  id       | uuid             | not null | gen_random_uuid()
--  name     | character varying| not null |
--  email    | character varying|          |
--  age      | integer          |          |
--  created_at | timestamp      |          | now()
```

---

## 🐬 MySQL 계층 구조

MySQL은 PostgreSQL보다 **단순한 계층 구조**를 가지고 있습니다.

### 전체 계층

```
┌──────────────────────────────────────────────────┐
│ 1️⃣ Server Instance (서버 인스턴스)               │
│    - MySQL 서버 프로세스                          │
│    - 여러 데이터베이스를 관리                      │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 2️⃣ Database (데이터베이스)                       │
│    - 논리적 데이터 저장 단위                      │
│    - PostgreSQL의 Schema와 유사한 역할            │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 3️⃣ Table (테이블)                               │
│    - 데이터 저장 단위                            │
│    - 스토리지 엔진에 따라 다름 (InnoDB, MyISAM)   │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 4️⃣ Row (행)                                     │
│    - 테이블의 한 행                              │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 5️⃣ Column (열)                                  │
│    - 행의 각 필드                                │
└──────────────────────────────────────────────────┘
```

### 주요 특징

#### 1. **Schema 개념 없음**

MySQL에서 `CREATE SCHEMA`는 `CREATE DATABASE`의 별칭일 뿐입니다.

```sql
-- MySQL에서는 동일한 명령
CREATE DATABASE mydb;
CREATE SCHEMA mydb;  -- 실제로는 CREATE DATABASE와 같음

-- PostgreSQL처럼 데이터베이스 내의 네임스페이스로 사용 불가
```

**PostgreSQL vs MySQL**:
```sql
-- PostgreSQL: 한 데이터베이스 내에 여러 스키마
CREATE DATABASE myapp;
\c myapp
CREATE SCHEMA sales;
CREATE SCHEMA marketing;
CREATE TABLE sales.customers (...);
CREATE TABLE marketing.customers (...);

-- MySQL: 여러 데이터베이스로 분리
CREATE DATABASE myapp_sales;
CREATE DATABASE myapp_marketing;
USE myapp_sales;
CREATE TABLE customers (...);
USE myapp_marketing;
CREATE TABLE customers (...);
```

#### 2. **Database = 디렉토리**

MySQL에서 각 데이터베이스는 물리적으로 별도 디렉토리입니다.

```bash
/var/lib/mysql/
├── myapp_sales/
│   ├── customers.ibd    # InnoDB 테이블 파일
│   ├── orders.ibd
│   └── db.opt           # 데이터베이스 옵션
├── myapp_marketing/
│   ├── customers.ibd
│   └── campaigns.ibd
└── mysql/               # 시스템 데이터베이스
    ├── user.ibd
    └── ...
```

#### 3. **스토리지 엔진**

MySQL은 **스토리지 엔진을 선택**할 수 있습니다.

```sql
-- InnoDB (기본, 트랜잭션 지원)
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100)
) ENGINE=InnoDB;

-- MyISAM (트랜잭션 미지원, 빠른 읽기)
CREATE TABLE logs (
    id INT PRIMARY KEY,
    message TEXT
) ENGINE=MyISAM;

-- Memory (메모리 전용, 재시작 시 손실)
CREATE TABLE temp_data (
    id INT PRIMARY KEY,
    value INT
) ENGINE=MEMORY;
```

**PostgreSQL과의 차이**:
- PostgreSQL: 스토리지 엔진 선택 불가 (하나의 스토리지 엔진만 사용)
- MySQL: 테이블마다 다른 스토리지 엔진 사용 가능

#### 4. **MVCC 구현 차이**

**PostgreSQL**:
```
UPDATE 시:
- 기존 튜플 유지 (Dead Tuple)
- 새 튜플 생성
- VACUUM으로 Dead Tuple 제거
```

**MySQL (InnoDB)**:
```
UPDATE 시:
- Undo Log에 이전 버전 저장
- 원본 행 자체를 업데이트
- Purge Thread가 Undo Log 정리
```

---

## 📦 SQLite 계층 구조

SQLite는 **가장 단순한** 계층 구조를 가지고 있습니다.

### 전체 계층

```
┌──────────────────────────────────────────────────┐
│ 1️⃣ Database File (데이터베이스 파일)             │
│    - 단일 파일 (예: mydb.sqlite)                  │
│    - 서버 없음 (Serverless)                      │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 2️⃣ Table (테이블)                               │
│    - 데이터 저장 단위                            │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 3️⃣ Row (행)                                     │
│    - 테이블의 한 행                              │
└──────────────────────────────────────────────────┘
         ↓ 포함 (1:N)
┌──────────────────────────────────────────────────┐
│ 4️⃣ Column (열)                                  │
│    - 행의 각 필드                                │
└──────────────────────────────────────────────────┘
```

### 주요 특징

#### 1. **단일 파일 데이터베이스**

```bash
# 파일 시스템
/path/to/app/
├── myapp.sqlite         # 전체 데이터베이스
├── backup.sqlite        # 백업 (파일 복사만으로 백업)
└── test.db             # 테스트 DB
```

**장점**:
- 설치 불필요 (라이브러리만 포함)
- 백업 간단 (파일 복사)
- 이식성 우수 (파일만 옮기면 됨)

**단점**:
- 동시 쓰기 제한
- 대용량 데이터 처리 어려움
- 네트워크 접근 불가

#### 2. **서버리스 (Serverless)**

```python
# PostgreSQL/MySQL: 서버 연결 필요
import psycopg2
conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='mydb',
    user='user',
    password='password'
)

# SQLite: 파일 경로만 필요
import sqlite3
conn = sqlite3.connect('mydb.sqlite')  # 서버 없음!
```

#### 3. **ATTACH DATABASE로 여러 DB 사용**

```sql
-- 메인 데이터베이스
-- myapp.sqlite

-- 다른 데이터베이스 연결
ATTACH DATABASE 'analytics.sqlite' AS analytics;
ATTACH DATABASE 'logs.sqlite' AS logs;

-- 다른 DB의 테이블에 접근
SELECT * FROM analytics.reports;
SELECT * FROM logs.error_logs;

-- JOIN도 가능
SELECT u.name, r.report_name
FROM users u
JOIN analytics.reports r ON u.id = r.user_id;

-- 연결 해제
DETACH DATABASE analytics;
```

#### 4. **동적 타이핑**

SQLite는 **동적 타입 시스템**을 사용합니다.

```sql
-- PostgreSQL/MySQL: 엄격한 타입
CREATE TABLE users (
    id INTEGER,
    name TEXT,
    age INTEGER
);

INSERT INTO users VALUES (1, 'Alice', 25);      -- OK
INSERT INTO users VALUES (2, 'Bob', 'thirty');  -- ❌ 에러! (MySQL/PostgreSQL)

-- SQLite: 유연한 타입
CREATE TABLE users (
    id INTEGER,
    name TEXT,
    age INTEGER
);

INSERT INTO users VALUES (1, 'Alice', 25);      -- OK
INSERT INTO users VALUES (2, 'Bob', 'thirty');  -- ✅ OK! (문자열 저장)
INSERT INTO users VALUES (3, 'Charlie', 30.5);  -- ✅ OK! (실수 저장)
```

**Storage Classes (저장 클래스)**:
- NULL
- INTEGER
- REAL
- TEXT
- BLOB

#### 5. **파일 내부 구조**

```
SQLite Database File
┌─────────────────────────────────┐
│ Header (100 bytes)              │
│ - Magic Number: "SQLite format 3"
│ - Page Size: 4096 bytes
│ - File Format Version
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Schema Page                     │
│ - sqlite_master 테이블          │
│ - 모든 테이블/인덱스 정의        │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Data Pages                      │
│ - 실제 테이블 데이터            │
│ - B-Tree 구조                   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Index Pages                     │
│ - 인덱스 데이터                 │
└─────────────────────────────────┘
```

---

## 📊 계층별 상세 비교

### 1. 클러스터/서버 레벨

| 기능 | PostgreSQL | MySQL | SQLite |
|------|-----------|-------|--------|
| **개념** | Cluster | Server Instance | 없음 (파일 기반) |
| **프로세스** | postgres | mysqld | 없음 (라이브러리) |
| **설정 파일** | postgresql.conf | my.cnf | 없음 (PRAGMA) |
| **포트** | 5432 | 3306 | 없음 |
| **동시 접속** | 제한 없음 | max_connections | 단일 writer |

### 2. 데이터베이스 레벨

| 기능 | PostgreSQL | MySQL | SQLite |
|------|-----------|-------|--------|
| **독립성** | 완전 독립 | 완전 독립 | 파일별 독립 |
| **크로스 DB 쿼리** | 불가 (dblink 사용) | 불가 | ATTACH로 가능 |
| **기본 DB** | postgres | mysql | main |
| **물리적 위치** | data/base/{oid}/ | /var/lib/mysql/{dbname}/ | 단일 파일 |

### 3. 스키마/네임스페이스 레벨

| 기능 | PostgreSQL | MySQL | SQLite |
|------|-----------|-------|--------|
| **스키마 지원** | ✅ 있음 | ❌ 없음 (DB가 스키마 역할) | ❌ 없음 |
| **기본 스키마** | public | 없음 | 없음 |
| **멀티 테넌트** | 스키마로 분리 | DB로 분리 | 파일로 분리 |
| **네임스페이스** | schema.table | database.table | database.table |

**예시**:
```sql
-- PostgreSQL
CREATE SCHEMA tenant_a;
CREATE TABLE tenant_a.users (...);
SELECT * FROM tenant_a.users;

-- MySQL
CREATE DATABASE tenant_a;
USE tenant_a;
CREATE TABLE users (...);
SELECT * FROM tenant_a.users;

-- SQLite
-- 별도 파일로 분리
ATTACH DATABASE 'tenant_a.db' AS tenant_a;
CREATE TABLE tenant_a.users (...);
SELECT * FROM tenant_a.users;
```

### 4. 테이블 레벨

| 기능 | PostgreSQL | MySQL | SQLite |
|------|-----------|-------|--------|
| **스토리지 엔진** | 단일 (heap) | 선택 가능 (InnoDB, MyISAM) | 단일 (B-Tree) |
| **트랜잭션** | 항상 지원 | InnoDB만 지원 | 지원 (제한적) |
| **외래키** | 지원 | InnoDB만 지원 | 지원 (활성화 필요) |
| **파티셔닝** | 지원 | 지원 | 미지원 |

### 5. 행 레벨 (Tuple/Row)

| 기능 | PostgreSQL | MySQL (InnoDB) | SQLite |
|------|-----------|----------------|--------|
| **용어** | Tuple | Row | Row |
| **MVCC** | Tuple 복사 | Undo Log | 저널 파일 |
| **Dead Tuple** | VACUUM 필요 | Purge Thread | 자동 정리 |
| **행 크기 제한** | 약 400GB | 약 65,535 bytes | 약 1GB |

### 6. 컬럼 레벨

| 기능 | PostgreSQL | MySQL | SQLite |
|------|-----------|-------|--------|
| **용어** | Attribute | Column | Column |
| **타입 시스템** | 엄격 | 엄격 | 동적 |
| **커스텀 타입** | 지원 (CREATE TYPE) | 제한적 (ENUM) | 미지원 |
| **배열 타입** | 지원 | 미지원 (JSON 사용) | 미지원 |

---

## 💻 실전 예제

### 예제 1: 멀티 테넌트 아키텍처

#### PostgreSQL (스키마 사용)

```sql
-- 테넌트별 스키마 생성
CREATE SCHEMA tenant_company_a;
CREATE SCHEMA tenant_company_b;

-- 각 스키마에 동일한 구조의 테이블 생성
CREATE TABLE tenant_company_a.users (
    id UUID PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE tenant_company_b.users (
    id UUID PRIMARY KEY,
    name VARCHAR(100)
);

-- 테넌트별 데이터 삽입
INSERT INTO tenant_company_a.users VALUES (gen_random_uuid(), 'Alice');
INSERT INTO tenant_company_b.users VALUES (gen_random_uuid(), 'Bob');

-- 검색 경로 설정으로 스키마 전환
SET search_path TO tenant_company_a;
SELECT * FROM users;  -- tenant_company_a.users

SET search_path TO tenant_company_b;
SELECT * FROM users;  -- tenant_company_b.users

-- 장점: 단일 데이터베이스 연결로 모든 테넌트 관리
-- 단점: 테넌트 간 격리 수준 낮음
```

#### MySQL (데이터베이스 사용)

```sql
-- 테넌트별 데이터베이스 생성
CREATE DATABASE tenant_company_a;
CREATE DATABASE tenant_company_b;

-- 각 데이터베이스에 테이블 생성
USE tenant_company_a;
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100)
);

USE tenant_company_b;
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100)
);

-- 테넌트별 데이터 삽입
USE tenant_company_a;
INSERT INTO users VALUES (UUID(), 'Alice');

USE tenant_company_b;
INSERT INTO users VALUES (UUID(), 'Bob');

-- 장점: 테넌트 간 완전 격리
-- 단점: 연결 전환 필요 (USE 명령)
```

#### SQLite (파일 사용)

```sql
-- 테넌트별 파일 생성
-- tenant_company_a.db
-- tenant_company_b.db

-- 메인 연결 (tenant_company_a.db)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT
);
INSERT INTO users VALUES (hex(randomblob(16)), 'Alice');

-- 다른 테넌트 연결
ATTACH DATABASE 'tenant_company_b.db' AS company_b;
CREATE TABLE company_b.users (
    id TEXT PRIMARY KEY,
    name TEXT
);
INSERT INTO company_b.users VALUES (hex(randomblob(16)), 'Bob');

-- 크로스 쿼리 가능
SELECT a.name, b.name
FROM users a
CROSS JOIN company_b.users b;

-- 장점: 파일 단위 격리, 백업 간단
-- 단점: 동시 쓰기 제한
```

---

### 예제 2: 계층 구조 확인

#### PostgreSQL

```sql
-- 1️⃣ 클러스터 정보
SELECT version();
SHOW data_directory;

-- 2️⃣ 데이터베이스 목록
SELECT datname, oid FROM pg_database;

-- 3️⃣ 스키마 목록
SELECT schema_name FROM information_schema.schemata;

-- 4️⃣ 테이블 목록
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema');

-- 5️⃣ 특정 테이블의 컬럼 정보
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users';

-- 6️⃣ 튜플 개수
SELECT schemaname, tablename, n_live_tup, n_dead_tup
FROM pg_stat_user_tables;
```

#### MySQL

```sql
-- 1️⃣ 서버 정보
SELECT VERSION();
SHOW VARIABLES LIKE 'datadir';

-- 2️⃣ 데이터베이스 목록
SHOW DATABASES;

-- 3️⃣ 스키마 (데이터베이스와 동일)
SHOW SCHEMAS;  -- SHOW DATABASES와 같음

-- 4️⃣ 테이블 목록
SHOW TABLES FROM household_ledger;

-- 5️⃣ 테이블 구조
DESCRIBE users;
-- 또는
SHOW COLUMNS FROM users;

-- 6️⃣ 테이블 상세 정보 (스토리지 엔진, 행 수 등)
SHOW TABLE STATUS LIKE 'users';
```

#### SQLite

```sql
-- 1️⃣ SQLite 버전
SELECT sqlite_version();

-- 2️⃣ 연결된 데이터베이스 목록
PRAGMA database_list;

-- 3️⃣ 테이블 목록
SELECT name FROM sqlite_master WHERE type='table';

-- 4️⃣ 테이블 구조
PRAGMA table_info(users);

-- 5️⃣ 전체 스키마
SELECT sql FROM sqlite_master WHERE type='table' AND name='users';

-- 6️⃣ 인덱스 목록
SELECT name FROM sqlite_master WHERE type='index';
```

---

### 예제 3: MVCC 동작 비교

#### PostgreSQL

```sql
-- 세션 1
BEGIN;
SELECT * FROM users WHERE id = 1;
-- id | name  | age
--  1 | Alice | 25

-- 세션 2
UPDATE users SET age = 26 WHERE id = 1;
-- 새 튜플 생성 (xmin=새트랜잭션ID)
-- 기존 튜플은 Dead Tuple (xmax=새트랜잭션ID)

-- 세션 1 (여전히 트랜잭션 중)
SELECT * FROM users WHERE id = 1;
-- id | name  | age
--  1 | Alice | 25  ← 여전히 이전 버전!

COMMIT;

-- 이제 새 버전 보임
SELECT * FROM users WHERE id = 1;
-- id | name  | age
--  1 | Alice | 26

-- Dead Tuple 확인
SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = 'users';
-- n_dead_tup: 1

-- VACUUM으로 정리
VACUUM users;
```

#### MySQL (InnoDB)

```sql
-- 세션 1
START TRANSACTION;
SELECT * FROM users WHERE id = 1;
-- id | name  | age
--  1 | Alice | 25

-- 세션 2
UPDATE users SET age = 26 WHERE id = 1;
-- Undo Log에 이전 버전 저장 (age=25)
-- 실제 행은 age=26으로 업데이트

-- 세션 1
SELECT * FROM users WHERE id = 1;
-- id | name  | age
--  1 | Alice | 25  ← Undo Log에서 읽음

COMMIT;

-- 이제 새 버전 보임
SELECT * FROM users WHERE id = 1;
-- id | name  | age
--  1 | Alice | 26

-- Purge Thread가 자동으로 Undo Log 정리
```

---

### 예제 4: 스토리지 엔진 차이 (MySQL)

```sql
-- InnoDB (트랜잭션 지원)
CREATE TABLE orders (
    id INT PRIMARY KEY,
    amount DECIMAL(10, 2)
) ENGINE=InnoDB;

BEGIN;
INSERT INTO orders VALUES (1, 100.00);
ROLLBACK;  -- ✅ 롤백됨

SELECT * FROM orders;  -- 빈 결과

-- MyISAM (트랜잭션 미지원)
CREATE TABLE logs (
    id INT PRIMARY KEY,
    message TEXT
) ENGINE=MyISAM;

BEGIN;
INSERT INTO logs VALUES (1, 'Test');
ROLLBACK;  -- ❌ 롤백 안 됨!

SELECT * FROM logs;
-- id | message
--  1 | Test    ← 롤백되지 않음!
```

---

## 🎯 선택 가이드

### PostgreSQL을 선택해야 하는 경우

✅ **추천 시나리오**:
- 복잡한 쿼리와 데이터 분석
- 멀티 테넌트 SaaS 애플리케이션 (스키마 활용)
- GIS 데이터 처리 (PostGIS)
- JSON/JSONB 고급 기능 필요
- 트랜잭션 무결성이 중요한 금융 시스템
- 대용량 데이터 처리 (100GB 이상)

**장점**:
- 가장 강력한 SQL 기능
- ACID 완벽 준수
- 확장성 우수 (파티셔닝, 상속 등)
- 풍부한 데이터 타입 (ARRAY, JSONB, UUID, INET 등)

**단점**:
- 초기 설정 복잡
- 메모리 사용량 높음
- VACUUM 관리 필요

---

### MySQL을 선택해야 하는 경우

✅ **추천 시나리오**:
- 읽기 중심 웹 애플리케이션
- WordPress, Drupal 등 오픈소스 CMS
- 레플리케이션이 중요한 경우 (설정 간단)
- 스토리지 엔진 선택이 필요한 경우
- 대규모 트래픽 웹사이트 (Facebook, Twitter 사용)

**장점**:
- 빠른 읽기 성능
- 간단한 레플리케이션 설정
- 스토리지 엔진 선택 가능
- 대규모 커뮤니티

**단점**:
- 스키마 기능 없음
- 일부 SQL 기능 제한적
- 트랜잭션 기능이 InnoDB에만 있음

---

### SQLite를 선택해야 하는 경우

✅ **추천 시나리오**:
- 모바일 앱 (iOS, Android)
- 데스크톱 애플리케이션
- 임베디드 시스템
- 프로토타이핑 및 테스트
- 작은 규모 웹사이트 (< 100,000 hits/day)
- 로컬 캐싱

**장점**:
- 설치 불필요 (제로 설정)
- 단일 파일로 이식성 우수
- 매우 가벼움 (< 1MB)
- 빠른 읽기 성능

**단점**:
- 동시 쓰기 제한 (한 번에 한 writer)
- 네트워크 접근 불가
- 대용량 데이터 처리 어려움
- 사용자 관리 기능 없음

---

## 📊 성능 비교

### 읽기 성능 (단순 SELECT)

```
벤치마크: SELECT * FROM users WHERE id = ?

SQLite:    0.001ms  ← 가장 빠름 (파일 직접 접근)
MySQL:     0.01ms   ← 빠름 (네트워크 오버헤드)
PostgreSQL: 0.02ms  ← 약간 느림 (MVCC 오버헤드)
```

### 쓰기 성능 (INSERT)

```
벤치마크: 100,000 행 일괄 INSERT

MySQL (InnoDB): 3초   ← 가장 빠름
PostgreSQL:     5초   ← 느림 (튜플 복사)
SQLite:         8초   ← 가장 느림 (동시 쓰기 제한)
```

### 복잡한 쿼리 (JOIN + 집계)

```
벤치마크: 5개 테이블 JOIN + GROUP BY + HAVING

PostgreSQL: 50ms  ← 가장 빠름 (쿼리 최적화)
MySQL:      80ms  ← 보통
SQLite:     150ms ← 느림 (제한적 최적화)
```

---

## 🎓 정리

### 계층 구조 요약

| 계층 | PostgreSQL | MySQL | SQLite |
|------|-----------|-------|--------|
| 최상위 | Cluster | Server | - |
| 격리 단위 | Database | Database | File |
| 네임스페이스 | Schema | - | - |
| 저장 단위 | Table | Table | Table |
| 행 | Tuple | Row | Row |
| 열 | Attribute | Column | Column |

### 핵심 차이점

**PostgreSQL**:
- ✅ 스키마로 세밀한 네임스페이스 관리
- ✅ 가장 강력한 SQL 기능
- ✅ MVCC로 동시성 우수
- ❌ 설정 복잡, VACUUM 필요

**MySQL**:
- ✅ 간단한 구조
- ✅ 스토리지 엔진 선택 가능
- ✅ 빠른 레플리케이션
- ❌ 스키마 없음

**SQLite**:
- ✅ 제로 설정
- ✅ 단일 파일
- ✅ 초경량
- ❌ 동시 쓰기 제한

---

## 📚 참고 자료

- [PostgreSQL Documentation: System Catalogs](https://www.postgresql.org/docs/current/catalogs.html)
- [MySQL Documentation: Data Directory](https://dev.mysql.com/doc/refman/8.0/en/data-directory.html)
- [SQLite Documentation: Database File Format](https://www.sqlite.org/fileformat.html)
- [PostgreSQL vs MySQL: A 360-degree Comparison](https://www.integrate.io/blog/postgresql-vs-mysql-which-one-is-better-for-your-use-case/)

---

**작성자**: Claude
**최종 수정**: 2025-10-19
