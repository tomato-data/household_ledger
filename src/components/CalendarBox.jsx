import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../App.css';

function CalendarBox({ transactions, selectedDate, setSelectedDate }) {
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
            <ul className="calendar-day-list">
              {income > 0 && (
                <li className="income">{income.toLocaleString()}</li>
               )}
               {expense > 0 && (
                <li className="expense">{expense.toLocaleString()}</li>
               )}
            </ul>
          );
        }}
      />

      {/* 상세 내역 표시 */}
      <div style={{ marginTop: '1rem' }}>
        <h4>{selectedDate.toLocaleDateString()} 상세 내역</h4>
        {transactionsForSelectedDate.length === 0 ? (
          <p>거래 내역이 없습니다.</p>
        ) : (
          <ul>
            {transactionsForSelectedDate.map(tx => (
              <li 
                key={tx.id}
                className={tx.type === 'income' ? 'income' : 'expense'}
              >
                [{new Date(tx.date).toLocaleDateString()}] : {tx.amount.toLocaleString()}원
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CalendarBox;