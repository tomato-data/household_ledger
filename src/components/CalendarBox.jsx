import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../App.css';

function CalendarBox({ transactions, selectedDate, setSelectedDate, onDelete, onEdit }) {
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, transaction: null });

  // 삭제 확인 모달 관련 함수들
  const handleDeleteClick = (transaction) => {
    setDeleteConfirm({ show: true, transaction });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.transaction) {
      onDelete(deleteConfirm.transaction.id);
      setDeleteConfirm({ show: false, transaction: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, transaction: null });
  };

  // 카테고리 이모지 매핑
  const getCategoryEmoji = (category) => {
    const emojiMap = {
      '식비': '🍽️',
      '간식류': '🍪',
      '카페': '☕',
      '농구 패배': '🏀',
      '교통비': '🚗',
      '문화생활': '🎭',
      '취미생활': '🎮',
      '의류': '👔',
      '생필품': '🛒',
      '미용': '💈',
      '의료비': '🏥',
      '교육': '📚',
      '월급': '💰',
      '월세': '🏠',
      '통신비': '📱',
      '구독료': '📺',
      '공과금': '⚡',
      '기타': '📝'
    };
    return emojiMap[category] || '📝';
  };

  // 특정 날짜에 해당하는 거래내역 필터링
  const transactionsForSelectedDate = transactions.filter(
    tx => new Date(tx.date).toDateString() === selectedDate.toDateString()
  );

  return (
    <div>
      <Calendar
        calendarType="gregory"
        onChange={setSelectedDate}  // 🔁 날짜 클릭 시 상태 변경
        value={selectedDate}
        tileContent={({ date, view }) => {
          if (view !== 'month') return null;

          const dayTxs = transactions.filter(
            tx => new Date(tx.date).toDateString() === date.toDateString()
          );

          if (dayTxs.length === 0) return null;

          const income = dayTxs
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

          const expense = dayTxs
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

          return (
            <div className="calendar-day-list">
              <div className="calendar-income-slot">
                {income > 0 && (
                  <div className="income">{income.toLocaleString()}</div>
                )}
              </div>
              <div className="calendar-expense-slot">
                {expense > 0 && (
                  <div className="expense">{expense.toLocaleString()}</div>
                )}
              </div>
            </div>
          );
        }}
      />

      {/* 상세 내역 표시 */}
      <div className="simple-details-section">
        <h4 className="simple-details-title">{selectedDate.toLocaleDateString()} 상세 내역</h4>
        {transactionsForSelectedDate.length === 0 ? (
          <p className="no-transactions-text">거래 내역이 없습니다.</p>
        ) : (
          <div className="simple-details-list">
            {transactionsForSelectedDate.map(tx => (
              <div key={tx.id} className="simple-detail-row">
                <div className="simple-detail-left">
                  <span className="simple-emoji">{getCategoryEmoji(tx.category)}</span>
                  <span className="simple-description">{tx.description}</span>
                  <span className="simple-category">({tx.category})</span>
                </div>
                <div className="simple-detail-right">
                  <span className={`simple-amount ${tx.type}`}>
                    {tx.type === 'income' ? '+' : ''}{tx.amount.toLocaleString()}원
                  </span>
                  <div className="simple-actions">
                    <button 
                      className="simple-action-btn edit-btn"
                      onClick={() => onEdit(tx)}
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button 
                      className="simple-action-btn delete-btn"
                      onClick={() => handleDeleteClick(tx)}
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirm.show && (
        <div className="delete-modal-overlay" onClick={handleDeleteCancel}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h3>거래 삭제</h3>
              <p>정말로 이 거래를 삭제하시겠습니까?</p>
            </div>
            
            {deleteConfirm.transaction && (
              <div className="delete-modal-transaction">
                <div className="delete-transaction-info">
                  <span className="delete-emoji">{getCategoryEmoji(deleteConfirm.transaction.category)}</span>
                  <span className="delete-description">{deleteConfirm.transaction.description}</span>
                </div>
                <div className={`delete-amount ${deleteConfirm.transaction.type}`}>
                  {deleteConfirm.transaction.type === 'income' ? '+' : ''}{deleteConfirm.transaction.amount.toLocaleString()}원
                </div>
              </div>
            )}
            
            <div className="delete-modal-actions">
              <button className="delete-cancel-btn" onClick={handleDeleteCancel}>
                취소
              </button>
              <button className="delete-confirm-btn" onClick={handleDeleteConfirm}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarBox;