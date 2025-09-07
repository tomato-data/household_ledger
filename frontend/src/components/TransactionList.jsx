import React from 'react';
import TransactionItem from './TransactionItem';

function TransactionList({ transactions, onEdit, onDelete }) {
    return (
        <div className="transaction-list-container">
            <h3 className="transaction-list-title">거래 내역</h3>
            {transactions.length === 0 ? (
                <div className="empty-state">
                    <p>등록된 거래 내역이 없습니다.</p>
                </div>
            ) : (
                <div className="transaction-list">
                    {transactions.map((transaction) => (
                        <TransactionItem 
                            key={transaction.id}
                            transaction={transaction}
                            onDelete={onDelete}
                            onEdit={onEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default TransactionList;