from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    DateTime,
    func,
    Enum,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.models.enums import RecurringFrequency, TransactionType
from app.core.database import Base


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    template_name = Column(String(255), nullable=False)
    description = Column(String(255), nullable=False)
    amount = Column(Integer, nullable=False)
    type = Column(Enum(TransactionType), nullable=False)  # income, expense
    frequency = Column(Enum(RecurringFrequency), nullable=False)
    start_date = Column(String(255), nullable=False)
    end_date = Column(String(255), nullable=True)
    day_of_month = Column(Integer, nullable=False)

    is_active = Column(Boolean, nullable=False)
    is_variable_amount = Column(Boolean, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="recurring_transactions")
    transactions = relationship(
        "Transaction",
        back_populates="recurring",
    )
