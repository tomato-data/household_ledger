# Axios 완벽 가이드 - HTTP 클라이언트 라이브러리

**작성 날짜**: 2025-10-18
**목적**: Axios의 개념, 사용법, 그리고 실제 프로젝트 적용 방법 이해하기

---

## 📋 목차

1. [Axios란 무엇인가?](#axios란-무엇인가)
2. [AJAX vs Fetch vs Axios](#ajax-vs-fetch-vs-axios)
3. [Axios의 장점](#axios의-장점)
4. [기본 사용법](#기본-사용법)
5. [인터셉터 (Interceptors)](#인터셉터-interceptors)
6. [실제 프로젝트 적용 예시](#실제-프로젝트-적용-예시)
7. [Best Practices](#best-practices)

---

## 🎯 Axios란 무엇인가?

### 정의

**Axios**는 **브라우저와 Node.js에서 사용할 수 있는 Promise 기반 HTTP 클라이언트 라이브러리**입니다.

```javascript
// Axios 설치
npm install axios

// 기본 사용
import axios from 'axios';

axios.get('https://api.example.com/users')
    .then(response => console.log(response.data))
    .catch(error => console.error(error));
```

### React 전용이 아닙니다!

❌ **오해**: "Axios는 React 전용 라이브러리다"
✅ **진실**: Axios는 React와 무관한 독립적인 HTTP 클라이언트입니다.

**사용 가능한 환경**:
- ✅ React
- ✅ Vue.js
- ✅ Angular
- ✅ Vanilla JavaScript
- ✅ Node.js (서버 사이드)
- ✅ React Native

---

## 🔄 AJAX vs Fetch vs Axios

### 1. AJAX (Asynchronous JavaScript And XML)

**AJAX는 기술이지 라이브러리가 아닙니다.**

```javascript
// AJAX의 원조: XMLHttpRequest (2000년대)
const xhr = new XMLHttpRequest();

xhr.open('GET', 'https://api.example.com/users', true);

xhr.onload = function() {
    if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        console.log(data);
    } else {
        console.error('Error:', xhr.status);
    }
};

xhr.onerror = function() {
    console.error('Request failed');
};

xhr.send();
```

**특징**:
- 😱 복잡하고 장황한 코드
- 😱 콜백 지옥 가능성
- 😱 에러 처리 번거로움
- ✅ 모든 브라우저 지원 (심지어 IE6!)

### 2. Fetch API (브라우저 내장)

**Fetch는 브라우저에 내장된 최신 HTTP API입니다.**

```javascript
// Fetch API (2015년 등장)
fetch('https://api.example.com/users')
    .then(response => {
        if (!response.ok) {
            throw new Error('HTTP error ' + response.status);
        }
        return response.json();
    })
    .then(data => console.log(data))
    .catch(error => console.error(error));
```

**특징**:
- ✅ Promise 기반
- ✅ 브라우저 내장 (별도 설치 불필요)
- ✅ 간결한 문법
- ❌ IE 미지원
- ❌ 자동 JSON 변환 없음 (`.json()` 필요)
- ❌ 타임아웃 기능 없음
- ❌ HTTP 에러 시 자동 reject 안 됨 (404, 500도 resolve!)

### 3. Axios (외부 라이브러리)

**Axios는 Fetch를 더 편리하게 사용하기 위한 라이브러리입니다.**

```javascript
// Axios (2016년 등장)
axios.get('https://api.example.com/users')
    .then(response => console.log(response.data))
    .catch(error => console.error(error));
```

**특징**:
- ✅ Promise 기반
- ✅ 자동 JSON 변환
- ✅ HTTP 에러 자동 reject
- ✅ 요청/응답 인터셉터
- ✅ 타임아웃 설정 가능
- ✅ CSRF 보호
- ✅ 업로드 진행률 표시
- ❌ 별도 설치 필요 (~13KB)

---

## 🏆 Axios의 장점

### 1. 자동 JSON 변환

```javascript
// Fetch (2단계 필요)
fetch('/api/users')
    .then(response => response.json())  // 1단계: JSON 파싱
    .then(data => console.log(data));   // 2단계: 데이터 사용

// Axios (1단계로 끝!)
axios.get('/api/users')
    .then(response => console.log(response.data));  // 자동 JSON 파싱!
```

### 2. HTTP 에러 자동 처리

```javascript
// Fetch (수동 에러 체크 필요)
fetch('/api/users')
    .then(response => {
        if (!response.ok) {  // 수동으로 확인해야 함!
            throw new Error('HTTP ' + response.status);
        }
        return response.json();
    })
    .catch(error => console.error(error));

// Axios (자동 에러 처리!)
axios.get('/api/users')
    .then(response => console.log(response.data))
    .catch(error => {
        // 4xx, 5xx 자동으로 catch!
        console.error(error.response.status);
    });
```

### 3. 요청 취소 (Cancellation)

```javascript
// Axios: 요청 취소 지원
const source = axios.CancelToken.source();

axios.get('/api/users', {
    cancelToken: source.token
});

// 필요 시 취소
source.cancel('사용자가 취소했습니다');
```

### 4. 타임아웃 설정

```javascript
// Axios: 간단한 타임아웃 설정
axios.get('/api/users', {
    timeout: 5000  // 5초 후 타임아웃
});

// Fetch: 수동으로 구현해야 함...
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

fetch('/api/users', { signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
```

### 5. 인터셉터 (Interceptors)

```javascript
// 모든 요청에 자동으로 토큰 추가
axios.interceptors.request.use(config => {
    config.headers.Authorization = `Bearer ${getToken()}`;
    return config;
});

// 모든 응답 에러 자동 처리
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response.status === 401) {
            // 자동으로 로그인 페이지로 이동
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
```

### 6. 업로드 진행률

```javascript
axios.post('/api/upload', formData, {
    onUploadProgress: progressEvent => {
        const percent = (progressEvent.loaded / progressEvent.total) * 100;
        console.log(`업로드 진행률: ${percent}%`);
    }
});
```

---

## 📖 기본 사용법

### 설치

```bash
# npm
npm install axios

# yarn
yarn add axios

# CDN (브라우저 직접 사용)
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
```

### GET 요청

```javascript
// 기본 GET
axios.get('https://api.example.com/users')
    .then(response => {
        console.log(response.data);      // 응답 데이터
        console.log(response.status);    // 200
        console.log(response.headers);   // 응답 헤더
    })
    .catch(error => console.error(error));

// 쿼리 파라미터 포함
axios.get('https://api.example.com/users', {
    params: {
        page: 1,
        limit: 10
    }
});
// → GET https://api.example.com/users?page=1&limit=10

// async/await
async function getUsers() {
    try {
        const response = await axios.get('https://api.example.com/users');
        console.log(response.data);
    } catch (error) {
        console.error(error);
    }
}
```

### POST 요청

```javascript
// 기본 POST
axios.post('https://api.example.com/users', {
    name: 'John Doe',
    email: 'john@example.com'
})
    .then(response => console.log(response.data))
    .catch(error => console.error(error));

// 헤더 포함
axios.post('https://api.example.com/users',
    { name: 'John' },
    {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123'
        }
    }
);

// async/await
async function createUser(userData) {
    try {
        const response = await axios.post('/api/users', userData);
        return response.data;
    } catch (error) {
        throw error;
    }
}
```

### PUT/PATCH 요청

```javascript
// PUT (전체 업데이트)
axios.put('https://api.example.com/users/1', {
    name: 'Jane Doe',
    email: 'jane@example.com'
});

// PATCH (부분 업데이트)
axios.patch('https://api.example.com/users/1', {
    name: 'Jane Doe'  // email은 그대로 유지
});
```

### DELETE 요청

```javascript
axios.delete('https://api.example.com/users/1')
    .then(() => console.log('삭제 완료'))
    .catch(error => console.error(error));
```

### 응답 구조

```javascript
axios.get('/api/users')
    .then(response => {
        console.log(response.data);      // 서버가 보낸 데이터
        console.log(response.status);    // 200, 201, 404, 500 등
        console.log(response.statusText);// "OK", "Not Found" 등
        console.log(response.headers);   // 응답 헤더 객체
        console.log(response.config);    // 요청 설정
        console.log(response.request);   // 원본 요청 객체
    });
```

### 에러 처리

```javascript
axios.get('/api/users')
    .catch(error => {
        if (error.response) {
            // 서버가 2xx 범위를 벗어난 상태 코드로 응답
            console.log(error.response.data);    // 서버 에러 메시지
            console.log(error.response.status);  // 404, 500 등
            console.log(error.response.headers);
        } else if (error.request) {
            // 요청은 보냈지만 응답을 받지 못함
            console.log('응답 없음:', error.request);
        } else {
            // 요청 설정 중 오류 발생
            console.log('Error:', error.message);
        }
    });
```

---

## 🔧 인터셉터 (Interceptors)

### 개념

**인터셉터**는 요청이나 응답을 가로채서 처리할 수 있는 기능입니다.

```
[클라이언트]
    ↓ 요청
[요청 인터셉터]  ← 여기서 토큰 추가, 로깅 등
    ↓
[서버]
    ↓ 응답
[응답 인터셉터]  ← 여기서 에러 처리, 데이터 가공 등
    ↓
[클라이언트]
```

### 요청 인터셉터

```javascript
// 모든 요청에 자동으로 처리 적용
axios.interceptors.request.use(
    config => {
        // 요청 전 처리
        console.log('요청 시작:', config.url);

        // 토큰 추가
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 타임스탬프 추가
        config.headers['X-Request-Time'] = Date.now();

        return config;  // 반드시 config 반환!
    },
    error => {
        // 요청 에러 처리
        console.error('요청 실패:', error);
        return Promise.reject(error);
    }
);
```

### 응답 인터셉터

```javascript
// 모든 응답에 자동으로 처리 적용
axios.interceptors.response.use(
    response => {
        // 2xx 응답 처리
        console.log('응답 성공:', response.status);

        // 데이터 가공
        response.data.timestamp = Date.now();

        return response;
    },
    error => {
        // 2xx 범위를 벗어난 응답 처리
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    // 인증 실패 → 로그인 페이지로
                    console.log('인증 만료, 로그인 필요');
                    window.location.href = '/login';
                    break;
                case 403:
                    console.log('권한 없음');
                    break;
                case 404:
                    console.log('리소스를 찾을 수 없음');
                    break;
                case 500:
                    console.log('서버 에러');
                    break;
                default:
                    console.log('알 수 없는 에러');
            }
        }

        return Promise.reject(error);
    }
);
```

### 인터셉터 제거

```javascript
// 인터셉터 등록 시 ID 저장
const myInterceptor = axios.interceptors.request.use(config => {
    return config;
});

// 나중에 제거
axios.interceptors.request.eject(myInterceptor);
```

---

## 💼 실제 프로젝트 적용 예시

### 우리 프로젝트의 Axios 사용

#### 1. `frontend/src/utils/api.js` - 중앙 집중식 설정

```javascript
import axios from 'axios';

// Axios 인스턴스 생성 (전역 설정)
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    timeout: 10000,  // 10초 타임아웃
    headers: {
        'Content-Type': 'application/json',
    },
});

// 요청 인터셉터: 모든 요청에 자동으로 적용
apiClient.interceptors.request.use(
    (config) => {
        // 요청 로깅
        console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// 응답 인터셉터: 모든 응답에 자동으로 적용
apiClient.interceptors.response.use(
    (response) => {
        // 응답 로깅
        console.log(`[API Response] ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        // 에러 로깅
        if (error.response) {
            console.error(
                `[API Error] ${error.response.status} ${error.response.config.url}`,
                error.response.data
            );
        } else {
            console.error('[API Error] No response', error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;
```

**장점**:
- ✅ 모든 API 호출이 동일한 설정 사용
- ✅ baseURL 한 곳에서 관리 (환경별로 자동 전환)
- ✅ 타임아웃 일괄 적용
- ✅ 로깅 자동화

#### 2. `frontend/src/services/categoryService.js` - 서비스 레이어

```javascript
import apiClient from '../utils/api';

/**
 * 카테고리 목록 조회
 */
export const getCategories = async (token) => {
    const response = await apiClient.get('/api/v1/categories', {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
};

/**
 * 카테고리 생성
 */
export const createCategory = async (token, categoryData) => {
    const response = await apiClient.post('/api/v1/categories', categoryData, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
};

/**
 * 카테고리 수정
 */
export const updateCategory = async (token, categoryId, categoryData) => {
    const response = await apiClient.patch(`/api/v1/categories/${categoryId}`, categoryData, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
};

/**
 * 카테고리 삭제
 */
export const deleteCategory = async (token, categoryId) => {
    await apiClient.delete(`/api/v1/categories/${categoryId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
};
```

**패턴 설명**:
- ✅ 각 API 엔드포인트를 함수로 캡슐화
- ✅ async/await로 간결한 비동기 처리
- ✅ 토큰을 인자로 받아 헤더에 추가
- ✅ `response.data`만 반환 (불필요한 메타데이터 제거)

#### 3. `frontend/src/context/CategoryContext.jsx` - Context에서 사용

```javascript
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService';

export const CategoryProvider = ({ children }) => {
    const { getToken } = useAuth();  // Clerk 토큰
    const [categories, setCategories] = useState([]);

    // 카테고리 로드
    const loadCategories = async () => {
        try {
            const token = await getToken();
            const data = await getCategories(token);  // Axios 사용
            setCategories(data);
        } catch (error) {
            console.error('카테고리 로딩 실패:', error);
        }
    };

    // 카테고리 추가
    const addCategory = async (categoryData) => {
        try {
            const token = await getToken();
            const newCategory = await createCategory(token, categoryData);
            setCategories([...categories, newCategory]);
            return newCategory;
        } catch (error) {
            console.error('카테고리 생성 실패:', error);
            throw error;
        }
    };

    // ...
};
```

**3계층 아키텍처**:
```
Component (UI)
    ↓
Context (상태 관리)
    ↓
Service (API 호출, Axios 사용)
    ↓
API Client (Axios 인스턴스)
    ↓
Backend API
```

---

## ✅ Best Practices

### 1. Axios 인스턴스 사용

```javascript
// ❌ 나쁜 예: 매번 전체 URL 작성
axios.get('http://localhost:8000/api/v1/users');
axios.get('http://localhost:8000/api/v1/posts');

// ✅ 좋은 예: 인스턴스 생성 후 재사용
const api = axios.create({
    baseURL: 'http://localhost:8000',
});

api.get('/api/v1/users');
api.get('/api/v1/posts');
```

### 2. 환경 변수로 설정 관리

```javascript
// .env.development
VITE_API_BASE_URL=http://localhost:8000

// .env.production
VITE_API_BASE_URL=https://api.production.com

// api.js
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
});
```

### 3. 에러 처리 통합

```javascript
// 인터셉터로 에러 처리 중앙화
apiClient.interceptors.response.use(
    response => response,
    error => {
        // 모든 API 에러를 한 곳에서 처리
        const message = error.response?.data?.message || error.message;

        // 사용자에게 알림
        toast.error(message);

        // Sentry 등으로 에러 로깅
        logError(error);

        return Promise.reject(error);
    }
);
```

### 4. 타입 안정성 (TypeScript)

```typescript
// TypeScript 사용 시
interface User {
    id: string;
    name: string;
    email: string;
}

// 제네릭으로 타입 지정
const getUsers = async (): Promise<User[]> => {
    const response = await api.get<User[]>('/api/users');
    return response.data;
};
```

### 5. 요청 취소 (Cancellation)

```javascript
// React 컴포넌트에서 cleanup
useEffect(() => {
    const source = axios.CancelToken.source();

    const fetchData = async () => {
        try {
            const response = await api.get('/api/users', {
                cancelToken: source.token
            });
            setUsers(response.data);
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log('요청 취소됨');
            }
        }
    };

    fetchData();

    // 컴포넌트 언마운트 시 요청 취소
    return () => source.cancel('Component unmounted');
}, []);
```

---

## 📊 비교표

| 기능 | XMLHttpRequest | Fetch | Axios |
|------|----------------|-------|-------|
| Promise 지원 | ❌ | ✅ | ✅ |
| 자동 JSON 변환 | ❌ | ❌ | ✅ |
| HTTP 에러 자동 reject | ❌ | ❌ | ✅ |
| 인터셉터 | ❌ | ❌ | ✅ |
| 타임아웃 | ✅ | ❌ | ✅ |
| 요청 취소 | ✅ | ✅ | ✅ |
| 업로드 진행률 | ✅ | ❌ | ✅ |
| 브라우저 내장 | ✅ | ✅ | ❌ |
| IE 지원 | ✅ | ❌ | ✅ |
| 크기 | 0KB (내장) | 0KB (내장) | ~13KB |

---

## 🎓 핵심 정리

### Axios는 무엇인가?

```
✅ Promise 기반 HTTP 클라이언트 라이브러리
✅ Fetch API의 불편함을 개선한 도구
✅ React 전용이 아님 (어디서나 사용 가능)
✅ AJAX를 쉽게 사용하게 해주는 래퍼(Wrapper)
```

### 언제 사용하나?

**Axios 사용 권장**:
- ✅ 복잡한 HTTP 통신이 많은 프로젝트
- ✅ 인터셉터로 공통 로직 처리 필요
- ✅ IE 지원 필요
- ✅ 업로드 진행률 표시 필요

**Fetch 사용 권장**:
- ✅ 간단한 API 호출만 있는 경우
- ✅ 번들 크기를 최소화하고 싶은 경우
- ✅ 최신 브라우저만 지원

### AJAX의 진화

```
XMLHttpRequest (2000년대)
    ↓ 복잡함
jQuery.ajax() (2006)
    ↓ 간편해짐
Fetch API (2015)
    ↓ Promise 기반
Axios (2016)
    ↓ 더 편리하게
현재 (2025): Axios가 사실상 표준
```

---

## 📖 추가 학습 자료

- [Axios 공식 문서](https://axios-http.com/docs/intro)
- [Axios GitHub](https://github.com/axios/axios)
- [MDN - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN - XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)

---

## 🚀 실습 예제

### 1. 간단한 GET 요청

```javascript
async function fetchUsers() {
    try {
        const response = await axios.get('https://jsonplaceholder.typicode.com/users');
        console.log(response.data);
    } catch (error) {
        console.error(error);
    }
}

fetchUsers();
```

### 2. POST 요청으로 데이터 생성

```javascript
async function createPost() {
    try {
        const response = await axios.post('https://jsonplaceholder.typicode.com/posts', {
            title: 'My Post',
            body: 'This is the content',
            userId: 1
        });
        console.log('생성됨:', response.data);
    } catch (error) {
        console.error('에러:', error);
    }
}

createPost();
```

### 3. 인터셉터로 토큰 자동 추가

```javascript
const api = axios.create({
    baseURL: 'https://api.example.com'
});

// 모든 요청에 토큰 자동 추가
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 이제 토큰을 매번 추가할 필요 없음!
api.get('/protected-route');
```

---

**작성자**: Claude Code
**마지막 업데이트**: 2025-10-18
**다음 주제**: React Query, SWR (최신 데이터 페칭 라이브러리)
