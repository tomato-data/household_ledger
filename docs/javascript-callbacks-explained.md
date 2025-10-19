# JavaScript 콜백 함수 (Callback Functions) 완벽 가이드

**작성 날짜**: 2025-10-18
**목적**: 콜백 함수의 개념, 사용법, 그리고 현대적인 대안 이해하기

---

## 📋 목차

1. [콜백 함수란?](#콜백-함수란)
2. [콜백 함수의 작동 원리](#콜백-함수의-작동-원리)
3. [동기 vs 비동기 콜백](#동기-vs-비동기-콜백)
4. [콜백 지옥 (Callback Hell)](#콜백-지옥-callback-hell)
5. [Promise와 async/await](#promise와-asyncawait)
6. [실제 프로젝트 예시](#실제-프로젝트-예시)
7. [Best Practices](#best-practices)

---

## 🎯 콜백 함수란?

### 정의

**콜백 함수(Callback Function)**는 **다른 함수에 인자로 전달되어, 나중에 호출되는 함수**를 말합니다.

```javascript
// 기본 형태
function 상위함수(callback) {
    // 어떤 작업 수행...
    callback();  // 콜백 함수 호출
}

// 사용 예시
상위함수(function() {
    console.log('나는 콜백 함수입니다!');
});
```

### 왜 "콜백(Callback)"이라고 부를까?

- **Call**: 호출하다
- **Back**: 나중에, 되돌아와서
- **의미**: "나중에 다시 호출해줘" → "콜백"

---

## ⚙️ 콜백 함수의 작동 원리

### 1. 함수를 값으로 전달

JavaScript에서 함수는 **일급 객체(First-Class Object)**입니다.

```javascript
// 함수는 변수에 저장 가능
const myFunction = function() {
    console.log('함수를 변수에 저장!');
};

// 함수는 다른 함수의 인자로 전달 가능
function executeCallback(callback) {
    callback();
}

executeCallback(myFunction);  // "함수를 변수에 저장!" 출력
```

### 2. 언제 호출될지는 상위 함수가 결정

```javascript
function processData(data, callback) {
    console.log('1. 데이터 처리 중...');

    // 시간이 걸리는 작업
    const result = data * 2;

    console.log('2. 데이터 처리 완료!');

    // 이제 콜백 호출
    callback(result);
}

processData(10, function(result) {
    console.log('3. 결과:', result);  // 20
});

// 출력 순서:
// 1. 데이터 처리 중...
// 2. 데이터 처리 완료!
// 3. 결과: 20
```

### 3. 실생활 비유

```
레스토랑에서 음식 주문 시나리오:

1. 고객: "음식 주문할게요. 다 되면 불러주세요." (콜백 등록)
2. 직원: "네, 알겠습니다." (콜백 저장)
3. [주방에서 음식 조리 중...]
4. 직원: "고객님, 음식 나왔습니다!" (콜백 호출)
5. 고객: "감사합니다." (콜백 함수 실행)
```

---

## 🔄 동기 vs 비동기 콜백

### 동기(Synchronous) 콜백

**즉시 실행**되는 콜백입니다.

```javascript
// Array.map은 동기 콜백
const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map(function(num) {  // 콜백 함수
    return num * 2;
});

console.log(doubled);  // [2, 4, 6, 8, 10]
```

**특징**:
- 함수가 완료될 때까지 다음 코드 실행 안 됨
- 순서가 보장됨
- 예시: `Array.map()`, `Array.filter()`, `Array.forEach()`

### 비동기(Asynchronous) 콜백

**나중에 실행**되는 콜백입니다.

```javascript
console.log('1. 시작');

setTimeout(function() {  // 비동기 콜백
    console.log('2. 2초 후 실행');
}, 2000);

console.log('3. 끝');

// 출력 순서:
// 1. 시작
// 3. 끝
// 2. 2초 후 실행  (2초 후)
```

**특징**:
- 다음 코드가 먼저 실행됨
- 순서가 보장되지 않음
- 예시: `setTimeout()`, `fetch()`, 이벤트 리스너

---

## 🌐 fetch()와 콜백

### fetch()의 구조

```javascript
fetch('https://api.example.com/data')
    .then(function(response) {    // ← 이것이 콜백 함수!
        return response.json();
    })
    .then(function(data) {        // ← 이것도 콜백 함수!
        console.log(data);
    });
```

**정확한 용어**:
- `.then(callback)`의 `callback`은 **Promise 콜백** 또는 **then 핸들러**라고 부릅니다.
- 일반적인 콜백 함수의 특수한 형태입니다.

### fetch() 작동 순서

```javascript
console.log('1. 요청 시작');

fetch('https://api.example.com/data')
    .then(function(response) {
        console.log('3. 서버 응답 도착!');
        return response.json();
    })
    .then(function(data) {
        console.log('4. 데이터 파싱 완료:', data);
    });

console.log('2. 요청 전송 후 다음 코드 실행');

// 출력 순서:
// 1. 요청 시작
// 2. 요청 전송 후 다음 코드 실행
// 3. 서버 응답 도착!
// 4. 데이터 파싱 완료: {...}
```

### 왜 비동기일까?

```javascript
// 만약 동기적이라면? (가상 시나리오)
const response = fetch('https://api.example.com/data');  // 여기서 멈춤!
// 서버 응답까지 3초 걸림... 브라우저 멈춤 😱
console.log('3초 후에야 실행됨');

// 실제 비동기 동작
fetch('https://api.example.com/data')  // 백그라운드에서 실행
    .then(res => console.log('응답 도착!'));
console.log('즉시 실행됨!');  // 브라우저 멈추지 않음 ✅
```

---

## 😱 콜백 지옥 (Callback Hell)

### 문제: 중첩된 콜백

```javascript
// 사용자 정보 → 게시글 → 댓글 순서로 가져오기
getUserInfo(userId, function(user) {
    console.log('사용자:', user.name);

    getPosts(user.id, function(posts) {
        console.log('게시글 수:', posts.length);

        getComments(posts[0].id, function(comments) {
            console.log('댓글 수:', comments.length);

            // 더 깊어질 수 있음... 😱
            // 피라미드 모양 = Callback Hell
        });
    });
});
```

**문제점**:
1. ❌ 가독성 매우 나쁨 (피라미드 구조)
2. ❌ 에러 처리 어려움
3. ❌ 유지보수 힘듦
4. ❌ 코드 흐름 파악 어려움

### 해결책: Promise 체이닝

```javascript
getUserInfo(userId)
    .then(user => {
        console.log('사용자:', user.name);
        return getPosts(user.id);
    })
    .then(posts => {
        console.log('게시글 수:', posts.length);
        return getComments(posts[0].id);
    })
    .then(comments => {
        console.log('댓글 수:', comments.length);
    })
    .catch(error => {
        console.error('에러:', error);
    });
```

**개선점**:
1. ✅ 평평한(flat) 구조
2. ✅ `.catch()`로 에러 처리 통합
3. ✅ 읽기 쉬움
4. ✅ 코드 흐름이 명확

---

## 🚀 Promise와 async/await

### Promise란?

**Promise**는 "미래의 어떤 값"을 나타내는 객체입니다.

```javascript
// Promise 생성
const myPromise = new Promise(function(resolve, reject) {
    // 비동기 작업
    setTimeout(function() {
        const success = true;

        if (success) {
            resolve('성공!');  // 성공 시
        } else {
            reject('실패...');  // 실패 시
        }
    }, 1000);
});

// Promise 사용
myPromise
    .then(function(result) {    // resolve 호출 시 실행
        console.log(result);     // "성공!"
    })
    .catch(function(error) {    // reject 호출 시 실행
        console.error(error);
    });
```

### async/await (현대적 방식)

```javascript
// Promise 방식
function fetchUserData() {
    return fetch('/api/user')
        .then(response => response.json())
        .then(data => {
            console.log(data);
            return data;
        })
        .catch(error => {
            console.error(error);
        });
}

// async/await 방식 (더 읽기 쉬움!)
async function fetchUserData() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.error(error);
    }
}
```

**장점**:
- ✅ 동기 코드처럼 읽힘
- ✅ `try/catch`로 에러 처리
- ✅ 가독성 최고

---

## 💼 실제 프로젝트 예시

### 1. 이벤트 리스너 (콜백의 가장 흔한 예시)

```javascript
// Button 클릭 시 실행될 함수 (콜백)
document.getElementById('myButton').addEventListener('click', function(event) {
    console.log('버튼 클릭됨!', event);
});

// 화살표 함수로 작성 (ES6+)
document.getElementById('myButton').addEventListener('click', (event) => {
    console.log('버튼 클릭됨!', event);
});
```

### 2. Array 메서드 (동기 콜백)

```javascript
const transactions = [
    { type: 'income', amount: 100 },
    { type: 'expense', amount: 50 },
    { type: 'income', amount: 200 },
];

// filter: 조건에 맞는 항목만 필터링 (콜백 사용)
const incomes = transactions.filter(function(tx) {
    return tx.type === 'income';
});

// map: 각 항목 변환 (콜백 사용)
const amounts = transactions.map(function(tx) {
    return tx.amount;
});

// reduce: 합계 계산 (콜백 사용)
const total = transactions.reduce(function(sum, tx) {
    return sum + tx.amount;
}, 0);
```

### 3. 우리 프로젝트의 실제 코드

#### categoryService.js
```javascript
// 콜백이 아닌 Promise 반환
export const getCategories = async (token) => {
    const response = await apiClient.get('/api/v1/categories', {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    return response.data;
};

// 사용처 (CategoryContext.jsx)
const loadCategories = async () => {
    try {
        const token = await getToken();
        const data = await getCategories(token);  // await로 기다림
        setCategories(data);
    } catch (error) {
        console.error('로딩 실패:', error);
    }
};
```

#### TransactionContext.jsx의 콜백 사용
```javascript
// useEffect: React의 콜백 사용 예시
useEffect(() => {  // ← 이것이 콜백 함수!
    loadAllTransactions();
    loadStats();
}, []);  // 컴포넌트 마운트 시 실행

// Array.filter: 동기 콜백
const checkTransactionMatchesFilter = (transaction) => {
    return filteredTransactions.filter(tx => {  // ← 콜백 함수
        return tx.id === transaction.id;
    });
};
```

#### CalendarBox.jsx의 콜백 체이닝
```javascript
// Array 메서드 체이닝 (모두 콜백 사용)
const totalIncome = transactions
    .filter(tx => tx.type === 'income')      // 콜백 1
    .filter(tx => tx.status === 'confirmed') // 콜백 2
    .reduce((sum, tx) => sum + tx.amount, 0); // 콜백 3
```

---

## 📚 콜백 함수의 종류

### 1. 익명 함수 (Anonymous Function)

```javascript
setTimeout(function() {  // 이름 없는 함수
    console.log('익명 콜백');
}, 1000);
```

### 2. 화살표 함수 (Arrow Function - ES6)

```javascript
setTimeout(() => {  // 더 간결한 문법
    console.log('화살표 콜백');
}, 1000);

// 한 줄이면 중괄호 생략 가능
[1, 2, 3].map(num => num * 2);  // [2, 4, 6]
```

### 3. 명명된 함수 (Named Function)

```javascript
function handleClick(event) {  // 이름 있는 함수
    console.log('클릭!', event);
}

button.addEventListener('click', handleClick);  // 함수 참조 전달

// 나중에 제거 가능
button.removeEventListener('click', handleClick);
```

### 4. 함수 표현식 (Function Expression)

```javascript
const myCallback = function(data) {
    console.log('데이터:', data);
};

fetchData(myCallback);
```

---

## ✅ Best Practices

### 1. 명확한 이름 사용

```javascript
// ❌ 나쁜 예
getData(function(x) {
    doSomething(x);
});

// ✅ 좋은 예
getUser(function(userData) {
    displayUserProfile(userData);
});
```

### 2. 콜백 지옥 피하기

```javascript
// ❌ 콜백 지옥
getUser(id, function(user) {
    getPosts(user.id, function(posts) {
        getComments(posts[0].id, function(comments) {
            // ...
        });
    });
});

// ✅ Promise 체이닝
getUser(id)
    .then(user => getPosts(user.id))
    .then(posts => getComments(posts[0].id))
    .then(comments => console.log(comments));

// ✅✅ async/await (최선!)
async function loadUserContent(id) {
    const user = await getUser(id);
    const posts = await getPosts(user.id);
    const comments = await getComments(posts[0].id);
    console.log(comments);
}
```

### 3. 에러 처리 항상 포함

```javascript
// ❌ 에러 처리 없음
fetch('/api/data')
    .then(res => res.json())
    .then(data => console.log(data));

// ✅ 에러 처리 포함
fetch('/api/data')
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(error => console.error('에러:', error));

// ✅✅ async/await + try/catch
async function fetchData() {
    try {
        const res = await fetch('/api/data');
        const data = await res.json();
        console.log(data);
    } catch (error) {
        console.error('에러:', error);
    }
}
```

### 4. 화살표 함수 적절히 활용

```javascript
// 짧은 콜백: 화살표 함수
const doubled = [1, 2, 3].map(n => n * 2);

// 복잡한 로직: 명명된 함수
function handleComplexClick(event) {
    // 여러 줄의 복잡한 로직...
    validateInput();
    processData(event.target.value);
    updateUI();
}

button.addEventListener('click', handleComplexClick);
```

---

## 🎓 핵심 개념 정리

### 콜백 함수란?

```
✅ 다른 함수의 인자로 전달되는 함수
✅ 나중에 호출되는 함수 (Call + Back)
✅ JavaScript에서 비동기 처리의 기본
```

### 용어 정리

| 용어 | 의미 | 예시 |
|------|------|------|
| **콜백 함수** | 인자로 전달되어 나중에 실행되는 함수 | `setTimeout(callback, 1000)` |
| **동기 콜백** | 즉시 실행되는 콜백 | `[1,2,3].map(callback)` |
| **비동기 콜백** | 나중에 실행되는 콜백 | `fetch().then(callback)` |
| **Promise 콜백** | `.then()`, `.catch()`의 콜백 | `.then(callback)` |
| **이벤트 핸들러** | 이벤트 발생 시 실행되는 콜백 | `button.onclick = callback` |

### 진화 과정

```
콜백 (1995~)
    ↓
Promise (ES6, 2015)
    ↓
async/await (ES8, 2017) ← 현재 권장
```

---

## 📖 추가 학습 자료

### MDN 문서
- [Callback function](https://developer.mozilla.org/en-US/docs/Glossary/Callback_function)
- [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)

### 실습 예제

```javascript
// 연습 1: 간단한 콜백
function greet(name, callback) {
    console.log('Hello, ' + name);
    callback();
}

greet('Alice', function() {
    console.log('Nice to meet you!');
});

// 연습 2: setTimeout
console.log('시작');
setTimeout(() => console.log('2초 후'), 2000);
console.log('끝');

// 연습 3: Promise
const promise = new Promise((resolve) => {
    setTimeout(() => resolve('완료!'), 1000);
});

promise.then((result) => console.log(result));

// 연습 4: async/await
async function example() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('1초 후 실행');
}

example();
```

---

## 🎯 결론

### 콜백 함수의 본질

> **"나중에 실행될 함수를 미리 등록해두는 것"**

### 언제 사용하나?

- ✅ 비동기 작업 (네트워크, 파일 I/O)
- ✅ 이벤트 처리 (클릭, 키보드 입력)
- ✅ 배열 처리 (map, filter, reduce)
- ✅ 타이머 (setTimeout, setInterval)

### 현대적 접근

```javascript
// 과거: 콜백 지옥
getData(function(a) {
    getMoreData(a, function(b) {
        getMoreData(b, function(c) {
            console.log(c);
        });
    });
});

// 현재: async/await
async function fetchData() {
    const a = await getData();
    const b = await getMoreData(a);
    const c = await getMoreData(b);
    console.log(c);
}
```

**핵심**: 콜백의 개념을 이해하되, 실무에서는 **async/await를 주로 사용**하세요!

---

**작성자**: Claude Code
**마지막 업데이트**: 2025-10-18
**다음 주제**: Promise 내부 동작 원리, Event Loop
