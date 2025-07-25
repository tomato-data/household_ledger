import React, { useState, useEffect } from 'react';

function TransactionForm({ onAdd, onUpdate, editTarget, selectedDate }) {
    const [text, setText] = useState('');
    const [amount, setAmount] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editID, setEditId] = useState(null);
    
    useEffect(() => {
        if (editTarget) {
            setText(editTarget.description);
            setAmount(editTarget.amount.toString());
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
        };

        if (editMode) {
            onUpdate(newTransaction);
        } else {
            onAdd(newTransaction);  // 부모에게 전달 (Home.jsx)
        } 
        setText('');
        setAmount('');
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
            <button type="submit">{editMode ? '수정' : '추가'}</button>
        </form>
    )
}

export default TransactionForm;