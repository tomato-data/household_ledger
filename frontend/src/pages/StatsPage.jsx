import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import CategoryPieChart from '../components/CategoryPieChart';
import './StatsPage.css';

function StatsPage() {
    const navigate = useNavigate(); // 네비게이션 훅
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [type, setType] = useState('expense'); // 'expense' 또는 'income'
    const [decimalPlaces, setDecimalPlaces] = useState(0); // 소수점 자릿수 (0=정수, 1=0.0, 2=0.00)

    // ESC 키로 홈 복귀
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'Escape') {
                navigate('/');
            }
        };
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [navigate]);

    // 이전/다음 달 이동
    const handlePreviousMonth = () => {
        setSelectedDate(prev => subMonths(prev, 1));
    };
    const handleNextMonth = () => {
        setSelectedDate(prev => addMonths(prev, 1));
    };

    return (
        <div className="stats-page">
            <div className="stats-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    🔙 홈으로 돌아가기
                </button>
                <h1>📊 소비 통계</h1>
            </div>

            {/* 월 선택 */}
            <div className="month-selector">
                <button onClick={handlePreviousMonth}>◀</button>
                <h2>{format(selectedDate, 'yyyy년 MM월')}</h2>
                <button onClick={handleNextMonth}>▶</button>
            </div>

            {/* 수입 지출 토글 */}
            <div className="type-toggle">
                <button
                    className={`type-btn ${type === 'expense' ? 'active' : ''}`}
                    onClick={() => setType('expense')}
                >
                    💸 지출
                </button>
                <button
                    className={`type-btn ${type === 'income' ? 'active' : ''}`}
                    onClick={() => setType('income')}
                >
                    💰 수입
                </button>
            </div>

            {/* 소수점 설정 */}
            <div className="decimal-toggle">
                <label className="decimal-label">소수점 자릿수:</label>
                <div className="decimal-buttons">
                    <button
                        className={`decimal-btn ${decimalPlaces === 0 ? 'active' : ''}`}
                        onClick={() => setDecimalPlaces(0)}
                    >
                        정수
                    </button>
                    <button
                        className={`decimal-btn ${decimalPlaces === 1 ? 'active' : ''}`}
                        onClick={() => setDecimalPlaces(1)}
                    >
                        0.0
                    </button>
                    <button
                        className={`decimal-btn ${decimalPlaces === 2 ? 'active' : ''}`}
                        onClick={() => setDecimalPlaces(2)}
                    >
                        0.00
                    </button>
                </div>
            </div>

            {/* 파이 차트 */}
            <CategoryPieChart
                selectedDate={selectedDate}
                type={type}
                decimalPlaces={decimalPlaces}
            />
        </div>
    );
}

export default StatsPage;