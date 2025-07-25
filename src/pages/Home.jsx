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
    const handleDeleteTransaction = (id) => {
        setTransactions(prev => prev.filter(tx => tx.id !== id));
    };

    const handleUpdateTransaction = (updatedTx) => {
        setTransactions(prev =>
            prev.map(tx => (tx.id === updatedTx.id ? updatedTx : tx))
        );
    };

    return (
        <div>
            <h2>가계부 내역</h2>
            <CalendarBox 
                transactions={transactions}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
            />
            <TransactionForm 
                onAdd={handleAddTransaction} 
                onUpdate={handleUpdateTransaction}
                selectedDate={selectedDate} 
                editTarget={editTarget}
            />
            <TransactionList 
                transactions={transactions} 
                onDelete={handleDeleteTransaction}
                onEdit={handleUpdateTransaction}
            />
        </div>
    )
}

export default Home;