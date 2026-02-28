import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.db import Base
from app.models.enums import DocumentType


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    contractor_id = Column(UUID(as_uuid=True), ForeignKey("contractors.id"), nullable=False)
    document_type = Column(Enum(DocumentType, native_enum=False), nullable=False)
    file_name = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    storage_path = Column(String, nullable=False)
    expires_on = Column(Date, nullable=True)
    verified = Column(Boolean, nullable=False, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
