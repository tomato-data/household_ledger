import Dexie from 'dexie';

const db = new Dexie('ledgerDB');


db.version(1).stores({
    transactions: '++id, date, description, amount, type'
    // ++id: 자동 증가 키
    // date: 날짜
    // description: 내용
    // amount: 금액
    // type: income/expense
})

export default db;