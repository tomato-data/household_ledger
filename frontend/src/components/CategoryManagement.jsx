import React, { useState } from 'react';
import { useCategories } from '../context/CategoryContext';
import './CategoryManagement.css';

function CategoryManagement({ onComplete }) {
    const {
        categories,
        loading,
        addCategory,
        updateCategory,
        deleteCategory,
    } = useCategories();

    const [newCategory, setNewCategory] = useState({ name: '', emoji: '' });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ name: '', emoji: '' });

    // 카테고리 추가
    const handleAdd = async () => {
        if (!newCategory.name || !newCategory.emoji) {
            alert('카테고리 이름과 이모지를 입력해주세요.');
            return;
        }

        try {
            await addCategory(newCategory);
            setNewCategory({ name: '', emoji: '' });
            alert('카테고리가 추가되었습니다. ✅');
        } catch (error) {
            console.error('카테고리 추가 실패:', error.message);
        }
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
    const handleUpdate = async () => {
        if (!editData.name || !editData.emoji) {
            alert('카테고리 이름과 이모지를 입력해주세요.');
            return;
        }

        try {
            await updateCategory(editingId, editData);
            setEditingId(null);
            setEditData({ name: '', emoji: '' });
            alert('카테고리가 수정되었습니다. ✅');
        } catch (error) {
            console.error('카테고리 수정 실패:', error.message);
        }
    };

    // 카테고리 삭제
    const handleDelete = async (categoryId, categoryName) => {
        const confirmed = window.confirm(
            `"${categoryName}" 카테고리를 삭제하시겠습니까?\n⚠️ 이 카테고리에 해당하는 거래에는 기본 설정값이 들어가며, 통계치 등을 제대로 보기위해서는 카테고리 재설정이 필요합니다.`
        );

        if (!confirmed) return;

        try {
            await deleteCategory(categoryId);
            alert('카테고리가 삭제되었습니다. ✅');
        } catch (error) {
            console.error('카테고리 삭제 실패:', error.message);
        }
    };

    if (loading) {
        return <div className="loading">카테고리 로딩 중...</div>;
    }

    return (
        <div className="category-management">
            <h3>카테고리 관리</h3>
            <p className="description">
                카테고리를 추가, 수정, 삭제할 수 있습니다.
            </p>

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
                <h4>📝 현재 카테고리 목록</h4>
                {categories.length === 0 ? (
                    <p className="no-categories">카테고리가 없습니다. 추가해보세요!</p>
                ) : (
                    <ul>
                        {categories.map((cat) => (
                            <li key={cat.id} className="category-item">
                                {editingId === cat.id ? (
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
                                        <span className="category-display">
                                            {cat.emoji} {cat.name}
                                        </span>
                                        <div className="actions">
                                            <button onClick={() => startEdit(cat)} className="btn-edit">
                                                ✏️ 수정
                                            </button>
                                            <button onClick={() => handleDelete(cat.id, cat.name)} className="btn-delete">
                                                🗑️ 삭제
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* 완료 버튼 (OnboardingModal에서만 사용) */}
            {onComplete && (
                <div className="complete-section">
                    <button onClick={onComplete} className="btn-complete">
                        완료
                    </button>
                </div>
            )}
        </div>
    );
}

export default CategoryManagement;