import React, { useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useTransactions } from '../context/TransactionContext';

const COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
    '#36A2EB', '#FFCE56', '#FF9F40'
];

function CategoryPieChart({ selectedDate, type = 'expense', decimalPlaces = 0 }) {
    const { categoryStats, loadCategoryStats, loading, error } = useTransactions();

    useEffect(() => {
        const startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

        // Context 함수 호출 (Backend API 요청)
        loadCategoryStats(startDate, endDate, type);
    }, [selectedDate, type]);  // 날짜나 타입 변경 시 재로드

    if (loading) {
        return <div className="chart-loading">📊 로딩 중...</div>;
    }

    if (error) {
        return <div className="chart-error">❌ {error}</div>;
    }

    if (!categoryStats || categoryStats.length === 0) {
        return <div className="chart-empty">데이터가 없습니다.</div>;
    }

    // Recharts용 데이터 포맷
    const chartData = categoryStats.map(stat => ({
        name: `${stat.category_emoji} ${stat.category_name}`,
        value: stat.total_amount,
        percentage: stat.percentage,
    }));

    // 백분율 포맷팅 함수
    const formatPercentage = (percentage) => {
        // percentage는 0~1 사이의 비율이므로 100을 곱해서 백분율로 변환
        return (percentage * 100).toFixed(decimalPlaces);
    };

    // 커스텀 툴팁
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (
                <div className="custom-tooltip">
                    <p className="label">{data.name}</p>
                    <p className="amount">{data.value.toLocaleString()}원</p>
                    <p className="percent">{formatPercentage(data.payload.percentage)}%</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="pie-chart-container">
            <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        startAngle={90}
                        endAngle={-270}
                        labelLine={false}
                        label={(entry) => `${formatPercentage(entry.percentage)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>

            {/* 리스트 뷰 */}
            <div className="stats-list">
                {categoryStats.map(stat => (
                    <div key={stat.category_id} className="stat-item">
                        <span className="stat-category">
                            {stat.category_emoji} {stat.category_name}
                        </span>
                        <span className="stat-amount">
                            {stat.total_amount.toLocaleString()}원
                        </span>
                        <span className="stat-percentage">
                            {formatPercentage(stat.percentage)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CategoryPieChart;