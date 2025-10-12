import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
    getTransactions,
    // getTransaction,
    createTransaction,
    updateTransaction as updateTransactionAPI,
    deleteTransaction as deleteTransactionAPI,
} from '../services/transactionService';

// 1. Context 생성
const TransactionContext = createContext();

// 2. Provider 컴포넌트 생성
export const TransactionProvider = ({ children }) => {
    const { getToken } = useAuth(); // Clerk에서 토큰 가져오기

    // 상태 관리
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        start_date: null,
        end_date: null,
        category_id: null,
        type: null,
    });

    const loadTransactions = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await getToken();
            const data = await getTransactions(token, filters);
            setTransactions(data);
        } catch (error) {
            console.error('트랜잭션 로딩 실패:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTransactions();
    }, [filters]); // filters가 변경될 때마다 트랜잭션 로드

    const addTransaction = async (transactionData) => {
        try {
            const token = await getToken();
            const newTransaction = await createTransaction(token, transactionData);

            // 상태에 새 트랜잭션 추가
            setTransactions([...transactions, newTransaction]);

            return newTransaction;
        } catch (error) {
            console.error('트랜잭션 생성 실패:', error);
            setError(error.message);
            throw error; // 호출한 곳에서 에러 처리하도록
        }
    };

    // 트랜잭션 수정 함수
    const updateTransaction = async (transactionId, transactionData) => {
        try {
            const token = await getToken();
            const updatedTransaction = await updateTransactionAPI(token, transactionId, transactionData);

            // 상태에서 해당 트랜잭션만 업데이트
            setTransactions(transactions.map(tx => tx.id === transactionId ? updatedTransaction : tx));

            return updatedTransaction;
        } catch (error) {
            console.error('트랜잭션 수정 실패:', error);
            setError(error.message);
            throw error; // 호출한 곳에서 에러 처리하도록
        }
    };

    // 트랜잭션 삭제 함수
    const deleteTransaction = async (transactionId) => {
        try {
            const token = await getToken();
            await deleteTransactionAPI(token, transactionId);

            // 상태에서 해당 트랜잭션 제거
            setTransactions(transactions.filter(tx => tx.id !== transactionId));
        } catch (error) {
            console.error('트랜잭션 삭제 실패:', error);
            setError(error.message);
            throw error; // 호출한 곳에서 에러 처리하도록
        }
    };

    // Context에 제공할 값
    const value = {
        transactions,
        loading,
        error,
        filters,
        loadTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        setFilters, // 필터 변경 함수도 제공
    };

    return (
        <TransactionContext.Provider value={value}>
            {children}
        </TransactionContext.Provider>
    )
};

// Custom Hook
export const useTransactions = () => {
    const context = useContext(TransactionContext);

    // Provider 밖에서 사용하면 에러
    if (!context) {
        throw new Error('useTransactions must be used within a TransactionProvider');
    }
    return context;
}