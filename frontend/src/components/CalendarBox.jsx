import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { getTransactionsForDate, formatDateToYYYYMMDD, formatDisplayDate } from '../utils/formatDate';
import 'react-calendar/dist/Calendar.css';
import '../App.css';

function CalendarBox({ transactions, recurringTransactions, selectedDate, setSelectedDate, onDelete, onEdit }) {
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

  const isValidPeriod = (recurring, currentYear, currentMonth) => {
    if (recurring.start_date) {
      const [startYear, startMonth] = recurring.start_date.split('-').map(Number);
      const currentYearMonth = currentYear * 12 + currentMonth;
      const startYearMonth = startYear * 12 + (startMonth - 1);

      if (currentYearMonth < startYearMonth) {
        return false; // 아직 시작 월이 아님
      }
    }

    if (recurring.end_date) {
      const [endYear, endMonth] = recurring.end_date.split('-').map(Number);
      const currentYearMonth = currentYear * 12 + currentMonth;
      const endYearMonth = endYear * 12 + (endMonth - 1);

      if (currentYearMonth > endYearMonth) {
        return false; // 종료 월이 지났음
      }
    }

    return true;
  }

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

  // 특정 날짜에 해당하는 거래내역 필터링 (유틸리티 함수 사용)
  const transactionsForSelectedDate = getTransactionsForDate(transactions, selectedDate);

  // 해당 날짜의 반복 거래도 포함
  const recurringForSelectedDate = (recurringTransactions || []).filter(recurring => {
    return parseInt(recurring.day_of_month) === selectedDate.getDate() &&
           isValidPeriod(recurring, selectedDate.getFullYear(), selectedDate.getMonth()) &&
           !transactionsForSelectedDate.some(tx => tx.recurring_id === recurring.id);
  }).map(recurring => ({
    ...recurring,
    id: `recurring-${recurring.id}`,
    date: formatDateToYYYYMMDD(selectedDate),
    isRecurring: true,
    status: 'recurring'
  }));

  const allTransactionsForSelectedDate = [...transactionsForSelectedDate, ...recurringForSelectedDate];

  return (
    <div>
      <Calendar
        calendarType="gregory"
        onChange={setSelectedDate}  // 🔁 날짜 클릭 시 상태 변경
        value={selectedDate}
        tileContent={({ date, view }) => {
          if (view !== 'month') return null;

          // 유틸리티 함수로 해당 날짜의 트랜잭션 필터링
          const dayTxs = getTransactionsForDate(transactions, date);

          // 반복 거래 중 해당 날짜에 해당하는 것 찾기
          const recurringForDay = (recurringTransactions || []).filter(recurring => {
            const dayOfMonth = parseInt(recurring.day_of_month);
            const isValidDate = dayOfMonth === date.getDate();
            const isValidTime = isValidPeriod(recurring, date.getFullYear(), date.getMonth());
            const hasExistingTx = dayTxs.some(tx => tx.recurring_id === recurring.id);

            return isValidDate && isValidTime && !hasExistingTx;
          });

          if (dayTxs.length === 0 && recurringForDay.length === 0) return null;

          // 실제 거래 금액 계산
          const income = dayTxs
            .filter(tx => tx.type === 'income' && tx.status === 'confirmed')
            .reduce((sum, tx) => sum + tx.amount, 0);

          const expense = dayTxs
            .filter(tx => tx.type === 'expense' && tx.status === 'confirmed')
            .reduce((sum, tx) => sum + tx.amount, 0);

          const scheduledIncome = dayTxs
            .filter(tx => tx.type === 'income' && tx.status === 'scheduled')
            .reduce((sum, tx) => sum + tx.amount, 0);

          const scheduledExpense = dayTxs
            .filter(tx => tx.type === 'expense' && tx.status === 'scheduled')
            .reduce((sum, tx) => sum + tx.amount, 0);

          // 반복 거래 금액 계산
          const recurringIncome = recurringForDay
            .filter(r => r.type === 'income')
            .reduce((sum, r) => sum + (r.amount || 0), 0);

          const recurringExpense = recurringForDay
            .filter(r => r.type === 'expense')
            .reduce((sum, r) => sum + (r.amount || 0), 0);

          return (
            <div className="calendar-day-list">
              <div className="calendar-income-slot">
                {income > 0 && (
                  <div className="income">{income.toLocaleString()}</div>
                )}
                {scheduledIncome > 0 && (
                  <div className="scheduled-income">⏰{scheduledIncome.toLocaleString()}</div>
                )}
                {recurringIncome > 0 && (
                  <div className="recurring-income">📅{recurringIncome.toLocaleString()}</div>
                )}
              </div>
              <div className="calendar-expense-slot">
                {expense > 0 && (
                  <div className="expense">{expense.toLocaleString()}</div>
                )}
                {scheduledExpense > 0 && (
                  <div className="scheduled-expense">⏰{scheduledExpense.toLocaleString()}</div>
                )}
                {recurringExpense > 0 && (
                  <div className="recurring-expense">📅{recurringExpense.toLocaleString()}</div>
                )}
              </div>
            </div>
          );
        }}
      />

      {/* 상세 내역 표시 */}
      <div className="simple-details-section">
        <h4 className="simple-details-title">{formatDisplayDate(selectedDate, 'full')} 상세 내역</h4>
        {allTransactionsForSelectedDate.length === 0 ? (
          <p className="no-transactions-text">거래 내역이 없습니다.</p>
        ) : (
          <div className="simple-details-list">
            {allTransactionsForSelectedDate.map(tx => (
                <div key={tx.id} className={`simple-detail-row ${tx.status === 'scheduled' ? 'scheduled' : ''}
                ${tx.status === 'recurring' ? 'recurring' : ''}`}>
                <div className="simple-detail-left">
                  <span className="simple-emoji">{tx.category.emoji || getCategoryEmoji(tx.category?.name)}</span>
                  <span className="simple-description">
                    {tx.status === 'scheduled' ? '⏰' : tx.status === 'recurring' ? '📅' : ''}
                    {tx.description}
                  </span>
                  <span className="simple-category">({tx.category?.name})</span>
                </div>
                <div className="simple-detail-right">
                  <span className={`simple-amount ${tx.type} ${tx.status === 'scheduled' ? 'scheduled' : ''}`}>
                    {tx.type === 'income' ? '+' : ''}{tx.amount.toLocaleString()}원
                  </span>
                  <div className="simple-actions">
                    <button
                      className="simple-action-btn edit-btn"
                      onClick={() => onEdit(tx)}
                      title="수정"
                      disabled={tx.status === 'recurring'}
                    >
                      ✏️
                    </button>
                    <button
                      className="simple-action-btn delete-btn"
                      onClick={() => handleDeleteClick(tx)}
                      title="삭제"
                      disabled={tx.status === 'scheduled'}
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
                  <span className="delete-emoji">{deleteConfirm.transaction.category.emoji || getCategoryEmoji(deleteConfirm.transaction.category?.name)}</span>
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