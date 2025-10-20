import apiClient from '../utils/api';

/**
 * 트랜잭션 목록 조회
 * @param {string} token - Clerk JWT 토큰
 * @param {Object} params - 쿼리 파라미터
 * @param {number} params.skip - 건너뛸 항목 수
 * @param {number} params.limit - 반환할 항목 수
 * @param {string} params.start_date - 시작 날짜 (YYYY-MM-DD)
 * @param {string} params.end_date - 종료 날짜 (YYYY-MM-DD)
 * @param {string} params.category_id - 카테고리 ID
 */
export const getTransactions = async (token, filters = {}) => {
    const response = await apiClient.get('/api/v1/transactions', {
        params: filters,
        headers: {
            Authorization: `Bearer ${token}`,
        }
    })
    return response.data;
}

/**
 * 단일 트랜잭션 조회
 * @param {string} token - Clerk JWT 토큰
 * @param {string} transactionId - 트랜잭션 ID
 * @returns {Promise<Object>} - 트랜잭션 객체
 */
export const getTransaction = async (token, transactionId) => {
    const response = await apiClient.get(`/api/v1/transactions/${transactionId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    })
    return response.data;
}

/**
 * 트랜잭션 생성
 * @param {string} token - Clerk JWT 토큰
 * @param {Object} transactionData - 트랜잭션 데이터
 * @returns {Promise<Object>} - 생성된 트랜잭션 객체
 */
export const createTransaction = async (token, transactionData) => {
    const response = await apiClient.post('/api/v1/transactions', transactionData, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    })
    return response.data;
}

/**
 * 트랜잭션 수정
 * @param {string} token - Clerk JWT 토큰
 * @param {string} transactionId - 트랜잭션 ID
 * @param {Object} transactionData - 트랜잭션 데이터
 * @returns {Promise<Object>} - 수정된 트랜잭션 객체
 */
export const updateTransaction = async (token, transactionId, transactionData) => {
    const response = await apiClient.patch(`/api/v1/transactions/${transactionId}`, transactionData, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    })
    return response.data;
}

/**
 * 트랜잭션 삭제
 * @param {string} token - Clerk JWT 토큰
 * @param {string} transactionId - 트랜잭션 ID
 */
export const deleteTransaction = async (token, transactionId) => {
    await apiClient.delete(`/api/v1/transactions/${transactionId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    })
    // 204 No Content이므로 반환값 없음
}

/**
 * 트랜잭션 통계 조회
 * @param {string} token - Clerk JWT 토큰
 * @returns {Promise<Object>} - 통계 객체 {total_income, total_expense, net_asset, transaction_count}
 */
export const getTransactionStats = async (token) => {
    const response = await apiClient.get('/api/v1/transactions/stats/summary', {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    })
    return response.data;
}

/**
 * 카테고리별 지출/수입 통계 조회
 * @param {string} token - Clerk JWT 토큰
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
 * @param {string} type - 거래 유형 (income/expense)
 * @returns {Promise<Object>} - 통계 객체 {category_id, category_name, category_emoji, total_amount, transaction_count, percentage}
 */
export const getCategoryBreakdown = async (token, startDate, endDate, type = 'expense') => {
    const response = await apiClient.get('/api/v1/transactions/stats/category-breakdown', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        params: {
            start_date: startDate,
            end_date: endDate,
            type: type,
        }
    });
    return response.data;
};