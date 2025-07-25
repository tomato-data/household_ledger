import React from 'react';

function TransactionItem({ transaction, onDelete, onEdit }) {
    const formattedDate = new Date(transaction.date).toLocaleDateString();
    
    return (
        <li style={{ color: transaction.amount > 0 ? 'green' : 'red'}}>
            [{formattedDate}] {transaction.descripttion}: {transaction.amount}원 ({transaction.type})
            <button onClick={() => onDelete(transaction.id)}>❌</button>
            <button onClick={() => onEdit(transaction)}>✏️</button>
        </li>
    );
}

export default TransactionItem;