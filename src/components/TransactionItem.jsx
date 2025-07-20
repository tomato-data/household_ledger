import React from 'react';

function TransactionItem({ transaction }) {
    return (
        <li style={{ color: transaction.amount > 0 ? 'green' : 'red'}}>
            {transaction.descripttion}: {transaction.amount}원 ({transaction.type})
        </li>
    );
}

export default TransactionItem;