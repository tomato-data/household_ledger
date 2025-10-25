import React, { useState, useRef, useEffect } from 'react';
import { useRecurringTransactions } from '../context/RecurringTransactionContext';

function RecurringTransactionForm({ onAdd }) {
    const { addRecurringTransaction } = useRecurringTransactions();
    const templateNameRef = useRef(null);
    const [templateName, setTemplateName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('expense');
    const [frequency, setFrequency] = useState('monthly'); // monthly, yearly
    const [startDate, setStartDate] = useState(''); // YYYY-MM 형식
    const [endDate, setEndDate] = useState(''); // YYYY-MM 형식, 빈 값이면 무제한
    const [dayOfMonth, setDayOfMonth] = useState('1'); // 1-31 인데, 특정 기믹이 들어갈 수 있음. 예를 들어 해당 날짜가 휴일이면 가장 가까운 월요일 등
    const [isActive, setIsActive] = useState(true);
    const [isVariableAmount, setIsVariableAmount] = useState(false);


    // 천단위 콤마 포맷팅 함수
    const formatNumber = (num) => {
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // 콤마 제거 함수
    const removeCommas = (str) => {
        return str.replace(/,/g, '');
    };

    // 금액 입력 핸들러
    const handleAmountChange = (e) => {
        const value = e.target.value;
        const numbersOnly = removeCommas(value);
        if (numbersOnly === '' || /^\d+$/.test(numbersOnly)) {
            setAmount(numbersOnly ? formatNumber(numbersOnly) : '');
        }
    };

    // 폼이 열릴 때 템플릿명 입력란에 포커스
    useEffect(() => {
        const timer = setTimeout(() => {
            if (templateNameRef.current) {
                templateNameRef.current.focus();
            }
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async(e) => {
        e.preventDefault();

        if (!templateName || !description) {
            alert('템플릿명과 내역을 입력해주세요.');
            return;
        }

        if (!isVariableAmount && !amount) {
            alert('금액을 입력해주세요.')
            return;
        }

        if (!startDate) {
            alert('시작월을 입력해주세요.');
            return;
        }

        const newRecurringTransaction = {
            template_name: templateName,
            description: description,
            amount: isVariableAmount ? null : parseInt(removeCommas(amount)),
            type: type,
            frequency: frequency,
            start_date: startDate,
            end_date: endDate || null,
            day_of_month: parseInt(dayOfMonth),
            is_active: isActive,
            is_variable_amount: isVariableAmount,
        };

        try {
            // Context 함수 호출
            await addRecurringTransaction(newRecurringTransaction);

            // 성공 시 부모 컴포넌트에 알림 (모달 닫기 등)
            onAdd();

            // 폼 초기화
            setTemplateName('');
            setDescription('');
            setAmount('');
            setType('expense');
            setFrequency('monthly');
            setStartDate('');
            setEndDate('');
            setDayOfMonth('1');
            setIsActive(true);
            setIsVariableAmount(false);
        } catch (error) {
            // 에러 처리 (Context에서 이미 로그 출력했지만, UI에서도 알림)
            alert('반복거래 생성 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="transaction-form-container">
            <div className="form-header">
                <h3>반복 거래 설정</h3>
                <p>정해진 주기마다 자동으로 생성될 거래를 설정하세요</p>
            </div>

            <form onSubmit={handleSubmit} className="transaction-form">
                {/* 템플릿명 입력*/}
                <div className="form-group">
                    <label className="form-label">템플릿명</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="예: 월세, 넷플릭스 구독료"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        ref={templateNameRef}
                    />
                </div>

                {/* 수입/지출 토글 버튼 */}
                <div className="form-group">
                    <label className="form-label">유형</label>
                    <div className="type-toggle">
                        <button
                            type="button"
                            className={`type-btn ${type === 'income' ? 'active income' : ''}`}
                            onClick={() => setType('income')}
                        >
                            💰 수입
                        </button>
                        <button
                            type="button"
                            className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
                            onClick={() => setType('expense')}
                        >
                            💸 지출
                        </button>
                    </div>
                </div>

                {/* 변동 금액 체크 박스, 나중에 제대로된 로직을 만들어야 함. */}
                <div className="form-group">
                    <label className="form-label">
                    <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={isVariableAmount}
                        onChange={(e) => setIsVariableAmount(e.target.checked)}
                    />
                    변동 금액 (매번 다른 금액)
                    </label>
                </div>

                {/* 금액 입력 - 고정 금액일 때만 표시 */}
                {!isVariableAmount && (
                    <div className="form-group">
                        <label className="form-label">금액</label>
                        <div className="amount-input-wrapper">
                            <input
                                type="text"
                                className="form-input amount-input"
                                placeholder="0"
                                value={amount}
                                onChange={handleAmountChange}
                            />
                            <span className="currency-symbol">원</span>
                        </div>
                    </div>
                )}

                {/* 내역 입력 */}
                <div className="form-group">
                    <label className="form-label">내역</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="거래 내역을 입력하세요"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* 주기 설정 */}
                <div className="form-group">
                    <label className="form-label">반복 주기</label>
                    <select
                        className="form-input"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        >
                        <option value="monthly">매 월</option>
                        <option value="yearly">매 년</option>
                    </select>
                </div>

                {/* 시작월 설정 */}
                <div className="form-group">
                    <label className="form-label">시작월</label>
                    <input
                        type="month"
                        className="form-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="YYYY-MM"
                    />
                </div>

                {/* 종료월 설정 (선택사항) */}
                <div className="form-group">
                    <label className="form-label">종료월 (선택사항)</label>
                    <input
                        type="month"
                        className="form-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="비어두면 무제한"
                    />
                </div>

                {/* 실행 날짜 설정 */}
                <div className="form-group">
                    <label className="form-label">
                        {frequency === "monthly" ? "매월 실행 날짜" : "매년 실행 날짜"}
                    </label>
                    <input
                        type="number"
                        className="form-input"
                        min="1"
                        max="31"
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(e.target.value)}
                        placeholder="1-31"
                    />
                </div>

                {/* 제출 버튼 */}
                <div className="form-actions">
                    <button type="submit" className={`submit-btn ${type}`}>
                        🔄 반복 거래 생성
                    </button>
                </div>
            </form>
        </div>
    );
}

export default RecurringTransactionForm;