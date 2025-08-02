import React, { useState, useEffect } from 'react';
import db from '../utils/db';
import CalendarBox from '../components/CalendarBox';
import TransactionForm from '../components/TransactionForm';

function Home() {
    const [transactions, setTransactions] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editTarget, setEditTarget] = useState(null);  // 수정할 거래 상태 추가
    const [showForm, setShowForm] = useState(false);
    const [showBackupAlert, setShowBackupAlert] = useState(false);

    useEffect(() => {
        const fetchTransactions = async () => {
            const allTransactions = await db.transactions.toArray();
            setTransactions(allTransactions);
        }
        fetchTransactions();
        
        // 백업 알림 체크
        checkBackupStatus();
    }, []);

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'Escape') {
                if (showForm) {
                    setShowForm(false);
                    setEditTarget(null);
                } else if (showBackupAlert) {
                    setShowBackupAlert(false);
                }
            }
        };

        if (showForm || showBackupAlert) {
            document.addEventListener('keydown', handleKeyPress);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [showForm, showBackupAlert]);

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
            const allTransactions = await db.transactions.toArray();
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
            
            alert('백업이 완료되었습니다! 💾');
        } catch (error) {
            console.error('백업 실패:', error);
            alert('백업 중 오류가 발생했습니다.');
        }
    };

    // 백업 복원
    const handleRestore = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                
                if (!backupData.transactions || !Array.isArray(backupData.transactions)) {
                    alert('올바르지 않은 백업 파일입니다.');
                    return;
                }
                
                const confirmRestore = window.confirm(
                    `백업 파일을 복원하시겠습니까?\n` +
                    `백업 날짜: ${new Date(backupData.exportDate).toLocaleDateString()}\n` +
                    `거래 수: ${backupData.transactions.length}개\n\n` +
                    `⚠️ 현재 데이터가 모두 삭제되고 백업 데이터로 대체됩니다.`
                );
                
                if (confirmRestore) {
                    // 기존 데이터 삭제
                    await db.transactions.clear();
                    
                    // 백업 데이터 복원
                    await db.transactions.bulkAdd(backupData.transactions);
                    
                    // 화면 새로고침
                    const newTransactions = await db.transactions.toArray();
                    setTransactions(newTransactions);
                    
                    alert('복원이 완료되었습니다! ✅');
                }
            } catch (error) {
                console.error('복원 실패:', error);
                alert('복원 중 오류가 발생했습니다.');
            }
        };
        reader.readAsText(file);
        
        // 파일 input 초기화
        event.target.value = '';
    };
    
    const handleAddTransaction = async(transaction) => {
        const id = await db.transactions.add(transaction);
        setTransactions((prev) => [transaction, ...prev]);
        setEditTarget(null);  // 추가 후 수정 상태 초기화
        setShowForm(false);   // 모달 닫기
    };

    const handleDeleteTransaction = async (id) => {
        await db.transactions.delete(id);
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        setEditTarget(null);  // 삭제 후 수정 상태 초기화
    };

    const handleUpdateTransaction = async(updatedTx) => {
        await db.transactions.put(updatedTx);
        setTransactions(prev =>
            prev.map(tx => (tx.id === updatedTx.id ? updatedTx : tx))
        );
        setEditTarget(null);  // 수정 완료 후 수정 상태 초기화
        setShowForm(false);   // 모달 닫기
    };

    // 수정할 거래를 선택하는 핸들러 추가
    const handleEditClick = (transaction) => {
        setEditTarget(transaction);
        setShowForm(true);  // 모달 열기
    };

    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();

    const monthlyTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return (
            txDate.getMonth() === selectedMonth &&
            txDate.getFullYear() === selectedYear
        );
    });

    const totalIncome = monthlyTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpense = monthlyTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

    // 전체 자산 계산 (모든 거래 기준)
    const allIncome = transactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const allExpense = transactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const totalAssets = allIncome - allExpense;

    return (
        <div>
            {/* 전체 자산 표시 */}
            <div className="total-assets-container">
                <div className="total-assets-card">
                    <span className="assets-label">전체 자산</span>
                    <span className={`assets-amount ${totalAssets >= 0 ? 'positive' : 'negative'}`}>
                        {totalAssets.toLocaleString()}원
                    </span>
                </div>
            </div>

            {/* 월별 수입/지출 요약 */}
            <div className="summary-container">
                <div className="summary-card income-card">
                    <span className="summary-label">이번 달 수입</span>
                    <span className="summary-amount income">{totalIncome.toLocaleString()}원</span>
                </div>
                <div className="summary-card expense-card">
                    <span className="summary-label">이번 달 지출</span>
                    <span className="summary-amount expense">{totalExpense.toLocaleString()}원</span>
                </div>
            </div>
            <div className="calendar-section">
                <CalendarBox 
                    transactions={transactions}
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
                    setEditTarget(null);  // 모달 닫을 때 수정 상태 초기화
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => {
                            setShowForm(false);
                            setEditTarget(null);  // 모달 닫을 때 수정 상태 초기화
                        }}>
                            ✕
                        </button>
                        <TransactionForm 
                            onAdd={handleAddTransaction} 
                            onUpdate={handleUpdateTransaction}
                            selectedDate={selectedDate} 
                            editTarget={editTarget}
                        />
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
                        
                        <div className="backup-tools">
                            <h4>백업 관리</h4>
                            <div className="backup-actions">
                                <button className="manual-backup-btn" onClick={handleBackup}>
                                    💾 수동 백업
                                </button>
                                <label className="restore-btn">
                                    📂 복원하기
                                    <input 
                                        type="file" 
                                        accept=".json"
                                        onChange={handleRestore}
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