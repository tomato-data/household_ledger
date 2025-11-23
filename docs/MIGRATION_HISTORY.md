# 마이그레이션 이력

이 문서는 IndexedDB 로컬 전용 앱에서 FastAPI + PostgreSQL 풀스택 앱으로의 마이그레이션 상세 이력을 기록합니다.

---

## 2024-11-23: Frontend 백업/복원 기능 Backend API 전환 + IndexedDB 완전 제거

### 개요
프론트엔드의 백업/복원 기능을 IndexedDB 직접 접근에서 Backend API 사용으로 전환하고, IndexedDB(Dexie) 의존성을 완전히 제거했습니다.

### 완료된 작업

#### 1. backupService.js 생성
- **위치**: `frontend/src/services/backupService.js`
- **구현 함수**:
  - `exportBackup(token)`: gzip 압축 백업 다운로드
    - `responseType: 'blob'`으로 바이너리 응답 처리
    - Backend의 StreamingResponse로 gzip 파일 수신
  - `previewBackup(token, file)`: 복원 전 메타데이터 미리보기
    - FormData로 파일 업로드
    - BackupMetadata(버전, 생성일, 데이터 개수) 반환
  - `importBackup(token, file, overwrite)`: 백업 복원
    - FormData + params로 overwrite 옵션 전달
    - 기존 데이터 삭제 후 백업 데이터로 교체

#### 2. Home.jsx 백업 함수 수정
- **handleBackup()** 수정:
  - `db.allTransactions.toArray()` → `exportBackup(token)`
  - Blob 생성 로직 제거 (Backend에서 gzip Blob 반환)
  - 파일 확장자: `.json` → `.json.gz`

- **restoreFromFile()** 수정:
  - FileReader 코드 제거
  - `previewBackup()` → `window.confirm()` → `importBackup()` 흐름
  - 복원 후 Context 새로고침:
    - `loadCategories()`
    - `loadAllTransactions()`
    - `loadRecurringTransactions()`

- **handleRestoreFromDirectory()** 수정:
  - `.json.gz` 파일 지원 추가

#### 3. recurringScheduler.js 리팩토링
- **의존성 주입 패턴**으로 변경:
  - 기존: IndexedDB 직접 접근 (`db.transactions.add()`)
  - 변경: 파라미터로 데이터/함수 전달

- **수정된 함수 시그니처**:
  ```javascript
  // Before
  export const generateScheduledTransactions = async () => {
      const data = await db.recurring_transactions.toArray();
  }

  // After
  export const generateScheduledTransactions = async (
      recurringTransactions,
      allTransactions,
      addTransaction
  ) => {
      // Context에서 전달받은 값 사용
  }
  ```

- **현재 상태**: Home.jsx에서 호출하지 않음 (향후 Backend 스케줄러로 이동 예정)

#### 4. IndexedDB 완전 제거
- **삭제된 파일**:
  - `frontend/src/utils/db.js` (Dexie 정의)
  - `frontend/export_all_indexeddb.js` (마이그레이션 스크립트)

- **제거된 의존성**:
  - `package.json`에서 `dexie: ^4.0.11` 제거

- **제거된 Import**:
  - Home.jsx에서 `import db from '../utils/db'` 삭제
  - Home.jsx에서 `import { use } from 'react'` 삭제 (불필요)

### 학습 포인트

#### Blob (Binary Large Object)
- 브라우저에서 바이너리 데이터를 다루는 객체
- `URL.createObjectURL(blob)`로 임시 URL 생성하여 파일 다운로드 트리거
- `URL.revokeObjectURL(url)`로 메모리 해제

#### FormData
- 파일 업로드를 위한 `multipart/form-data` 요청 생성
- `formData.append('file', file)`로 파일 추가
- axios가 자동으로 `Content-Type` 헤더 설정 (직접 설정하면 안 됨)

#### responseType: 'blob'
- axios에서 바이너리 응답을 Blob 객체로 받음
- 기본값 `'json'`은 자동 파싱하므로 바이너리 데이터가 깨짐

#### 의존성 주입 패턴 (Dependency Injection)
- 유틸리티 함수에서 React Hook 제약 회피
- 테스트 용이성 향상 (mock 데이터 전달 가능)
- 함수의 재사용성 증가

### 파일 변경 요약

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/services/backupService.js` | 신규 생성 |
| `frontend/src/pages/Home.jsx` | 백업/복원 함수 수정, Import 정리 |
| `frontend/src/utils/recurringScheduler.js` | 의존성 주입 패턴으로 리팩토링 |
| `frontend/src/utils/db.js` | 삭제 |
| `frontend/export_all_indexeddb.js` | 삭제 |
| `frontend/package.json` | dexie 의존성 제거 |

---

## 이전 마이그레이션 이력

> 이전 마이그레이션 작업들의 상세 내역은 추후 정리 예정

### 주요 완료 항목 (요약)
- Backend 3-Layer Architecture 구축
- Category, Transaction, RecurringTransaction API 구현
- Backend 백업/복원 API (gzip 압축, UUID 매핑)
- Frontend Context API + Service 레이어 패턴 확립
- Clerk 인증 통합
- Docker Compose 환경 구축
- IndexedDB → PostgreSQL 데이터 마이그레이션 (261건)
- 통계 API + Recharts 시각화
- Soft Delete 패턴 (RecurringTransaction)
- Timezone 전략 (UTC/KST)
