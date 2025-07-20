import React from 'react';
import TransactionItem from './TransactionItem';

function TransactionList({ transactions }) {
    return (
        <ul>
            {transactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
        </ul>
    );
}

export default TransactionList;