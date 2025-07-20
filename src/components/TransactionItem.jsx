import React from 'react';

function TransactionItem({ transaction }) {
    const formattedDate = new Date(transaction.date).toLocaleDateString();
    
    return (
        <li style={{ color: transaction.amount > 0 ? 'green' : 'red'}}>
            [{formattedDate}] {transaction.descripttion}: {transaction.amount}원 ({transaction.type})
        </li>
    );
}

export default TransactionItem;