import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db import Base
from app.models.enums import BilledStatus, PaidInStatus, PaidOutStatus


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_order_uid", "order_uid", unique=True),
        Index("ix_orders_client_name_raw_order_number", "client_name_raw", "order_number"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    import_batch_id = Column(UUID(as_uuid=True), ForeignKey("import_batches.id"), nullable=False)
    order_uid = Column(String, nullable=False)
    order_number = Column(String, nullable=True)
    work_code = Column(String, nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    contractor_id = Column(UUID(as_uuid=True), ForeignKey("contractors.id"), nullable=True)
    client_name_raw = Column(String, nullable=True)
    contractor_name_raw = Column(String, nullable=True)
    contractor_user_id = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip = Column(String, nullable=True)
    county = Column(String, nullable=True)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    due_date = Column(Date, nullable=True)
    inspector_due_date = Column(Date, nullable=True)
    ecd_date = Column(Date, nullable=True)
    window_start_date = Column(Date, nullable=True)
    window_end_date = Column(Date, nullable=True)
    ordered_at = Column(DateTime(timezone=True), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    imported_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    submitted_to_client_at = Column(DateTime(timezone=True), nullable=True)
    submitted_to_client_by = Column(String, nullable=True)
    source = Column(String, nullable=True)
    owner = Column(String, nullable=True)
    lender = Column(String, nullable=True)
    loan_number = Column(String, nullable=True)
    vacant = Column(Boolean, nullable=True)
    photo_required = Column(Boolean, nullable=True)
    instructions = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    qc_user = Column(String, nullable=True)
    mapping_address_1 = Column(String, nullable=True)
    mapping_address_2 = Column(String, nullable=True)
    mapping_city = Column(String, nullable=True)
    mapping_state = Column(String, nullable=True)
    mapping_zip = Column(String, nullable=True)
    data_entry_error_code = Column(String, nullable=True)
    client_pay_amount = Column(Numeric(12, 2), nullable=True)
    contractor_pay_amount = Column(Numeric(12, 2), nullable=True)
    paid_out_status = Column(Enum(PaidOutStatus, native_enum=False), nullable=False, default=PaidOutStatus.unpaid)
    paid_in_status = Column(Enum(PaidInStatus, native_enum=False), nullable=False, default=PaidInStatus.unpaid)
    billed_status = Column(Enum(BilledStatus, native_enum=False), nullable=False, default=BilledStatus.unbilled)
    missing_paid_out_rate = Column(Boolean, nullable=False, default=False)
    conflicting_paid_out_rate = Column(Boolean, nullable=False, default=False)
    missing_paid_in_rate = Column(Boolean, nullable=False, default=False)
    conflicting_paid_in_rate = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
