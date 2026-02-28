import uuid

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.db import Base
from app.models.enums import PayrollBatchStatus


class PayrollBatch(Base):
    __tablename__ = "payroll_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    batch_name = Column(String, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    contractor_id = Column(UUID(as_uuid=True), ForeignKey("contractors.id"), nullable=True)
    status = Column(Enum(PayrollBatchStatus, native_enum=False), nullable=False, default=PayrollBatchStatus.draft)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
