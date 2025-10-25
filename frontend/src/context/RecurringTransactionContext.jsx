import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
    getRecurringTransactions,
    createRecurringTransaction,
    updateRecurringTransaction as updateRecurringTransactionAPI,
    deleteRecurringTransaction as deleteRecurringTransactionAPI,
} from '../services/recurringTransactionService';

// 1. Context 생성
const RecurringTransactionContext = createContext();

// 2. Provider 컴포넌트 생성
export const RecurringTransactionProvider = ({ children }) => {
    const { getToken } = useAuth(); // Clerk에서 토큰 가져오기

    // 상태 관리
    const [recurringTransactions, setRecurringTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 반복 거래 목록을 불러오는 함수
    const loadRecurringTransactions = async (isActive = null) => {
        try {
            setLoading(true);
            setError(null);
            const token = await getToken();
            const data = await getRecurringTransactions(token, isActive);
            setRecurringTransactions(data);
        } catch (error) {
            console.error('반복 거래 로딩 실패', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // 반복 거래를 추가하는 함수
    const addRecurringTransaction = async (recurringTransactionData) => {
        try {
            const token = await getToken();
            const newRecurringTransaction = await createRecurringTransaction(token, recurringTransactionData);

            // 상태에 새 반복거래 추가 (CategoryContext 패턴과 동일)
            setRecurringTransactions([...recurringTransactions, newRecurringTransaction]);

            return newRecurringTransaction;
        } catch (error) {
            console.error('반복거래 생성 실패:', error);
            setError(error.message);
            throw error;
        }
    };

    // 반복거래 수정 함수
    const updateRecurringTransaction = async (recurringTransactionId, recurringTransactionData) => {
        try {
            const token = await getToken();
            const updatedRecurringTransaction = await updateRecurringTransactionAPI(token, recurringTransactionId, recurringTransactionData);

            // 상태에서 해당 반복거래만 업데이트
            setRecurringTransactions(recurringTransactions.map(rt => rt.id === recurringTransactionId ? updatedRecurringTransaction : rt));
            return updatedRecurringTransaction;
        } catch (error) {
            console.error('반복거래 수정 실패:', error);
            setError(error.message);
            throw error;
        }
    };

    // 반복거래 삭제 함수
    const deleteRecurringTransaction = async (recurringTransactionId) => {
        try {
            const token = await getToken();
            await deleteRecurringTransactionAPI(token, recurringTransactionId);

            // 상태에서 해당 반복거래 제거
            setRecurringTransactions(recurringTransactions.filter(rt => rt.id !== recurringTransactionId));

        } catch (error) {
            console.error('반복거래 삭제 실패:', error);
            setError(error.message);
            throw error;
        }
    };

    // 최초 로드 시 전체 트랜잭션 가져오기
    useEffect(() => {
        loadRecurringTransactions();
    }, []); // 컴포넌트 마운트 시 한 번

    // Context에 제공할 값
    const value = {
        recurringTransactions,
        loading,
        error,
        loadRecurringTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
    };

    return (
        <RecurringTransactionContext.Provider value={value}>
            {children}
        </RecurringTransactionContext.Provider>
    )
};

// Custom Hook
export const useRecurringTransactions = () => {
    const context = useContext(RecurringTransactionContext);

    // Provider 밖에서 사용하면 에러
    if (!context) {
        throw new Error('useRecurringTransactions must be used within a RecurringTransactionProvider');
    }
    return context;
}