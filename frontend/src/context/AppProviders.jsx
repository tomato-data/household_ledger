import React from 'react';
import { CategoryProvider } from './CategoryContext';
import { TransactionProvider } from './TransactionContext';
import { RecurringTransactionProvider } from './RecurringTransactionContext';
// 나중에 컨텍스트들을 추가

/**
 * 모든 Context Provider를 한곳에서 관리
 * Provider Hell을 방지하고 중앙 집중식 관리
 */
export const AppProviders = ({ children }) => {
    return (
        <CategoryProvider>
            <TransactionProvider>
                <RecurringTransactionProvider>
                    {children}
                </RecurringTransactionProvider>
            </TransactionProvider>
        </CategoryProvider>
    );
};

export default AppProviders;