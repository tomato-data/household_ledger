import apiClient from "../utils/api";

/**
 * 자산 조정 목록 조회
 */
export const getAdjustmetns = async (token, filters = {}) => {
  const params = new URLSearchParams();

  if (filters.skip) params.append("skip", filters.skip);
  if (filters.limit) params.append("limit", filters.limit);
  if (filters.adjustment_type)
    params.append("adjustment_type", filters.adjustment_type);
  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);

  const response = await apiClient.get(`/api/v1/asset-adjustments/?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
/**
 * 자산 조정 통계 조회
 */
export const getAdjustmentStats = async (token) => {
  const response = await apiClient.get("/api/v1/asset-adjustments/stats", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * 단일 자산 조정 조회
 */
export const getAdjustmentById = async (token, adjustmentId) => {
  const response = await apiClient.get(
    `/api/v1/asset-adjustments/${adjustmentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

/**
 * 자산 조정 생성
 */
export const createAdjustment = async (token, adjustmentData) => {
  const response = await apiClient.post(
    "/api/v1/asset-adjustments/",
    adjustmentData,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

/**
 * 자산 조정 수정
 */
export const updateAdjustment = async (token, adjustmentId, adjustmentData) => {
  const response = await apiClient.patch(
    `/api/v1/asset-adjustments/${adjustmentId}`,
    adjustmentData,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

/**
 * 자산 조정 삭제
 */
export const deleteAdjustment = async (token, adjustmentId) => {
  await apiClient.delete(`/api/v1/asset-adjustments/${adjustmentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
