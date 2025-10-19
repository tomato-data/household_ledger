import apiClient from '../utils/api';

/**
 * 카테고리 목록 조회
 * @param {string} token - Clerk JWT 토큰
 * @returns {Promise<Array>} - 카테고리 목록 배열
 */
export const getCategories = async (token) => {
    const response = await apiClient.get('/api/v1/categories', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return response.data;
}

/**
 * 단일 카테고리 조회
 * @param {string} token - Clerk JWT 토큰
 * @param {string} categoryId - 카테고리 ID
 * @returns {Promise<Object>} - 카테고리 객체
 */
export const getCategory = async (token, categoryId) => {
    const response = await apiClient.get(`/api/v1/categories/${categoryId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return response.data;
}

/**
 * 카테고리 생성
 * @param {string} token - Clerk JWT 토큰
 * @param {Object} categoryData - 카테고리 데이터
 * @returns {Promise<Object>} - 생성된 카테고리 객체
 */
export const createCategory = async (token, categoryData) => {
    const response = await apiClient.post(`/api/v1/categories`, categoryData, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
}

/**
 * 카테고리 수정
 * @param {string} token - Clerk JWT 토큰
 * @param {string} categoryId - 카테고리 ID
 * @param {Object} categoryData - 카테고리 데이터
 * @returns {Promise<Object>} - 수정된 카테고리 객체
 */
export const updateCategory = async (token, categoryId, categoryData) => {
    const response = await apiClient.patch(`/api/v1/categories/${categoryId}`, categoryData, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
}

/**
 * 카테고리 삭제
 * @param {string} token - Clerk JWT 토큰
 * @param {string} categoryId - 카테고리 ID
 */
export const deleteCategory = async (token, categoryId) => {
    await apiClient.delete(`/api/v1/categories/${categoryId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    // 204 No Content이므로 반환값 없음
}

/**
 * 카테고리 순서 일괄 업데이트
 * @param {string} token - Clerk JWT 토큰
 * @param {Array} reorderData - [{category_id: string, order: number}, ...]
 * @returns {Promise<Object>} - 응답 메시지
 */
export const reorderCategories = async (token, reorderData) => {
    const response = await apiClient.patch('/api/v1/categories/batch/reorder', reorderData, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
}