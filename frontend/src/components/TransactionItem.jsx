import React from 'react';

function TransactionItem({ transaction, onDelete, onEdit }) {
    const formattedDate = new Date(transaction.date).toLocaleDateString();
    
    return (
        <div className={`transaction-item ${transaction.type}`}>
            <div className="transaction-info">
                <div className="transaction-date">{formattedDate}</div>
                <div className="transaction-description">{transaction.description}</div>
            </div>
            <div className="transaction-amount-section">
                <div className={`transaction-amount ${transaction.type}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}원
                </div>
                <div className="transaction-actions">
                    <button 
                        className="action-btn edit-btn"
                        onClick={() => onEdit(transaction)}
                        title="수정"
                    >
                        ✏️
                    </button>
                    <button 
                        className="action-btn delete-btn"
                        onClick={() => onDelete(transaction.id)}
                        title="삭제"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TransactionItem;