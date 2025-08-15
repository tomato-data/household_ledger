import Dexie from 'dexie';

const db = new Dexie('ledgerDB');


db.version(3).stores({
    transactions: '++id, date, description, amount, type, category, status, recurring_id',
    // ++id: 자동 증가 키
    // date: 날짜
    // description: 내용
    // amount: 금액
    // type: income/expense
    recurring_transactions: '++id, template_name, description, amount, type, frequency, start_date, day_of_month, is_active, is_variable_amount',
    categories: '++id, name, emoji'
})

export default db;