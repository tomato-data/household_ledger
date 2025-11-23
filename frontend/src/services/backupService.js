import apiClient from "../utils/api";

/**
 * 백업 파일 내보내기 (gzip 압축)
 * @param {string} token - Clerk JWT 토큰
 * @returns {Promise<Blob>} - gzip 압축된 백업 파일 Blob
 */
export const exportBackup = async (token) => {
  const response = await apiClient.post(
    "/backup/export",
    {},
    {
      // 두번째 {}는 빈 바디, 나중에 백업 옵션을 추가 가능
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: "blob",
    }
  );
  return response.data;
};

/**
 * 백업 파일 미리보기 (메타데이터 조회)
 * @param {string} token - Clerk JWT 토큰
 * @param {File} file - 백업 파일 (.json.gz)
 * @returns {Promise<Object>} - BackupMetadata 객체
 */
export const previewBackup = async (token, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/backup/preview", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * 백업 파일 복원
 * @param {string} token - Clerk JWT 토큰
 * @param {File} file - 백업 파일 (.json.gz)
 * @param {boolean} overwrite - 기존 데이터 덮어쓰기 여부 (true 권장)
 * @returns {Promise<Object>} - BackupMetadata 객체
 */
export const importBackup = async (token, file, overwrite = true) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/backup/import", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      overwrite,
    },
  });
  return response.data;
};
