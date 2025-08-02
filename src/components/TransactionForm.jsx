import React, { useState, useEffect } from 'react';

function TransactionForm({ onAdd, onUpdate, editTarget, selectedDate }) {
    const [text, setText] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('기타'); // 기본값
    const [type, setType] = useState('income'); // 수입/지출 선택
    const [editMode, setEditMode] = useState(false);
    const [editID, setEditId] = useState(null);
    
    useEffect(() => {
        if (editTarget) {
            setText(editTarget.description);
            setAmount(editTarget.amount.toString());
            setCategory(editTarget.category || '기타');
            setType(editTarget.type || 'income');
            setEditMode(true);
            setEditId(editTarget.id);
        }
    }, [editTarget]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!text || !amount) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        const newTransaction = {
            id: editMode ? editID : crypto.randomUUID(),
            description: text,
            amount: parseFloat(amount),
            type: type,
            date: selectedDate.toISOString(),
            category: category,
        };

        if (editMode) {
            onUpdate(newTransaction);
        } else {
            onAdd(newTransaction);  // 부모에게 전달 (Home.jsx)
        } 
        setText('');
        setAmount('');
        setCategory('기타');
        setType('income'); // 초기화
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

                {/* 금액 입력 */}
                <div className="form-group">
                    <label className="form-label">금액</label>
                    <div className="amount-input-wrapper">
                        <input
                            type="number"
                            className="form-input amount-input"
                            placeholder="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <span className="currency">원</span>
                    </div>
                </div>

                {/* 카테고리 선택 */}
                <div className="form-group">
                    <label className="form-label">카테고리</label>
                    <select 
                        className="form-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="식비">🍽️ 식비</option>
                        <option value="교통비">🚗 교통비</option>
                        <option value="문화생활">🎭 문화생활</option>
                        <option value="생필품">🛒 생필품</option>
                        <option value="미용">💄 미용</option>
                        <option value="의료비">🏥 의료비</option>
                        <option value="교육">📚 교육</option>
                        <option value="월세">🏠 월세</option>
                        <option value="통신비">📱 통신비</option>
                        <option value="공과금">⚡ 공과금</option>
                        <option value="기타">📝 기타</option>
                    </select>
                </div>

                {/* 제출 버튼 */}
                <div className="form-actions">
                    <button type="submit" className={`submit-btn ${type}`}>
                        {editMode ? '✅ 수정 완료' : '➕ 추가하기'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default TransactionForm;