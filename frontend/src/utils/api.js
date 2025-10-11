// 1. axios와 Clerk의 useAuth 훅 import
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

// 2. axios 인스턴스 생성 (기본 설정)
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL ||'http://localhost:8000/api/v1',
    header: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10초 타임아웃
});

// 3. Request Interceptor - 토큰 자동 추가
// ⚠️ 주의: Interceptor 안에서는 React Hook을 사용할 수 없음
// 따라서 토큰을 파라미터로 받는 별도 함수 필요
apiClient.interceptors.request.use(
    (config) => {
        // 여기서 토큰 추가는 나중에 처리 (Hook 문제 때문)
        // 요청 전 로깅 (개발 모드에서만)
        if (import.meta.env.DEV) {
            console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 4. Response Interceptor (응답 후처리)
apiClient.interceptors.response.use(
    (response) => {
        // 성공 응답은 그대로 반환
        // 응답 후 로깅 (개발 모드에서만)
        if (import.meta.env.DEV) {
            console.log(`[API Response] ${response.status} ${response.config.url}`);
        }
        return response;
    },
    (error) => {
        // 통합 에러 처리
        if (error.response) {
            const { status, data } = error.response;
            console.error('API Error:', status, data);

            // 특정 상태 코드별 처리
            switch (status) {
                case 401:                     // 인증 실패 - 로그아웃 처리 등
                    console.error('Unauthorized - Token may be expired or invalid');
                    break;
                case 403:                     // 권한 없음 - 접근 거절
                    console.error('Forbidden - You do not have permission to access this resource');
                    break;
                case 404:                     // 리소스 없음
                    console.error('Not Found - The requested resource was not found');
                    break;
                case 500:
                    console.error('Internal Server Error - Please try again later');
                default:
                    console.error('API Error:', status, data);
                    break;
            }
        }
        else if (error.request) {
            // 요청은 보냈지만 응답을 받지 못함 (네트워크 에러)
            console.error('Network Error:', error.request);
        } else {
            // 요청 설정 중 에러 발생
            console.error('Request Config Error:', error.message);
        }

        return Promise.reject(error);
    }
);

// 5. apiClient export
export default apiClient;