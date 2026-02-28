import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.db import Base


class ClientBillingRate(Base):
    __tablename__ = "client_billing_rates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    state = Column(String, nullable=True)
    county = Column(String, nullable=True)
    city = Column(String, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    priority = Column(Integer, nullable=False, default=100)
    active = Column(Boolean, nullable=False, default=True)
    effective_start_date = Column(Date, nullable=True)
    effective_end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
