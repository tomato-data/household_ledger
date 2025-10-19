import React, { useState, useEffect } from 'react';
import { useCategories } from '../context/CategoryContext';
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
import './CategoryManagement.css';

// 드래그 가능한 카테고리 아이템 컴포넌트
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
                    <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="name-input"
                    />
                    <input
                        type="text"
                        value={editData.emoji}
                        onChange={(e) => setEditData({ ...editData, emoji: e.target.value })}
                        className="emoji-input"
                        maxLength={2}
                    />
                    <button onClick={handleUpdate} className="btn-save">
                        ✅ 저장
                    </button>
                    <button onClick={cancelEdit} className="btn-cancel">
                        ❌ 취소
                    </button>
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

function CategoryManagement({ onComplete }) {
    const {
        categories,
        loading,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
    } = useCategories();

    const [newCategory, setNewCategory] = useState({ name: '', emoji: '' });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ name: '', emoji: '' });

    // Draft State (로컬 임시 상태)
    const [draftCategories, setDraftCategories] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);

    // 모달 열릴 때 categories를 draftCategories에 복사
    useEffect(() => {
        setDraftCategories(JSON.parse(JSON.stringify(categories)));
    }, [categories]);

    // 변경 사항 감지
    useEffect(() => {
        const changed = JSON.stringify(categories) !== JSON.stringify(draftCategories);
        setHasChanges(changed);
    }, [categories, draftCategories]);

    // 브라우저 닫기 경고
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges]);

    // 드래그 앤 드롭 센서 설정
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
            const oldIndex = draftCategories.findIndex((cat) => cat.id === active.id);
            const newIndex = draftCategories.findIndex((cat) => cat.id === over.id);
            setDraftCategories(arrayMove(draftCategories, oldIndex, newIndex));
        }
    };

    // 카테고리 추가
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
            _isNew: true,
        };
        setDraftCategories([...draftCategories, newCat]);
        setNewCategory({ name: '', emoji: '' });
    };

    // 수정 모드 진입
    const startEdit = (category) => {
        setEditingId(category.id);
        setEditData({ name: category.name, emoji: category.emoji });
    };

    // 수정 취소
    const cancelEdit = () => {
        setEditingId(null);
        setEditData({ name: '', emoji: '' });
    };

    // 카테고리 수정
    const handleUpdate = () => {
        if (!editData.name || !editData.emoji) {
            alert('카테고리 이름과 이모지를 입력해주세요.');
            return;
        }

        setDraftCategories(
            draftCategories.map((cat) =>
                cat.id === editingId
                    ? { ...cat, ...editData, _isModified: true }
                    : cat
            )
        );
        setEditingId(null);
        setEditData({ name: '', emoji: '' });
    };

    // 카테고리 삭제
    const handleDelete = (categoryId, categoryName) => {
        const confirmed = window.confirm(
            `"${categoryName}" 카테고리를 삭제하시겠습니까?\n⚠️ 이 카테고리에 해당하는 거래에는 기본 설정값이 들어가며, 통계치 등을 제대로 보기위해서는 카테고리 재설정이 필요합니다.`
        );

        if (!confirmed) return;

        setDraftCategories(draftCategories.filter((cat) => cat.id !== categoryId));
    };

    // 변경사항 계산
    const calculateChanges = () => {
        const originalMap = new Map(categories.map((cat) => [cat.id, cat]));
        const draftMap = new Map(draftCategories.map((cat) => [cat.id, cat]));

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
        categories.forEach((cat) => {
            if (!draftMap.has(cat.id)) {
                changes.toDelete.push(cat.id);
            }
        });

        return changes;
    };

    // 저장 및 닫기
    const handleSaveAndClose = async () => {
        if (!hasChanges) {
            if (onComplete) {
                onComplete();
            }
            return;
        }

        const changes = calculateChanges();

        try {
            // 삭제 먼저 처리
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
            if (onComplete) {
                onComplete();
            }
        } catch (error) {
            console.error('저장 실패:', error);
            alert('저장에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 취소
    const handleCancel = () => {
        if (hasChanges) {
            const confirmed = window.confirm('저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?');
            if (!confirmed) return;
        }

        if (onComplete) {
            onComplete();
        }
    };

    if (loading) {
        return <div className="loading">카테고리 로딩 중...</div>;
    }

    return (
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
                        <span className="unsaved-indicator" title="저장되지 않은 변경사항이 있습니다">
                            ● 변경사항 있음
                        </span>
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

            {/* 새 카테고리 추가 */}
            <div className="add-section">
                <h4>➕ 새 카테고리 추가</h4>
                <div className="input-group">
                    <input
                        type="text"
                        placeholder="카테고리 이름 (예: 식비)"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        className="name-input"
                    />
                    <input
                        type="text"
                        placeholder="이모지 (예: 🍽️)"
                        value={newCategory.emoji}
                        onChange={(e) => setNewCategory({ ...newCategory, emoji: e.target.value })}
                        className="emoji-input"
                        maxLength={2}
                    />
                    <button onClick={handleAdd} className="add-btn">
                        추가하기
                    </button>
                </div>
            </div>

            {/* 카테고리 목록 */}
            <div className="category-list">
                <h4>📝 현재 카테고리 목록 ({draftCategories.length}개)</h4>
                {draftCategories.length === 0 ? (
                    <p className="no-categories">카테고리가 없습니다. 추가해보세요!</p>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={draftCategories.map((cat) => cat.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <ul>
                                {draftCategories.map((cat) => (
                                    <SortableCategoryItem
                                        key={cat.id}
                                        category={cat}
                                        editingId={editingId}
                                        editData={editData}
                                        setEditData={setEditData}
                                        startEdit={startEdit}
                                        cancelEdit={cancelEdit}
                                        handleUpdate={handleUpdate}
                                        handleDelete={handleDelete}
                                    />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
}

export default CategoryManagement;
