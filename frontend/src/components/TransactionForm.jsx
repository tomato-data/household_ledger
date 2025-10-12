import React, { useState, useEffect, useRef } from 'react';
import { useCategories } from '../context/CategoryContext';

function TransactionForm({ onAdd, onUpdate, editTarget, selectedDate }) {
    // Context에서 카테고리 가져오기
    const { categories, loading: categoriesLoading } = useCategories();

    // 상태 관리
    const [text, setText] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState(''); // 기본값
    const [type, setType] = useState('expense'); // 수입/지출 선택
    const [status, setStatus] = useState('confirmed');
    const [editMode, setEditMode] = useState(false);
    const [editID, setEditId] = useState(null);
    const amountInputRef = useRef(null);

    // 천단위 콤마 포맷팅 함수
    const formatNumber = (num) => {
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // 콤마 제거 함수
    const removeCommas = (str) => {
        return str.replace(/,/g, '');
    };

    // 금액 입력 핸들러
    const handleAmountChange = (e) => {
        const value = e.target.value;
        // 숫자와 콤마만 허용
        const numbersOnly = removeCommas(value);
        if (numbersOnly === '' || /^\d+$/.test(numbersOnly)) {
            setAmount(numbersOnly ? formatNumber(numbersOnly) : '');
        }
    };

    useEffect(() => {
        if (editTarget) {
            setText(editTarget.description);
            setAmount(formatNumber(editTarget.amount.toString()));
            setCategoryId(editTarget.category_id || (categories.length > 0 ? categories[0].id : ''));
            setType(editTarget.type || 'income');
            setStatus(editTarget.status || 'confirmed'); // 기존 상태 로드
            setEditMode(true);
            setEditId(editTarget.id);
        }
    }, [editTarget]);

    // 폼이 열릴 때 금액 입력란에 포커스
    useEffect(() => {
        const timer = setTimeout(() => {
            if (amountInputRef.current) {
                amountInputRef.current.focus();
            }
        }, 100); // 약간의 지연으로 모달 애니메이션 후 포커스

        return () => clearTimeout(timer);
    }, []);

    // 선택된 날짜가 미래인지 확인하고 상태 자동 설정
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정

        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);

        if (selected > today) {
            setStatus('scheduled'); // 미래 날짜면 자동으로 scheduled
        } else {
            setStatus('confirmed'); // 오늘이나 과거면 confirmed
        }
    }, [selectedDate]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!text || !amount || !categoryId) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        const newTransaction = {
            id: editMode ? editID : crypto.randomUUID(),
            description: text,
            amount: parseFloat(removeCommas(amount)),
            type: type,
            date: selectedDate.toISOString(),
            category_id: categoryId,
            status: status,
            recurring_id: null,
        };

        if (editMode) {
            onUpdate(newTransaction);
        } else {
            onAdd(newTransaction);  // 부모에게 전달 (Home.jsx)
        }
        setText('');
        setAmount('');
        setCategoryId(categories.length > 0 ? categories[0].id : '');
        setType('expense'); // 초기화
        setStatus('confirmed');
        setEditMode(false);
        setEditId(null);
    };

    return (
        <div className="transaction-form-container">
            <div className="form-header">
                <h3>{editMode ? '거래 수정' : '새 거래 추가'}</h3>
                <p>선택된 날짜: {selectedDate.toLocaleDateString()}</p>
            </div>

            <form onSubmit={handleSubmit} className="transaction-form">
                {/* 수입/지출 토글 버튼 */}
                <div className="form-group">
                    <label className="form-label">유형</label>
                    <div className="type-toggle">
                        <button
                            type="button"
                            className={`type-btn ${type === 'income' ? 'active income' : ''}`}
                            onClick={() => setType('income')}
                        >
                            💰 수입
                        </button>
                        <button
                            type="button"
                            className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
                            onClick={() => setType('expense')}
                        >
                            💸 지출
                        </button>
                    </div>
                </div>

                {/* 거래 상태 선택 */}
                <div className="form-group">
                    <label className="form-label">거래 상태</label>
                    <div className="status-toggle">
                        <button
                            type="button"
                            className={`status-btn ${status === 'confirmed' ? 'active' : ''}`}
                            onClick={() => setStatus('confirmed')}
                        >
                            ✅ 확정
                        </button>
                        <button
                            type="button"
                            className={`status-btn ${status === 'scheduled' ? 'active' : ''}`}
                            onClick={() => setStatus('scheduled')}
                        >
                            ⏰ 예약
                        </button>
                    </div>
                    <p className="status-help-text">
                        {status === 'confirmed' ? '이미 발생한 거래입니다.' : '미래에 발생할 예정인 거래입니다.'}
                    </p>
                </div>

                {/* 금액 입력 */}
                <div className="form-group">
                    <label className="form-label">금액</label>
                    <div className="amount-input-wrapper">
                        <input
                            type="text"
                            className="form-input amount-input"
                            placeholder="0"
                            value={amount}
                            onChange={handleAmountChange}
                            ref={amountInputRef}
                        />
                        <span className="currency">원</span>
                    </div>
                </div>

                {/* 내역 입력 */}
                <div className="form-group">
                    <label className="form-label">내역</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="거래 내역을 입력하세요"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>

                {/* 카테고리 선택 */}
                <div className="form-group">
                    <label className="form-label">카테고리</label>
                    <div className="category-grid">
                        {categoriesLoading ? (
                            <p className="loading-message">Loading categories...</p>
                        ) : categories.length === 0 ? (
                            <p className="no-categories">No categories found</p>
                        ) : (
                        categories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`category-btn ${categoryId === cat.id ? 'active' : ''}`}
                                onClick={() => setCategoryId(cat.id)}
                            >
                                {cat.emoji} {cat.name}
                            </button>
                        ))
                    )}
                    </div>
                </div>

                {/* 제출 버튼 */}
                <div className="form-actions">
                    <button type="submit" className={`submit-btn ${type}`}>
                        {editMode ? '✅ 수정 완료' : (status === 'scheduled' ? '⏰ 예약하기' : '➕ 추가하기')}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default TransactionForm;