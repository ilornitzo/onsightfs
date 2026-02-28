import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID

from app.db import Base
from app.models.enums import PaidOutStatus


class PayrollBatchItem(Base):
    __tablename__ = "payroll_batch_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    payroll_batch_id = Column(UUID(as_uuid=True), ForeignKey("payroll_batches.id"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    contractor_id = Column(UUID(as_uuid=True), ForeignKey("contractors.id"), nullable=False)
    pay_amount = Column(Numeric(12, 2), nullable=False)
    paid_out_status = Column(Enum(PaidOutStatus, native_enum=False), nullable=False, default=PaidOutStatus.unpaid)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
