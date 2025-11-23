//반복 거래에서 실제 거래 생성
export const generateScheduledTransactions = async (
  recurringTransactions,
  allTransactions,
  addTransaction
) => {
  try {
    // 안전하게 recurring_transactions 테이블 조회
    const activeRecurring = recurringTransactions.filter(
      (rt) => rt.is_active === true
    );

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    for (const recurring of activeRecurring) {
      await generateTransactionsForRecurring(
        recurring,
        currentYear,
        currentMonth,
        allTransactions,
        addTransaction
      );
    }
  } catch (error) {
    console.log("반복 거래 생성 중 오류:", error);
    // 에러가 발생해도 앱이 멈추지 않도록 함
  }
};

// 특정 반복거래에 대해 거래 생성
const generateTransactionsForRecurring = async (
  recurring,
  currentYear,
  currentMonth,
  allTransactions,
  addTransaction
) => {
  // 시작월/종료월 체크
  if (!isInValidPeriod(recurring, currentYear, currentMonth)) {
    return; // 유효 기간이 아님
  }

  const targetDate = new Date(
    currentYear,
    currentMonth,
    parseInt(recurring.day_of_month)
  );

  // 이미 해당 월에 생성된 거래가 있는지 확인
  const existingTransaction = allTransactions.find((tx) => {
    if (tx.recurring_id !== recurring.id) return false;
    const txDate = new Date(tx.date);
    return (
      txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
    );
  });
  if (existingTransaction) {
    return; // 이미 생성됨
  }

  // 새 거래 생성
  const newTransaction = {
    date: targetDate.toISOString(),
    description: recurring.description,
    amount: recurring.amount,
    type: recurring.type,
    status: targetDate <= new Date() ? "confirmed" : "scheduled",
    recurring_id: recurring.id,
  };

  await addTransaction(newTransaction);
};

// 현재 년월이 반복거래의 유효 기간 내인지 확인
const isInValidPeriod = (recurring, currentYear, currentMonth) => {
  // start_date 체크 (YYYY-MM 형식)
  if (recurring.start_date) {
    const [startYear, startMonth] = recurring.start_date.split("-").map(Number);
    const currentYearMonth = currentYear * 12 + currentMonth;
    const startYearMonth = startYear * 12 + (startMonth - 1); // 월은 0부터 시작

    if (currentYearMonth < startYearMonth) {
      return false; // 아직 시작 전
    }
  }

  // end_date 체크 (YYYY-MM 형식, null이면 무제한)
  if (recurring.end_date) {
    const [endYear, endMonth] = recurring.end_date.split("-").map(Number);
    const currentYearMonth = currentYear * 12 + currentMonth;
    const endYearMonth = endYear * 12 + (endMonth - 1); // 월은 0부터 시작

    if (currentYearMonth > endYearMonth) {
      return false; // 이미 종료됨
    }
  }

  return true;
};

// 스케줄된 거래들의 상태 업데이트
export const updateScheduledTransactions = async (
  allTransactions,
  updateTransaction
) => {
  try {
    const today = new Date();

    const scheduledTransactions = allTransactions.filter(
      (tx) => tx.status === "scheduled"
    );

    for (const transaction of scheduledTransactions) {
      const transactionDate = new Date(transaction.date);

      if (transactionDate <= today) {
        //날짜가 지났으면 confirmed로 변경
        await updateTransaction(transaction.id, { status: "confirmed" });
      }
    }
  } catch (error) {
    console.log("스케줄된 거래 업데이트 중 오류:", error);
  }
};
