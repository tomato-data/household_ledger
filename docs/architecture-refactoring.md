# Backend 3-Layer Architecture 리팩토링 가이드

**작업 일자**: 2025-11-02
**작업 범위**: Category, Transaction, RecurringTransaction 도메인

---

## 목차
1. [리팩토링 배경](#1-리팩토링-배경)
2. [새로운 아키텍처](#2-새로운-아키텍처)
3. [각 계층의 역할](#3-각-계층의-역할)
4. [주요 패턴](#4-주요-패턴)
5. [특수 케이스](#5-특수-케이스)
6. [리팩토링 전후 비교](#6-리팩토링-전후-비교)
7. [파일 구조](#7-파일-구조)
8. [개선 효과](#8-개선-효과)
9. [학습 포인트](#9-학습-포인트)

---

## 1. 리팩토링 배경

### 기존 문제점

**Router에서 직접 DB 쿼리 수행**:
- 비즈니스 로직과 HTTP 로직 혼재
- 각 엔드포인트마다 DB 쿼리 중복 작성
- 유지보수 시 여러 파일 수정 필요

**테스트 어려움**:
- Router를 통하지 않으면 비즈니스 로직 테스트 불가
- DB 모킹이 복잡함

**코드 중복**:
- 같은 쿼리를 여러 엔드포인트에서 반복 작성
- 예: `db.query(CategoryModel).filter(user_id == ...).first()` 반복

**확장성 제한**:
- 새 기능 추가 시 기존 코드와 중복
- 비즈니스 로직 재사용 불가

---

## 2. 새로운 아키텍처

### 3-Layer Architecture

```
┌─────────────────────────────────────────┐
│  Router Layer (HTTP 처리)               │
│  - 요청 받기, 응답 반환                  │
│  - HTTPException 발생                   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Service Layer (비즈니스 로직)           │
│  - 여러 CRUD 조합                       │
│  - 트랜잭션 관리 (commit, rollback)      │
│  - None/False 반환                      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  CRUD Layer (DB 쿼리)                   │
│  - 순수 DB 작업만                       │
│  - flush() 사용                         │
│  - 단일 테이블 위주                      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Model Layer (SQLAlchemy ORM)           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Database (PostgreSQL)                  │
└─────────────────────────────────────────┘
```

---

## 3. 각 계층의 역할

### 3.1 CRUD Layer

**위치**: `backend/app/crud/*.py`

**역할**:
- 순수 DB 쿼리만 담당
- 재사용 가능한 쿼리 함수 제공
- 단일 테이블 작업 위주

**원칙**:
- ✅ `db.flush()` 사용 (commit은 Service에서)
- ❌ `db.commit()` 사용 금지
- ❌ `db.refresh()` 사용 안 함
- ✅ None 반환 (존재하지 않을 때)
- ❌ HTTPException 발생 금지
- ✅ 에러 처리 최소화

**예시**:
```python
# app/crud/category_crud.py

def get_category_by_id(
    db: Session, category_id: UUID, user_id: UUID
) -> Optional[CategoryModel]:
    """특정 카테고리 조회"""
    return (
        db.query(CategoryModel)
        .filter(CategoryModel.user_id == user_id)
        .filter(CategoryModel.id == category_id)
        .first()
    )

def create_category(
    db: Session, category: CategoryCreate, user_id: UUID
) -> CategoryModel:
    """카테고리 생성"""
    new_category = CategoryModel(
        **category.model_dump(),
        user_id=user_id,
    )
    db.add(new_category)
    db.flush()  # ID 생성 (commit 전)
    return new_category
```

**파일 목록**:
- `category_crud.py`: 카테고리 CRUD
- `transaction_crud.py`: 트랜잭션 CRUD + 통계 쿼리
- `recurring_transaction_crud.py`: 반복 트랜잭션 CRUD

---

### 3.2 Service Layer

**위치**: `backend/app/services/*.py`

**역할**:
- 비즈니스 로직 처리
- 여러 CRUD 함수 조합
- 트랜잭션 관리 (`commit`, `rollback`)
- 복잡한 검증 및 계산

**원칙**:
- ✅ CRUD 함수만 호출 (직접 쿼리 금지)
- ✅ `db.commit()` 담당
- ✅ `db.refresh()` 담당 (commit 후)
- ✅ None/False 반환 (실패 시)
- ❌ HTTPException 발생 금지 (Router에서)
- ✅ 클래스 기반 설계

**클래스 기반 설계 이유**:
- `db: Session`을 생성자에서 주입
- 모든 메서드에서 `self.db` 재사용
- 의존성 주입(Dependency Injection) 패턴
- 테스트 시 목(mock) DB 주입 용이

**예시**:
```python
# app/services/category_service.py

class CategoryService:
    def __init__(self, db: Session):
        self.db = db

    def create_category(self, category: CategoryCreate, user_id: UUID):
        """카테고리 생성"""
        # 1. CRUD 호출
        new_category = create_category(self.db, category, user_id)

        # 2. commit (영구 저장)
        self.db.commit()

        # 3. refresh (DB 기본값 로드: id, created_at 등)
        self.db.refresh(new_category)

        return new_category

    def delete_category(self, category_id: UUID, user_id: UUID) -> bool:
        """카테고리 삭제"""
        # 1. 존재 확인
        category = get_category_by_id(self.db, category_id, user_id)
        if not category:
            return False  # 실패

        # 2. 삭제
        delete_category(self.db, category)
        self.db.commit()

        return True  # 성공
```

**파일 목록**:
- `category_service.py`: CategoryService
- `transaction_service.py`: TransactionService
- `recurring_transaction_service.py`: RecurringTransactionService

---

### 3.3 Router Layer

**위치**: `backend/app/api/routes/*.py`

**역할**:
- HTTP 요청 받기
- Service 호출
- 응답 반환
- HTTPException 발생

**원칙**:
- ✅ Service 호출만
- ❌ 직접 DB 쿼리 금지
- ❌ 비즈니스 로직 금지
- ✅ None/False 체크 → HTTPException
- ✅ 간결하고 명확

**예시**:
```python
# app/api/routes/categories.py

@router.post("/", response_model=Category, status_code=status.HTTP_201_CREATED)
def create_category(
    category: CategoryCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """새 카테고리 생성"""
    # 1. Service 인스턴스 생성
    service = CategoryService(db)

    # 2. Service 호출
    new_category = service.create_category(category, current_user.id)

    # 3. 응답 (에러 체크 불필요, 생성은 항상 성공)
    return new_category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """카테고리 삭제"""
    service = CategoryService(db)
    success = service.delete_category(category_id, current_user.id)

    # None/False 체크
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return
```

**파일 목록**:
- `categories.py`: 카테고리 Router
- `transactions.py`: 트랜잭션 Router
- `recurring_transactions.py`: 반복 트랜잭션 Router

---

## 4. 주요 패턴

### 4.1 기본 CRUD 패턴

**조회 (Read)**:
```python
def get_category_by_id(db: Session, category_id: UUID, user_id: UUID):
    return (
        db.query(CategoryModel)
        .filter(CategoryModel.user_id == user_id)
        .filter(CategoryModel.id == category_id)
        .first()
    )
```

**생성 (Create)**:
```python
def create_category(db: Session, category: CategoryCreate, user_id: UUID):
    new_category = CategoryModel(**category.model_dump(), user_id=user_id)
    db.add(new_category)
    db.flush()  # ID 생성
    return new_category
```

**수정 (Update)**:
```python
def update_category(db: Session, category: CategoryModel, update: CategoryUpdate):
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.flush()
    return category
```

**삭제 (Delete)**:
```python
def delete_category(db: Session, category: CategoryModel):
    db.delete(category)
    db.flush()
```

---

### 4.2 Service 패턴

**생성**:
```python
def create_category(self, category: CategoryCreate, user_id: UUID):
    new_category = create_category(self.db, category, user_id)
    self.db.commit()
    self.db.refresh(new_category)
    return new_category
```

**수정**:
```python
def update_category(self, category_id: UUID, update: CategoryUpdate, user_id: UUID):
    # 1. 존재 확인
    category = get_category_by_id(self.db, category_id, user_id)
    if not category:
        return None

    # 2. 업데이트
    updated = update_category(self.db, category, update)
    self.db.commit()
    self.db.refresh(updated)
    return updated
```

**삭제**:
```python
def delete_category(self, category_id: UUID, user_id: UUID) -> bool:
    category = get_category_by_id(self.db, category_id, user_id)
    if not category:
        return False

    delete_category(self.db, category)
    self.db.commit()
    return True
```

---

### 4.3 Router 패턴

**생성**:
```python
@router.post("/", response_model=Category, status_code=status.HTTP_201_CREATED)
def create_category(...):
    service = CategoryService(db)
    new_category = service.create_category(category, current_user.id)
    return new_category
```

**수정**:
```python
@router.patch("/{category_id}", response_model=Category)
def update_category(...):
    service = CategoryService(db)
    updated = service.update_category(category_id, category_update, current_user.id)

    if not updated:
        raise HTTPException(status_code=404, detail="Category not found")
    return updated
```

**삭제**:
```python
@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(...):
    service = CategoryService(db)
    success = service.delete_category(category_id, current_user.id)

    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return
```

---

## 5. 특수 케이스

### 5.1 여러 테이블 작업 (RecurringTransaction 삭제)

**문제**:
- RecurringTransaction 삭제 시
- 연결된 scheduled Transaction도 삭제
- 2개 테이블 작업 → 하나의 트랜잭션으로 묶어야 함

**해결**:

**CRUD Layer** - 각 테이블별 함수 분리:
```python
def delete_scheduled_transactions_by_recurring_id(
    db: Session, recurring_id: UUID, user_id: UUID
) -> int:
    """연결된 scheduled Transaction 삭제"""
    deleted_count = db.query(TransactionModel).filter(
        TransactionModel.user_id == user_id,
        TransactionModel.recurring_id == recurring_id,
        TransactionModel.status == TransactionStatus.SCHEDULED,
    ).delete(synchronize_session=False)

    db.flush()
    return deleted_count

def soft_delete_recurring_transaction(
    db: Session, recurring: RecurringTransactionModel
) -> None:
    """RecurringTransaction soft delete"""
    from sqlalchemy import func

    recurring.deleted_at = func.now()
    recurring.is_active = False
    db.flush()
```

**Service Layer** - 2개 CRUD 조합:
```python
def delete_recurring_transaction(
    self, recurring_transaction_id: UUID, user_id: UUID
) -> Optional[int]:
    # 1. 존재 확인
    recurring = get_recurring_transaction_by_id(
        self.db, recurring_transaction_id, user_id
    )
    if not recurring:
        return None

    # 2. scheduled Transaction 삭제
    deleted_count = delete_scheduled_transactions_by_recurring_id(
        self.db, recurring_transaction_id, user_id
    )

    # 3. RecurringTransaction soft delete
    soft_delete_recurring_transaction(self.db, recurring)

    # 4. commit (2개 작업을 하나의 트랜잭션으로)
    self.db.commit()

    return deleted_count
```

**핵심**: Service가 여러 CRUD를 조율하여 하나의 트랜잭션으로 묶음

---

### 5.2 카테고리 검증 (Transaction 생성)

**문제**:
- Transaction 생성 시 category_id 검증 필요
- 존재하지 않는 카테고리 방지
- 다른 사용자의 카테고리 사용 방지

**해결**:

**Service Layer**:
```python
def create_transaction(self, transaction: TransactionCreate, user_id: UUID):
    # 1. 카테고리 검증
    category = get_category_by_id(self.db, transaction.category_id, user_id)
    if not category:
        return None  # 실패

    # 2. 트랜잭션 생성
    new_transaction = create_transaction(self.db, transaction, user_id)

    # 3. N+1 방지 (이미 조회한 category 재사용)
    new_transaction.category = category

    self.db.commit()
    self.db.refresh(new_transaction)
    return new_transaction
```

**Router Layer**:
```python
@router.post("", response_model=Transaction, status_code=201)
def create_transaction(...):
    service = TransactionService(db)
    new_transaction = service.create_transaction(transaction, current_user.id)

    if not new_transaction:
        raise HTTPException(status_code=404, detail="Category not found")

    return new_transaction
```

---

### 5.3 N+1 문제 방지

**N+1 문제란?**
- Transaction 목록 조회 시
- 각 Transaction의 category를 참조하면
- N개의 Transaction마다 1개씩 category 조회 (N+1 쿼리)

**해결 1: CRUD에서 joinedload**:
```python
def get_transactions_by_user(db: Session, user_id: UUID, ...):
    query = db.query(TransactionModel).options(
        joinedload(TransactionModel.category)  # eager loading
    )
    # ... 필터링
    return query.all()
```

**해결 2: Service에서 이미 조회한 객체 재사용**:
```python
# Transaction 생성 시 이미 category 검증으로 조회함
category = get_category_by_id(...)  # 1번 쿼리

# 생성 후 재사용
new_transaction.category = category  # 추가 쿼리 없음
```

---

## 6. 리팩토링 전후 비교

### 6.1 categories.py

**Before** (161줄):
```python
@router.get("/", response_model=List[Category])
def get_categories(...):
    categories = (
        db.query(CategoryModel)
        .filter(CategoryModel.user_id == current_user.id)
        .order_by(CategoryModel.order.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return categories

@router.post("/", response_model=Category, status_code=201)
def create_category(...):
    try:
        new_category = CategoryModel(
            **category.model_dump(),
            user_id=current_user.id,
        )
        db.add(new_category)
        db.commit()
        db.refresh(new_category)
        return new_category
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**After** (133줄, 17% 감소):
```python
@router.get("/", response_model=List[Category])
def get_categories(...):
    service = CategoryService(db)
    categories = service.get_categories(current_user.id, skip, limit)
    return categories

@router.post("/", response_model=Category, status_code=201)
def create_category(...):
    service = CategoryService(db)
    new_category = service.create_category(category, current_user.id)
    return new_category
```

**개선**:
- 코드 17% 감소
- DB 쿼리 로직 제거
- 에러 처리 단순화 (try-except 불필요)
- 간결하고 명확

---

### 6.2 transactions.py

**Before** (282줄):
```python
@router.post("", response_model=Transaction, status_code=201)
def create_transaction(...):
    # 1. 카테고리 검증
    category = (
        db.query(CategoryModel)
        .filter(CategoryModel.user_id == current_user.id)
        .filter(CategoryModel.id == transaction.category_id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # 2. 트랜잭션 생성
    new_transaction = TransactionModel(
        **transaction.model_dump(),
        user_id=current_user.id,
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    # 3. N+1 방지
    new_transaction.category = category

    return new_transaction
```

**After** (166줄, 41% 감소):
```python
@router.post("", response_model=Transaction, status_code=201)
def create_transaction(...):
    service = TransactionService(db)
    new_transaction = service.create_transaction(transaction, current_user.id)

    if not new_transaction:
        raise HTTPException(status_code=404, detail="Category not found")

    return new_transaction
```

**개선**:
- 코드 41% 대폭 감소
- 복잡한 로직 Service로 이동
- Router는 에러 처리만

---

### 6.3 통계 엔드포인트 비교

**Before**:
```python
@router.get("/stats/summary", response_model=TransactionStats)
def get_transaction_stats(...):
    # 전체 수입 합계
    total_income = (
        db.query(func.sum(TransactionModel.amount))
        .filter(TransactionModel.user_id == current_user.id)
        .filter(TransactionModel.type == "income")
        .filter(TransactionModel.status == "confirmed")
        .scalar()
        or 0
    )

    # 전체 지출 합계
    total_expense = (
        db.query(func.sum(TransactionModel.amount))
        .filter(TransactionModel.user_id == current_user.id)
        .filter(TransactionModel.type == "expense")
        .filter(TransactionModel.status == "confirmed")
        .scalar()
        or 0
    )

    # 트랜잭션 수
    transaction_count = (
        db.query(func.count(TransactionModel.id))
        .filter(TransactionModel.user_id == current_user.id)
        .filter(TransactionModel.status == "confirmed")
        .scalar()
        or 0
    )

    return TransactionStats(
        total_income=total_income,
        total_expense=total_expense,
        net_asset=total_income - total_expense,
        transaction_count=transaction_count,
    )
```

**After**:
```python
@router.get("/stats/summary", response_model=TransactionStats)
def get_transaction_stats(...):
    service = TransactionService(db)
    stats = service.get_stats(current_user.id)
    return stats
```

**개선**:
- 30줄 → 3줄 (90% 감소)
- 복잡한 집계 쿼리 + 계산 로직 Service로 이동
- Router는 한 줄로 호출

---

## 7. 파일 구조

```
backend/
├── app/
│   ├── crud/                           # CRUD Layer
│   │   ├── category_crud.py            # 카테고리 DB 쿼리
│   │   ├── transaction_crud.py         # 트랜잭션 DB 쿼리 + 통계
│   │   └── recurring_transaction_crud.py  # 반복 트랜잭션 DB 쿼리
│   │
│   ├── services/                       # Service Layer
│   │   ├── category_service.py         # CategoryService 클래스
│   │   ├── transaction_service.py      # TransactionService 클래스
│   │   └── recurring_transaction_service.py  # RecurringTransactionService 클래스
│   │
│   ├── api/
│   │   └── routes/                     # Router Layer
│   │       ├── categories.py           # 카테고리 HTTP 엔드포인트
│   │       ├── transactions.py         # 트랜잭션 HTTP 엔드포인트
│   │       └── recurring_transactions.py  # 반복 트랜잭션 HTTP 엔드포인트
│   │
│   ├── models/                         # SQLAlchemy 모델
│   │   ├── category.py
│   │   ├── transaction.py
│   │   └── recurring_transaction.py
│   │
│   └── schemas/                        # Pydantic 스키마
│       ├── category.py
│       ├── transaction.py
│       └── recurring_transaction.py
```

---

## 8. 개선 효과

### 8.1 코드 품질

✅ **중복 제거**:
- 같은 쿼리를 한 곳에서 관리
- DRY(Don't Repeat Yourself) 원칙 준수

✅ **관심사 분리** (Separation of Concerns):
- HTTP 처리 (Router)
- 비즈니스 로직 (Service)
- DB 쿼리 (CRUD)

✅ **간결성**:
- Router 코드 17-41% 감소
- 각 함수가 단일 책임만 수행

---

### 8.2 유지보수성

✅ **변경 영향 최소화**:
- DB 쿼리 변경 → CRUD만 수정
- 비즈니스 로직 변경 → Service만 수정
- HTTP 규격 변경 → Router만 수정

✅ **재사용성**:
- CRUD 함수를 다른 Service에서 재사용
- Service 로직을 다른 Router에서 재사용

✅ **가독성**:
- 각 계층의 역할이 명확
- 코드 추적이 쉬움

---

### 8.3 테스트 용이성

✅ **단위 테스트**:
- CRUD: DB 세션만 있으면 독립 테스트
- Service: CRUD를 모킹하여 테스트
- Router: Service를 모킹하여 테스트

✅ **통합 테스트**:
- 각 계층별로 독립 테스트 후 통합

---

### 8.4 확장성

✅ **새 기능 추가**:
- 기존 CRUD 재사용
- 새 비즈니스 로직만 Service에 추가

✅ **성능 최적화**:
- CRUD에서 쿼리 최적화 (한 곳만 수정)
- 영향 범위가 명확

---

## 9. 학습 포인트

### 9.1 Layered Architecture의 중요성

**왜 계층을 나누는가?**:
- 복잡도 관리: 큰 문제를 작은 문제로 분할
- 관심사 분리: 각 계층이 자신의 책임만 수행
- 변경 영향 최소화: 한 계층 변경이 다른 계층에 영향 적음

**실제 효과**:
- 코드 17-41% 감소
- 테스트 용이성 증가
- 유지보수 시간 단축

---

### 9.2 `flush()` vs `commit()` vs `refresh()`

**`db.flush()`**:
- DB에 변경사항 반영 (INSERT/UPDATE 실행)
- 하지만 **commit 안 함** (트랜잭션 유지)
- ID 같은 DB 생성값은 생성됨
- **CRUD에서 사용**

**`db.commit()`**:
- 트랜잭션을 영구 저장
- 변경사항 확정
- **Service에서 사용**

**`db.refresh(obj)`**:
- DB에서 객체의 최신 상태 다시 로드
- DB 기본값 (id, created_at, updated_at) 가져오기
- **Service에서 commit 후 사용**

**왜 CRUD에서 flush만?**:
- Service에서 여러 CRUD를 하나의 트랜잭션으로 묶을 수 있게
- 유연성 증가

---

### 9.3 의존성 주입 (Dependency Injection)

**패턴**:
```python
class CategoryService:
    def __init__(self, db: Session):
        self.db = db  # 의존성 주입
```

**장점**:
- 테스트 시 목(mock) DB 주입 가능
- 느슨한 결합 (Loose Coupling)
- 재사용성 증가

---

### 9.4 에러 처리 계층 분리

**CRUD Layer**:
- None 반환 (조회 실패)
- Exception 발생 안 함

**Service Layer**:
- None/False 반환 (비즈니스 로직 실패)
- Exception 발생 안 함

**Router Layer**:
- HTTPException 발생
- 사용자에게 적절한 HTTP 상태 ��드 반환

**장점**:
- 각 계층의 책임 명확
- 재사용성 증가 (CRUD, Service는 HTTP와 무관)

---

### 9.5 N+1 문제와 해결

**N+1 문제**:
```python
# 나쁜 예
transactions = db.query(TransactionModel).all()  # 1 쿼리

for t in transactions:
    print(t.category.name)  # N 쿼리 (각 transaction마다 category 조회)
```

**해결 1: joinedload (Eager Loading)**:
```python
transactions = db.query(TransactionModel).options(
    joinedload(TransactionModel.category)  # JOIN으로 한 번에 로드
).all()

for t in transactions:
    print(t.category.name)  # 추가 쿼리 없음
```

**해결 2: 이미 조회한 객체 재사용**:
```python
# Service에서
category = get_category_by_id(...)  # 1번 쿼리
new_transaction = create_transaction(...)
new_transaction.category = category  # 재사용, 추가 쿼리 없음
```

---

## 마무리

### 핵심 원칙 요약

1. **CRUD**: 순수 DB 쿼리만, flush() 사용
2. **Service**: 비즈니스 로직, commit() + refresh()
3. **Router**: HTTP 처리, Service 호출만

### 다음 단계

- ✅ 3-Layer Architecture 완성
- ⏭️ 백업 기능 추가 (같은 패턴 적용)
- ⏭️ 단위 테스트 작성
- ⏭️ Swagger 문서 업데이트

---

**작성일**: 2025-11-02
**작성자**: Household Ledger Development Team
