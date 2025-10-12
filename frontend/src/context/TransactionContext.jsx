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
    const [allTransactions, setAllTransactions] = useState([]); // 전체 데이터
    const [filteredTransactions, setFilteredTransactions] = useState([]); // 필터링된 데이터
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        start_date: null,
        end_date: null,
        category_id: null,
        type: null,
    });

    // 헬퍼 함수: 필터가 활성화되었는지 체크
    const hasActiveFilters = () => {
        return !!(filters.start_date || filters.end_date || filters.category_id || filters.type);
    }

    const loadAllTransactions = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await getToken();
            const data = await getTransactions(token, {}); // 전체 데이터 로드
            setAllTransactions(data);
        } catch (error) {
            console.error('트랜잭션 로딩 실패:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    const loadFilteredTransactions = async () => {
        try {
            const token = await getToken();
            const data = await getTransactions(token, filters);
            setFilteredTransactions(data);
        } catch (error) {
            console.error('필터링된 트랜잭션 로딩 실패:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    // 최초 로드 시 전체 트랜잭션 가져오기
    useEffect(() => {
        loadAllTransactions();
    }, []); // 컴포넌트 마운트 시 한 번

    // 필터 변경 시 필터링된 트랜잭션 가져오기
    useEffect(() => {
        if (filters.start_date || filters.end_date || filters.category_id || filters.type) {
            loadFilteredTransactions();
        }
    }, [filters]);

    const addTransaction = async (transactionData) => {
        try {
            const token = await getToken();
            const newTransaction = await createTransaction(token, transactionData);

            // 전체 트랜잭션 배열에 추가
            setAllTransactions([...allTransactions, newTransaction]);

            // 필터가 설정된 경우에만 필터링된 트랜잭션 다시 로드
            if (hasActiveFilters()) {
                loadFilteredTransactions();
            }

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

            // 전체 트랜잭션 배열에서 해당 트랜잭션만 업데이트
            setAllTransactions(allTransactions.map(tx =>
                tx.id === transactionId ? updatedTransaction : tx
            ));

            // 필터 조건에 맞으면 filteredTransactions에도 업데이트 또는 다시 로드
            setFilteredTransactions(filteredTransactions.map(tx =>
                tx.id === transactionId ? updatedTransaction : tx
            ));

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

            // 전체 트랜잭션 배열에서 해당 트랜잭션 제거
            setAllTransactions(allTransactions.filter(tx => tx.id !== transactionId));

            // 필터 조건에 맞으면 filteredTransactions에도 제거 또는 다시 로드
            setFilteredTransactions(filteredTransactions.filter(tx => tx.id !== transactionId));
        } catch (error) {
            console.error('트랜잭션 삭제 실패:', error);
            setError(error.message);
            throw error; // 호출한 곳에서 에러 처리하도록
        }
    };

    // Context에 제공할 값
    const value = {
        allTransactions,
        filteredTransactions,
        loading,
        error,
        filters,
        loadAllTransactions,
        loadFilteredTransactions,
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