import React, { useState } from 'react';

function TransactionForm({ onAdd, selectedDate }) {
    const [text, setText] = useState('');
    const [amount, setAmount] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();

        if (!text || !amount) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        const newTransaction = {
            id: crypto.randomUUID(),
            description: text,
            amount: parseFloat(amount),
            type: parseFloat(amount) > 0 ? 'income' : 'expense',
            date: selectedDate.toISOString(),
        };

        onAdd(newTransaction);  // 부모에게 전달 (Home.jsx)
        setText('');
        setAmount('');
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
            <button type="submit">추가</button>
        </form>
    )
}

export default TransactionForm;