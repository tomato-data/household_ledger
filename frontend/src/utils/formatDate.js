/**
 * 날짜 유틸리티 함수 모음
 * 모든 날짜 처리는 이 파일의 함수를 사용하여 일관성 유지
 */

/**
 * Date 객체를 YYYY-MM-DD 형식의 문자열로 변환 (로컬 타임존)
 * @param {Date} date - JavaScript Date 객체
 * @returns {string} - YYYY-MM-DD 형식의 문자열
 */
export const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * YYYY-MM-DD 문자열 또는 ISO 문자열을 Date 객체로 변환
 * @param {string} dateString - "2025-10-18" 또는 "2025-10-18T00:00:00.000Z" 형식의 문자열
 * @returns {Date} - JavaScript Date 객체
 */
export const parseDateString = (dateString) => {
    if (!dateString) return null;

    // "YYYY-MM-DD" 형식이면 로컬 타임존으로 파싱
    if (dateString.length === 10 && !dateString.includes('T')) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    // ISO 문자열이면 Date 생성자 사용 (하지만 날짜만 추출)
    const date = new Date(dateString);
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * 두 날짜가 같은 날인지 비교 (시간 무시)
 * @param {Date} date1 - 첫 번째 날짜
 * @param {Date} date2 - 두 번째 날짜
 * @returns {boolean} - 같은 날이면 true, 다른 날이면 false
 */
export const isSameDay = (date1, date2) => {
    const d1 = date1 instanceof Date ? date1 : parseDateString(date1);
    const d2 = date2 instanceof Date ? date2 : parseDateString(date2);

    if (!d1 || !d2) return false;

    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
};

/**
 * 날짜가 범위 내에 있는지 확인
 * @param {Date|string} date - 확인할 날짜
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD 형식)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD 형식)
 * @returns {boolean} - 범위 내에 있으면 true, 범위 밖이면 false
 */
export const isDateInRange = (date, startDate, endDate) => {
    const targetDateStr = date instanceof Date
        ? formatDateToYYYYMMDD(date)
        : date.split('T')[0];

    if (startDate && targetDateStr < startDate) return false;
    if (endDate && targetDateStr > endDate) return false;

    return true;
};

/**
 * 트랜잭션 배열을 날짜 기준으로 정렬 (내림차순)
 * @param {Array} transactions - 트랜잭션 배열
 * @returns {Array} - 정렬된 트랜잭션 배열
 */
export const sortTransactionsByDate = (transactions) => {
    return [...transactions].sort((a, b) => {
        // 문자열 비교로 정렬 (YYYY-MM-DD 형식은 문자열 비교로 정렬 가능)
        const dateA = a.date.split('T')[0];
        const dateB = b.date.split('T')[0];
        return dateB.localeCompare(dateA); // 내림차순
    });
};

/**
 * 특정 날짜의 트랜잭션 필터링
 * @param {Array} transactions - 트랜잭션 배열
 * @param {Date} selectedDate - 선택한 날짜
 * @returns {Array} - 필터링된 트랜잭션 배열
 */
export const getTransactionsForDate = (transactions, selectedDate) => {
    return transactions.filter(tx => {
        // 백엔드에서 "2025-10-18" 또는 "2025-10-18T00:00:00.000Z" 형식의 문자열로 전달됨
        const txDateStr = tx.date.split('T')[0];
        const [year, month, day] = txDateStr.split('-').map(Number);

        return (
            year === selectedDate.getFullYear() &&
            month - 1 === selectedDate.getMonth() &&
            day === selectedDate.getDate()
        );
    });
};

/**
 * 월별 트랜잭션 필터링
 * @param {Array} transactions - 트랜잭션 배열
 * @param {Date} selectedDate - 선택한 날짜 (월 기준)
 * @returns {Array} - 필터링된 트랜잭션 배열
 */
export const getTransactionsForMonth = (transactions, selectedDate) => {
    return transactions.filter(tx => {
        const txDateStr = tx.date.split('T')[0];
        const [year, month] = txDateStr.split('-').map(Number);

        return (
            year === selectedDate.getFullYear() &&
            month - 1 === selectedDate.getMonth()
        );
    });
};

/**
 * 날짜를 사용자 친화적 형식으로 표시
 * @param {Date|string} date - 날짜
 * @param {string} format - 'full' | 'short' | 'month'
 * @returns {string} - 포맷된 날짜 문자열
 */
export const formatDisplayDate = (date, format = 'full') => {
    const dateObj = date instanceof Date ? date : parseDateString(date);

    if (!dateObj) return '';

    const options = {
        full: { year: 'numeric', month: 'long', day: 'numeric' }, // 2025년 10월 18일
        short: { year: 'numeric', month: '2-digit', day: '2-digit' }, // 2025.10.18
        month: {year: 'numeric', month: 'long'} // 2025년 10월
    };

    return dateObj.toLocaleDateString('ko-KR', options[format]);
};