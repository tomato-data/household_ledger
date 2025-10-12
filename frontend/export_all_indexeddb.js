/**
 * IndexedDB의 모든 데이터를 JSON으로 백업하는 스크립트
 * 브라우저 개발자 도구 콘솔에서 실행하세요
 */

(async function exportAllIndexedDB() {
    console.log('🚀 IndexedDB 전체 백업 시작...');

    // Dexie import (이미 페이지에 로드되어 있다고 가정)
    const { default: db } = await import('./src/utils/db.js');

    try {
        // 모든 테이블 데이터 가져오기
        const transactions = await db.transactions.toArray();
        const categories = await db.categories.toArray();
        const recurringTransactions = await db.recurring_transactions.toArray();

        console.log(`✅ 데이터 로드 완료:`);
        console.log(`  - 트랜잭션: ${transactions.length}개`);
        console.log(`  - 카테고리: ${categories.length}개`);
        console.log(`  - 반복 트랜잭션: ${recurringTransactions.length}개`);

        // 백업 데이터 객체 생성
        const backupData = {
            version: 2,
            exportDate: new Date().toISOString(),
            transactions: transactions,
            categories: categories,
            recurring_transactions: recurringTransactions
        };

        // JSON 파일로 다운로드
        const blob = new Blob([JSON.stringify(backupData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `indexeddb_full_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('✅ 백업 파일 다운로드 완료!');
        console.log(`파일명: indexeddb_full_backup_${new Date().toISOString().split('T')[0]}.json`);

        return backupData;
    } catch (error) {
        console.error('❌ 백업 실패:', error);
        throw error;
    }
})();