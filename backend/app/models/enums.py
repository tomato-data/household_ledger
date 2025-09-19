from enum import Enum


class TransactionType(str, Enum):
    """거래 유형 - 수입과 지출을 구분"""

    INCOME = "income"
    EXPENSE = "expense"


class TransactionStatus(str, Enum):
    """거래 상태 - 거래의 확정 여부를 나타냄"""

    CONFIRMED = "confirmed"  # 확정된 거래
    SCHEDULED = "scheduled"  # 예약된 거래 (반복거래에서도 생성)
    PENDING = "pending"  # 대기 중인 거래


class RecurringFrequency(str, Enum):
    """반복 주기 - 반복 거래의 주기를 나타냄"""

    WEEKLY = "weekly"  # 매주
    MONTHLY = "monthly"  # 매월
    YEARLY = "yearly"  # 매년
