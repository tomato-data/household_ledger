import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
    getTransactions,
    createTransaction,
    updateTransaction as updateTransactionAPI,
    deleteTransaction as deleteTransactionAPI,
    getTransactionStats,
} from '../services/transactionService';
import { sortTransactionsByDate, isDateInRange } from '../utils/formatDate';

// 1. Context 생성
const TransactionContext = createContext();

// 2. Provider 컴포넌트 생성
export const TransactionProvider = ({ children }) => {
    const { getToken } = useAuth(); // Clerk에서 토큰 가져오기

    // 상태 관리
    const [allTransactions, setAllTransactions] = useState([]); // 전체 데이터
    const [filteredTransactions, setFilteredTransactions] = useState([]); // 필터링된 데이터
    const [stats, setStats] = useState(null); // 통계 데이터
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
    };

    // 헬퍼 함수: 트랜잭션이 현재 필터에 맞는지 확인
    const checkTransactionMatchesFilter = (transaction) => {
        // 날짜 필터 (문자열 비교)
        const txDate = transaction.date.split('T')[0]; // "2025-10-18"

        if (!isDateInRange(txDate, filters.start_date, filters.end_date)) {
            return false;
        }

        // 카테고리 필터
        if (filters.category_id && transaction.category.id !== filters.category_id) {
            return false;
        }

        // 타입 필터
        if (filters.type && transaction.type.toLowerCase() !== filters.type.toLowerCase()) {
            return false;
        }

        return true;
    };

    const loadAllTransactions = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await getToken();
            const data = await getTransactions(token, { limit: 10000 });
            setAllTransactions(sortTransactionsByDate(data));
        } catch (error) {
            console.error('트랜잭션 로딩 실패:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const token = await getToken();
            const statsData = await getTransactionStats(token);
            setStats(statsData);
        } catch (error) {
            console.error('트랜잭션 통계 로딩 실패:', error);
        }
    }

    const loadFilteredTransactions = async () => {
        try {
            // 즉시 클라이언트 필터링 (낙관적 업데이트)
            if (allTransactions.length > 0) {
                const clientFiltered = allTransactions.filter(tx => {
                    return checkTransactionMatchesFilter(tx);
                });
                setFilteredTransactions(sortTransactionsByDate(clientFiltered));
            }
            // 백그라운드에서 서버 데이터 동기화
            const token = await getToken();
            const serverData = await getTransactions(token, filters);
            setFilteredTransactions(sortTransactionsByDate(serverData));
        } catch (error) {
            console.error('필터링된 트랜잭션 로딩 실패:', error);
            setError(error.message);
        }
    };

    // 최초 로드 시 전체 트랜잭션 가져오기
    useEffect(() => {
        loadAllTransactions();
        loadStats();
    }, []); // 컴포넌트 마운트 시 한 번

    // allTransactions 변경 시 filteredTransactions 동기화 (필터 없을 때)
    useEffect(() => {
        if (!hasActiveFilters()) {
            setFilteredTransactions(allTransactions);
        }
    }, [allTransactions]);

    // 필터 변경 시 필터링된 트랜잭션 가져오기
    useEffect(() => {
        if (hasActiveFilters()) {
            loadFilteredTransactions();
        } else {
            setFilteredTransactions(allTransactions);
        }
    }, [filters]);

    const addTransaction = async (transactionData) => {
        try {
            const token = await getToken();
            const newTransaction = await createTransaction(token, transactionData);

            // 전체 트랜잭션에 추가 후 정렬
            const updatedAll = sortTransactionsByDate([...allTransactions, newTransaction]);
            setAllTransactions(updatedAll);

            // 필터가 있으면 조건 확인 후 추가
            if (hasActiveFilters()) {
                if (checkTransactionMatchesFilter(newTransaction)) {
                    const updatedFiltered = sortTransactionsByDate([...filteredTransactions, newTransaction]);
                    setFilteredTransactions(updatedFiltered);
                }
            }
            // 필터가 없으면 useEffect가 자동 동기화

            loadStats();
            return newTransaction;
        } catch (error) {
            console.error('트랜잭션 생성 실패:', error);
            setError(error.message);
            throw error;
        }
    }

    const updateTransaction = async (transactionId, transactionData) => {
        try {
            const token = await getToken();
            const updatedTransaction = await updateTransactionAPI(token, transactionId, transactionData);

            // 전체 트랜잭션 업데이트
            const updatedAll = allTransactions.map(tx =>
                tx.id === transactionId ? updatedTransaction : tx
            );
            setAllTransactions(sortTransactionsByDate(updatedAll));

            // 필터링된 트랜잭션 업데이트
            if (hasActiveFilters()) {
                if (checkTransactionMatchesFilter(updatedTransaction)) {
                    const updatedFiltered = filteredTransactions.map(tx =>
                        tx.id === transactionId ? updatedTransaction : tx
                    );
                    setFilteredTransactions(sortTransactionsByDate(updatedFiltered));
                } else {
                    // 더 이상 필터에 맞지 않으면 제거
                    setFilteredTransactions(filteredTransactions.filter(tx => tx.id !== transactionId));
                }
            }

            loadStats();
            return updatedTransaction;
        } catch (error) {
            console.error('트랜잭션 수정 실패:', error);
            setError(error.message);
            throw error;
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

            // 통계 데이터 업데이트
            loadStats();

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
        stats,
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