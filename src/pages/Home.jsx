import React, { useState} from 'react';
import CalendarBox from '../components/CalendarBox';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';

function Home() {
    const [transactions, setTransactions] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const handleAddTransaction = (transaction) => {
        setTransactions((prev) => [transaction, ...prev]);
    };

    return (
        <div>
            <h2>가계부 내역</h2>
            <CalendarBox value={selectedDate} onChange={setSelectedDate}/> {/* 달력 컴포넌트 */}
            <TransactionForm onAdd={handleAddTransaction} selectedDate={selectedDate} />
            <TransactionList transactions={transactions} />
        </div>
    )
}

export default Home;