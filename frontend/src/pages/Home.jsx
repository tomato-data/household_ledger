import React, { useState, useEffect } from 'react';
import db from '../utils/db';
import { useTransactions } from '../context/TransactionContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { getTransactionsForMonth } from '../utils/formatDate';
import CalendarBox from '../components/CalendarBox';
import TransactionForm from '../components/TransactionForm';
import RecurringTransactionForm from '../components/RecurringTransactionForm'
import OnboardingModal from '../components/OnboardingModal';
import { generateScheduledTransactions, updateScheduledTransactions } from '../utils/recurringScheduler';

function Home() {
    const {
        allTransactions,
        filteredTransactions,
        stats,
        loading,
        error,
        loadAllTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        setFilters,
    } = useTransactions();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editTarget, setEditTarget] = useState(null);  // 수정할 거래 상태 추가
    const [showForm, setShowForm] = useState(false);
    const [showBackupAlert, setShowBackupAlert] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [showAssets, setShowAssets] = useState(false);
    const [modalTab, setModalTab] = useState('transaction'); // 'transaction' or 'recurring'
    const [recurringTransactions, setRecurringTransactions] = useState([]);

    useEffect(() => {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);

        // 달력에 표시되는 전체 범위 (이전/다음 달 포함)
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

        // 필터 설정 (자동으로 loadFilteredTransactions 호출됨)
        setFilters({
            start_date: format(calendarStart, 'yyyy-MM-dd'),
            end_date: format(calendarEnd, 'yyyy-MM-dd'),
            category_id: null,
            type: null,
        });

        // Recurring 트랜잭션 처리 (아직 IndexedDB 사용)
        const setupRecurring = async () => {
            await generateScheduledTransactions();
            await updateScheduledTransactions();

            const allRecurringTransactions = await db.recurring_transactions
                .filter(rt => rt.is_active === true)
                .toArray();
            setRecurringTransactions(allRecurringTransactions);
        };

        setupRecurring();
        checkBackupStatus();
    }, [selectedDate, setFilters]);

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'Escape') {
                if (showForm) {
                    setShowForm(false);
                    setEditTarget(null);
                    setModalTab('transaction');
                } else if (showBackupAlert) {
                    setShowBackupAlert(false);
                } else if (showSidebar) {
                    setShowSidebar(false);
                }
            }
        };

        if (showForm || showBackupAlert || showSidebar) {
            document.addEventListener('keydown', handleKeyPress);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [showForm, showBackupAlert, showSidebar]);

    // 백업 상태 체크 (30일마다)
    const checkBackupStatus = () => {
        const lastBackup = localStorage.getItem('lastBackupDate');
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        if (!lastBackup || parseInt(lastBackup) < thirtyDaysAgo) {
            setShowBackupAlert(true);
        }
    };

    // 백업 실행
    const handleBackup = async () => {
        try {
            const allTransactions = await db.allTransactions.toArray();
            const backupData = {
                version: 1,
                exportDate: new Date().toISOString(),
                transactions: allTransactions
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `가계부_백업_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // 백업 날짜 저장
            localStorage.setItem('lastBackupDate', Date.now().toString());
            setShowBackupAlert(false);
            setShowSidebar(false);

            alert('백업이 완료되었습니다! 💾');
        } catch (error) {
            console.error('백업 실패:', error);
            alert('백업 중 오류가 발생했습니다.');
        }
    };

    // 백업 복원 (단일 파일)
    const handleRestore = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        restoreFromFile(file);

        // 파일 input 초기화
        event.target.value = '';
    };

    // 백업 디렉토리에서 최신 파일 복원
    const handleRestoreFromDirectory = (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // JSON 백업 파일만 필터링
        const backupFiles = files.filter(file =>
            file.name.endsWith('.json') && file.name.includes('가계부_백업')
        );

        if (backupFiles.length === 0) {
            alert('백업 파일을 찾을 수 없습니다. 파일명이 "가계부_백업"으로 시작하는 JSON 파일이 있는지 확인해주세요.');
            return;
        }

        // 파일 수정 날짜로 정렬하여 가장 최신 파일 찾기
        backupFiles.sort((a, b) => b.lastModified - a.lastModified);
        const latestFile = backupFiles[0];

        const confirmRestore = window.confirm(
            `백업 디렉토리에서 가장 최신 파일을 복원하시겠습니까?\n\n` +
            `파일명: ${latestFile.name}\n` +
            `수정일: ${new Date(latestFile.lastModified).toLocaleString()}\n` +
            `총 ${backupFiles.length}개의 백업 파일을 찾았습니다.\n\n` +
            `⚠️ 현재 데이터가 모두 삭제되고 백업 데이터로 대체됩니다.`
        );

        if (confirmRestore) {
            restoreFromFile(latestFile);
        }

        // 파일 input 초기화
        event.target.value = '';
    };

    // 파일에서 복원하는 공통 함수
    const restoreFromFile = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backupData = JSON.parse(e.target.result);

                if (!backupData.transactions || !Array.isArray(backupData.transactions)) {
                    alert('올바르지 않은 백업 파일입니다.');
                    return;
                }

                // 기존 데이터 삭제
                await db.transactions.clear();

                // 백업 데이터 복원
                await db.transactions.bulkAdd(backupData.transactions);

                // 화면 새로고침
                loadAllTransactions();
                setShowSidebar(false);

                alert(`복원이 완료되었습니다! ✅\n파일: ${file.name}\n거래 수: ${backupData.transactions.length}개`);
            } catch (error) {
                console.error('복원 실패:', error);
                alert('복원 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
            }
        };
        reader.readAsText(file);
    };

    const handleAddTransaction = async(transaction) => {
        try {
            await addTransaction(transaction); // Context 함수 사용
            setEditTarget(null);
            setShowForm(false);
        } catch (error) {
            console.error('트랜잭션 추가 실패:', error);
            alert('트랜잭션 추가 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteTransaction = async (id) => {
        try {
            if (id.startsWith('recurring-')) {
                // recurring 거래 삭제 (아직 IndexedDB 사용)
                const recurringId = parseInt(id.split('-')[1]);
                await db.recurring_transactions.delete(recurringId);

                setRecurringTransactions(prev => prev.filter(rt => rt.id !== recurringId));

                // 연결된 실제 거래들도 삭제 (이건 Backend API 사용)
                const relatedTransactions = allTransactions.filter(tx => tx.recurring_id === recurringId);
                for (const tx of relatedTransactions) {
                    await deleteTransaction(tx.id);
                }
            } else {
                await deleteTransaction(id);
            }
            setEditTarget(null);
        } catch (error) {
            console.error('트랜잭션 삭제 실패:', error);
            alert('트랜잭션 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleUpdateTransaction = async(updatedTx) => {
        try {
            await updateTransaction(updatedTx.id, updatedTx); // Context 함수 사용
            setEditTarget(null);
            setShowForm(false);
        } catch (error) {
            console.error('트랜잭션 수정 실패:', error);
            alert('트랜잭션 수정 중 오류가 발생했습니다.');
        }
    };

    const handleAddRecurringTransaction = async(recurringTx) => {
        const id = await db.recurring_transactions.add(recurringTx);
        alert(`반복 거래 "${recurringTx.template_name}"가 생성되었습니다! 🔄`);
        setShowForm(false);
        setModalTab('transaction');
    }

    // 수정할 거래를 선택하는 핸들러 추가
    const handleEditClick = (transaction) => {
        setEditTarget(transaction);
        setShowForm(true);  // 모달 열기
    };

    // 월별 트랜잭션 필터링 (유틸리티 함수 사용)
    const monthlyTransactions = getTransactionsForMonth(filteredTransactions, selectedDate);

    // 월별 수입/지출 계산 (filteredTransactions 사용)
    const totalIncome = monthlyTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpense = monthlyTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

    // 전체 자산 계산 (Backend 통계 API 사용)
    const totalAssets = stats?.net_asset ?? 0;

    return (
        <div>
            <OnboardingModal />
            {/* 햄버거 메뉴 버튼 */}
            <button
                className="hamburger-btn"
                onClick={() => setShowSidebar(true)}
                aria-label="메뉴 열기"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            {/* 전체 자산 표시 */}
            <div className="total-assets-container">
                <div className="assets-toggle-container">
                    <button
                        className="assets-toggle-btn"
                        onClick={() => setShowAssets(!showAssets)}
                        title={showAssets ? "자산 숨기기" : "자산 보기"}
                    >
                        {showAssets ? '👁️' : '💰'}
                    </button>
                    {showAssets && (
                        <div className="total-assets-card">
                            <span className="assets-label">전체 자산</span>
                            <span className={`assets-amount ${totalAssets >= 0 ? 'positive' : 'negative'}`}>
                                {totalAssets.toLocaleString()}원
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* 월별 수입/지출 요약 */}
            <div className="summary-container">
                <div className="summary-card income-card">
                    <span className="summary-label">수입</span>
                    <span className="summary-amount income">{totalIncome.toLocaleString()}원</span>
                </div>
                <div className="summary-card expense-card">
                    <span className="summary-label">지출</span>
                    <span className="summary-amount expense">{totalExpense.toLocaleString()}원</span>
                </div>
            </div>
            <div className={`calendar-section ${loading ? 'calendar-loading' : ''}`}>
                <CalendarBox
                    transactions={filteredTransactions}
                    recurringTransactions={recurringTransactions}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    onDelete={handleDeleteTransaction}
                    onEdit={handleEditClick}
                />

                {/* + 버튼 - 캘린더 우측하단에 고정 */}
                <button className="add-button" onClick={() => setShowForm(true)}>+</button>
            </div>

            {/* 거래 추가/수정 모달 */}
            {showForm && (
                <div className="modal-overlay" onClick={() => {
                    setShowForm(false);
                    setEditTarget(null);
                    setModalTab('transaction');  // 모달 닫을 때 수정 상태 초기화
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => {
                            setShowForm(false);
                            setEditTarget(null);
                            setModalTab('transaction');  // 모달 닫을 때 수정 상태 초기화
                        }}>
                            ✕
                        </button>
                        <div className="modal-tabs">
                            <button className={`tab-btn ${modalTab === 'transaction' ? 'active' : ''}`}
                            onClick={() => setModalTab('transaction')}>💳 일반 거래</button>
                            <button className={`tab-btn ${modalTab === 'recurring' ? 'active' : ''}`}
                            onClick={() => setModalTab('recurring')}>🔄 반복 거래</button>
                        </div>
                        {/* 탭 내용 */}
                        {modalTab === 'transaction' && (
                        <TransactionForm
                            onAdd={handleAddTransaction}
                            onUpdate={handleUpdateTransaction}
                            selectedDate={selectedDate}
                            editTarget={editTarget}
                        />
                        )}
                        {modalTab === 'recurring' && (
                            <RecurringTransactionForm
                                onAdd={handleAddRecurringTransaction}
                                // onUpdate={handleUpdateRecurringTransaction}
                            />
                            // <div>반복 거래 폼(준비 중)</div>
                        )}
                    </div>
                </div>
            )}

            {/* 백업 알림 모달 */}
            {showBackupAlert && (
                <div className="backup-modal-overlay">
                    <div className="backup-modal-content">
                        <div className="backup-modal-header">
                            <h3>💾 정기 백업 알림</h3>
                            <p>30일이 지났습니다. 소중한 가계부 데이터를 백업하세요!</p>
                        </div>

                        <div className="backup-modal-actions">
                            <button className="backup-btn" onClick={handleBackup}>
                                📥 지금 백업하기
                            </button>
                            <button className="backup-later-btn" onClick={() => setShowBackupAlert(false)}>
                                나중에 하기
                            </button>
                        </div>

                        <div className="backup-info">
                            <p>💡 일반 백업 기능은 왼쪽 상단 메뉴에서 이용하실 수 있습니다.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 사이드바 */}
            {showSidebar && (
                <div className="sidebar-overlay" onClick={() => setShowSidebar(false)}>
                    <div className="sidebar" onClick={(e) => e.stopPropagation()}>
                        <div className="sidebar-header">
                            <h3>메뉴</h3>
                            <button
                                className="sidebar-close-btn"
                                onClick={() => setShowSidebar(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="sidebar-content">
                            <div className="sidebar-section">
                                <h4>백업 관리</h4>
                                <button className="sidebar-btn backup-btn" onClick={handleBackup}>
                                    💾 수동 백업
                                </button>
                                <label className="sidebar-btn restore-btn">
                                    📂 파일에서 복원
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleRestore}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                                <label className="sidebar-btn restore-dir-btn">
                                    📁 디렉토리에서 최신 복원
                                    <input
                                        type="file"
                                        webkitdirectory=""
                                        directory=""
                                        multiple
                                        onChange={handleRestoreFromDirectory}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Home;