import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

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

          const txs = transactions.filter(
            tx => new Date(tx.date).toDateString() === date.toDateString()
          );

          if (txs.length === 0) return null;

          return (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {txs.slice(0, 2).map((tx, idx) => (
                <li
                  key={idx}
                  style={{ fontSize: '0.6rem', color: tx.amount > 0 ? 'green' : 'red' }}
                >
                  {tx.description}
                </li>
              ))}
              {txs.length > 2 && (
                <li style={{ fontSize: '0.5rem', color: '#888' }}>+{txs.length - 2} more</li>
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
              <li key={tx.id}>
                {tx.description}: {tx.amount}원 ({tx.type})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CalendarBox;