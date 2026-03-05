import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.db import Base


class ContractorProfile(Base):
    __tablename__ = "contractor_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    contractor_id = Column(UUID(as_uuid=True), ForeignKey("contractors.id"), nullable=False, unique=True)
    dob = Column(Date, nullable=True)
    ssn_or_ein = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    aspen_grove_abc_number = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    bank_account_type = Column(String, nullable=True)
    bank_routing_number = Column(String, nullable=True)
    bank_account_number = Column(String, nullable=True)
    counties = Column(JSON, nullable=True)
    expected_pay_per_inspection = Column(Numeric(12, 2), nullable=True)
    min_daily_volume = Column(Integer, nullable=True)
    ic_acknowledged = Column(Boolean, nullable=False, default=False)
    signature_name = Column(String, nullable=True)
    signature_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
