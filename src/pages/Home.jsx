import React, { useState, useEffect } from 'react';
import db from '../utils/db';
import CalendarBox from '../components/CalendarBox';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';

function Home() {
    const [transactions, setTransactions] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editTarget, setEditTarget] = useState(null);  // 수정할 거래 상태 추가

    useEffect(() => {
        const fetchTransactions = async () => {
            const allTransactions = await db.transactions.toArray();
            setTransactions(allTransactions);
        }
        fetchTransactions();
    }, []);
    
    const handleAddTransaction = (transaction) => {
        setTransactions((prev) => [transaction, ...prev]);
        setEditTarget(null);  // 추가 후 수정 상태 초기화
    };

    const handleDeleteTransaction = (id) => {
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        setEditTarget(null);  // 삭제 후 수정 상태 초기화
    };

    const handleUpdateTransaction = (updatedTx) => {
        setTransactions(prev =>
            prev.map(tx => (tx.id === updatedTx.id ? updatedTx : tx))
        );
        setEditTarget(null);  // 수정 완료 후 수정 상태 초기화
    };

    // 수정할 거래를 선택하는 핸들러 추가
    const handleEditClick = (transaction) => {
        setEditTarget(transaction);
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
                onEdit={handleEditClick}  // 수정 핸들러 연결
            />
        </div>
    )
}

export default Home;