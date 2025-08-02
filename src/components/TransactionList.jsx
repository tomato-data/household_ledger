import React from 'react';
import TransactionItem from './TransactionItem';

function TransactionList({ transactions, onEdit, onDelete }) {
    return (
        <ul>
            {transactions.map((transaction) => (
                <TransactionItem 
                key={transaction.id}
                transaction={transaction}
                onDelete={onDelete}
                onEdit={onEdit}
                />
            ))}
        </ul>
    );
}

export default TransactionList;