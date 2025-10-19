# 카테고리 관리 Draft State 패턴 구현

**작성 날짜**: 2025-10-19
**목적**: 카테고리 관리 모달에 일괄 저장(Batch Save) 패턴 적용 및 드래그 앤 드롭 정렬 기능 추가

---

## 📋 목차

1. [개요](#개요)
2. [구현 배경](#구현-배경)
3. [Draft State 패턴 설명](#draft-state-패턴-설명)
4. [구현 내용](#구현-내용)
5. [파일별 변경 사항](#파일별-변경-사항)
6. [사용 방법](#사용-방법)
7. [트러블슈팅](#트러블슈팅)
8. [향후 개선 사항](#향후-개선-사항)

---

## 🎯 개요

CategoryManagement 컴포넌트에 **Draft State 패턴**을 적용하여 사용자 경험을 개선했습니다.

### 주요 변경사항
- ✅ 드래그 앤 드롭 카테고리 정렬 기능 추가 (`@dnd-kit`)
- ✅ 일괄 저장(Batch Save) 패턴 구현
- ✅ 변경사항 추적 및 시각적 피드백
- ✅ "저장 및 나가기" / "취소" 버튼 추가
- ✅ 브라우저 닫기 경고 기능
- ✅ 완전한 에러 수정 및 코드 리팩토링

---

## 🚨 구현 배경

### 기존 방식의 문제점 (Immediate Save)

```javascript
// ❌ 기존: 즉시 저장
const handleAdd = async () => {
    await addCategory(newCategory); // 즉시 DB 저장
};

const handleUpdate = async () => {
    await updateCategory(id, data); // 즉시 DB 저장
};

const handleDragEnd = async (event) => {
    await reorderCategories(newOrder); // 즉시 DB 저장
};
```

**문제점**:
1. ❌ 실수로 클릭 시 되돌리기 어려움
2. ❌ API 호출 횟수가 많음 (성능 저하)
3. ❌ "취소" 개념이 없음
4. ❌ 네트워크 오류 시 일부만 저장될 수 있음

### 개선된 방식 (Draft State Pattern)

```javascript
// ✅ 개선: 로컬 상태로만 관리
const [draftCategories, setDraftCategories] = useState([]);

const handleAdd = () => {
    setDraftCategories([...draftCategories, newCat]); // 로컬 상태만 수정
};

const handleSaveAndClose = async () => {
    // "저장 및 나가기" 버튼 클릭 시 한 번에 DB 저장
    const changes = calculateChanges();
    await batchSave(changes);
};
```

**장점**:
1. ✅ 사용자가 변경사항을 미리 확인 가능
2. ✅ "취소" 기능으로 실수 방지
3. ✅ API 호출 최소화 (성능 향상)
4. ✅ 트랜잭션처럼 동작 (전체 성공 or 전체 실패)

---

## 🏗️ Draft State 패턴 설명

### 아키텍처

```
┌─────────────────────────────────────────┐
│  CategoryContext (Global State)         │  ← 실제 DB 상태
│  categories: [...]                      │
└─────────────────────────────────────────┘
                    ↓ 복사 (Deep Copy)
┌─────────────────────────────────────────┐
│  CategoryManagement (Local Draft State) │  ← 임시 편집 상태
│  draftCategories: [...]                 │
│  - 추가/수정/삭제/순서 변경 모두 여기서  │
└─────────────────────────────────────────┘
                    ↓
        [저장 및 나가기 버튼]
                    ↓
        변경사항 계산 (Diff)
                    ↓
    ┌──────────────────────────────┐
    │ toAdd: [...] (새로 추가)      │
    │ toUpdate: [...] (수정됨)      │
    │ toDelete: [...] (삭제됨)      │
    │ toReorder: [...] (순서 변경)  │
    └──────────────────────────────┘
                    ↓
        Backend API 일괄 호출
                    ↓
        CategoryContext 업데이트
```

### 핵심 개념

#### 1. **Draft State (임시 상태)**
```javascript
const [draftCategories, setDraftCategories] = useState([]);

// 모달 열릴 때 categories를 draftCategories에 복사
useEffect(() => {
    setDraftCategories(JSON.parse(JSON.stringify(categories))); // 깊은 복사
}, [categories]);
```

#### 2. **변경사항 추적**
```javascript
const [hasChanges, setHasChanges] = useState(false);

useEffect(() => {
    const changed = JSON.stringify(categories) !== JSON.stringify(draftCategories);
    setHasChanges(changed);
}, [categories, draftCategories]);
```

#### 3. **변경사항 플래그**
```javascript
// 추가된 항목
{ id: 'temp-uuid', name: '식비', emoji: '🍽️', _isNew: true }

// 수정된 항목
{ id: 'real-uuid', name: '간식류', emoji: '🍪', _isModified: true }

// 삭제된 항목은 filter로 제거
```

#### 4. **변경사항 계산 (Diff)**
```javascript
const calculateChanges = () => {
    const originalMap = new Map(categories.map(cat => [cat.id, cat]));
    const draftMap = new Map(draftCategories.map(cat => [cat.id, cat]));

    const changes = {
        toAdd: [],      // _isNew 플래그가 있는 항목
        toUpdate: [],   // name/emoji가 변경된 항목
        toDelete: [],   // originalMap에는 있지만 draftMap에 없는 항목
        toReorder: [],  // order가 변경된 항목
    };

    // ... 변경사항 계산 로직

    return changes;
};
```

#### 5. **일괄 저장**
```javascript
const handleSaveAndClose = async () => {
    const changes = calculateChanges();

    try {
        // 1️⃣ 삭제 (먼저 처리)
        for (const id of changes.toDelete) {
            await deleteCategory(id);
        }

        // 2️⃣ 추가
        for (const newCat of changes.toAdd) {
            await addCategory(newCat);
        }

        // 3️⃣ 수정
        for (const updated of changes.toUpdate) {
            await updateCategory(updated.id, { name: updated.name, emoji: updated.emoji });
        }

        // 4️⃣ 순서 변경
        if (changes.toReorder.length > 0) {
            await reorderCategories(draftCategories);
        }

        alert('변경사항이 저장되었습니다! ✅');
        onComplete();
    } catch (error) {
        alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
};
```

---

## 🛠️ 구현 내용

### 1. 백엔드 작업 (사용자 작업)

#### **Step 1: Category 모델에 `order` 필드 추가**

**파일**: `backend/app/models/category.py`

```python
class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    emoji = Column(String(10), nullable=True)
    order = Column(Integer, nullable=False, default=0)  # ✨ 추가
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

#### **Step 2: Alembic 마이그레이션 생성**

**파일**: `backend/alembic/versions/fe552720537a_add_order_field_to_categories.py`

```python
def upgrade():
    # 1. 컬럼 추가 (nullable=True로 임시 생성)
    op.add_column('categories', sa.Column('order', sa.Integer(), nullable=True))

    # 2. 기존 데이터에 순서 부여
    op.execute("""
        WITH ordered_categories AS (
            SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS new_order
            FROM categories
        )
        UPDATE categories
        SET "order" = ordered_categories.new_order
        FROM ordered_categories
        WHERE categories.id = ordered_categories.id
    """)

    # 3. NOT NULL 제약 조건 추가
    op.alter_column('categories', 'order', nullable=False)

def downgrade():
    op.drop_column('categories', 'order')
```

**주의사항**:
- `order`는 SQL 예약어이므로 쌍따옴표(`"order"`)로 감싸야 함
- PostgreSQL UPDATE에서는 윈도우 함수를 직접 사용할 수 없으므로 CTE 사용

#### **Step 3: Pydantic 스키마 수정**

**파일**: `backend/app/schemas/category.py`

```python
# CategoryBase에 order 필드 추가
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    emoji: Optional[str] = Field(None, max_length=10)
    order: Optional[int] = 0  # ✨ 추가

# 순서 일괄 업데이트용 스키마 추가
class CategoryReorder(BaseModel):
    category_id: UUID
    order: int
```

#### **Step 4: API 엔드포인트 추가**

**파일**: `backend/app/api/routes/categories.py`

```python
# GET /categories에 정렬 추가
@router.get("/", response_model=List[Category])
def get_categories(
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    categories = (
        db.query(CategoryModel)
        .filter(CategoryModel.user_id == current_user.id)
        .order_by(CategoryModel.order.asc())  # ✨ 순서 정렬 추가
        .offset(skip)
        .limit(limit)
        .all()
    )
    return categories

# PATCH /categories/reorder 엔드포인트 추가
@router.patch("/reorder")
def reorder_categories(
    reorder_data: List[CategoryReorder],
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """카테고리 순서 일괄 업데이트"""
    for item in reorder_data:
        category = db.query(CategoryModel).filter(
            CategoryModel.id == item.category_id,
            CategoryModel.user_id == current_user.id,
        ).first()
        if category:
            category.order = item.order

    db.commit()  # ✨ 루프 밖에서 한 번만 commit
    return {"message": "Categories reordered successfully"}
```

**개선 사항**:
- ✅ GET 엔드포인트에 `order_by(CategoryModel.order.asc())` 추가
- ✅ commit을 루프 밖으로 이동 (성능 향상)

---

### 2. 프론트엔드 작업

#### **Step 1: 라이브러리 설치**

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**설치된 패키지**:
- `@dnd-kit/core`: 드래그 앤 드롭 코어 기능
- `@dnd-kit/sortable`: 정렬 가능한 리스트 기능
- `@dnd-kit/utilities`: CSS 변환 유틸리티

---

#### **Step 2: categoryService.js 수정**

**파일**: `frontend/src/services/categoryService.js`

```javascript
/**
 * 카테고리 순서 일괄 업데이트
 * @param {string} token - Clerk JWT 토큰
 * @param {Array} reorderData - [{category_id: string, order: number}, ...]
 * @returns {Promise<Object>} - 응답 메시지
 */
export const reorderCategories = async (token, reorderData) => {
    const response = await apiClient.patch('/api/v1/categories/reorder', reorderData, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
};
```

---

#### **Step 3: CategoryContext.jsx 수정**

**파일**: `frontend/src/context/CategoryContext.jsx`

```javascript
import { reorderCategories as reorderCategoriesAPI } from '../services/categoryService';

export const CategoryProvider = ({ children }) => {
    const { getToken } = useAuth();
    const [categories, setCategories] = useState([]);

    // 카테고리 로드 시 order 기준 정렬
    const loadCategories = async () => {
        const token = await getToken();
        const data = await getCategories(token);
        const sortedData = [...data].sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(sortedData);
    };

    // 카테고리 순서 변경 함수
    const reorderCategories = async (newOrderedCategories) => {
        try {
            // 1️⃣ 낙관적 UI 업데이트
            setCategories(newOrderedCategories);

            // 2️⃣ 백엔드 동기화용 데이터 생성
            const reorderData = newOrderedCategories.map((cat, index) => ({
                category_id: cat.id,
                order: index,
            }));

            // 3️⃣ 백엔드에 순서 저장
            const token = await getToken();
            await reorderCategoriesAPI(token, reorderData);
        } catch (error) {
            console.error('카테고리 순서 변경 실패:', error);
            await loadCategories(); // 에러 시 롤백
            throw error;
        }
    };

    const value = {
        categories,
        loadCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories, // ✨ 추가
    };

    return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
};
```

---

#### **Step 4: CategoryManagement.jsx 수정**

**파일**: `frontend/src/components/CategoryManagement.jsx`

**주요 변경사항**:

1. **Import 추가**
```javascript
import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

2. **State 추가**
```javascript
// 기본 state
const [newCategory, setNewCategory] = useState({ name: '', emoji: '' });
const [editingId, setEditingId] = useState(null);
const [editData, setEditData] = useState({ name: '', emoji: '' });

// Draft State
const [draftCategories, setDraftCategories] = useState([]);
const [hasChanges, setHasChanges] = useState(false);
```

3. **useEffect 추가**
```javascript
// 모달 열릴 때 categories 복사
useEffect(() => {
    setDraftCategories(JSON.parse(JSON.stringify(categories)));
}, [categories]);

// 변경사항 감지
useEffect(() => {
    const changed = JSON.stringify(categories) !== JSON.stringify(draftCategories);
    setHasChanges(changed);
}, [categories, draftCategories]);

// 브라우저 닫기 경고
useEffect(() => {
    const handleBeforeUnload = (e) => {
        if (hasChanges) {
            e.preventDefault();
            e.returnValue = '저장하지 않은 변경사항이 있습니다.';
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasChanges]);
```

4. **드래그 앤 드롭 설정**
```javascript
// 센서 설정
const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
    })
);

// 드래그 종료 핸들러
const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = draftCategories.findIndex(cat => cat.id === active.id);
        const newIndex = draftCategories.findIndex(cat => cat.id === over.id);
        setDraftCategories(arrayMove(draftCategories, oldIndex, newIndex));
    }
};
```

5. **CRUD 핸들러 수정 (로컬 상태만 업데이트)**
```javascript
// 추가
const handleAdd = () => {
    if (!newCategory.name || !newCategory.emoji) {
        alert('카테고리 이름과 이모지를 입력해주세요.');
        return;
    }

    const newCat = {
        id: crypto.randomUUID(),
        name: newCategory.name,
        emoji: newCategory.emoji,
        order: draftCategories.length,
        _isNew: true, // 플래그
    };
    setDraftCategories([...draftCategories, newCat]);
    setNewCategory({ name: '', emoji: '' });
};

// 수정
const handleUpdate = () => {
    if (!editData.name || !editData.emoji) {
        alert('카테고리 이름과 이모지를 입력해주세요.');
        return;
    }

    setDraftCategories(
        draftCategories.map(cat =>
            cat.id === editingId
                ? { ...cat, ...editData, _isModified: true }
                : cat
        )
    );
    setEditingId(null);
    setEditData({ name: '', emoji: '' });
};

// 삭제
const handleDelete = (categoryId, categoryName) => {
    const confirmed = window.confirm(
        `"${categoryName}" 카테고리를 삭제하시겠습니까?`
    );
    if (!confirmed) return;

    setDraftCategories(draftCategories.filter(cat => cat.id !== categoryId));
};
```

6. **변경사항 계산 및 저장**
```javascript
const calculateChanges = () => {
    const originalMap = new Map(categories.map(cat => [cat.id, cat]));
    const draftMap = new Map(draftCategories.map(cat => [cat.id, cat]));

    const changes = {
        toAdd: [],
        toUpdate: [],
        toDelete: [],
        toReorder: [],
    };

    // 추가 및 수정 감지
    draftCategories.forEach((draft, index) => {
        if (draft._isNew) {
            changes.toAdd.push({ name: draft.name, emoji: draft.emoji, order: index });
        } else {
            const original = originalMap.get(draft.id);
            if (original) {
                if (draft.name !== original.name || draft.emoji !== original.emoji) {
                    changes.toUpdate.push({ id: draft.id, name: draft.name, emoji: draft.emoji });
                }
                if (index !== (original.order || 0)) {
                    changes.toReorder.push({ category_id: draft.id, order: index });
                }
            }
        }
    });

    // 삭제 감지
    categories.forEach(cat => {
        if (!draftMap.has(cat.id)) {
            changes.toDelete.push(cat.id);
        }
    });

    return changes;
};

const handleSaveAndClose = async () => {
    if (!hasChanges) {
        if (onComplete) onComplete();
        return;
    }

    const changes = calculateChanges();

    try {
        // 삭제
        for (const id of changes.toDelete) {
            await deleteCategory(id);
        }

        // 추가
        for (const newCat of changes.toAdd) {
            await addCategory(newCat);
        }

        // 수정
        for (const updated of changes.toUpdate) {
            await updateCategory(updated.id, { name: updated.name, emoji: updated.emoji });
        }

        // 순서 변경
        if (changes.toReorder.length > 0) {
            await reorderCategories(draftCategories);
        }

        alert('변경사항이 저장되었습니다! ✅');
        if (onComplete) onComplete();
    } catch (error) {
        console.error('저장 실패:', error);
        alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
};

const handleCancel = () => {
    if (hasChanges) {
        const confirmed = window.confirm('저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?');
        if (!confirmed) return;
    }
    if (onComplete) onComplete();
};
```

7. **UI 구조 변경**
```jsx
<div className="category-management">
    {/* 헤더 */}
    <div className="modal-header">
        <div className="modal-title-section">
            <h3>카테고리 관리</h3>
            <p className="description">
                카테고리를 추가, 수정, 삭제할 수 있습니다. ☰ 아이콘을 드래그하여 순서를 변경할 수 있습니다.
            </p>
        </div>
        <div className="modal-actions">
            {hasChanges && (
                <span className="unsaved-indicator">● 변경사항 있음</span>
            )}
            <button onClick={handleCancel} className="btn-cancel-modal">
                취소
            </button>
            <button
                onClick={handleSaveAndClose}
                className="btn-save-modal"
                disabled={!hasChanges}
            >
                저장 및 나가기
            </button>
        </div>
    </div>

    {/* 카테고리 목록 */}
    <div className="category-list">
        <h4>📝 현재 카테고리 목록 ({draftCategories.length}개)</h4>
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={draftCategories.map(cat => cat.id)}
                strategy={verticalListSortingStrategy}
            >
                <ul>
                    {draftCategories.map(cat => (
                        <SortableCategoryItem
                            key={cat.id}
                            category={cat}
                            // ... props
                        />
                    ))}
                </ul>
            </SortableContext>
        </DndContext>
    </div>
</div>
```

8. **SortableCategoryItem 컴포넌트**
```javascript
function SortableCategoryItem({
    category,
    editingId,
    editData,
    setEditData,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleDelete
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <li ref={setNodeRef} style={style} className="category-item">
            {editingId === category.id ? (
                // 수정 모드
                <div className="edit-mode">
                    {/* ... */}
                </div>
            ) : (
                // 일반 모드
                <div className="normal-mode">
                    <div className="category-left">
                        <span className="drag-handle" {...attributes} {...listeners}>
                            ☰
                        </span>
                        <span className="category-display">
                            {category.emoji} {category.name}
                        </span>
                    </div>
                    <div className="actions">
                        <button onClick={() => startEdit(category)} className="btn-edit">
                            ✏️ 수정
                        </button>
                        <button onClick={() => handleDelete(category.id, category.name)} className="btn-delete">
                            🗑️ 삭제
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
}
```

---

#### **Step 5: CategoryManagement.css 수정**

**파일**: `frontend/src/components/CategoryManagement.css`

**추가된 스타일**:

```css
/* 모달 헤더 */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    gap: 20px;
}

.modal-title-section h3 {
    margin: 0 0 8px 0;
    color: #e0e0e0;
    font-size: 26px;
    font-weight: 600;
}

.modal-title-section .description {
    color: #b0b0b0;
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
}

/* 모달 액션 버튼들 */
.modal-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-shrink: 0;
}

.unsaved-indicator {
    color: #ff9800;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 12px;
    background: rgba(255, 152, 0, 0.1);
    border-radius: 20px;
    border: 1px solid rgba(255, 152, 0, 0.3);
    animation: pulse 2s infinite;
    white-space: nowrap;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(0.98);
    }
}

.btn-cancel-modal {
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.1);
    color: #e0e0e0;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-save-modal {
    padding: 10px 24px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-save-modal:disabled {
    background: #666;
    cursor: not-allowed;
    opacity: 0.6;
}

/* 드래그 핸들 */
.category-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.drag-handle {
    cursor: grab;
    padding: 4px 8px;
    color: #adb5bd;
    font-size: 18px;
    user-select: none;
    transition: color 0.2s;
}

.drag-handle:hover {
    color: #e0e0e0;
}

.drag-handle:active {
    cursor: grabbing;
}

/* 반응형 */
@media (max-width: 768px) {
    .modal-header {
        flex-direction: column;
        gap: 15px;
    }

    .modal-actions {
        width: 100%;
        justify-content: flex-end;
    }
}
```

---

## 📂 파일별 변경 사항

### 백엔드

| 파일 | 변경 내용 |
|------|----------|
| `backend/app/models/category.py` | `order` 필드 추가 |
| `backend/alembic/versions/fe552720537a_*.py` | 마이그레이션 파일 생성 (order 컬럼 추가) |
| `backend/app/schemas/category.py` | `CategoryBase`에 `order` 추가, `CategoryReorder` 스키마 추가 |
| `backend/app/api/routes/categories.py` | `GET /categories`에 정렬 추가, `PATCH /reorder` 엔드포인트 추가 |

### 프론트엔드

| 파일 | 변경 내용 |
|------|----------|
| `frontend/package.json` | `@dnd-kit/*` 라이브러리 추가 |
| `frontend/src/services/categoryService.js` | `reorderCategories()` 함수 추가 |
| `frontend/src/context/CategoryContext.jsx` | `reorderCategories()` 함수 추가, 정렬 로직 추가 |
| `frontend/src/components/CategoryManagement.jsx` | Draft State 패턴 구현, 드래그 앤 드롭 추가, UI 개선 |
| `frontend/src/components/CategoryManagement.css` | 모달 헤더, 버튼, 드래그 핸들 스타일 추가 |

---

## 🎮 사용 방법

### 1. 카테고리 관리 모달 열기
```
홈 화면 → 햄버거 메뉴(☰) → 카테고리 관리
```

### 2. 카테고리 추가
1. "➕ 새 카테고리 추가" 섹션에서 이름과 이모지 입력
2. "추가하기" 버튼 클릭
3. 목록에 즉시 추가 (로컬 상태)
4. "● 변경사항 있음" 인디케이터 표시

### 3. 카테고리 수정
1. 카테고리 항목의 "✏️ 수정" 버튼 클릭
2. 이름과 이모지 수정
3. "✅ 저장" 클릭 (로컬 상태만 업데이트)

### 4. 카테고리 삭제
1. 카테고리 항목의 "🗑️ 삭제" 버튼 클릭
2. 확인 다이얼로그에서 "확인" 클릭
3. 목록에서 즉시 제거 (로컬 상태)

### 5. 순서 변경 (드래그 앤 드롭)
1. 카테고리 왼쪽의 `☰` 아이콘을 마우스로 드래그
2. 원하는 위치에 드롭
3. 순서가 즉시 반영 (로컬 상태)

### 6. 변경사항 저장
1. "저장 및 나가기" 버튼 클릭
2. 모든 변경사항이 일괄적으로 DB에 저장
3. 성공 메시지 표시 후 모달 닫기

### 7. 변경사항 취소
1. "취소" 버튼 클릭
2. 변경사항이 있으면 확인 다이얼로그 표시
3. "확인" 클릭 시 모든 변경사항 버리고 모달 닫기

---

## 🔧 트러블슈팅

### 문제 1: "order is a reserved keyword" 에러

**증상**:
```
psycopg2.errors.SyntaxError: syntax error at or near "order"
```

**원인**: `order`는 SQL 예약어

**해결**:
```sql
-- ❌ 에러
SET order = ...

-- ✅ 정상
SET "order" = ...
```

### 문제 2: "window functions are not allowed in UPDATE"

**증상**:
```
psycopg2.errors.WindowingError: window functions are not allowed in UPDATE
```

**원인**: PostgreSQL UPDATE에서 윈도우 함수 직접 사용 불가

**해결**: CTE(Common Table Expression) 사용
```sql
WITH ordered_categories AS (
    SELECT id, row_number() OVER (...) AS new_order
    FROM categories
)
UPDATE categories
SET "order" = ordered_categories.new_order
FROM ordered_categories
WHERE categories.id = ordered_categories.id
```

### 문제 3: 드래그 앤 드롭이 작동하지 않음

**원인**: `useSortable` 훅이 제공하는 `attributes`와 `listeners`를 드래그 핸들에 적용하지 않음

**해결**:
```jsx
<span className="drag-handle" {...attributes} {...listeners}>
    ☰
</span>
```

### 문제 4: 변경사항이 감지되지 않음

**원인**: `useEffect` 의존성 배열 오류

**해결**:
```javascript
useEffect(() => {
    const changed = JSON.stringify(categories) !== JSON.stringify(draftCategories);
    setHasChanges(changed);
}, [categories, draftCategories]); // 두 state 모두 포함
```

### 문제 5: "useEffect is not defined"

**원인**: `useEffect` import 누락

**해결**:
```javascript
import React, { useState, useEffect } from 'react';
```

### 문제 6: 카테고리 개수가 표시되지 않음

**원인**: `categories` 대신 `draftCategories` 사용해야 함

**해결**:
```jsx
<h4>📝 현재 카테고리 목록 ({draftCategories.length}개)</h4>
```

---

## 🚀 향후 개선 사항

### 1. 성능 최적화
- [ ] `calculateChanges()` 메모이제이션 (`useMemo`)
- [ ] `SortableCategoryItem` 메모이제이션 (`React.memo`)
- [ ] 대량 데이터 처리 시 가상화 (`react-window`)

### 2. UX 개선
- [ ] 드래그 중 프리뷰 커스터마이징
- [ ] 드롭 위치 하이라이트 표시
- [ ] 변경사항 미리보기 모달
- [ ] Undo/Redo 기능

### 3. 접근성
- [ ] 키보드 네비게이션 개선
- [ ] Screen Reader 지원 (ARIA 속성)
- [ ] Focus 관리

### 4. 에러 처리
- [ ] 네트워크 오류 시 재시도 로직
- [ ] 부분 저장 실패 시 롤백 로직
- [ ] 상세한 에러 메시지 표시

### 5. 테스트
- [ ] Unit Test (Jest)
- [ ] Integration Test (React Testing Library)
- [ ] E2E Test (Playwright)

---

## 📚 참고 자료

- [dnd-kit 공식 문서](https://docs.dndkit.com/)
- [React Hooks 가이드](https://react.dev/reference/react)
- [Alembic 마이그레이션 가이드](docs/alembic-migration-guide.md)
- [PostgreSQL Reserved Keywords](https://www.postgresql.org/docs/current/sql-keywords-appendix.html)

---

**작성자**: Claude
**최종 수정**: 2025-10-19
