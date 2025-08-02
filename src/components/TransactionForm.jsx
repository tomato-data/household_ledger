import React, { useState, useEffect } from 'react';

function TransactionForm({ onAdd, onUpdate, editTarget, selectedDate }) {
    const [text, setText] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('기타'); // 기본값
    const [editMode, setEditMode] = useState(false);
    const [editID, setEditId] = useState(null);
    
    useEffect(() => {
        if (editTarget) {
            setText(editTarget.description);
            setAmount(editTarget.amount.toString());
            setCategory(editTarget.category || '기타');
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
            type: parseFloat(amount) > 0 ? 'income' : 'expense',
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
        setEditMode(false);
        setEditId(null);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="내역"
                value={text}
                onChange={(e) => setText(e.target.value)}
                />
            <input
                type="number"
                placeholder="금액"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                />
            <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
            >
                <option value="식비">식비</option>
                <option value="교통비">교통비</option>
                <option value="문화생활">문화생활</option>
                <option value="생필품">생필품</option>
                <option value="미용">미용</option>
                <option value="의료비">의료비</option>
                <option value="교육">교육</option>
                <option value="월세">월세</option>
                <option value="통신비">통신비</option>
                <option value="공과금">공과금</option>
                <option value="기타">기타</option>
            </select>
            <button type="submit">{editMode ? '수정' : '추가'}</button>
        </form>
    )
}

export default TransactionForm;