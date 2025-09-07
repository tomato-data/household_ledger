import Dexie from 'dexie';

const db = new Dexie('ledgerDB');

// 기존 버전 (호환성 유지)
db.version(2).stores({
    transactions: '++id, date, description, amount, type, category'
});

// 새 버전 (기존 transactions 테이블에 필드 추가 + recurring_transactions 테이블 새로 생성)
db.version(3).stores({
    transactions: '++id, date, description, amount, type, category, status, recurring_id',
    recurring_transactions: '++id, template_name, description, amount, type, frequency, start_date, day_of_month, is_active, is_variable_amount',
    categories: '++id, name, emoji'
}).upgrade(tx => {
    // 기존 거래에 새 필드 추가
    return tx.transactions.toCollection().modify(transaction => {
        if (!transaction.status) {
            transaction.status = 'confirmed';  // 기존 거래는 모두 confirmed
        }
        if (!transaction.recurring_id) {
            transaction.recurring_id = null;   // 기존 거래는 일반 거래
        }
    });
});

// 버전 4: recurring_transactions에 end_date 필드 추가 및 start_date 용도 변경
db.version(4).stores({
    transactions: '++id, date, description, amount, type, category, status, recurring_id',
    recurring_transactions: '++id, template_name, description, amount, type, frequency, start_date, end_date, day_of_month, is_active, is_variable_amount',
    categories: '++id, name, emoji'
}).upgrade(tx => {
    // 기존 반복 거래에 새 필드 추가 및 start_date 형식 변경
    return tx.recurring_transactions.toCollection().modify(recurring => {
        const now = new Date();
        // start_date를 YYYY-MM 형식으로 변경 (기존 데이터는 현재 월로 설정)
        recurring.start_date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // end_date 추가 (null이면 무제한)
        recurring.end_date = null;
    });
});

export default db;