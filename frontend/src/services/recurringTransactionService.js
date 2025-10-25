import apiClient from '../utils/api';

/**
 * 반복거래 목록 조회
 * @param {string} token - Clerk JWT 토큰
 * @param {Object} params - 쿼리 파라미터
 * @param {number} params.skip - 건너뛸 항목 수
 * @param {number} params.limit - 반환할 항목 수
 * @param {boolean} params.is_active - 활성 여부
 */
export const getRecurringTransactions = async (token, isActive = null) => {
    const params = {};
    if (isActive !== null) {
        params.is_active = isActive;
    }
    const response = await apiClient.get('/api/v1/recurring-transactions', {
        headers: { Authorization: `Bearer ${token}` },
        params,
    });
    return response.data;
}

/**
 * 단일 반복거래 조회
 * @param {string} token - Clerk JWT 토큰
 * @param {string} recurringTransactionId - 반복거래 ID
 * @returns {Promise<Object>} - 반복거래 객체
 */
export const getRecurringTransaction = async (token, recurringTransactionId) => {
    const response = await apiClient.get(`/api/v1/recurring-transactions/${recurringTransactionId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
}

/**
 * 반복거래 생성
 * @param {string} token - Clerk JWT 토큰
 * @param {Object} recurringTransactionData - 반복거래 데이터
 * @returns {Promise<Object>} - 생성된 반복거래 객체
 */
export const createRecurringTransaction = async (token, recurringTransactionData) => {
    const response = await apiClient.post('/api/v1/recurring-transactions', recurringTransactionData, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
}

/**
 * 반복거래 수정
 * @param {string} token - Clerk JWT 토큰
 * @param {string} recurringTransactionId - 반복거래 ID
 * @param {Object} recurringTransactionData - 반복거래 데이터
 * @returns {Promise<Object>} - 수정된 반복거래 객체
 */
export const updateRecurringTransaction = async (token, recurringTransactionId, recurringTransactionData) => {
    const response = await apiClient.patch(`/api/v1/recurring-transactions/${recurringTransactionId}`, recurringTransactionData, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
}

/**
 * 반복거래 삭제
 * @param {string} token - Clerk JWT 토큰
 * @param {string} recurringTransactionId - 반복거래 ID
 */
export const deleteRecurringTransaction = async (token, recurringTransactionId) => {
    await apiClient.delete(`/api/v1/recurring-transactions/${recurringTransactionId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    })
    // 204 No Content이므로 반환값 없음
}